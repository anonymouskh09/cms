const PLACEHOLDER_MSG = 'AI features are UI-only in Phase 3. No real AI API calls are made.';

const PLACEHOLDER = { success: false, message: PLACEHOLDER_MSG, placeholder: true };

const DEFAULT_SETTINGS = {
  provider: 'placeholder',
  model_name: 'cms-ai-placeholder-v1',
  max_tokens: 2000,
  temperature: 0.7,
  enable_question_bank: false,
  enable_exam_generator: false,
  enable_marking_scheme: false,
  api_key_hint: 'Not configured',
  status: 'inactive',
};

const SAMPLE_QUESTIONS = [
  { id: 1, question_type: 'mcq', difficulty: 'medium', question_text: 'What is the value of 15 × 8?', options: ['100', '120', '115', '125'], correct_answer: '120', marks: 2, syllabus_topic: 'Multiplication', subject_name: 'Mathematics', class_name: 'Grade 5', status: 'approved' },
  { id: 2, question_type: 'short', difficulty: 'easy', question_text: 'Define photosynthesis in one sentence.', correct_answer: 'Process by which plants make food using sunlight.', marks: 3, syllabus_topic: 'Plant Biology', subject_name: 'Science', class_name: 'Grade 5', status: 'approved' },
  { id: 3, question_type: 'long', difficulty: 'hard', question_text: 'Explain the causes of World War I.', marks: 10, syllabus_topic: 'Modern History', subject_name: 'History', class_name: 'Grade 8', status: 'draft' },
];

const SAMPLE_PAPERS = [
  { id: 1, title: 'Mid Term Mathematics — Grade 5', total_marks: 50, duration_minutes: 90, status: 'generated', class_name: 'Grade 5', subject_name: 'Mathematics', created_at: '2026-05-20 10:00:00' },
  { id: 2, title: 'Science Quiz — Plant Biology', total_marks: 30, duration_minutes: 45, status: 'draft', class_name: 'Grade 5', subject_name: 'Science', created_at: '2026-05-22 14:00:00' },
];

const SAMPLE_SCHEMES = [
  { id: 1, title: 'Mathematics Mid Term — Answer Key', exam_paper_title: 'Mid Term Mathematics — Grade 5', status: 'generated', created_at: '2026-05-20 11:00:00' },
];

function settings(req, res) {
  res.json({ success: true, data: { ...DEFAULT_SETTINGS, institution_id: req.institutionFilter || req.user.institution_id }, placeholder: true, message: PLACEHOLDER_MSG });
}

function updateSettings(req, res) {
  res.json({ success: true, data: { ...DEFAULT_SETTINGS, ...req.body }, placeholder: true, message: PLACEHOLDER_MSG });
}

function listQuestions(req, res) {
  res.json({ success: true, data: SAMPLE_QUESTIONS, placeholder: true, message: PLACEHOLDER_MSG });
}

function createQuestion(req, res) {
  res.status(201).json({ success: true, data: { id: Date.now(), ...req.body, status: 'draft' }, placeholder: true, message: PLACEHOLDER_MSG });
}

function listExamPapers(req, res) {
  res.json({ success: true, data: SAMPLE_PAPERS, placeholder: true, message: PLACEHOLDER_MSG });
}

function generateExamPaper(req, res) {
  res.status(201).json({
    success: true,
    data: { id: Date.now(), title: req.body.title || 'Generated Paper', status: 'generated', total_marks: req.body.total_marks || 100 },
    placeholder: true,
    message: PLACEHOLDER_MSG,
  });
}

function listMarkingSchemes(req, res) {
  res.json({ success: true, data: SAMPLE_SCHEMES, placeholder: true, message: PLACEHOLDER_MSG });
}

function generateMarkingScheme(req, res) {
  res.status(201).json({
    success: true,
    data: { id: Date.now(), title: req.body.title || 'Marking Scheme', status: 'generated' },
    placeholder: true,
    message: PLACEHOLDER_MSG,
  });
}

function testPlaceholder(req, res) {
  res.json(PLACEHOLDER);
}

module.exports = {
  settings, updateSettings, listQuestions, createQuestion,
  listExamPapers, generateExamPaper, listMarkingSchemes, generateMarkingScheme, testPlaceholder,
};
