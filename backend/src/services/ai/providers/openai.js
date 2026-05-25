const aiConfig = require('../../../config/ai');

async function testConnection(model) {
  const apiKey = aiConfig.getProviderApiKey('openai');
  if (!apiKey) {
    return { success: false, message: 'AI provider is not configured yet.' };
  }

  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return { success: false, message: `OpenAI connection failed (${res.status}).`, detail: err.slice(0, 200) };
  }

  return {
    success: true,
    message: `OpenAI connection successful${model ? ` (model: ${model})` : ''}.`,
    provider: 'openai',
  };
}

module.exports = { testConnection };
