/**
 * Lark Webhook Integration Service
 * Handles sending notifications to Lark group chat
 */

import { SummaryResult, LarkWebhookResponse, FeedSummaryBundle } from '../types.js';

/**
 * Send a summary to Lark via webhook
 * @param webhookUrl - Lark webhook URL
 * @param summary - Summary result to send
 * @returns Response from Lark API
 */
export async function sendToLark(
  webhookUrl: string,
  summary: SummaryResult
): Promise<LarkWebhookResponse> {
  if (!webhookUrl) {
    throw new Error('Lark webhook URL is required');
  }

  if (!webhookUrl.includes('larksuite.com')) {
    throw new Error('Invalid Lark webhook URL');
  }

  const message = formatLarkMessage(summary);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = (await response.json()) as LarkWebhookResponse;
    
    // Debug: Log response only if DEBUG environment variable is set
    if (process.env.DEBUG === 'true') {
      console.log('Lark API Response:', JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      const errorMsg = data.msg || response.statusText;
      throw new Error(`Lark API HTTP error: ${errorMsg}`);
    }

    // Check Lark API response code (0 means success)
    if (data.code !== 0) {
      throw new Error(`Lark API error (code: ${data.code}): ${data.msg || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Lark send error:', errorMessage);
    throw new Error(`Failed to send message to Lark: ${errorMessage}`);
  }
}

/**
 * Send multiple summaries to Lark
 * @param webhookUrl - Lark webhook URL
 * @param summaries - Array of summary results
 * @returns Array of responses from Lark API
 */
export async function sendMultipleToLark(
  webhookUrl: string,
  summaries: SummaryResult[]
): Promise<LarkWebhookResponse[]> {
  return Promise.all(summaries.map((summary) => sendToLark(webhookUrl, summary)));
}

/**
 * Send a consolidated bundle of articles from a single feed to Lark
 * @param webhookUrl - Lark webhook URL
 * @param bundle - Feed summary bundle with multiple articles
 * @returns Response from Lark API
 */
export async function sendBundleToLark(
  webhookUrl: string,
  bundle: FeedSummaryBundle
): Promise<LarkWebhookResponse> {
  if (!webhookUrl) {
    throw new Error('Lark webhook URL is required');
  }

  if (!webhookUrl.includes('larksuite.com')) {
    throw new Error('Invalid Lark webhook URL');
  }

  const message = formatConsolidatedMessage(bundle);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const data = (await response.json()) as LarkWebhookResponse;

    // Debug: Log response only if DEBUG environment variable is set
    if (process.env.DEBUG === 'true') {
      console.log('Lark API Response:', JSON.stringify(data, null, 2));
    }

    if (!response.ok) {
      const errorMsg = data.msg || response.statusText;
      throw new Error(`Lark API HTTP error: ${errorMsg}`);
    }

    // Check Lark API response code (0 means success)
    if (data.code !== 0) {
      throw new Error(`Lark API error (code: ${data.code}): ${data.msg || 'Unknown error'}`);
    }

    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Lark send error:', errorMessage);
    throw new Error(`Failed to send message to Lark: ${errorMessage}`);
  }
}

/**
 * Format consolidated feed bundle into Lark message format
 * @param bundle - Feed summary bundle with multiple articles
 * @returns Formatted Lark message
 */
function formatConsolidatedMessage(bundle: FeedSummaryBundle): Record<string, unknown> {
  let messageText = `📰 ${bundle.feedName}\n`;
  messageText += `📊 ${bundle.articles.length}件の新着記事\n`;
  messageText += '─'.repeat(40) + '\n\n';

  // Add each article
  bundle.articles.forEach((article, index) => {
    messageText += `【${index + 1}】${article.title}\n`;
    if (article.originalLink) {
      messageText += `🔗 ${article.originalLink}\n`;
    }
    messageText += `\n${article.summary}\n`;
    if (article.publishedAt) {
      messageText += `⏰ ${article.publishedAt}\n`;
    }
    messageText += '\n';
  });

  messageText += '─'.repeat(40) + '\n';
  messageText += `出典: ${bundle.articles[0]?.source || bundle.feedName}`;

  // Use text type for simplicity and compatibility
  return {
    msg_type: 'text',
    content: {
      text: messageText,
    },
  };
}

/**
 * Format summary result into Lark message format
 * @param summary - Summary result
 * @returns Formatted Lark message
 */
function formatLarkMessage(summary: SummaryResult): Record<string, unknown> {
  // Build message text
  let messageText = `📰 ${summary.feedName}\n\n`;
  messageText += `タイトル: ${summary.title}\n`;
  if (summary.originalLink) {
    messageText += `リンク: ${summary.originalLink}\n`;
  }
  messageText += `\n要約:\n${summary.summary}\n`;
  if (summary.publishedAt) {
    messageText += `\n公開日時: ${summary.publishedAt}\n`;
  }
  messageText += `\n出典: ${summary.source || summary.feedName}`;

  // Use text type for simplicity and compatibility
  return {
    msg_type: 'text',
    content: {
      text: messageText,
    },
  };
}

/**
 * Test if a webhook URL is valid by sending a test message
 * @param webhookUrl - Lark webhook URL to test
 * @returns True if webhook is reachable
 */
export async function validateWebhookUrl(webhookUrl: string): Promise<boolean> {
  try {
    const testMessage = {
      msg_type: 'text',
      content: {
        text: 'RSS Summary System - Webhook Test',
      },
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    return response.ok;
  } catch {
    return false;
  }
}
