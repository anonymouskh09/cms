const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

function calcGrade(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

async function generateReportCardPdf(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { institution, student, exam, subjects, totals, attendance, teacherRemarks, principalRemarks } = data;
  const passThreshold = exam.pass_threshold || 33;
  const passFail = totals.percentage >= passThreshold ? 'PASS' : 'FAIL';

  let y = 800;
  const drawText = (text, x, size = 11, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(String(text ?? ''), { x, y, size, font: bold ? fontBold : font, color });
    y -= size + 6;
  };

  page.drawRectangle({ x: 50, y: 760, width: 60, height: 60, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 1 });
  page.drawText('LOGO', { x: 62, y: 785, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) });

  page.drawText(institution.name, { x: 130, y: 790, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
  page.drawText('STUDENT REPORT CARD', { x: 130, y: 770, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y = 740;

  drawText(`Exam / Term: ${exam.name} (${exam.exam_type_name || ''})`, 50, 11, true);
  drawText(`Academic Year: ${exam.academic_year || '—'}`, 50);
  y -= 4;
  drawText(`Student: ${student.first_name} ${student.last_name || ''}`, 50);
  drawText(`Roll No: ${student.roll_no || '—'}    Admission No: ${student.admission_no || '—'}`, 50);
  drawText(`Class: ${student.class_name || '—'}    Section: ${student.section_name || '—'}`, 50);
  y -= 8;

  page.drawText('Subject-wise Marks', { x: 50, y, size: 12, font: fontBold });
  y -= 18;

  const cols = [50, 200, 290, 360, 420, 480];
  const headers = ['Subject', 'Max', 'Obtained', 'Grade', 'Status'];
  headers.forEach((h, i) => page.drawText(h, { x: cols[i], y, size: 10, font: fontBold }));
  y -= 14;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  y -= 12;

  subjects.forEach((s) => {
    const obtained = s.is_absent ? 'AB' : (s.marks_obtained ?? '—');
    const pct = s.max_marks && s.marks_obtained != null ? (s.marks_obtained / s.max_marks) * 100 : 0;
    const grade = s.grade || (s.is_absent ? 'AB' : calcGrade(pct));
    const status = s.is_absent ? 'Absent' : ((s.marks_obtained ?? 0) >= (s.pass_marks ?? (s.max_marks * passThreshold / 100)) ? 'Pass' : 'Fail');
    page.drawText(s.subject_name, { x: cols[0], y, size: 10, font });
    page.drawText(String(s.max_marks), { x: cols[1], y, size: 10, font });
    page.drawText(String(obtained), { x: cols[2], y, size: 10, font });
    page.drawText(String(grade), { x: cols[3], y, size: 10, font });
    page.drawText(status, { x: cols[4], y, size: 10, font });
    y -= 14;
  });

  y -= 8;
  page.drawLine({ start: { x: 50, y: y + 4 }, end: { x: 545, y: y + 4 }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  drawText(`Total Marks: ${totals.total_marks}    Obtained: ${totals.obtained_marks}    Percentage: ${totals.percentage}%`, 50, 11, true);
  drawText(`Final Grade: ${totals.grade}    Result: ${passFail}`, 50, 11, true);
  y -= 8;

  drawText('Attendance Summary', 50, 12, true);
  if (attendance) {
    drawText(`Period: ${attendance.from} to ${attendance.to}`, 50, 10);
    drawText(`Present: ${attendance.present} / ${attendance.total} days (${attendance.percentage}%)`, 50, 10);
    drawText(`Absent: ${attendance.absent}    Late: ${attendance.late}`, 50, 10);
  } else {
    drawText('No attendance records for this period.', 50, 10);
  }
  y -= 8;

  drawText('Teacher Remarks:', 50, 11, true);
  const teacherLines = (teacherRemarks || '—').match(/.{1,70}/g) || ['—'];
  teacherLines.slice(0, 3).forEach((line) => drawText(line, 50, 10));
  y -= 4;

  drawText('Principal Remarks:', 50, 11, true);
  const principalLines = (principalRemarks || '—').match(/.{1,70}/g) || ['—'];
  principalLines.slice(0, 3).forEach((line) => drawText(line, 50, 10));
  y -= 20;

  page.drawLine({ start: { x: 350, y: 80 }, end: { x: 520, y: 80 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Principal Signature', { x: 370, y: 65, size: 10, font, color: rgb(0.4, 0.4, 0.4) });

  const genDate = new Date().toLocaleDateString();
  page.drawText(`Generated: ${genDate}`, { x: 50, y: 65, size: 9, font, color: rgb(0.5, 0.5, 0.5) });

  const uploadsDir = path.join(__dirname, '../../uploads/report-cards');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `report_card_${student.id}_exam_${exam.id}_${Date.now()}.pdf`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, await pdfDoc.save());

  return `/uploads/report-cards/${filename}`;
}

module.exports = { generateReportCardPdf, calcGrade };
