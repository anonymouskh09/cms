const aiConfig = require('../../config/ai');

async function openaiChat({ model, messages, temperature, maxTokens }) {
  const apiKey = aiConfig.getProviderApiKey('openai');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || aiConfig.DEFAULT_MODELS.openai,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 2000,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `OpenAI error ${res.status}`);
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens ?? null,
  };
}

async function anthropicChat({ model, messages, temperature, maxTokens }) {
  const apiKey = aiConfig.getProviderApiKey('anthropic');
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const userMsgs = messages.filter((m) => m.role !== 'system');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: model || aiConfig.DEFAULT_MODELS.anthropic,
      max_tokens: maxTokens ?? 2000,
      temperature: temperature ?? 0.7,
      system,
      messages: userMsgs.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Anthropic error ${res.status}`);
  const content = data.content?.map((c) => c.text).join('') || '';
  return {
    content,
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function openrouterChat({ model, messages, temperature, maxTokens }) {
  const apiKey = aiConfig.getProviderApiKey('openrouter');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
      'X-Title': 'Campus CMS',
    },
    body: JSON.stringify({
      model: model || aiConfig.defaultModel || aiConfig.DEFAULT_MODELS.openrouter,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 2000,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `OpenRouter error ${res.status}`);
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens ?? null,
  };
}

async function localChat({ model, messages, temperature, maxTokens }) {
  const baseUrl = (process.env.LOCAL_LLM_URL || '').replace(/\/$/, '');
  if (!baseUrl) throw new Error('AI provider is not configured yet.');
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: process.env.LOCAL_LLM_API_KEY ? `Bearer ${process.env.LOCAL_LLM_API_KEY}` : undefined,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'local-model',
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? 2000,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Local LLM error ${res.status}`);
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens ?? null,
  };
}

async function chatCompletion({ provider, model, messages, temperature, maxTokens }) {
  if (!aiConfig.isProviderConfigured(provider)) {
    throw new Error('AI provider is not configured yet.');
  }
  switch (provider) {
    case 'openai': return openaiChat({ model, messages, temperature, maxTokens });
    case 'anthropic': return anthropicChat({ model, messages, temperature, maxTokens });
    case 'openrouter': return openrouterChat({ model, messages, temperature, maxTokens });
    case 'local': return localChat({ model, messages, temperature, maxTokens });
    default: throw new Error('Invalid AI provider.');
  }
}

module.exports = { chatCompletion };
