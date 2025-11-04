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
 * @param sinceDate - Optional ISO date string to filter articles published after this date
 * @returns Array of feed articles
 */
export async function fetchFeedArticles(
  feedUrl: string,
  limit: number = 10,
  sinceDate?: string
): Promise<FeedArticle[]> {
  try {
    const feed = await parser.parseURL(feedUrl);

    let articles: FeedArticle[] = (feed.items || [])
      .map((item) => ({
        title: item.title || 'Untitled',
        link: item.link,
        pubDate: item.pubDate,
        isoDate: item.isoDate,
        content: item.fullContent || item.content || '',
        description: item.description || '',
        creator: item.creator,
      }));

    // Filter articles by date if sinceDate is provided
    if (sinceDate) {
      const sinceTimestamp = new Date(sinceDate).getTime();
      articles = articles.filter((article) => {
        const articleDate = article.isoDate
          ? new Date(article.isoDate).getTime()
          : article.pubDate
            ? new Date(article.pubDate).getTime()
            : 0;
        return articleDate > sinceTimestamp;
      });
    }

    // Sort by date (newest first) and limit
    articles.sort((a, b) => {
      const dateA = a.isoDate
        ? new Date(a.isoDate).getTime()
        : a.pubDate
          ? new Date(a.pubDate).getTime()
          : 0;
      const dateB = b.isoDate
        ? new Date(b.isoDate).getTime()
        : b.pubDate
          ? new Date(b.pubDate).getTime()
          : 0;
      return dateB - dateA;
    });

    return articles.slice(0, limit);
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
