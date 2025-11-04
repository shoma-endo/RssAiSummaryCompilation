# RssAiSummaryCompilation

An autonomous RSS feed aggregator with AI-powered summarization and Lark group chat integration. Automatically fetches RSS feeds, summarizes content using OpenAI API, and posts summaries to Lark.

## Features

- **RSS Feed Fetching**: Automatically fetch articles from multiple RSS feeds
- **AI Summarization**: Use OpenAI API to generate concise summaries
- **Lark Integration**: Post summaries directly to Lark group chats via webhooks
- **Flexible Configuration**: Manage feeds with customizable prompts and processing schedules
- **Scheduled Processing**: Cron-based scheduling for automatic feed processing
- **Type-Safe**: Full TypeScript implementation with strict type checking
- **Comprehensive Tests**: 45+ tests covering all core features

## Getting Started

### Prerequisites

1. **Node.js** (v18+)
2. **OpenAI API Key**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. **Lark Webhook URL**: Create a bot in Lark and get webhook URL

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your keys
```

### Environment Variables

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-...

# Lark Webhook
LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/...

# Feed Processing Schedule (cron format)
FEED_PROCESS_SCHEDULE=0 9 * * *  # Daily at 9 AM

# Configuration file location
FEEDS_CONFIG_FILE=.ai/feeds.json
```

### Running the Application

```bash
# Development mode
npm run dev

# Run once and exit
npm run dev -- --once

# Build
npm run build

# Test
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
src/
├── index.ts                    # Main entry point
├── types.ts                   # Type definitions
└── services/
    ├── rss.service.ts        # RSS feed fetching
    ├── summarizer.service.ts # OpenAI API integration
    ├── lark.service.ts       # Lark webhook posting
    ├── config.service.ts     # Configuration management
    └── processor.service.ts  # Feed processing & scheduling

tests/
├── example.test.ts
├── rss.service.test.ts
├── summarizer.service.test.ts
├── lark.service.test.ts
├── config.service.test.ts
└── processor.service.test.ts
```

## Configuration

### Feed Configuration File

Create `.ai/feeds.json` to configure your RSS feeds:

```json
{
  "feeds": [
    {
      "id": "hn",
      "url": "https://news.ycombinator.com/rss",
      "name": "Hacker News",
      "enabled": true,
      "customPrompt": "Summarize technical content for developers"
    }
  ],
  "webhookUrl": "https://open.larksuite.com/open-apis/bot/v2/hook/...",
  "defaultSystemPrompt": "Summarize concisely and highlight key information",
  "processSchedule": "0 9 * * *"
}
```

### Cron Schedule Format

- `0 9 * * *` - Every day at 9:00 AM
- `0 */6 * * *` - Every 6 hours
- `*/30 * * * *` - Every 30 minutes
- `0 0 * * 0` - Every Sunday at midnight

## API Services

### RSS Service
- Fetches articles from RSS feed URLs
- Parses feed metadata and content
- Validates feed URLs

### Summarizer Service
- Integrates with OpenAI API (gpt-4o-mini by default)
- Supports custom summarization prompts
- Handles batch summarization

### Lark Service
- Posts formatted messages to Lark via webhook
- Formats summaries with links and metadata
- Validates webhook URLs

### Config Service
- Loads/saves feed configuration
- Manages feed lifecycle
- Tracks processing timestamps

### Processor Service
- Orchestrates feed processing
- Schedules with cron expressions
- Manages summarization and posting workflow

## Testing

Run the full test suite:

```bash
npm test              # Run all tests
npm test -- --watch  # Watch mode
npm test -- --coverage # With coverage
```

Current test coverage: **45 tests passing**
- Configuration management: 10 tests
- RSS fetching: 6 tests
- Summarization: 10 tests
- Lark integration: 5 tests
- Feed processing: 10 tests
- Core functionality: 4 tests

## Development

### Type Safety
The project uses strict TypeScript configuration. Run type checking:

```bash
npm run typecheck
```

### Code Quality
```bash
npm run lint           # Run ESLint
npm run lint -- --fix # Fix linting issues
```

### Build
```bash
npm run build  # Compiles TypeScript to ./dist
```

## Architecture

### Service Layer
All business logic is organized into services:
- Each service has a single responsibility
- Services are independently testable
- Clear interfaces for service communication

### Configuration-Driven
- All settings are externalized to environment and config files
- No hardcoded values
- Easy to customize for different environments

### Error Handling
- Comprehensive error messages
- Graceful failure modes
- Logging for debugging

## Support & License

MIT License - See LICENSE file

## Status

✅ **Complete Implementation**
- Core features implemented
- Full test coverage
- Production-ready configuration
