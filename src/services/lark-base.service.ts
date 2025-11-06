/**
 * Lark Base API Service
 *
 * Handles integration with Lark (Feishu) Base to fetch RSS feed URLs
 *
 * Validation Requirements:
 * - All API requests must be authenticated with valid app_access_token
 * - Base URL must match Lark domain format
 * - Required fields must be present in base records
 * - URLs must be valid RSS feed URLs
 */

import type {
  LarkBaseConfig,
  LarkAppAccessTokenResponse,
  LarkBaseListRecordsResponse,
  LarkBaseRecord,
  FeedConfig
} from '../types.js';

/**
 * Lark Base API Service
 */
export class LarkBaseService {
  private appAccessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly LARK_API_BASE = 'https://open.larksuite.com/open-apis';
  private readonly LARK_API_BASE_CN = 'https://open.feishu.cn/open-apis';

  /**
   * Validate Lark Base configuration
   */
  validateConfig(config: LarkBaseConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate App ID
    if (!config.appId || config.appId.trim().length === 0) {
      errors.push('App ID is required');
    }

    // Validate App Secret
    if (!config.appSecret || config.appSecret.trim().length === 0) {
      errors.push('App Secret is required');
    }

    // Validate Base URL format
    if (!config.baseUrl || config.baseUrl.trim().length === 0) {
      errors.push('Base URL is required');
    } else {
      const baseUrlPattern = /^https:\/\/[\w-]+\.(larksuite\.com|feishu\.cn)\/base\/[\w-]+/;
      if (!baseUrlPattern.test(config.baseUrl)) {
        errors.push(
          'Base URL must be in format: https://[tenant].larksuite.com/base/[baseId] or https://[tenant].feishu.cn/base/[baseId]'
        );
      }
    }

    // Validate Table ID
    if (!config.tableId || config.tableId.trim().length === 0) {
      errors.push('Table ID is required');
    }

    // Validate field names (use defaults if not provided)
    const urlFieldName = config.urlFieldName || 'URL';
    const nameFieldName = config.nameFieldName || 'Name';
    const enabledFieldName = config.enabledFieldName || 'Enabled';

    if (!urlFieldName || urlFieldName.trim().length === 0) {
      errors.push('URL field name cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get API base URL based on config
   */
  private getApiBase(config: LarkBaseConfig): string {
    return config.baseUrl.includes('feishu.cn') ? this.LARK_API_BASE_CN : this.LARK_API_BASE;
  }

  /**
   * Extract base ID from base URL
   */
  private extractBaseId(baseUrl: string): string | null {
    const match = baseUrl.match(/\/base\/([\w-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get app access token (with caching)
   */
  private async getAppAccessToken(config: LarkBaseConfig): Promise<string> {
    // Return cached token if still valid
    if (this.appAccessToken && Date.now() < this.tokenExpiry) {
      return this.appAccessToken;
    }

    const apiBase = this.getApiBase(config);
    const url = `${apiBase}/auth/v3/app_access_token/internal`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: config.appId,
        app_secret: config.appSecret
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get app access token: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as LarkAppAccessTokenResponse;

    if (data.code !== 0 || !data.app_access_token) {
      throw new Error(`Lark API error: ${data.msg} (code: ${data.code})`);
    }

    // Cache token with 2 hour expiry (token typically expires after 2 hours)
    this.appAccessToken = data.app_access_token;
    this.tokenExpiry = Date.now() + (data.expire - 300) * 1000; // 5 min buffer

    return this.appAccessToken;
  }

  /**
   * Fetch all records from Lark Base table
   */
  async fetchRecords(config: LarkBaseConfig): Promise<LarkBaseRecord[]> {
    // Validate configuration first
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid Lark Base configuration: ${validation.errors.join(', ')}`);
    }

    const token = await this.getAppAccessToken(config);
    const apiBase = this.getApiBase(config);
    const baseId = this.extractBaseId(config.baseUrl);

    if (!baseId) {
      throw new Error('Invalid base URL: could not extract base ID');
    }

    const allRecords: LarkBaseRecord[] = [];
    let pageToken: string | undefined = undefined;
    let hasMore = true;

    // Fetch all pages
    while (hasMore) {
      const url = new URL(`${apiBase}/bitable/v1/apps/${baseId}/tables/${config.tableId}/records`);

      if (config.viewId) {
        url.searchParams.set('view_id', config.viewId);
      }

      if (pageToken) {
        url.searchParams.set('page_token', pageToken);
      }

      url.searchParams.set('page_size', '500'); // Max page size

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as LarkBaseListRecordsResponse;

      if (data.code !== 0 || !data.data) {
        throw new Error(`Lark API error: ${data.msg} (code: ${data.code})`);
      }

      allRecords.push(...data.data.items);
      hasMore = data.data.has_more;
      pageToken = data.data.page_token;
    }

    return allRecords;
  }

  /**
   * Convert Lark Base records to FeedConfig array
   */
  convertRecordsToFeeds(
    records: LarkBaseRecord[],
    config: LarkBaseConfig
  ): { feeds: FeedConfig[]; errors: string[] } {
    const urlFieldName = config.urlFieldName || 'URL';
    const nameFieldName = config.nameFieldName || 'Name';
    const enabledFieldName = config.enabledFieldName || 'Enabled';

    const feeds: FeedConfig[] = [];
    const errors: string[] = [];

    for (const record of records) {
      const fields = record.fields;

      // Extract URL (required)
      const url = fields[urlFieldName];
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        errors.push(`Record ${record.record_id}: Missing or invalid URL field`);
        continue;
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        errors.push(`Record ${record.record_id}: Invalid URL format: ${url}`);
        continue;
      }

      // Extract name (optional, use URL as fallback)
      let name = fields[nameFieldName];
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        name = url;
      }

      // Extract enabled status (optional, default to true)
      let enabled = true;
      if (fields[enabledFieldName] !== undefined) {
        // Handle boolean or checkbox field
        if (typeof fields[enabledFieldName] === 'boolean') {
          enabled = fields[enabledFieldName];
        } else if (typeof fields[enabledFieldName] === 'string') {
          enabled = fields[enabledFieldName].toLowerCase() === 'true';
        }
      }

      feeds.push({
        id: record.record_id,
        url: url.trim(),
        name: name.trim(),
        enabled
      });
    }

    return { feeds, errors };
  }

  /**
   * Fetch RSS feed configurations from Lark Base
   */
  async fetchFeedsFromBase(config: LarkBaseConfig): Promise<{ feeds: FeedConfig[]; errors: string[] }> {
    try {
      const records = await this.fetchRecords(config);
      return this.convertRecordsToFeeds(records, config);
    } catch (error) {
      return {
        feeds: [],
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Test Lark Base connection
   */
  async testConnection(config: LarkBaseConfig): Promise<{ success: boolean; message: string; recordCount?: number }> {
    try {
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Try to fetch records
      const records = await this.fetchRecords(config);

      return {
        success: true,
        message: `Successfully connected to Lark Base`,
        recordCount: records.length
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const larkBaseService = new LarkBaseService();
