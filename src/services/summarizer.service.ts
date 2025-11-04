/**
 * AI Summarization Service
 * Uses Claude API to summarize RSS feed content
 */

import { ClaudeConfig } from '../types.js';

// Store Claude config globally
let claudeConfig: ClaudeConfig | undefined;

/**
 * Initialize Claude API client with configuration
 * @param config - Claude configuration with API key
 */
export function initializeClaudeClient(config: ClaudeConfig): void {
  if (!config.apiKey) {
    throw new Error('Claude API key is required');
  }
  // Store configuration for use in summarization
  claudeConfig = config;
}

/**
 * Summarize content using Claude API
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
  if (!claudeConfig?.apiKey) {
    throw new Error(
      'Claude API not initialized. Call initializeClaudeClient first.'
    );
  }

  if (!content || content.trim().length === 0) {
    return 'No content to summarize.';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: claudeConfig.model || 'claude-3-5-sonnet-20241022',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
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
      throw new Error(`Claude API error: ${errorMessage}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const textContent = data.content.find((c) => c.type === 'text');

    if (!textContent) {
      throw new Error('No text content in Claude API response');
    }

    return textContent.text;
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
