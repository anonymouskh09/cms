const pool = require('../config/db');
const aiConfig = require('../config/ai');
const aiService = require('../services/aiService');
const { logAudit } = require('../utils/auditLog');

const NOT_CONFIGURED_MSG = 'AI provider is not configured yet.';

function resolveInstitutionId(req) {
  const fromQuery = req.query.institution_id ? parseInt(req.query.institution_id, 10) : null;
  const fromBody = req.body?.institution_id ? parseInt(req.body.institution_id, 10) : null;

  if (req.user.role === 'owner') {
    const id = fromBody || fromQuery || req.institutionFilter;
    if (!id) {
      return { error: 'institution_id is required for owner (use header filter or pass institution_id).' };
    }
    return { id };
  }

  if (!req.user.institution_id) {
    return { error: 'User is not linked to an institution.' };
  }
  return { id: req.user.institution_id };
}

async function assertInstitutionAccess(req, institutionId) {
  if (req.user.role === 'owner') return true;
  return req.user.institution_id === institutionId;
}

async function getSettingsRow(institutionId) {
  const [rows] = await pool.query('SELECT * FROM ai_settings WHERE institution_id = ? LIMIT 1', [institutionId]);
  return rows[0] || null;
}

async function logGeneration({ institutionId, userId, provider, model, feature, status, errorMessage, tokensUsed, promptSummary }) {
  try {
    await pool.query(
      `INSERT INTO ai_generation_logs (institution_id, user_id, provider, model, feature, prompt_summary, status, error_message, tokens_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [institutionId, userId, provider, model, feature, promptSummary || null, status, errorMessage || null, tokensUsed ?? null]
    );
  } catch (err) {
    console.error('ai_generation_logs insert failed:', err.message);
  }
}

function buildPayload(body) {
  const provider = body.provider || aiConfig.defaultProvider;
  const model = body.model || body.model_name || aiConfig.DEFAULT_MODELS[provider] || aiConfig.defaultModel;
  const isEnabled = body.is_enabled != null ? Boolean(body.is_enabled) : body.status === 'active';
  return {
    provider,
    model,
    model_name: model,
    max_tokens: parseInt(body.max_tokens, 10) || 2000,
    temperature: body.temperature != null ? Number(body.temperature) : 0.7,
    is_enabled: isEnabled ? 1 : 0,
    status: isEnabled ? 'active' : 'inactive',
    enable_question_bank: body.enable_question_bank ? 1 : 0,
    enable_exam_generator: body.enable_exam_generator ? 1 : 0,
    enable_marking_scheme: body.enable_marking_scheme ? 1 : 0,
    api_key_hint: aiService.isProviderConfigured(provider) ? 'Configured on server' : 'Not configured',
  };
}

async function getSettings(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    let row = await getSettingsRow(institutionId);
    if (!row) {
      const payload = buildPayload({
        provider: aiConfig.defaultProvider,
        model: aiConfig.defaultModel,
        is_enabled: false,
      });
      const [result] = await pool.query(
        `INSERT INTO ai_settings (institution_id, provider, model, model_name, max_tokens, temperature, is_enabled, status,
          enable_question_bank, enable_exam_generator, enable_marking_scheme, api_key_hint, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`,
        [
          institutionId, payload.provider, payload.model, payload.model_name, payload.max_tokens, payload.temperature,
          payload.is_enabled, payload.status, payload.api_key_hint, req.user.user_id, req.user.user_id,
        ]
      );
      const [rows] = await pool.query('SELECT * FROM ai_settings WHERE id = ?', [result.insertId]);
      row = rows[0];
    }

    const settings = aiService.sanitizeSettingsRow(row);
    const providerConfigured = aiService.isProviderConfigured(settings.provider);

    res.json({
      success: true,
      data: {
        settings,
        providers: aiService.listProvidersMeta(),
        env_default_provider: aiConfig.defaultProvider,
        env_default_model: aiConfig.defaultModel || null,
      },
      message: providerConfigured && settings.is_enabled
        ? 'AI settings loaded.'
        : NOT_CONFIGURED_MSG,
      configured: providerConfigured && settings.is_enabled,
    });
  } catch (err) {
    next(err);
  }
}

async function createSettings(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getSettingsRow(institutionId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'AI settings already exist for this institution. Use PUT to update.',
        data: { id: existing.id },
      });
    }

    const payload = buildPayload(req.body);
    const [result] = await pool.query(
      `INSERT INTO ai_settings (institution_id, provider, model, model_name, max_tokens, temperature, is_enabled, status,
        enable_question_bank, enable_exam_generator, enable_marking_scheme, api_key_hint, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        institutionId, payload.provider, payload.model, payload.model_name, payload.max_tokens, payload.temperature,
        payload.is_enabled, payload.status, payload.enable_question_bank, payload.enable_exam_generator,
        payload.enable_marking_scheme, payload.api_key_hint, req.user.user_id, req.user.user_id,
      ]
    );

    await logAudit({
      institutionId,
      userId: req.user.user_id,
      action: 'create',
      module: 'ai_settings',
      recordId: result.insertId,
      req,
    });

    const [rows] = await pool.query('SELECT * FROM ai_settings WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      data: aiService.sanitizeSettingsRow(rows[0]),
      message: 'AI settings created.',
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettingsById(req, res, next) {
  try {
    const settingsId = parseInt(req.params.id, 10);
    const [rows] = await pool.query('SELECT * FROM ai_settings WHERE id = ?', [settingsId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'AI settings not found.' });

    const row = rows[0];
    if (!(await assertInstitutionAccess(req, row.institution_id))) {
      return res.status(403).json({ success: false, message: 'Access denied for this institution.' });
    }

    const payload = buildPayload({ ...row, ...req.body });
    await pool.query(
      `UPDATE ai_settings SET provider = ?, model = ?, model_name = ?, max_tokens = ?, temperature = ?,
        is_enabled = ?, status = ?, enable_question_bank = ?, enable_exam_generator = ?, enable_marking_scheme = ?,
        api_key_hint = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        payload.provider, payload.model, payload.model_name, payload.max_tokens, payload.temperature,
        payload.is_enabled, payload.status, payload.enable_question_bank, payload.enable_exam_generator,
        payload.enable_marking_scheme, payload.api_key_hint, req.user.user_id, settingsId,
      ]
    );

    await logAudit({
      institutionId: row.institution_id,
      userId: req.user.user_id,
      action: 'update',
      module: 'ai_settings',
      recordId: settingsId,
      req,
    });

    const [updated] = await pool.query('SELECT * FROM ai_settings WHERE id = ?', [settingsId]);
    res.json({ success: true, data: aiService.sanitizeSettingsRow(updated[0]), message: 'AI settings updated.' });
  } catch (err) {
    next(err);
  }
}

async function upsertSettings(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const existing = await getSettingsRow(institutionId);
    if (existing) {
      req.params.id = String(existing.id);
      return updateSettingsById(req, res, next);
    }
    return createSettings(req, res, next);
  } catch (err) {
    next(err);
  }
}

async function testConnection(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const settings = await getSettingsRow(institutionId);
    const provider = req.body.provider || settings?.provider || aiConfig.defaultProvider;
    const model = req.body.model || aiService.resolveEffectiveModel(settings);

    const result = await aiService.testConnection(provider, model);

    await logGeneration({
      institutionId,
      userId: req.user.user_id,
      provider,
      model,
      feature: 'test_connection',
      status: result.success ? 'success' : 'failed',
      errorMessage: result.success ? null : result.message,
      promptSummary: 'Connection test',
    });

    res.json({
      success: result.success,
      data: {
        provider,
        model,
        configured: aiService.isProviderConfigured(provider),
      },
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
}

async function getLogs(req, res, next) {
  try {
    const { id: institutionId, error } = resolveInstitutionId(req);
    if (error) return res.status(400).json({ success: false, message: error });

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const [logs] = await pool.query(
      `SELECT l.id, l.institution_id, l.user_id, u.name AS user_name, l.provider, l.model, l.feature,
              l.prompt_summary, l.status, l.error_message, l.tokens_used, l.created_at
       FROM ai_generation_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.institution_id = ?
       ORDER BY l.created_at DESC
       LIMIT ?`,
      [institutionId, limit]
    );

    res.json({
      success: true,
      data: logs,
      message: logs.length ? 'AI usage logs loaded.' : 'No AI usage logs yet.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  createSettings,
  updateSettingsById,
  upsertSettings,
  testConnection,
  getLogs,
};
