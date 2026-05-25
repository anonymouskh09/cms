const aiConfig = require('../../../config/ai');

async function testConnection(model) {
  const apiKey = aiConfig.getProviderApiKey('anthropic');
  if (!apiKey) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || aiConfig.DEFAULT_MODELS.anthropic,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Reply with OK only.' }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { success: false, message: `Anthropic connection failed (${res.status}).`, detail: err.slice(0, 200) };
  }

  return {
    success: true,
    message: `Anthropic connection successful${model ? ` (model: ${model})` : ''}.`,
    provider: 'anthropic',
  };
}

module.exports = { testConnection };
