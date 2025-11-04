/**
 * Feed Processing Service
 * Handles scheduled processing of RSS feeds and sending summaries
 */

import * as cron from 'node-cron';
import { FeedConfig, SummaryResult, FeedSummaryBundle } from '../types.js';
import { fetchFeedArticles } from './rss.service.js';
import { summarizeContent } from './summarizer.service.js';
import { sendBundleToLark } from './lark.service.js';
import { updateFeedLastProcessed } from './config.service.js';

export interface ProcessorConfig {
  feeds: FeedConfig[];
  webhookUrl: string;
  defaultSystemPrompt: string;
  articlesPerFeed?: number;
  configPath?: string; // Path to config file for updating lastProcessed
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

  const enabledFeeds = config.feeds.filter((f) => f.enabled);
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

      // Consolidate all summaries from this feed into a single message
      if (summaries.length > 0) {
        try {
          const bundle: FeedSummaryBundle = {
            feedId: feed.id,
            feedName: feed.name,
            articles: summaries,
          };

          await sendBundleToLark(config.webhookUrl, bundle);
          console.log(
            `Sent consolidated message to Lark: ${summaries.length} article(s) from ${feed.name}`
          );
          totalSummaries += summaries.length;
          successCount++;
        } catch (error) {
          console.error(
            `Failed to send consolidated message to Lark: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
          failureCount++;
        }

        // Update lastProcessed timestamp if we processed articles and configPath is provided
        if (config.configPath) {
          try {
            await updateFeedLastProcessed(config.configPath, feed.id);
          } catch (error) {
            console.warn(
              `Failed to update lastProcessed for ${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
      } else {
        successCount++;
      }
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
