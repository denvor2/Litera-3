export interface LLMProvider {
  query(options: {
    systemPrompt: string;
    context: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    text: string;
    tokensUsed: number;
    tokenLimit?: number;
  }>;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  tokenLimit?: number;
  tokensRemaining?: number;
  warnings?: string[];
}
