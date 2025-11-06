/**
 * Vercel Cron Job Endpoint
 * This endpoint is called by Vercel Cron Jobs to process RSS feeds
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processAllFeeds } from '../src/services/processor.service.js';
import type { ProcessorConfig } from '../src/services/processor.service.js';
import { initializeLLMClient } from '../src/services/summarizer.service.js';
import {
  loadConfigFromKV,
  updateFeedLastProcessedKV,
} from '../src/services/storage.service.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is a legitimate Vercel Cron request
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting Vercel cron job at', new Date().toISOString());

    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    initializeLLMClient({
      apiKey,
      model: process.env.OPENAI_MODEL || 'gpt-5-nano',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '300', 10),
      provider: 'openai',
    });

    // Load configuration from KV storage or environment variables
    const config = await loadConfigFromKV();

    console.log(
      `Loaded configuration: ${config.feeds.length} feeds, ${config.feeds.filter((f) => f.enabled).length} enabled`
    );

    // Create processor configuration
    const processorConfig: ProcessorConfig = {
      feeds: config.feeds,
      webhookUrl: config.webhookUrl,
      defaultSystemPrompt: config.defaultSystemPrompt,
      articlesPerFeed: parseInt(process.env.ARTICLES_PER_FEED || '5', 10),
      // Don't provide configPath in Vercel environment
      // We'll update lastProcessed via KV instead
    };

    // Process feeds (only new articles)
    const result = await processAllFeeds(processorConfig, true);

    // Update lastProcessed timestamps in KV
    const timestamp = new Date().toISOString();
    for (const feed of config.feeds.filter((f) => f.enabled)) {
      try {
        await updateFeedLastProcessedKV(feed.id, timestamp);
      } catch (error) {
        console.warn(
          `Failed to update lastProcessed for ${feed.name}:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    console.log('Cron job completed successfully');

    return res.status(200).json({
      success: true,
      feedsProcessed: result.successCount,
      summariesSent: result.totalSummaries,
      failures: result.failureCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
