/**
 * API Route: Fetch RSS Feeds from Lark Base
 * POST /api/lark-base/fetch - Fetch and preview feeds from Lark Base
 */

import { NextRequest, NextResponse } from 'next/server';
import { larkBaseService } from '../../../../src/services/lark-base.service.js';
import type { LarkBaseConfig } from '../../../../src/types.js';

/**
 * POST /api/lark-base/fetch
 * Fetch RSS feeds from Lark Base
 */
export async function POST(request: NextRequest) {
  try {
    const config = (await request.json()) as LarkBaseConfig;

    // Validate configuration
    const validation = larkBaseService.validateConfig(config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        },
        { status: 400 }
      );
    }

    // Fetch feeds
    const result = await larkBaseService.fetchFeedsFromBase(config);

    if (result.errors.length > 0) {
      return NextResponse.json({
        success: true,
        feeds: result.feeds,
        warnings: result.errors,
        message: `Fetched ${result.feeds.length} feeds with ${result.errors.length} warnings`
      });
    }

    return NextResponse.json({
      success: true,
      feeds: result.feeds,
      message: `Successfully fetched ${result.feeds.length} feeds`
    });
  } catch (error) {
    console.error('Failed to fetch feeds from Lark Base:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feeds',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
