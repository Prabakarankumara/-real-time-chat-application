const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini'
};

// Get environment variables from window (injected by Vercel)
const getEnvVar = (name) => {
  if (typeof window !== 'undefined' && window.ENV) {
    return window.ENV[name] || '';
  }
  return '';
};

const ENV_DEFAULTS = {
  apiKey: getEnvVar('VITE_API_KEY') || '',
  baseUrl: getEnvVar('VITE_BASE_URL') || 'https://api.openai.com/v1/chat/completions',
  model: getEnvVar('VITE_MODEL') || 'gpt-4o-mini'
};

export function getConfig() {
  try {
    const saved = localStorage.getItem('nova-config');
    const baseConfig = { ...DEFAULT_CONFIG, ...ENV_DEFAULTS };
    return saved ? { ...baseConfig, ...JSON.parse(saved) } : { ...baseConfig };
  } catch {
    return { ...DEFAULT_CONFIG, ...ENV_DEFAULTS };
  }
}

export function saveConfig(config) {
  localStorage.setItem('nova-config', JSON.stringify(config));
}

export function detectProvider(baseUrl = '') {
  const value = (baseUrl || '').toLowerCase();
  if (value.includes('gemini') || value.includes('generativelanguage')) return 'gemini';
  if (value.includes('groq')) return 'groq';
  if (value.includes('openrouter')) return 'openrouter';
  return 'openai';
}

export function buildRequestUrl(baseUrl, config = getConfig()) {
  if (detectProvider(baseUrl) !== 'gemini') return baseUrl;
  const url = new URL(baseUrl);
  if (!url.searchParams.has('key')) {
    url.searchParams.set('key', config.apiKey);
  }
  return url.toString();
}

export function getApiHeaders(config = getConfig()) {
  const provider = detectProvider(config.baseUrl);
  if (provider === 'gemini') {
    return {
      'Content-Type': 'application/json'
    };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`
  };
}
