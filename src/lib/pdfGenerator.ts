import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface AttendanceRecord {
  employeeName: string;
  date: Date;
  day: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
}

export function generateAttendancePDF(
  records: AttendanceRecord[],
  title: string = 'Attendance Report'
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(31, 41, 55);
  doc.text('URC Attendance Report', 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(107, 114, 128);
  doc.text(title, 14, 32);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, 14, 40);
  
  // Table
  const tableData = records.map(record => [
    record.employeeName,
    format(record.date, 'dd/MM/yyyy'),
    record.day,
    record.checkIn || '-',
    record.checkOut || '-',
    record.workHours ? `${record.workHours.toFixed(2)} hrs` : '-'
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['Name', 'Date', 'Day', 'Check In', 'Check Out', 'Work Hours']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 28 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 28 },
    },
  });

  return doc;
}

export function downloadAttendancePDF(
  records: AttendanceRecord[],
  filename: string = 'attendance-report.pdf'
) {
  const doc = generateAttendancePDF(records);
  doc.save(filename);
}
