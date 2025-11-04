/**
 * Feed Processing Service
 * Handles scheduled processing of RSS feeds and sending summaries
 */

import * as cron from 'node-cron';
import { FeedConfig, SummaryResult } from '../types.js';
import { fetchFeedArticles } from './rss.service.js';
import { summarizeContent } from './summarizer.service.js';
import { sendToLark } from './lark.service.js';

export interface ProcessorConfig {
  feeds: FeedConfig[];
  webhookUrl: string;
  defaultSystemPrompt: string;
  articlesPerFeed?: number;
}

/**
 * Process a single RSS feed and return summaries
 * @param feed - Feed configuration
 * @param defaultPrompt - Default system prompt for summarization
 * @param maxArticles - Maximum articles to process
 * @returns Array of summary results
 */
export async function processSingleFeed(
  feed: FeedConfig,
  defaultPrompt: string,
  maxArticles: number = 5
): Promise<SummaryResult[]> {
  try {
    console.log(`Processing feed: ${feed.name}`);

    // Fetch articles from RSS feed
    const articles = await fetchFeedArticles(feed.url, maxArticles);

    if (articles.length === 0) {
      console.warn(`No articles found in feed: ${feed.name}`);
      return [];
    }

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
 * @returns Summary of processing results
 */
export async function processAllFeeds(
  config: ProcessorConfig
): Promise<{
  successCount: number;
  failureCount: number;
  totalSummaries: number;
}> {
  console.log(`Starting feed processing at ${new Date().toISOString()}`);

  const enabledFeeds = config.feeds.filter((f) => f.enabled);
  let totalSummaries = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const feed of enabledFeeds) {
    try {
      const summaries = await processSingleFeed(
        feed,
        config.defaultSystemPrompt,
        config.articlesPerFeed || 5
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
 * @returns Cron task object (call .stop() to cancel scheduling)
 */
export function scheduleFeeds(
  config: ProcessorConfig,
  cronExpression: string
): cron.ScheduledTask {
  const task = cron.schedule(cronExpression, async () => {
    await processAllFeeds(config);
  });

  console.log(`Feed processing scheduled: ${cronExpression}`);
  return task;
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
