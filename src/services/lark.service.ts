/**
 * Lark Webhook Integration Service
 * Handles sending notifications to Lark group chat
 */

import { SummaryResult, LarkWebhookResponse } from '../types.js';

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

    if (!response.ok) {
      const errorData = (await response.json()) as Record<string, unknown>;
      const errorMsg = (errorData.msg as string) || response.statusText;
      throw new Error(`Lark API error: ${errorMsg}`);
    }

    const data = (await response.json()) as LarkWebhookResponse;
    return data;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
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
 * Format summary result into Lark message format
 * @param summary - Summary result
 * @returns Formatted Lark message
 */
function formatLarkMessage(summary: SummaryResult): Record<string, unknown> {
  const titleLink = summary.originalLink ? `[${summary.title}](${summary.originalLink})` : summary.title;

  return {
    msg_type: 'post',
    content: {
      post: {
        zh_cn: {
          title: `📰 ${summary.feedName}`,
          content: [
            [
              {
                tag: 'text',
                text: `标题: ${titleLink}\n\n摘要:\n${summary.summary}`,
              },
            ],
            [
              {
                tag: 'text',
                text: `\n来源: ${summary.source || summary.feedName}`,
                style: {
                  bold: false,
                  italic: true,
                },
              },
            ],
            summary.publishedAt
              ? [
                  {
                    tag: 'text',
                    text: `发布时间: ${summary.publishedAt}`,
                    style: {
                      bold: false,
                      italic: true,
                    },
                  },
                ]
              : null,
          ].filter(Boolean),
        },
      },
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
