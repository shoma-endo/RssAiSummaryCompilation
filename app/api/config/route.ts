/**
 * API Route: Configuration Management
 * GET  /api/config - Get current configuration
 * POST /api/config - Update configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromKV, saveConfigToKV, isVercelEnvironment } from '../../../src/services/storage.service.js';
import type { FeedsConfiguration } from '../../../src/types.js';

/**
 * GET /api/config
 * Retrieve current configuration
 */
export async function GET() {
  try {
    const config = await loadConfigFromKV();
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load configuration', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/config
 * Update configuration
 */
export async function POST(request: NextRequest) {
  try {
    const config = (await request.json()) as FeedsConfiguration;

    // Validate required fields
    if (!config.webhookUrl || !config.defaultSystemPrompt) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'webhookUrl and defaultSystemPrompt are required' },
        { status: 400 }
      );
    }

    // Validate Lark Base config if provided
    if (config.larkBase) {
      const { appId, appSecret, baseUrl, tableId } = config.larkBase;

      if (!appId || !appSecret || !baseUrl || !tableId) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Lark Base configuration requires appId, appSecret, baseUrl, and tableId'
          },
          { status: 400 }
        );
      }

      // Validate Base URL format
      const baseUrlPattern = /^https:\/\/[\w-]+\.(larksuite\.com|feishu\.cn)\/base\/[\w-]+/;
      if (!baseUrlPattern.test(baseUrl)) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            message: 'Base URL must be in format: https://[tenant].larksuite.com/base/[baseId] or https://[tenant].feishu.cn/base/[baseId]'
          },
          { status: 400 }
        );
      }
    }

    // Save configuration
    if (isVercelEnvironment()) {
      await saveConfigToKV(config);
    } else {
      return NextResponse.json(
        { error: 'Configuration update not supported in local environment. Please modify .ai/feeds.json directly.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Failed to save configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
