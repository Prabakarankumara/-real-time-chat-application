const DEFAULT_CONFIG = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini'
};

export function getConfig() {
  try {
    const saved = localStorage.getItem('nova-config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
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
