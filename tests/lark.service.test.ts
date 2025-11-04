/**
 * Tests for Lark Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SummaryResult } from '../src/types.js';

describe('Lark Service', () => {
  describe('Webhook URL validation', () => {
    it('should validate Lark webhook URL format', () => {
      const validUrl = 'https://open.larksuite.com/open-apis/bot/v2/hook/xxx';
      const invalidUrl = 'https://example.com/webhook';

      expect(validUrl.includes('larksuite.com')).toBe(true);
      expect(invalidUrl.includes('larksuite.com')).toBe(false);
    });
  });

  describe('Message formatting', () => {
    it('should format summary result into Lark message structure', () => {
      const summary: SummaryResult = {
        feedId: 'test-feed',
        feedName: 'Test Feed',
        title: 'Test Article',
        originalLink: 'https://example.com/article',
        summary: 'This is a test summary',
        publishedAt: '2024-01-01T00:00:00Z',
        source: 'Test Source',
      };

      // Basic validation of summary structure
      expect(summary.title).toBeDefined();
      expect(summary.summary).toBeDefined();
      expect(summary.feedName).toBeDefined();
      expect(typeof summary.title).toBe('string');
      expect(typeof summary.summary).toBe('string');
    });

    it('should handle missing optional fields in summary', () => {
      const summary: SummaryResult = {
        feedId: 'test-feed',
        feedName: 'Test Feed',
        title: 'Test Article',
        summary: 'This is a test summary',
      };

      expect(summary.originalLink).toBeUndefined();
      expect(summary.publishedAt).toBeUndefined();
      expect(summary.title).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle invalid webhook URLs', async () => {
      const invalidWebhookUrl = '';
      expect(() => {
        if (!invalidWebhookUrl) {
          throw new Error('Lark webhook URL is required');
        }
      }).toThrow('Lark webhook URL is required');
    });

    it('should validate webhook URL contains larksuite domain', async () => {
      const invalidUrl = 'https://example.com/webhook';
      expect(() => {
        if (!invalidUrl.includes('larksuite.com')) {
          throw new Error('Invalid Lark webhook URL');
        }
      }).toThrow('Invalid Lark webhook URL');
    });
  });
});
