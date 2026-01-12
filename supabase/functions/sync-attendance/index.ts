import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceLog {
  device_user_id: string;
  punch_time: string;
  device_id: string;
}

interface SyncRequest {
  device_id: string;
  device_ip: string;
  logs: AttendanceLog[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { device_id, device_ip, logs } = (await req.json()) as SyncRequest;

    if (!logs || !Array.isArray(logs)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: logs array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create device record
    let { data: device } = await supabase
      .from("devices")
      .select("id")
      .eq("device_ip", device_ip)
      .maybeSingle();

    if (!device) {
      const { data: newDevice, error: deviceError } = await supabase
        .from("devices")
        .insert({
          device_ip: device_ip,
          device_name: `ZKTeco Device ${device_ip}`,
          device_port: 4370,
        })
        .select("id")
        .single();

      if (deviceError) throw deviceError;
      device = newDevice;
    }

    // Create sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from("sync_logs")
      .insert({
        device_id: device.id,
        status: "in_progress",
        records_fetched: logs.length,
      })
      .select("id")
      .single();

    if (syncLogError) throw syncLogError;

    let recordsAdded = 0;
    const errors: string[] = [];

    for (const log of logs) {
      try {
        // Find employee by device_user_id
        const { data: employee } = await supabase
          .from("employees")
          .select("id")
          .eq("device_user_id", log.device_user_id)
          .maybeSingle();

        if (!employee) {
          errors.push(`Employee not found for device_user_id: ${log.device_user_id}`);
          continue;
        }

        // Check for duplicate punch
        const { data: existingLog } = await supabase
          .from("attendance_logs")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("punch_time", log.punch_time)
          .maybeSingle();

        if (existingLog) {
          continue; // Skip duplicate
        }

        // Insert attendance log
        const { error: insertError } = await supabase
          .from("attendance_logs")
          .insert({
            employee_id: employee.id,
            punch_time: log.punch_time,
            device_id: device_id,
          });

        if (insertError) {
          errors.push(`Failed to insert log: ${insertError.message}`);
          continue;
        }

        recordsAdded++;

        // Update daily attendance
        const punchDate = log.punch_time.split("T")[0];
        
        const { data: dailyRecord } = await supabase
          .from("daily_attendance")
          .select("*")
          .eq("employee_id", employee.id)
          .eq("attendance_date", punchDate)
          .maybeSingle();

        const punchTime = new Date(log.punch_time);

        if (!dailyRecord) {
          // Create new daily record with first punch as check-in
          await supabase
            .from("daily_attendance")
            .insert({
              employee_id: employee.id,
              attendance_date: punchDate,
              check_in: log.punch_time,
              status: "present",
              total_punches: 1,
            });
        } else {
          // Update existing record
          const checkIn = dailyRecord.check_in ? new Date(dailyRecord.check_in) : null;
          const checkOut = dailyRecord.check_out ? new Date(dailyRecord.check_out) : null;
          
          let newCheckIn = dailyRecord.check_in;
          let newCheckOut = dailyRecord.check_out;
          
          // First punch or earlier punch = check in
          if (!checkIn || punchTime < checkIn) {
            newCheckIn = log.punch_time;
          }
          
          // Last punch = check out (if different from check in time)
          if (!checkOut || punchTime > checkOut) {
            if (!checkIn || punchTime > checkIn) {
              newCheckOut = log.punch_time;
            }
          }

          // Calculate work hours
          let workHours = null;
          if (newCheckIn && newCheckOut) {
            const inTime = new Date(newCheckIn);
            const outTime = new Date(newCheckOut);
            workHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
            workHours = Math.round(workHours * 100) / 100;
          }

          await supabase
            .from("daily_attendance")
            .update({
              check_in: newCheckIn,
              check_out: newCheckOut,
              work_hours: workHours,
              total_punches: (dailyRecord.total_punches || 0) + 1,
            })
            .eq("id", dailyRecord.id);
        }
      } catch (err) {
        errors.push(`Error processing log: ${err}`);
      }
    }

    // Update sync log
    await supabase
      .from("sync_logs")
      .update({
        status: errors.length > 0 ? "completed_with_errors" : "completed",
        records_added: recordsAdded,
        sync_end_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join("; ") : null,
      })
      .eq("id", syncLog.id);

    // Update device last_sync_at
    await supabase
      .from("devices")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", device.id);

    return new Response(
      JSON.stringify({
        success: true,
        records_fetched: logs.length,
        records_added: recordsAdded,
        errors: errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
