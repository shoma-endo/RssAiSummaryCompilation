/**
 * API Route: Test Lark Base Connection
 * POST /api/lark-base/test - Test Lark Base configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { larkBaseService } from '../../../../src/services/lark-base.service.js';
import type { LarkBaseConfig } from '../../../../src/types.js';

/**
 * POST /api/lark-base/test
 * Test Lark Base connection with provided configuration
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

    // Test connection
    const result = await larkBaseService.testConnection(config);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        recordCount: result.recordCount
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Failed to test Lark Base connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test connection',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
