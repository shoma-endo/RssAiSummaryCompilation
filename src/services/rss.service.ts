/**
 * RSS Feed Fetching Service
 * Handles fetching and parsing RSS feeds
 */

import Parser from 'rss-parser';
import { FeedArticle } from '../types.js';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'fullContent'],
      ['description', 'description'],
    ],
  },
});

/**
 * Fetch articles from an RSS feed URL
 * @param feedUrl - URL of the RSS feed
 * @param limit - Maximum number of articles to fetch (default: 10)
 * @returns Array of feed articles
 */
export async function fetchFeedArticles(
  feedUrl: string,
  limit: number = 10
): Promise<FeedArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    const articles: FeedArticle[] = (feed.items || [])
      .slice(0, limit)
      .map((item) => ({
        title: item.title || 'Untitled',
        link: item.link,
        pubDate: item.pubDate,
        isoDate: item.isoDate,
        content: item.fullContent || item.content || '',
        description: item.description || '',
        creator: item.creator,
      }));

    return articles;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch RSS feed from ${feedUrl}: ${errorMessage}`);
  }
}

/**
 * Validate if a URL is a valid RSS feed
 * @param feedUrl - URL to validate
 * @returns True if the URL contains valid RSS feed
 */
export async function validateFeedUrl(feedUrl: string): Promise<boolean> {
  try {
    const feed = await parser.parseURL(feedUrl);
    return !!(feed.title || feed.items);
  } catch {
    return false;
  }
}
