import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMResponse } from './base.js';

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;
  private contextLimit: number = 200000; // Claude 3.5 Sonnet context window

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async query(options: {
    systemPrompt: string;
    context: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<LLMResponse> {
    const {
      systemPrompt,
      context,
      userMessage,
      temperature = 0.7,
      maxTokens = 2000,
    } = options;

    // Combine context and user message
    const fullPrompt = `${context}\n\n---\n\n${userMessage}`;

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(
      (systemPrompt.length + fullPrompt.length) / 4
    );

    let warnings: string[] = [];
    let truncatedContext = context;

    // If too large, truncate context
    if (estimatedTokens > this.contextLimit - 2000) {
      warnings.push('Контекст обрезан: используются последние сцены');
      // Keep last N% of context
      const keepRatio = 0.7;
      const keepLength = Math.floor(context.length * keepRatio);
      truncatedContext = context.substring(context.length - keepLength);
    }

    const fullPromptFinal = `${truncatedContext}\n\n---\n\n${userMessage}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: fullPromptFinal,
          },
        ],
        temperature,
      });

      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text in response');
      }

      // Use actual usage from response
      const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
      const tokensRemaining = this.contextLimit - tokensUsed;

      if (tokensRemaining < 5000) {
        warnings.push('Приближается лимит контекста (осталось < 5000 токенов)');
      }

      return {
        text: textContent.text,
        tokensUsed,
        tokenLimit: this.contextLimit,
        tokensRemaining: Math.max(0, tokensRemaining),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      if (error.status === 401) {
        throw new Error('Invalid API key');
      }
      if (error.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (error.status === 503) {
        throw new Error('Service unavailable');
      }
      throw error;
    }
  }
}
