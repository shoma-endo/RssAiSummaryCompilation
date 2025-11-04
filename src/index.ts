/**
 * RssAiSummaryCompilation - Entry Point
 *
 * Autonomous RSS feed aggregator with AI summarization
 * Fetches RSS feeds, summarizes content with OpenAI API, and posts to Lark
 */

import 'dotenv/config';
import { initializeLLMClient } from './services/summarizer.service.js';
import { loadFeedsConfig } from './services/config.service.js';
import { scheduleFeeds, processAllFeeds, startRealtimeMonitoring } from './services/processor.service.js';
import type { ProcessorConfig } from './services/processor.service.js';

const FEEDS_CONFIG_PATH = process.env.FEEDS_CONFIG_FILE || '.ai/feeds.json';

async function main(): Promise<void> {
  console.log('🌸 Welcome to RssAiSummaryCompilation!');
  console.log('RSS Feed Aggregator with AI Summarization');
  console.log('');

  try {
    // Initialize OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('Error: OPENAI_API_KEY environment variable not set');
      process.exit(1);
    }

    initializeLLMClient({
      apiKey,
      model: 'gpt-5-nano',
      maxTokens: 300,
      provider: 'openai',
    });

    console.log('✓ OpenAI API initialized');

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
      const onlyNew = args.includes('--new');
      console.log(`Running feed processing once${onlyNew ? ' (new articles only)' : ''}...`);
      const processorConfig: ProcessorConfig = {
        feeds: config.feeds,
        webhookUrl: config.webhookUrl,
        defaultSystemPrompt: config.defaultSystemPrompt,
        articlesPerFeed: 5,
        configPath: FEEDS_CONFIG_PATH,
      };

      const result = await processAllFeeds(processorConfig, onlyNew);
      console.log('');
      console.log('Processing Results:');
      console.log(`  Feeds processed: ${result.successCount}`);
      console.log(`  Summaries sent: ${result.totalSummaries}`);
      console.log(`  Failures: ${result.failureCount}`);
      process.exit(0);
    }

    // Prepare processor config
    const processorConfig: ProcessorConfig = {
      feeds: config.feeds,
      webhookUrl: config.webhookUrl,
      defaultSystemPrompt: config.defaultSystemPrompt,
      articlesPerFeed: 5,
      configPath: FEEDS_CONFIG_PATH,
    };

    // Check if real-time monitoring is enabled
    if (config.realtimeMonitoring) {
      const intervalMinutes = config.realtimeIntervalMinutes || 5;
      console.log('');
      console.log('🔄 Real-time monitoring mode enabled');
      console.log(`   Checking for new articles every ${intervalMinutes} minutes`);
      
      startRealtimeMonitoring(processorConfig, intervalMinutes);
      console.log('✓ Real-time monitoring started');
      console.log('');
      console.log('Application is running. Press Ctrl+C to stop.');
    } else {
      // Schedule feeds with cron
      console.log('');
      console.log('Starting RSS feed processor with schedule:', config.processSchedule);

      scheduleFeeds(processorConfig, config.processSchedule, false);
      console.log('✓ Feed processing scheduled');
      console.log('');
      console.log('Application is running. Press Ctrl+C to stop.');
    }
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
