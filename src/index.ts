/**
 * RssAiSummaryCompilation - Entry Point
 *
 * Autonomous RSS feed aggregator with AI summarization
 * Fetches RSS feeds, summarizes content with Claude API, and posts to Lark
 */

import 'dotenv/config';
import { initializeClaudeClient } from './services/summarizer.service.js';
import { loadFeedsConfig } from './services/config.service.js';
import { scheduleFeeds, processAllFeeds } from './services/processor.service.js';
import type { ProcessorConfig } from './services/processor.service.js';

const FEEDS_CONFIG_PATH = process.env.FEEDS_CONFIG_FILE || '.ai/feeds.json';

async function main(): Promise<void> {
  console.log('🌸 Welcome to RssAiSummaryCompilation!');
  console.log('RSS Feed Aggregator with AI Summarization');
  console.log('');

  try {
    // Initialize Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('Error: ANTHROPIC_API_KEY environment variable not set');
      process.exit(1);
    }

    initializeClaudeClient({
      apiKey,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 300,
    });

    console.log('✓ Claude API initialized');

    // Load configuration
    const config = await loadFeedsConfig(FEEDS_CONFIG_PATH);

    if (config.feeds.length === 0) {
      console.log('No feeds configured. Configure feeds in:', FEEDS_CONFIG_PATH);
      console.log('');
      console.log('Example configuration:');
      console.log(JSON.stringify({
        feeds: [
          {
            id: 'hn',
            url: 'https://news.ycombinator.com/rss',
            name: 'Hacker News',
            enabled: true,
          },
        ],
        webhookUrl: 'https://open.larksuite.com/open-apis/bot/v2/hook/...',
        defaultSystemPrompt: 'Summarize concisely',
        processSchedule: '0 9 * * *',
      }, null, 2));
      process.exit(0);
    }

    console.log(`✓ Loaded ${config.feeds.length} feeds from configuration`);

    // Validate webhook URL
    if (!config.webhookUrl) {
      console.error('Error: webhookUrl not configured');
      process.exit(1);
    }

    console.log('✓ Webhook URL configured');

    // Check for command line arguments
    const args = process.argv.slice(2);
    if (args.includes('--once')) {
      // Run once and exit
      console.log('Running feed processing once...');
      const processorConfig: ProcessorConfig = {
        feeds: config.feeds,
        webhookUrl: config.webhookUrl,
        defaultSystemPrompt: config.defaultSystemPrompt,
        articlesPerFeed: 5,
      };

      const result = await processAllFeeds(processorConfig);
      console.log('');
      console.log('Processing Results:');
      console.log(`  Feeds processed: ${result.successCount}`);
      console.log(`  Summaries sent: ${result.totalSummaries}`);
      console.log(`  Failures: ${result.failureCount}`);
      process.exit(0);
    }

    // Schedule feeds with cron
    console.log('');
    console.log('Starting RSS feed processor with schedule:', config.processSchedule);

    const processorConfig: ProcessorConfig = {
      feeds: config.feeds,
      webhookUrl: config.webhookUrl,
      defaultSystemPrompt: config.defaultSystemPrompt,
      articlesPerFeed: 5,
    };

    scheduleFeeds(processorConfig, config.processSchedule);
    console.log('✓ Feed processing scheduled');
    console.log('');
    console.log('Application is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
export * as RSSService from './services/rss.service.js';
export * as SummarizerService from './services/summarizer.service.js';
export * as LarkService from './services/lark.service.js';
export * as ConfigService from './services/config.service.js';
export * as ProcessorService from './services/processor.service.js';
