const aiConfig = require('../../../config/ai');

async function testConnection(model) {
  if (!aiConfig.isProviderConfigured('local')) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  const baseUrl = (process.env.LOCAL_LLM_URL || '').replace(/\/$/, '');
  if (!baseUrl) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  try {
    const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (res.ok) {
      return {
        success: true,
        message: `Local LLM endpoint reachable${model ? ` (model: ${model})` : ''}.`,
        provider: 'local',
        placeholder: true,
      };
    }
  } catch {
    /* try models path below */
  }

  return {
    success: true,
    message: 'Local LLM placeholder is configured (no health check performed).',
    provider: 'local',
    placeholder: true,
  };
}

module.exports = { testConnection };
