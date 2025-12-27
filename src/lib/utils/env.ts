// ===========================================
// Environment Variables Validation
// ===========================================

interface EnvConfig {
  OPENROUTER_API_KEY: string;
  GITHUB_TOKEN?: string;
  LLM_MODEL: string;
  LLM_MAX_TOKENS: number;
  NEXT_PUBLIC_APP_URL: string;
}

let _validated = false;
let _config: EnvConfig | null = null;

/**
 * Validates required environment variables and returns typed config.
 * Throws on first call if required vars are missing.
 * Subsequent calls return cached config.
 */
export function validateEnv(): EnvConfig {
  if (_validated && _config) {
    return _config;
  }

  const errors: string[] = [];

  // Required
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    errors.push('OPENROUTER_API_KEY is required');
  }

  // Optional with defaults
  const githubToken = process.env.GITHUB_TOKEN;
  const llmModel = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4';
  const llmMaxTokens = parseInt(process.env.LLM_MAX_TOKENS || '4000', 10);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Validate formats
  if (openRouterKey && !openRouterKey.startsWith('sk-or-')) {
    errors.push('OPENROUTER_API_KEY should start with "sk-or-"');
  }

  if (githubToken && !githubToken.startsWith('ghp_') && !githubToken.startsWith('github_pat_')) {
    errors.push('GITHUB_TOKEN should start with "ghp_" or "github_pat_"');
  }

  if (isNaN(llmMaxTokens) || llmMaxTokens < 100 || llmMaxTokens > 100000) {
    errors.push('LLM_MAX_TOKENS should be between 100 and 100000');
  }

  if (errors.length > 0) {
    const message = `Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`;
    console.error(message);
    throw new Error(message);
  }

  _config = {
    OPENROUTER_API_KEY: openRouterKey!,
    GITHUB_TOKEN: githubToken,
    LLM_MODEL: llmModel,
    LLM_MAX_TOKENS: llmMaxTokens,
    NEXT_PUBLIC_APP_URL: appUrl,
  };

  _validated = true;
  console.log('Environment validated successfully');

  return _config;
}

/**
 * Quick check if env is configured (doesn't throw)
 */
export function isEnvConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Get missing env vars for error messages
 */
export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.OPENROUTER_API_KEY) missing.push('OPENROUTER_API_KEY');
  return missing;
}
