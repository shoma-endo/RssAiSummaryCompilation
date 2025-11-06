/**
 * Storage Service for Vercel KV
 * Handles configuration storage in Vercel KV or environment variables
 */

import { FeedsConfiguration, FeedConfig } from '../types.js';

// Vercel KV will be conditionally imported only in Vercel environment
let kv: any = null;

// Initialize KV client if in Vercel environment
async function getKVClient() {
  if (kv) return kv;

  // Only import @vercel/kv if we're in Vercel environment
  if (process.env.VERCEL || process.env.KV_REST_API_URL) {
    try {
      const kvModule = await import('@vercel/kv');
      kv = kvModule.kv;
      return kv;
    } catch (error) {
      console.warn('Failed to load @vercel/kv, falling back to environment variables');
      return null;
    }
  }

  return null;
}

const CONFIG_KEY = 'rss-feeds-config';

/**
 * Load configuration from Vercel KV
 */
export async function loadConfigFromKV(): Promise<FeedsConfiguration> {
  try {
    const kvClient = await getKVClient();

    if (kvClient) {
      const config = await kvClient.get<FeedsConfiguration>(CONFIG_KEY);
      if (config) {
        return config;
      }
    }

    // Fallback to environment variable or default
    return getConfigFromEnv() || getDefaultConfig();
  } catch (error) {
    console.error('Failed to load config from KV:', error);
    // Fallback to environment variable
    return getConfigFromEnv() || getDefaultConfig();
  }
}

/**
 * Save configuration to Vercel KV
 */
export async function saveConfigToKV(config: FeedsConfiguration): Promise<void> {
  const kvClient = await getKVClient();

  if (!kvClient) {
    throw new Error('KV storage not available. Cannot save configuration in Vercel environment without KV.');
  }

  await kvClient.set(CONFIG_KEY, config);
}

/**
 * Update lastProcessed timestamp for a feed in KV
 */
export async function updateFeedLastProcessedKV(
  feedId: string,
  timestamp: string
): Promise<void> {
  const config = await loadConfigFromKV();
  const feed = config.feeds.find((f) => f.id === feedId);

  if (feed) {
    feed.lastProcessed = timestamp;
    await saveConfigToKV(config);
  }
}

/**
 * Load config from environment variable (fallback)
 */
function getConfigFromEnv(): FeedsConfiguration | null {
  const configJson = process.env.FEEDS_CONFIG_JSON;
  if (configJson) {
    try {
      return JSON.parse(configJson);
    } catch (error) {
      console.error('Failed to parse FEEDS_CONFIG_JSON:', error);
      return null;
    }
  }
  return null;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): FeedsConfiguration {
  return {
    feeds: [],
    webhookUrl: process.env.LARK_WEBHOOK_URL || '',
    defaultSystemPrompt:
      process.env.SUMMARY_SYSTEM_PROMPT ||
      'Summarize the following content concisely and highlight key information.',
    processSchedule: process.env.FEED_PROCESS_SCHEDULE || '0 9 * * *',
  };
}

/**
 * Check if running in Vercel environment
 */
export function isVercelEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}
