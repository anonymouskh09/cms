const VALID_TYPES = new Set(['mcq', 'short', 'long', 'true_false', 'fill_blank']);
const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);

function validateGeneratedQuestions(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Response is not a JSON object.' };
  }

  const list = payload.questions;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, error: 'Response must contain a non-empty questions array.' };
  }

  const normalized = [];
  for (let i = 0; i < list.length; i += 1) {
    const q = list[i];
    if (!q || typeof q.question_text !== 'string' || !q.question_text.trim()) {
      return { ok: false, error: `Question ${i + 1} missing question_text.` };
    }
    const type = (q.question_type || 'mcq').toLowerCase();
    if (!VALID_TYPES.has(type)) {
      return { ok: false, error: `Question ${i + 1} has invalid question_type.` };
    }
    const difficulty = (q.difficulty || 'medium').toLowerCase();
    if (!VALID_DIFFICULTY.has(difficulty)) {
      return { ok: false, error: `Question ${i + 1} has invalid difficulty.` };
    }

    const options = Array.isArray(q.options) ? q.options.map((o, idx) => ({
      label: o.label || String.fromCharCode(65 + idx),
      option_text: String(o.option_text || ''),
      is_correct: Boolean(o.is_correct),
    })) : [];

    if (type === 'mcq' && options.length < 2) {
      return { ok: false, error: `Question ${i + 1} MCQ requires at least 2 options.` };
    }

    normalized.push({
      question_text: q.question_text.trim(),
      question_type: type,
      difficulty,
      marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
      correct_answer: q.correct_answer != null ? String(q.correct_answer) : null,
      explanation: q.explanation != null ? String(q.explanation) : null,
      topic: q.topic ? String(q.topic) : null,
      chapter: q.chapter ? String(q.chapter) : null,
      options,
    });
  }

  return { ok: true, questions: normalized };
}

function parseJsonFromContent(content) {
  if (!content) return null;
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

module.exports = { validateGeneratedQuestions, parseJsonFromContent, VALID_TYPES, VALID_DIFFICULTY };
