const fs = require('fs');
const path = require('path');

const TEXT_EXT = new Set(['.txt']);

function getExtension(filename) {
  return path.extname(filename || '').toLowerCase();
}

async function extractTextFromFile(filePath, originalName) {
  const ext = getExtension(originalName || filePath);

  if (TEXT_EXT.has(ext)) {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      return { text: text.slice(0, 500000), extraction_status: 'completed' };
    } catch (err) {
      return { text: null, extraction_status: 'failed', error: err.message };
    }
  }

  if (['.pdf', '.doc', '.docx'].includes(ext)) {
    return { text: null, extraction_status: 'pending', message: 'Text extraction pending for PDF/DOC files.' };
  }

  return { text: null, extraction_status: 'not_applicable' };
}

module.exports = { extractTextFromFile, getExtension };
