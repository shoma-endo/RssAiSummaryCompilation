/**
 * Configuration Management Service
 * Handles loading and saving RSS feed configurations
 * Supports both local file system and Vercel KV storage
 */

import fs from 'fs/promises';
import path from 'path';
import { FeedsConfiguration, FeedConfig } from '../types.js';
import {
  loadConfigFromKV,
  saveConfigToKV,
  updateFeedLastProcessedKV,
  isVercelEnvironment,
} from './storage.service.js';

/**
 * Load feeds configuration from file or KV storage
 * @param configPath - Path to configuration file (ignored in Vercel environment)
 * @returns Loaded configuration or default if file doesn't exist
 */
export async function loadFeedsConfig(
  configPath: string
): Promise<FeedsConfiguration> {
  // Use KV storage in Vercel environment
  if (isVercelEnvironment()) {
    return loadConfigFromKV();
  }

  // Use file system in local environment
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as FeedsConfiguration;
    return config;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      // File doesn't exist, return default config
      return getDefaultConfig();
    }
    throw new Error(
      `Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Save feeds configuration to file or KV storage
 * @param configPath - Path to configuration file (ignored in Vercel environment)
 * @param config - Configuration to save
 */
export async function saveFeedsConfig(
  configPath: string,
  config: FeedsConfiguration
): Promise<void> {
  // Use KV storage in Vercel environment
  if (isVercelEnvironment()) {
    return saveConfigToKV(config);
  }

  // Use file system in local environment
  try {
    // Ensure directory exists
    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });

    // Write configuration file
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    throw new Error(
      `Failed to save configuration to ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Add a new feed to configuration
 * @param configPath - Path to configuration file
 * @param feed - Feed configuration to add
 */
export async function addFeed(
  configPath: string,
  feed: FeedConfig
): Promise<void> {
  const config = await loadFeedsConfig(configPath);
  const existingIndex = config.feeds.findIndex((f) => f.url === feed.url);

  if (existingIndex >= 0) {
    config.feeds[existingIndex] = feed;
  } else {
    config.feeds.push(feed);
  }

  await saveFeedsConfig(configPath, config);
}

/**
 * Remove a feed from configuration
 * @param configPath - Path to configuration file
 * @param feedId - ID of feed to remove
 */
export async function removeFeed(configPath: string, feedId: string): Promise<void> {
  const config = await loadFeedsConfig(configPath);
  config.feeds = config.feeds.filter((f) => f.id !== feedId);
  await saveFeedsConfig(configPath, config);
}

/**
 * Get all enabled feeds
 * @param configPath - Path to configuration file
 * @returns Array of enabled feed configurations
 */
export async function getEnabledFeeds(
  configPath: string
): Promise<FeedConfig[]> {
  const config = await loadFeedsConfig(configPath);
  return config.feeds.filter((f) => f.enabled);
}

/**
 * Update feed's last processed timestamp
 * @param configPath - Path to configuration file (ignored in Vercel environment)
 * @param feedId - ID of feed to update
 */
export async function updateFeedLastProcessed(
  configPath: string,
  feedId: string
): Promise<void> {
  // Use KV storage in Vercel environment
  if (isVercelEnvironment()) {
    return updateFeedLastProcessedKV(feedId, new Date().toISOString());
  }

  // Use file system in local environment
  const config = await loadFeedsConfig(configPath);
  const feed = config.feeds.find((f) => f.id === feedId);

  if (feed) {
    feed.lastProcessed = new Date().toISOString();
    await saveFeedsConfig(configPath, config);
  }
}

/**
 * Get default configuration
 * @returns Default feeds configuration
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
