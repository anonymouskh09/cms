const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateChallanPdf(challan, student, institution, className, sectionName) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const draw = (text, x, size = 12, bold = false) => {
    page.drawText(String(text), { x, y, size, font: bold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 8;
  };

  draw('FEE CHALLAN', 220, 18, true);
  draw(institution.name, 200, 14, true);
  y -= 10;
  draw(`Challan No: ${challan.challan_no || challan.id}`, 50);
  draw(`Student: ${student.first_name} ${student.last_name || ''}`, 50);
  draw(`Class/Section: ${className || '-'} / ${sectionName || '-'}`, 50);
  draw(`Month: ${challan.month_year}`, 50);
  draw(`Due Date: ${challan.due_date}`, 50);
  draw(`Status: ${challan.status.toUpperCase()}`, 50);
  y -= 10;
  draw('Fee Breakdown:', 50, 14, true);

  const breakdown = typeof challan.fee_breakdown === 'string'
    ? JSON.parse(challan.fee_breakdown)
    : (challan.fee_breakdown || []);

  if (Array.isArray(breakdown)) {
    breakdown.forEach((item) => draw(`  ${item.fee_type || item.name}: Rs. ${item.amount}`, 50));
  }

  y -= 10;
  draw(`Base Amount: Rs. ${challan.base_amount}`, 50);
  draw(`Fine: Rs. ${challan.fine_amount}`, 50);
  draw(`Total Payable: Rs. ${challan.total_amount}`, 50, 14, true);

  const uploadsDir = path.join(__dirname, '../../uploads/challans');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `challan_${challan.id}_${Date.now()}.pdf`;
  const filepath = path.join(uploadsDir, filename);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filepath, pdfBytes);

  return `/uploads/challans/${filename}`;
}

module.exports = { generateChallanPdf };
