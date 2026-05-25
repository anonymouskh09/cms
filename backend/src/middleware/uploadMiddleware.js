const multer = require('multer');
const path = require('path');
const fs = require('fs');

const assignmentDir = path.join(__dirname, '../../uploads/assignments');
const submissionDir = path.join(__dirname, '../../uploads/submissions');
const announcementDir = path.join(__dirname, '../../uploads/announcements');
const syllabusDir = path.join(__dirname, '../../uploads/syllabus');

[assignmentDir, submissionDir, announcementDir, syllabusDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function storage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, subdir),
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safe}`);
    },
  });
}

const assignmentUpload = multer({
  storage: storage(assignmentDir),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const submissionUpload = multer({
  storage: storage(submissionDir),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const announcementUpload = multer({
  storage: storage(announcementDir),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const syllabusUpload = multer({
  storage: storage(syllabusDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = new Set(['.pdf', '.doc', '.docx', '.txt']);
    if (allowed.has(ext)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT.'));
  },
});

module.exports = { assignmentUpload, submissionUpload, announcementUpload, syllabusUpload };
