/**
 * Core types and interfaces for RSS Feed Summary system
 */

/**
 * Configuration for an RSS feed
 */
export interface FeedConfig {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  customPrompt?: string;
  lastProcessed?: string;
}

/**
 * Stored configuration for all feeds
 */
export interface FeedsConfiguration {
  feeds: FeedConfig[];
  webhookUrl: string;
  defaultSystemPrompt: string;
  processSchedule: string;
  realtimeMonitoring?: boolean; // Enable real-time monitoring mode (short polling interval)
  realtimeIntervalMinutes?: number; // Polling interval in minutes for real-time mode (default: 5)
}

/**
 * Article from an RSS feed
 */
export interface FeedArticle {
  title: string;
  link?: string;
  pubDate?: string;
  content?: string;
  description?: string;
  isoDate?: string;
  creator?: string;
}

/**
 * Summarized article ready for posting
 */
export interface SummaryResult {
  feedId: string;
  feedName: string;
  title: string;
  originalLink?: string;
  summary: string;
  publishedAt?: string;
  source?: string;
}

/**
 * Bundle of summarized articles from a single feed
 * Used to consolidate multiple articles into a single Lark message
 */
export interface FeedSummaryBundle {
  feedId: string;
  feedName: string;
  articles: SummaryResult[];
}

/**
 * Response from Lark webhook API
 */
export interface LarkWebhookResponse {
  code: number;
  msg: string;
  data?: Record<string, unknown>;
}

/**
 * Configuration for LLM API (supports both Claude and OpenAI)
 */
export interface LLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  provider?: 'openai' | 'claude';
}

/**
 * Configuration for Claude API (deprecated, use LLMConfig instead)
 */
export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}
