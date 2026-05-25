const QUESTION_TYPES = ['mcq', 'short', 'long', 'true_false', 'fill_blank'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

function parseJsonField(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distributionTargets(totalMarks, distribution, keys) {
  const targets = {};
  const entries = keys.filter((k) => distribution?.[k] != null);
  if (!entries.length) {
    keys.forEach((k) => { targets[k] = totalMarks / keys.length; });
    return targets;
  }
  let assigned = 0;
  entries.forEach((k, idx) => {
    const pct = Number(distribution[k]) || 0;
    if (idx === entries.length - 1) {
      targets[k] = Math.max(0, totalMarks - assigned);
    } else {
      const m = Math.round((totalMarks * pct) / 100);
      targets[k] = m;
      assigned += m;
    }
  });
  keys.forEach((k) => {
    if (targets[k] == null) targets[k] = 0;
  });
  return targets;
}

function autoPickQuestions(available, { totalMarks, difficultyDistribution, typeDistribution, allowPending }) {
  const pool = available.filter((q) => {
    if (allowPending) return q.status !== 'rejected' && q.status !== 'archived';
    return q.status === 'approved';
  });

  const diffTargets = distributionTargets(totalMarks, difficultyDistribution, DIFFICULTIES);
  const typeTargets = distributionTargets(totalMarks, typeDistribution, QUESTION_TYPES);

  const picked = [];
  const usedIds = new Set();
  let currentMarks = 0;

  const tryPick = (candidates, targetMarks) => {
    let gained = 0;
    for (const q of shuffle(candidates)) {
      if (usedIds.has(q.id)) continue;
      if (currentMarks + Number(q.marks) > totalMarks + 2) continue;
      picked.push(q);
      usedIds.add(q.id);
      currentMarks += Number(q.marks);
      gained += Number(q.marks);
      if (gained >= targetMarks || currentMarks >= totalMarks) break;
    }
    return gained;
  };

  for (const diff of DIFFICULTIES) {
    if (diffTargets[diff] <= 0) continue;
    const candidates = pool.filter((q) => q.difficulty === diff);
    tryPick(candidates, diffTargets[diff]);
  }

  for (const type of QUESTION_TYPES) {
    if (typeTargets[type] <= 0) continue;
    const candidates = pool.filter((q) => q.question_type === type && !usedIds.has(q.id));
    tryPick(candidates, typeTargets[type]);
  }

  if (currentMarks < totalMarks) {
    const remaining = shuffle(pool.filter((q) => !usedIds.has(q.id)));
    for (const q of remaining) {
      if (currentMarks + Number(q.marks) > totalMarks + 2) continue;
      picked.push(q);
      usedIds.add(q.id);
      currentMarks += Number(q.marks);
      if (currentMarks >= totalMarks) break;
    }
  }

  return picked.map((q, idx) => ({
    question_id: q.id,
    section_name: q.question_type === 'mcq' ? 'Section A — MCQ' : q.question_type === 'long' ? 'Section C — Long Questions' : 'Section B — Short Questions',
    question_order: idx + 1,
    marks: Number(q.marks),
    question: q,
  }));
}

function buildDefaultAnswerKey(questions) {
  return {
    title: 'Answer Key',
    generated_at: new Date().toISOString(),
    items: questions.map((q, idx) => {
      const correctOpt = q.options?.find((o) => o.is_correct);
      return {
        order: idx + 1,
        question_id: q.question_id || q.id,
        question_type: q.question_type,
        marks: q.marks,
        correct_answer: q.correct_answer || correctOpt?.label || '',
        correct_option: correctOpt ? `${correctOpt.label}: ${correctOpt.option_text}` : null,
        marking_guidelines: q.explanation || '',
        rubric: q.question_type === 'long' ? [{ criterion: 'Content accuracy', marks: Number(q.marks) * 0.6 }, { criterion: 'Structure & clarity', marks: Number(q.marks) * 0.4 }] : [],
      };
    }),
  };
}

function buildDefaultMarkingScheme(questions) {
  return {
    title: 'Marking Scheme',
    generated_at: new Date().toISOString(),
    total_marks: questions.reduce((s, q) => s + Number(q.marks || 0), 0),
    sections: [
      {
        name: 'Objective Questions',
        items: questions.filter((q) => ['mcq', 'true_false', 'fill_blank'].includes(q.question_type)).map((q) => ({
          question_id: q.question_id || q.id,
          marks: q.marks,
          scheme: 'Full marks for correct answer; no partial marks.',
        })),
      },
      {
        name: 'Subjective Questions',
        items: questions.filter((q) => ['short', 'long'].includes(q.question_type)).map((q) => ({
          question_id: q.question_id || q.id,
          marks: q.marks,
          scheme: q.explanation || 'Award marks based on key points covered.',
          rubric: q.question_type === 'long'
            ? [
              { level: 'Excellent', marks_range: `${Math.round(q.marks * 0.8)}-${q.marks}`, description: 'Complete, accurate, well-structured' },
              { level: 'Good', marks_range: `${Math.round(q.marks * 0.5)}-${Math.round(q.marks * 0.79)}`, description: 'Mostly correct with minor gaps' },
              { level: 'Partial', marks_range: `1-${Math.round(q.marks * 0.49)}`, description: 'Some relevant points' },
            ]
            : [{ level: 'Full', marks_range: `${q.marks}`, description: 'Correct key points' }],
        })),
      },
    ],
  };
}

function validateAnswerKeyJson(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Invalid answer key format.' };
  if (!Array.isArray(payload.items)) return { ok: false, error: 'Answer key must contain items array.' };
  return { ok: true, data: payload };
}

function validateMarkingSchemeJson(payload) {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Invalid marking scheme format.' };
  return { ok: true, data: payload };
}

module.exports = {
  QUESTION_TYPES,
  DIFFICULTIES,
  parseJsonField,
  autoPickQuestions,
  buildDefaultAnswerKey,
  buildDefaultMarkingScheme,
  validateAnswerKeyJson,
  validateMarkingSchemeJson,
};
