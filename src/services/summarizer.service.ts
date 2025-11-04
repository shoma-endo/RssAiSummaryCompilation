/**
 * AI Summarization Service
 * Uses OpenAI API to summarize RSS feed content
 */

import { LLMConfig } from '../types.js';

// Store LLM config globally
let llmConfig: LLMConfig | undefined;

/**
 * Initialize OpenAI API client with configuration
 * @param config - LLM configuration with API key
 */
export function initializeLLMClient(config: LLMConfig): void {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }
  // Store configuration for use in summarization
  llmConfig = config;
}

/**
 * Summarize content using OpenAI API
 * @param content - Content to summarize
 * @param systemPrompt - Custom system prompt for summarization
 * @param maxTokens - Maximum tokens for response (default: 300)
 * @returns Summarized text
 */
export async function summarizeContent(
  content: string,
  systemPrompt: string = 'Summarize the following content concisely.',
  maxTokens: number = 300
): Promise<string> {
  if (!llmConfig?.apiKey) {
    throw new Error(
      'OpenAI API not initialized. Call initializeLLMClient first.'
    );
  }

  if (!content || content.trim().length === 0) {
    return 'No content to summarize.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${llmConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: llmConfig.model || 'gpt-4o-mini',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please summarize the following content:\n\n${content.substring(0, 8000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      const errorMessage =
        (errorData.error as Record<string, unknown>)?.message || 'Unknown error';
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const firstChoice = data.choices?.[0];

    if (!firstChoice?.message?.content) {
      throw new Error('No text content in OpenAI API response');
    }

    return firstChoice.message.content;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to summarize content: ${errorMessage}`);
  }
}

/**
 * Batch summarize multiple content pieces
 * @param contentList - Array of content strings to summarize
 * @param systemPrompt - Custom system prompt
 * @param maxTokens - Maximum tokens per response
 * @returns Array of summaries
 */
export async function summarizeContentBatch(
  contentList: string[],
  systemPrompt: string = 'Summarize the following content concisely.',
  maxTokens: number = 300
): Promise<string[]> {
  return Promise.all(
    contentList.map((content) =>
      summarizeContent(content, systemPrompt, maxTokens)
    )
  );
}
