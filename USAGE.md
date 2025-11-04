# Usage Guide - RSS AI Summary Compilation

This guide walks you through setting up and using the RSS feed aggregator with AI summarization.

## Quick Start

### 1. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

Required environment variables:
- `ANTHROPIC_API_KEY`: Your Claude API key from [console.anthropic.com](https://console.anthropic.com)
- `LARK_WEBHOOK_URL`: Your Lark bot webhook URL

### 2. Configure Feeds

Create `.ai/feeds.json`:

```json
{
  "feeds": [
    {
      "id": "tech-news",
      "url": "https://news.ycombinator.com/rss",
      "name": "Hacker News",
      "enabled": true
    },
    {
      "id": "dev-blog",
      "url": "https://example.com/blog/rss",
      "name": "Developer Blog",
      "enabled": true,
      "customPrompt": "Focus on technical insights and best practices"
    }
  ],
  "webhookUrl": "https://open.larksuite.com/open-apis/bot/v2/hook/YOUR_WEBHOOK_ID",
  "defaultSystemPrompt": "Summarize the content concisely and highlight key information",
  "processSchedule": "0 9 * * *"
}
```

### 3. Run the Application

```bash
# Install dependencies
npm install

# Test configuration (run once)
npm run dev -- --once

# Start scheduled processing
npm run dev
```

## Configuration Details

### Feed Properties

- **id**: Unique identifier for the feed
- **url**: RSS feed URL
- **name**: Display name for the feed
- **enabled**: Whether to process this feed
- **customPrompt** (optional): Custom AI summarization prompt for this feed
- **lastProcessed** (optional): Timestamp of last processing (auto-managed)

### Scheduling

Use cron expressions for `processSchedule`:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

Common schedules:
- `0 9 * * *` - Every day at 9:00 AM
- `0 */6 * * *` - Every 6 hours
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * 0` - Every Sunday at midnight
- `0 9 * * 1-5` - Weekdays at 9:00 AM

### Summarization Prompts

You can customize how summaries are generated:

```json
{
  "defaultSystemPrompt": "Summarize concisely in 2-3 sentences, highlighting key points",
  "feeds": [
    {
      "id": "technical",
      "url": "...",
      "customPrompt": "Focus on technical details and implementation insights"
    },
    {
      "id": "business",
      "url": "...",
      "customPrompt": "Summarize business implications and market impact"
    }
  ]
}
```

## Managing Feeds

### Add a New Feed

Edit `.ai/feeds.json` and add to the feeds array:

```json
{
  "id": "new-feed",
  "url": "https://example.com/rss.xml",
  "name": "New Feed",
  "enabled": true
}
```

### Enable/Disable a Feed

Set the `enabled` property:

```json
{
  "id": "paused-feed",
  "enabled": false  // Will not be processed
}
```

### Remove a Feed

Delete the feed object from the feeds array.

## Lark Integration

### Setting Up Lark Webhook

1. Open Lark application
2. Navigate to your group chat
3. Click settings → Bots
4. Create a new bot
5. Copy the webhook URL
6. Add to `.env` as `LARK_WEBHOOK_URL`

### Message Format

Messages are posted as formatted cards with:
- Feed name
- Article title (with link if available)
- Summary text
- Source and publication date
- Formatted for easy reading

## Testing

### Run Tests

```bash
npm test              # Run all tests
npm test -- --watch  # Watch mode for development
npm test -- --coverage # With coverage report
```

### Manual Testing

```bash
# Test with a single run
npm run dev -- --once

# Check configuration
npm run typecheck

# Lint code
npm run lint
```

## Troubleshooting

### No articles are being fetched

1. Check feed URLs are valid
   ```bash
   # Test a feed URL
   curl https://example.com/rss.xml | head -20
   ```

2. Verify the `enabled` property is `true`

3. Check network connectivity

### Summaries are not being posted to Lark

1. Verify `LARK_WEBHOOK_URL` is correct
   ```bash
   # Test webhook
   curl -X POST $LARK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"msg_type":"text","content":{"text":"Test"}}'
   ```

2. Check `ANTHROPIC_API_KEY` is valid

3. Verify Lark bot has permission to post in the group

### Claude API errors

1. Check API key is valid: `echo $ANTHROPIC_API_KEY`

2. Verify you have credits on Anthropic account

3. Check API key permissions include message creation

### Build/Compilation errors

1. Ensure TypeScript version is compatible
   ```bash
   npm install
   npm run build
   ```

2. Check all types are correct
   ```bash
   npm run typecheck
   ```

## Performance Optimization

### Batch Processing
The system automatically batches requests for efficiency:
- Processes multiple feeds in parallel
- Summarizes articles concurrently
- Respects Claude API rate limits

### Caching
- Configuration is loaded once at startup
- Last processed timestamps prevent duplicate summaries
- Feed URLs are validated before processing

### Resource Usage
- Typical: 5-10 articles per feed per run
- API calls: ~1 per article (summarization)
- Storage: Config file only (~1 KB per 10 feeds)

## Advanced Configuration

### Environment Overrides

```bash
# Override schedule
FEED_PROCESS_SCHEDULE="*/15 * * * *" npm run dev

# Override config location
FEEDS_CONFIG_FILE="./my-feeds.json" npm run dev

# Custom system prompt
SUMMARY_SYSTEM_PROMPT="Make summaries humorous" npm run dev
```

### Logging

The application logs to console. For production deployments, consider:
- Redirecting stdout to a log file
- Using a log aggregation service
- Monitoring error rates

## API Reference

See `src/services/` for detailed API documentation:

- **rss.service.ts** - RSS feed fetching
- **summarizer.service.ts** - Claude API integration
- **lark.service.ts** - Lark webhook posting
- **config.service.ts** - Configuration management
- **processor.service.ts** - Feed processing orchestration

## Support

For issues or questions:
1. Check the main README.md
2. Review test files for usage examples
3. Check GitHub issues: https://github.com/shoma-endo/RssAiSummaryCompilation/issues
