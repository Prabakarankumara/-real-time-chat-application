const fs = require('fs');
const path = require('path');

// Read environment variables from Vercel
const envVars = {
  apiKey: process.env.VITE_API_KEY || '',
  baseUrl: process.env.VITE_BASE_URL || 'https://api.openai.com/v1/chat/completions',
  model: process.env.VITE_MODEL || 'gpt-4o-mini'
};

// Read the original config.js
const configPath = path.join(__dirname, 'config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

// Inject environment variables as defaults
const envInjection = `
// Environment variables injected by Vercel build
const ENV_DEFAULTS = {
  apiKey: '${envVars.apiKey}',
  baseUrl: '${envVars.baseUrl}',
  model: '${envVars.model}'
};
`;

// Insert the environment defaults after the DEFAULT_CONFIG
configContent = configContent.replace(
  /(const DEFAULT_CONFIG = \{[^}]+\};)/,
  `$1\n${envInjection}`
);

// Modify getConfig to use ENV_DEFAULTS as base
configContent = configContent.replace(
  /(export function getConfig\(\) \{[\s\S]*?return saved \? \{ \.\.\.DEFAULT_CONFIG, \.\.\.JSON\.parse\(saved\) \} : \{ \.\.\.DEFAULT_CONFIG \};)/,
  `export function getConfig() {
  try {
    const saved = localStorage.getItem('nova-config');
    const baseConfig = { ...DEFAULT_CONFIG, ...ENV_DEFAULTS };
    return saved ? { ...baseConfig, ...JSON.parse(saved) } : { ...baseConfig };
  } catch {
    return { ...DEFAULT_CONFIG, ...ENV_DEFAULTS };
  }`
);

// Write the modified config.js
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('Build complete: Environment variables injected into config.js');
