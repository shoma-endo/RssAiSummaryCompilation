/**
 * Feed Processing Service
 * Handles scheduled processing of RSS feeds and sending summaries
 */

import * as cron from 'node-cron';
import { FeedConfig, SummaryResult, LarkBaseConfig } from '../types.js';
import { fetchFeedArticles } from './rss.service.js';
import { summarizeContent } from './summarizer.service.js';
import { sendToLark } from './lark.service.js';
import { updateFeedLastProcessed } from './config.service.js';
import { isVercelEnvironment, updateFeedLastProcessedKV } from './storage.service.js';
import { larkBaseService } from './lark-base.service.js';

export interface ProcessorConfig {
  feeds: FeedConfig[];
  webhookUrl: string;
  defaultSystemPrompt: string;
  articlesPerFeed?: number;
  configPath?: string; // Path to config file for updating lastProcessed
  larkBase?: LarkBaseConfig; // Optional Lark Base integration
}

/**
 * Process a single RSS feed and return summaries
 * @param feed - Feed configuration
 * @param defaultPrompt - Default system prompt for summarization
 * @param maxArticles - Maximum articles to process
 * @param onlyNew - If true, only process articles newer than lastProcessed
 * @returns Array of summary results
 */
export async function processSingleFeed(
  feed: FeedConfig,
  defaultPrompt: string,
  maxArticles: number = 5,
  onlyNew: boolean = false
): Promise<SummaryResult[]> {
  try {
    console.log(`Processing feed: ${feed.name}`);

    // Fetch articles from RSS feed, filtering by lastProcessed if onlyNew is true
    const sinceDate = onlyNew && feed.lastProcessed ? feed.lastProcessed : undefined;
    const articles = await fetchFeedArticles(feed.url, maxArticles, sinceDate);

    if (articles.length === 0) {
      if (onlyNew) {
        console.log(`No new articles found in feed: ${feed.name}`);
      } else {
        console.warn(`No articles found in feed: ${feed.name}`);
      }
      return [];
    }

    console.log(`Found ${articles.length} ${onlyNew ? 'new' : ''} article(s) in feed: ${feed.name}`);

    // Summarize each article
    const systemPrompt = feed.customPrompt || defaultPrompt;
    const summaries: SummaryResult[] = [];

    for (const article of articles) {
      try {
        const content = article.content || article.description || article.title;
        const summary = await summarizeContent(content, systemPrompt);

        summaries.push({
          feedId: feed.id,
          feedName: feed.name,
          title: article.title,
          originalLink: article.link,
          summary,
          publishedAt: article.pubDate || article.isoDate,
          source: feed.name,
        });
      } catch (error) {
        console.error(
          `Failed to summarize article from ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return summaries;
  } catch (error) {
    console.error(
      `Error processing feed ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return [];
  }
}

/**
 * Fetch feeds from Lark Base and merge with configured feeds
 * @param config - Processor configuration
 * @returns Merged feed list
 */
async function getFeedsWithLarkBase(config: ProcessorConfig): Promise<FeedConfig[]> {
  let feeds = [...config.feeds];

  // If Lark Base is configured, fetch feeds from there
  if (config.larkBase) {
    try {
      console.log('Fetching RSS feeds from Lark Base...');
      const result = await larkBaseService.fetchFeedsFromBase(config.larkBase);

      if (result.errors.length > 0) {
        console.warn(`Lark Base fetch warnings: ${result.errors.join(', ')}`);
      }

      if (result.feeds.length > 0) {
        console.log(`Fetched ${result.feeds.length} feeds from Lark Base`);

        // Merge with existing feeds, prioritizing Lark Base feeds
        const larkFeedIds = new Set(result.feeds.map((f) => f.id));
        const nonLarkFeeds = feeds.filter((f) => !larkFeedIds.has(f.id));

        feeds = [...result.feeds, ...nonLarkFeeds];
      } else {
        console.log('No feeds found in Lark Base, using configured feeds only');
      }
    } catch (error) {
      console.error(
        `Failed to fetch feeds from Lark Base: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.log('Falling back to configured feeds only');
    }
  }

  return feeds;
}

/**
 * Process multiple feeds and send summaries to Lark
 * @param config - Processor configuration
 * @param onlyNew - If true, only process articles newer than lastProcessed
 * @returns Summary of processing results
 */
export async function processAllFeeds(
  config: ProcessorConfig,
  onlyNew: boolean = false
): Promise<{
  successCount: number;
  failureCount: number;
  totalSummaries: number;
}> {
  const mode = onlyNew ? 'new articles only' : 'all articles';
  console.log(`Starting feed processing (${mode}) at ${new Date().toISOString()}`);

  // Fetch feeds from Lark Base if configured
  const allFeeds = await getFeedsWithLarkBase(config);
  const enabledFeeds = allFeeds.filter((f) => f.enabled);
  let totalSummaries = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const feed of enabledFeeds) {
    try {
      const summaries = await processSingleFeed(
        feed,
        config.defaultSystemPrompt,
        config.articlesPerFeed || 5,
        onlyNew
      );

      // Send each summary to Lark
      for (const summary of summaries) {
        try {
          await sendToLark(config.webhookUrl, summary);
          console.log(
            `Sent summary to Lark: ${summary.title.substring(0, 50)}...`
          );
          totalSummaries++;
        } catch (error) {
          console.error(
            `Failed to send summary to Lark: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          failureCount++;
        }
      }

      // Update lastProcessed timestamp if we processed articles
      if (summaries.length > 0) {
        try {
          // Check if we're in Vercel environment
          if (isVercelEnvironment()) {
            await updateFeedLastProcessedKV(feed.id, new Date().toISOString());
          } else if (config.configPath) {
            await updateFeedLastProcessed(config.configPath, feed.id);
          }
        } catch (error) {
          console.warn(
            `Failed to update lastProcessed for ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      successCount++;
    } catch (error) {
      console.error(
        `Failed to process feed ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      failureCount++;
    }
  }

  console.log(
    `Feed processing completed: ${successCount} feeds processed, ${totalSummaries} summaries sent`
  );

  return {
    successCount,
    failureCount,
    totalSummaries,
  };
}

/**
 * Schedule feed processing with cron expression
 * @param config - Processor configuration
 * @param cronExpression - Cron schedule (e.g., "0 9 * * *" for 9 AM daily)
 * @param onlyNew - If true, only process articles newer than lastProcessed
 * @returns Cron task object (call .stop() to cancel scheduling)
 */
export function scheduleFeeds(
  config: ProcessorConfig,
  cronExpression: string,
  onlyNew: boolean = false
): cron.ScheduledTask {
  const task = cron.schedule(cronExpression, async () => {
    await processAllFeeds(config, onlyNew);
  });

  const mode = onlyNew ? ' (new articles only)' : '';
  console.log(`Feed processing scheduled: ${cronExpression}${mode}`);
  return task;
}

/**
 * Start real-time monitoring mode with short polling interval
 * @param config - Processor configuration
 * @param intervalMinutes - Polling interval in minutes (default: 5)
 * @returns Cron task object (call .stop() to cancel monitoring)
 */
export function startRealtimeMonitoring(
  config: ProcessorConfig,
  intervalMinutes: number = 5
): cron.ScheduledTask {
  // Convert minutes to cron expression (e.g., "*/5 * * * *" for every 5 minutes)
  const cronExpression = `*/${intervalMinutes} * * * *`;
  
  console.log(`Starting real-time monitoring (checking every ${intervalMinutes} minutes)...`);
  
  // Process immediately on start
  processAllFeeds(config, true).catch((error) => {
    console.error(`Initial real-time processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  });

  // Then schedule periodic checks for new articles only
  return scheduleFeeds(config, cronExpression, true);
}

/**
 * Validate cron expression
 * @param cronExpression - Expression to validate
 * @returns True if expression is valid
 */
export function validateCronExpression(cronExpression: string): boolean {
  try {
    cron.validate(cronExpression);
    return true;
  } catch {
    return false;
  }
}
