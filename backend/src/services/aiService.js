const aiConfig = require('../config/ai');
const openai = require('./ai/providers/openai');
const anthropic = require('./ai/providers/anthropic');
const openrouter = require('./ai/providers/openrouter');
const local = require('./ai/providers/local');

const ADAPTERS = {
  openai,
  anthropic,
  openrouter,
  local,
};

function getAdapter(provider) {
  return ADAPTERS[provider] || null;
}

function listProvidersMeta() {
  return aiConfig.PROVIDERS.map((id) => ({
    id,
    name: aiConfig.PROVIDER_LABELS[id],
    configured: aiConfig.isProviderConfigured(id),
    default_model: aiConfig.DEFAULT_MODELS[id],
    env_configured: id === 'local'
      ? Boolean(process.env.LOCAL_LLM_URL)
      : Boolean(aiConfig.getProviderApiKey(id)?.trim()),
  }));
}

async function testConnection(provider, model) {
  if (!provider || !aiConfig.PROVIDERS.includes(provider)) {
    return { success: false, message: 'Invalid AI provider selected.' };
  }

  if (!aiConfig.isProviderConfigured(provider)) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  const adapter = getAdapter(provider);
  if (!adapter?.testConnection) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  return adapter.testConnection(model || aiConfig.DEFAULT_MODELS[provider] || aiConfig.defaultModel);
}

function resolveEffectiveModel(settingsRow) {
  const provider = settingsRow?.provider || aiConfig.defaultProvider;
  return settingsRow?.model || settingsRow?.model_name || aiConfig.defaultModel || aiConfig.DEFAULT_MODELS[provider] || '';
}

function buildQuestionPrompt({ count, questionType, difficulty, topic, chapter, className, subjectName, syllabusText }) {
  const typeLabel = {
    mcq: 'multiple choice (MCQ)',
    short: 'short answer',
    long: 'long answer',
    true_false: 'true/false',
    fill_blank: 'fill in the blank',
  }[questionType] || questionType;

  const syllabusSnippet = (syllabusText || '').slice(0, 12000);

  return `You are an expert exam question writer for ${className || 'the class'} — ${subjectName || 'subject'}.
Generate exactly ${count} ${typeLabel} question(s) at ${difficulty} difficulty.
${topic ? `Topic: ${topic}.` : ''}${chapter ? ` Chapter: ${chapter}.` : ''}
${syllabusSnippet ? `\nUse this syllabus content as reference:\n${syllabusSnippet}\n` : ''}

Respond ONLY with valid JSON matching this schema (no markdown, no commentary):
{
  "questions": [
    {
      "question_text": "string",
      "question_type": "${questionType}",
      "difficulty": "${difficulty}",
      "marks": 1,
      "correct_answer": "string",
      "explanation": "string",
      "topic": "string",
      "chapter": "string",
      "options": [
        { "label": "A", "option_text": "string", "is_correct": false }
      ]
    }
  ]
}

Rules:
- For mcq: include exactly 4 options (A-D) with exactly one is_correct true.
- For true_false: correct_answer must be "True" or "False"; options may be omitted.
- For fill_blank: use _____ in question_text; correct_answer is the blank answer.
- For short/long: options array should be empty [].
- marks must be a positive number.
- All questions must match the requested type and difficulty.`;
}

async function generateQuestions({ settings, count, questionType, difficulty, topic, chapter, className, subjectName, syllabusText }) {
  const provider = settings?.provider || aiConfig.defaultProvider;
  if (!settings?.is_enabled) {
    throw new Error('AI question generation is disabled for this institution.');
  }
  if (!aiConfig.isProviderConfigured(provider)) {
    throw new Error('AI provider is not configured yet.');
  }

  const model = resolveEffectiveModel(settings);
  const { chatCompletion } = require('./ai/chatProvider');
  const { parseJsonFromContent, validateGeneratedQuestions } = require('../utils/aiQuestionValidator');

  const prompt = buildQuestionPrompt({
    count,
    questionType,
    difficulty,
    topic,
    chapter,
    className,
    subjectName,
    syllabusText,
  });

  const { content, tokensUsed } = await chatCompletion({
    provider,
    model,
    messages: [
      { role: 'system', content: 'You output strict JSON only for educational question generation.' },
      { role: 'user', content: prompt },
    ],
    temperature: settings.temperature != null ? Number(settings.temperature) : 0.7,
    maxTokens: settings.max_tokens != null ? Number(settings.max_tokens) : 2000,
  });

  const parsed = parseJsonFromContent(content);
  const validation = validateGeneratedQuestions(parsed);
  if (!validation.ok) {
    const err = new Error(validation.error || 'Invalid AI response format.');
    err.tokensUsed = tokensUsed;
    err.provider = provider;
    err.model = model;
    throw err;
  }

  return {
    questions: validation.questions,
    tokensUsed,
    provider,
    model,
    promptSummary: `Generate ${count} ${questionType} (${difficulty}) — ${topic || chapter || 'general'}`,
  };
}

async function generatePaperStructure({ settings, title, examType, className, subjectName, totalMarks, duration, questionSummary }) {
  const provider = settings?.provider || aiConfig.defaultProvider;
  if (!settings?.is_enabled) throw new Error('AI is disabled for this institution.');
  if (!aiConfig.isProviderConfigured(provider)) throw new Error('AI provider is not configured yet.');

  const model = resolveEffectiveModel(settings);
  const { chatCompletion } = require('./ai/chatProvider');
  const { parseJsonFromContent } = require('../utils/aiQuestionValidator');

  const prompt = `Design an exam paper structure for "${title}" (${examType || 'Exam'}).
Class: ${className || '—'}, Subject: ${subjectName || '—'}, Total Marks: ${totalMarks}, Duration: ${duration} minutes.
Questions available: ${JSON.stringify(questionSummary || []).slice(0, 4000)}

Respond ONLY with JSON:
{
  "instructions": "string — exam instructions for students",
  "sections": [
    { "name": "Section A", "question_type": "mcq", "description": "string", "suggested_marks": 20 }
  ],
  "notes": "string"
}`;

  const { content, tokensUsed } = await chatCompletion({
    provider,
    model,
    messages: [
      { role: 'system', content: 'You output strict JSON for exam paper structure only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    maxTokens: settings.max_tokens != null ? Number(settings.max_tokens) : 2000,
  });

  const parsed = parseJsonFromContent(content);
  if (!parsed?.sections || !Array.isArray(parsed.sections)) {
    const err = new Error('Invalid AI paper structure response.');
    err.tokensUsed = tokensUsed;
    err.provider = provider;
    err.model = model;
    throw err;
  }

  return {
    structure: parsed,
    tokensUsed,
    provider,
    model,
    promptSummary: `Paper structure: ${title}`,
  };
}

async function generateAnswerKeyAi({ settings, paperTitle, questions }) {
  const provider = settings?.provider || aiConfig.defaultProvider;
  if (!settings?.is_enabled) throw new Error('AI is disabled for this institution.');
  if (!aiConfig.isProviderConfigured(provider)) throw new Error('AI provider is not configured yet.');

  const model = resolveEffectiveModel(settings);
  const { chatCompletion } = require('./ai/chatProvider');
  const { parseJsonFromContent } = require('../utils/aiQuestionValidator');
  const { validateAnswerKeyJson, validateMarkingSchemeJson } = require('../utils/examPaperHelpers');

  const qPayload = questions.map((q, idx) => ({
    order: idx + 1,
    question_id: q.question_id || q.id,
    question_type: q.question_type,
    marks: q.marks,
    question_text: q.question_text?.slice(0, 500),
    correct_answer: q.correct_answer,
    options: q.options?.map((o) => ({ label: o.label, text: o.option_text, is_correct: o.is_correct })),
  }));

  const prompt = `Generate answer key and marking scheme for exam "${paperTitle}".
Questions: ${JSON.stringify(qPayload).slice(0, 12000)}

Respond ONLY with JSON:
{
  "answer_key": {
    "title": "Answer Key",
    "items": [
      {
        "order": 1,
        "question_id": 1,
        "question_type": "mcq",
        "marks": 2,
        "correct_answer": "A",
        "correct_option": "A: text",
        "marking_guidelines": "string"
      }
    ]
  },
  "marking_scheme": {
    "title": "Marking Scheme",
    "total_marks": 100,
    "sections": [
      {
        "name": "Section name",
        "items": [
          {
            "question_id": 1,
            "marks": 2,
            "scheme": "string",
            "rubric": [{ "level": "Full", "marks_range": "2", "description": "string" }]
          }
        ]
      }
    ]
  }
}
Include detailed rubrics for long/subjective questions.`;

  const { content, tokensUsed } = await chatCompletion({
    provider,
    model,
    messages: [
      { role: 'system', content: 'You output strict JSON for answer keys and marking schemes.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    maxTokens: settings.max_tokens != null ? Number(settings.max_tokens) : 3000,
  });

  const parsed = parseJsonFromContent(content);
  const akVal = validateAnswerKeyJson(parsed?.answer_key);
  const msVal = validateMarkingSchemeJson(parsed?.marking_scheme);
  if (!akVal.ok || !msVal.ok) {
    const err = new Error(akVal.error || msVal.error || 'Invalid AI answer key response.');
    err.tokensUsed = tokensUsed;
    err.provider = provider;
    err.model = model;
    throw err;
  }

  return {
    answerKey: akVal.data,
    markingScheme: msVal.data,
    tokensUsed,
    provider,
    model,
    promptSummary: `Answer key: ${paperTitle}`,
  };
}

function sanitizeSettingsRow(row) {
  if (!row) return null;
  const provider = row.provider || aiConfig.defaultProvider;
  const configured = aiConfig.isProviderConfigured(provider);
  return {
    id: row.id,
    institution_id: row.institution_id,
    provider,
    model: row.model || row.model_name || aiConfig.DEFAULT_MODELS[provider] || '',
    temperature: row.temperature != null ? Number(row.temperature) : 0.7,
    max_tokens: row.max_tokens != null ? Number(row.max_tokens) : 2000,
    is_enabled: Boolean(row.is_enabled),
    enable_question_bank: Boolean(row.enable_question_bank),
    enable_exam_generator: Boolean(row.enable_exam_generator),
    enable_marking_scheme: Boolean(row.enable_marking_scheme),
    status: row.status,
    api_key_configured: configured,
    api_key_hint: configured ? 'Configured on server' : 'Not configured',
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

module.exports = {
  listProvidersMeta,
  testConnection,
  sanitizeSettingsRow,
  resolveEffectiveModel,
  generateQuestions,
  generatePaperStructure,
  generateAnswerKeyAi,
  isProviderConfigured: aiConfig.isProviderConfigured,
  PROVIDERS: aiConfig.PROVIDERS,
};
