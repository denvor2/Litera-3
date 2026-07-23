import { LLMProvider } from './base.js';
import { ClaudeProvider } from './claude.js';

export type ProviderType = 'claude' | 'openai' | 'yandex' | 'ollama';

export function createProvider(
  providerType: ProviderType,
  apiKey: string,
  model?: string,
  endpoint?: string
): LLMProvider {
  switch (providerType) {
    case 'claude':
      return new ClaudeProvider(apiKey, model);
    // TODO: Add other providers (OpenAI, Yandex, Ollama)
    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }
}

export function getProviderFromEnv(): LLMProvider {
  const provider = process.env.AI_PROVIDER || 'claude';
  const apiKey = process.env.CLAUDE_API_KEY || process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!apiKey && provider !== 'ollama') {
    throw new Error(`Missing API key for provider: ${provider}`);
  }

  return createProvider(provider as ProviderType, apiKey || '', model);
}
