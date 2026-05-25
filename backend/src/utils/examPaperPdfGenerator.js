const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/exam-papers');

function ensureDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function wrapText(text, maxChars = 90) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + w).length > maxChars) {
      lines.push(line.trim());
      line = `${w} `;
    } else {
      line += `${w} `;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.length ? lines : [''];
}

async function generateExamPaperPdf({ institution, paper, questions }) {
  ensureDir();
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const newPageIfNeeded = (needed = 40) => {
    if (y < needed) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
  };

  page.drawText(institution?.name || 'Institution', { x: 50, y, size: 16, font: fontBold, color: rgb(0.15, 0.1, 0.45) });
  y -= 22;
  page.drawText(paper.title || 'Examination Paper', { x: 50, y, size: 14, font: fontBold });
  y -= 18;
  page.drawText(`Subject: ${paper.subject_name || '—'}    Class: ${paper.class_name || '—'}${paper.section_name ? ` / ${paper.section_name}` : ''}`, { x: 50, y, size: 11, font });
  y -= 14;
  page.drawText(`Exam Type: ${paper.exam_type || '—'}    Date: ${paper.paper_date || '—'}    Duration: ${paper.duration_minutes} min    Total Marks: ${paper.total_marks}`, { x: 50, y, size: 11, font });
  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 18;

  if (paper.instructions) {
    page.drawText('Instructions:', { x: 50, y, size: 11, font: fontBold });
    y -= 14;
    wrapText(paper.instructions, 95).forEach((ln) => {
      newPageIfNeeded();
      page.drawText(ln, { x: 50, y, size: 10, font });
      y -= 12;
    });
    y -= 8;
  }

  let currentSection = null;
  questions.forEach((q, idx) => {
    if (q.section_name && q.section_name !== currentSection) {
      currentSection = q.section_name;
      newPageIfNeeded(50);
      page.drawText(currentSection, { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.15, 0.5) });
      y -= 16;
    }
    newPageIfNeeded(60);
    const qNum = q.question_order || idx + 1;
    const header = `Q${qNum}. (${q.marks} mark${Number(q.marks) === 1 ? '' : 's'})`;
    page.drawText(header, { x: 50, y, size: 11, font: fontBold });
    y -= 14;
    wrapText(q.question_text, 95).forEach((ln) => {
      newPageIfNeeded();
      page.drawText(ln, { x: 60, y, size: 10, font });
      y -= 12;
    });
    if (q.question_type === 'mcq' && q.options?.length) {
      q.options.forEach((opt) => {
        newPageIfNeeded();
        page.drawText(`${opt.label}) ${opt.option_text}`, { x: 70, y, size: 10, font });
        y -= 12;
      });
    }
    y -= 8;
  });

  const filename = `paper_${paper.id}_${Date.now()}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
  return `/uploads/exam-papers/${filename}`;
}

async function generateAnswerKeyPdf({ institution, paper, answerKey, markingScheme, questions }) {
  ensureDir();
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const newPageIfNeeded = (needed = 40) => {
    if (y < needed) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
  };

  page.drawText(institution?.name || 'Institution', { x: 50, y, size: 16, font: fontBold, color: rgb(0.15, 0.1, 0.45) });
  y -= 22;
  page.drawText(`Answer Key — ${paper.title}`, { x: 50, y, size: 14, font: fontBold });
  y -= 16;
  page.drawText(`Subject: ${paper.subject_name || '—'}    Total Marks: ${paper.total_marks}`, { x: 50, y, size: 11, font });
  y -= 20;
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
  y -= 18;

  const items = answerKey?.items || [];
  items.forEach((item, idx) => {
    const q = questions.find((qq) => qq.question_id === item.question_id || qq.id === item.question_id) || {};
    newPageIfNeeded(70);
    page.drawText(`Q${item.order || idx + 1}. [${item.marks ?? q.marks} marks] (${item.question_type || q.question_type})`, { x: 50, y, size: 11, font: fontBold });
    y -= 14;
    if (item.correct_option) {
      page.drawText(`Answer: ${item.correct_option}`, { x: 60, y, size: 10, font });
      y -= 12;
    } else if (item.correct_answer) {
      wrapText(`Answer: ${item.correct_answer}`, 90).forEach((ln) => {
        newPageIfNeeded();
        page.drawText(ln, { x: 60, y, size: 10, font });
        y -= 12;
      });
    }
    if (item.marking_guidelines) {
      wrapText(`Guidelines: ${item.marking_guidelines}`, 90).forEach((ln) => {
        newPageIfNeeded();
        page.drawText(ln, { x: 60, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
        y -= 11;
      });
    }
    y -= 6;
  });

  if (markingScheme?.sections?.length) {
    newPageIfNeeded(80);
    y -= 10;
    page.drawText('Marking Scheme', { x: 50, y, size: 13, font: fontBold, color: rgb(0.15, 0.1, 0.45) });
    y -= 18;
    markingScheme.sections.forEach((sec) => {
      newPageIfNeeded();
      page.drawText(sec.name, { x: 50, y, size: 11, font: fontBold });
      y -= 14;
      (sec.items || []).forEach((it) => {
        newPageIfNeeded();
        page.drawText(`Question #${it.question_id} (${it.marks} marks): ${it.scheme || ''}`, { x: 60, y, size: 9, font });
        y -= 12;
        (it.rubric || []).forEach((r) => {
          newPageIfNeeded();
          page.drawText(`  • ${r.level}: ${r.marks_range} — ${r.description}`, { x: 65, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
          y -= 10;
        });
      });
      y -= 6;
    });
  }

  const filename = `answer_key_${paper.id}_${Date.now()}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, await pdfDoc.save());
  return `/uploads/exam-papers/${filename}`;
}

async function generateMarkingSchemePdf({ institution, paper, markingScheme }) {
  ensureDir();
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  page.drawText(institution?.name || 'Institution', { x: 50, y, size: 16, font: fontBold });
  y -= 22;
  page.drawText(`Marking Scheme — ${paper.title}`, { x: 50, y, size: 14, font: fontBold });
  y -= 20;

  (markingScheme?.sections || []).forEach((sec) => {
    if (y < 80) { page = pdfDoc.addPage([595, 842]); y = 800; }
    page.drawText(sec.name, { x: 50, y, size: 12, font: fontBold });
    y -= 16;
    (sec.items || []).forEach((it) => {
      if (y < 60) { page = pdfDoc.addPage([595, 842]); y = 800; }
      wrapText(`Q${it.question_id} (${it.marks}m): ${it.scheme}`, 90).forEach((ln) => {
        page.drawText(ln, { x: 55, y, size: 10, font });
        y -= 12;
      });
    });
    y -= 8;
  });

  const filename = `marking_scheme_${paper.id}_${Date.now()}.pdf`;
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, await pdfDoc.save());
  return `/uploads/exam-papers/${filename}`;
}

module.exports = {
  generateExamPaperPdf,
  generateAnswerKeyPdf,
  generateMarkingSchemePdf,
  UPLOAD_DIR,
};
