const aiConfig = require('../../../config/ai');

async function testConnection(model) {
  const apiKey = aiConfig.getProviderApiKey('openrouter');
  if (!apiKey) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'Campus CMS',
    },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { success: false, message: `OpenRouter connection failed (${res.status}).`, detail: err.slice(0, 200) };
  }

  return {
    success: true,
    message: `OpenRouter connection successful${model ? ` (model: ${model})` : ''}.`,
    provider: 'openrouter',
  };
}

module.exports = { testConnection };
