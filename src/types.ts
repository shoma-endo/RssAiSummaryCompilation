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
  larkBase?: LarkBaseConfig; // Optional Lark Base integration for RSS URL management
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

/**
 * Lark Base configuration for RSS URL management
 *
 * Field Validation Requirements:
 * - appId: Required, non-empty string, Lark App ID format
 * - appSecret: Required, non-empty string, should be kept secure
 * - baseUrl: Required, valid Lark Base URL format
 *   Format: https://[tenant].larksuite.com/base/[baseId]
 *   Or: https://[tenant].feishu.cn/base/[baseId]
 * - tableId: Required, non-empty string, the table ID within the base
 * - viewId: Optional, specific view ID to filter data
 * - urlFieldName: Required, the field name containing RSS URLs (default: 'URL')
 * - nameFieldName: Optional, field name for feed names (default: 'Name')
 * - enabledFieldName: Optional, field name for enabled status (default: 'Enabled')
 */
export interface LarkBaseConfig {
  appId: string;
  appSecret: string;
  baseUrl: string;
  tableId: string;
  viewId?: string;
  urlFieldName?: string;
  nameFieldName?: string;
  enabledFieldName?: string;
}

/**
 * Record from Lark Base
 */
export interface LarkBaseRecord {
  record_id: string;
  fields: Record<string, any>;
  created_time: number;
  last_modified_time: number;
}

/**
 * Lark Base API response for listing records
 */
export interface LarkBaseListRecordsResponse {
  code: number;
  msg: string;
  data?: {
    has_more: boolean;
    page_token?: string;
    total: number;
    items: LarkBaseRecord[];
  };
}

/**
 * Lark App access token response
 */
export interface LarkAppAccessTokenResponse {
  code: number;
  msg: string;
  app_access_token?: string;
  expire: number;
}
