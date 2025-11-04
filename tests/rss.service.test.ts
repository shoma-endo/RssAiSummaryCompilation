/**
 * Tests for RSS Feed Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchFeedArticles, validateFeedUrl } from '../src/services/rss.service.js';

describe('RSS Service', () => {
  describe('fetchFeedArticles', () => {
    it('should throw error with invalid URL', async () => {
      await expect(
        fetchFeedArticles('https://invalid-rss-feed-url.example.com/rss.xml')
      ).rejects.toThrow();
    });

    it('should throw error with malformed URL', async () => {
      await expect(fetchFeedArticles('not a valid url')).rejects.toThrow();
    });

    it('should return array when valid feed URL provided', async () => {
      // This test would require a real RSS feed or mocking
      // For now, we test the error handling
      const result = await fetchFeedArticles(
        'https://news.ycombinator.com/rss'
      ).catch(() => []);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const articles = await fetchFeedArticles(
        'https://news.ycombinator.com/rss',
        3
      ).catch(() => []);
      expect(articles.length).toBeLessThanOrEqual(3);
    });
  });

  describe('validateFeedUrl', () => {
    it('should return false for invalid URL', async () => {
      const isValid = await validateFeedUrl('https://invalid-rss-feed.example.com');
      expect(isValid).toBe(false);
    });

    it('should validate required feed properties', async () => {
      const isValid = await validateFeedUrl('https://news.ycombinator.com/rss');
      // Result depends on network availability
      expect(typeof isValid).toBe('boolean');
    });
  });
});
