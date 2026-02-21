import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if admin user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const adminExists = existingUsers?.users?.some(
      (user) => user.email === "admin@urc.com"
    );

    if (adminExists) {
      // Update password to latest
      const adminUser = existingUsers?.users?.find(u => u.email === "admin@urc.com");
      if (adminUser) {
        await supabase.auth.admin.updateUserById(adminUser.id, { password: "admin@urc" });
      }
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Admin user updated. Login with admin@urc.com / admin@urc" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: "admin@urc.com",
      password: "admin@urc",
      email_confirm: true,
      user_metadata: {
        role: "admin",
      },
    });

    if (error) {
      throw error;
    }

    // Add admin role
    if (newUser?.user) {
      await supabase.from("user_roles").insert({
        user_id: newUser.user.id,
        role: "admin",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin user created successfully!",
        credentials: {
          email: "admin@urc.com",
          password: "admin@urc",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Setup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
