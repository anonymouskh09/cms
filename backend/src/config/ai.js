const PROVIDERS = ['openai', 'anthropic', 'openrouter', 'local'];

const PROVIDER_LABELS = {
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  openrouter: 'OpenRouter',
  local: 'Local / Private LLM',
};

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  openrouter: 'openai/gpt-4o-mini',
  local: 'local-model',
};

function getProviderApiKey(provider) {
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY || '';
    case 'local':
      return process.env.LOCAL_LLM_API_KEY || process.env.LOCAL_LLM_URL || '';
    default:
      return '';
  }
}

function isProviderConfigured(provider) {
  if (!PROVIDERS.includes(provider)) return false;
  if (provider === 'local') {
    return Boolean(process.env.LOCAL_LLM_URL || process.env.LOCAL_LLM_API_KEY);
  }
  return Boolean(getProviderApiKey(provider)?.trim());
}

module.exports = {
  PROVIDERS,
  PROVIDER_LABELS,
  DEFAULT_MODELS,
  defaultProvider: process.env.AI_PROVIDER || 'openrouter',
  defaultModel: process.env.AI_MODEL || '',
  getProviderApiKey,
  isProviderConfigured,
};
