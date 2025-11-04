/**
 * Tests for Configuration Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  loadFeedsConfig,
  saveFeedsConfig,
  addFeed,
  removeFeed,
  getEnabledFeeds,
} from '../src/services/config.service.js';
import type { FeedsConfiguration, FeedConfig } from '../src/types.js';

const TEST_CONFIG_DIR = '.test-config';
const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'test-feeds.json');

describe('Config Service', () => {
  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(TEST_CONFIG_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rm(TEST_CONFIG_DIR, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadFeedsConfig', () => {
    it('should return default config if file does not exist', async () => {
      const config = await loadFeedsConfig(TEST_CONFIG_FILE);
      expect(config).toBeDefined();
      expect(Array.isArray(config.feeds)).toBe(true);
      expect(config.feeds.length).toBe(0);
    });

    it('should load existing configuration file', async () => {
      const testConfig: FeedsConfiguration = {
        feeds: [
          {
            id: 'test-1',
            url: 'https://example.com/rss.xml',
            name: 'Test Feed',
            enabled: true,
          },
        ],
        webhookUrl: 'https://lark.com/webhook',
        defaultSystemPrompt: 'Summarize',
        processSchedule: '0 9 * * *',
      };

      await saveFeedsConfig(TEST_CONFIG_FILE, testConfig);
      const loaded = await loadFeedsConfig(TEST_CONFIG_FILE);

      expect(loaded.feeds).toHaveLength(1);
      expect(loaded.feeds[0].name).toBe('Test Feed');
    });
  });

  describe('saveFeedsConfig', () => {
    it('should create file if it does not exist', async () => {
      const config: FeedsConfiguration = {
        feeds: [],
        webhookUrl: 'https://lark.com/webhook',
        defaultSystemPrompt: 'Summarize',
        processSchedule: '0 9 * * *',
      };

      await saveFeedsConfig(TEST_CONFIG_FILE, config);
      const fileExists = await fs
        .stat(TEST_CONFIG_FILE)
        .then(() => true)
        .catch(() => false);

      expect(fileExists).toBe(true);
    });

    it('should overwrite existing configuration', async () => {
      const config1: FeedsConfiguration = {
        feeds: [
          {
            id: 'feed-1',
            url: 'https://example.com/1.xml',
            name: 'Feed 1',
            enabled: true,
          },
        ],
        webhookUrl: 'https://lark.com/webhook',
        defaultSystemPrompt: 'Summarize',
        processSchedule: '0 9 * * *',
      };

      await saveFeedsConfig(TEST_CONFIG_FILE, config1);

      const config2: FeedsConfiguration = {
        feeds: [
          {
            id: 'feed-2',
            url: 'https://example.com/2.xml',
            name: 'Feed 2',
            enabled: false,
          },
        ],
        webhookUrl: 'https://lark.com/webhook',
        defaultSystemPrompt: 'Summarize',
        processSchedule: '0 9 * * *',
      };

      await saveFeedsConfig(TEST_CONFIG_FILE, config2);
      const loaded = await loadFeedsConfig(TEST_CONFIG_FILE);

      expect(loaded.feeds).toHaveLength(1);
      expect(loaded.feeds[0].id).toBe('feed-2');
    });
  });

  describe('addFeed', () => {
    it('should add new feed to configuration', async () => {
      const feed: FeedConfig = {
        id: 'new-feed',
        url: 'https://example.com/new.xml',
        name: 'New Feed',
        enabled: true,
      };

      await addFeed(TEST_CONFIG_FILE, feed);
      const config = await loadFeedsConfig(TEST_CONFIG_FILE);

      expect(config.feeds).toHaveLength(1);
      expect(config.feeds[0].id).toBe('new-feed');
    });

    it('should update existing feed with same URL', async () => {
      const feed1: FeedConfig = {
        id: 'feed-1',
        url: 'https://example.com/feed.xml',
        name: 'Feed 1',
        enabled: true,
      };

      await addFeed(TEST_CONFIG_FILE, feed1);

      const feed2: FeedConfig = {
        id: 'feed-1-updated',
        url: 'https://example.com/feed.xml',
        name: 'Feed 1 Updated',
        enabled: false,
      };

      await addFeed(TEST_CONFIG_FILE, feed2);
      const config = await loadFeedsConfig(TEST_CONFIG_FILE);

      expect(config.feeds).toHaveLength(1);
      expect(config.feeds[0].name).toBe('Feed 1 Updated');
    });
  });

  describe('removeFeed', () => {
    it('should remove feed by ID', async () => {
      const feed: FeedConfig = {
        id: 'to-remove',
        url: 'https://example.com/remove.xml',
        name: 'Feed to Remove',
        enabled: true,
      };

      await addFeed(TEST_CONFIG_FILE, feed);
      await removeFeed(TEST_CONFIG_FILE, 'to-remove');
      const config = await loadFeedsConfig(TEST_CONFIG_FILE);

      expect(config.feeds).toHaveLength(0);
    });

    it('should not affect other feeds when removing', async () => {
      const feed1: FeedConfig = {
        id: 'feed-1',
        url: 'https://example.com/1.xml',
        name: 'Feed 1',
        enabled: true,
      };

      const feed2: FeedConfig = {
        id: 'feed-2',
        url: 'https://example.com/2.xml',
        name: 'Feed 2',
        enabled: true,
      };

      await addFeed(TEST_CONFIG_FILE, feed1);
      await addFeed(TEST_CONFIG_FILE, feed2);
      await removeFeed(TEST_CONFIG_FILE, 'feed-1');

      const config = await loadFeedsConfig(TEST_CONFIG_FILE);
      expect(config.feeds).toHaveLength(1);
      expect(config.feeds[0].id).toBe('feed-2');
    });
  });

  describe('getEnabledFeeds', () => {
    it('should return only enabled feeds', async () => {
      const feed1: FeedConfig = {
        id: 'feed-1',
        url: 'https://example.com/1.xml',
        name: 'Feed 1',
        enabled: true,
      };

      const feed2: FeedConfig = {
        id: 'feed-2',
        url: 'https://example.com/2.xml',
        name: 'Feed 2',
        enabled: false,
      };

      const feed3: FeedConfig = {
        id: 'feed-3',
        url: 'https://example.com/3.xml',
        name: 'Feed 3',
        enabled: true,
      };

      await addFeed(TEST_CONFIG_FILE, feed1);
      await addFeed(TEST_CONFIG_FILE, feed2);
      await addFeed(TEST_CONFIG_FILE, feed3);

      const enabled = await getEnabledFeeds(TEST_CONFIG_FILE);
      expect(enabled).toHaveLength(2);
      expect(enabled.every((f) => f.enabled)).toBe(true);
    });

    it('should return empty array when no feeds enabled', async () => {
      const feed: FeedConfig = {
        id: 'disabled-feed',
        url: 'https://example.com/feed.xml',
        name: 'Disabled Feed',
        enabled: false,
      };

      await addFeed(TEST_CONFIG_FILE, feed);
      const enabled = await getEnabledFeeds(TEST_CONFIG_FILE);

      expect(enabled).toHaveLength(0);
    });
  });
});
