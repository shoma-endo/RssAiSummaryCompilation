'use client';

import { useState, useEffect } from 'react';
import type { FeedsConfiguration, LarkBaseConfig } from '../src/types';

export default function SettingsPage() {
  const [config, setConfig] = useState<FeedsConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lark Base configuration state
  const [larkBase, setLarkBase] = useState<LarkBaseConfig>({
    appId: '',
    appSecret: '',
    baseUrl: '',
    tableId: '',
    viewId: '',
    urlFieldName: 'URL',
    nameFieldName: 'Name',
    enabledFieldName: 'Enabled',
  });

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to load configuration');
      const data = await response.json();
      setConfig(data);
      if (data.larkBase) {
        setLarkBase({
          ...larkBase,
          ...data.larkBase,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load configuration',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/lark-base/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(larkBase),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `${data.message} (${data.recordCount} records found)`,
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Connection test failed',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const updatedConfig: FeedsConfiguration = {
        ...config,
        larkBase: larkBase.appId && larkBase.appSecret && larkBase.baseUrl && larkBase.tableId
          ? larkBase
          : undefined,
      };

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({
          type: 'success',
          text: 'Configuration saved successfully',
        });
        await loadConfiguration();
      } else {
        setMessage({
          type: 'error',
          text: data.message || data.error || 'Failed to save configuration',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ marginBottom: '30px' }}>RSS AI Summary - Settings</h1>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '4px',
            backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}

      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px' }}>Lark Base Integration</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Configure Lark Base to automatically fetch RSS feed URLs from your Lark Base table.
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            Lark App ID *
          </label>
          <input
            type="text"
            value={larkBase.appId}
            onChange={(e) => setLarkBase({ ...larkBase, appId: e.target.value })}
            placeholder="cli_xxx..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            Lark App Secret *
          </label>
          <input
            type="password"
            value={larkBase.appSecret}
            onChange={(e) => setLarkBase({ ...larkBase, appSecret: e.target.value })}
            placeholder="Enter your Lark App Secret"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            Base URL *
          </label>
          <input
            type="text"
            value={larkBase.baseUrl}
            onChange={(e) => setLarkBase({ ...larkBase, baseUrl: e.target.value })}
            placeholder="https://example.larksuite.com/base/abc123"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Format: https://[tenant].larksuite.com/base/[baseId]
          </small>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            Table ID *
          </label>
          <input
            type="text"
            value={larkBase.tableId}
            onChange={(e) => setLarkBase({ ...larkBase, tableId: e.target.value })}
            placeholder="tblxxx..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            View ID (Optional)
          </label>
          <input
            type="text"
            value={larkBase.viewId || ''}
            onChange={(e) => setLarkBase({ ...larkBase, viewId: e.target.value })}
            placeholder="vewxxx..."
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <details style={{ marginBottom: '16px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '500', marginBottom: '12px' }}>
            Advanced: Field Names
          </summary>
          <div style={{ paddingLeft: '20px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>URL Field Name</label>
              <input
                type="text"
                value={larkBase.urlFieldName || 'URL'}
                onChange={(e) => setLarkBase({ ...larkBase, urlFieldName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Name Field Name</label>
              <input
                type="text"
                value={larkBase.nameFieldName || 'Name'}
                onChange={(e) => setLarkBase({ ...larkBase, nameFieldName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>Enabled Field Name</label>
              <input
                type="text"
                value={larkBase.enabledFieldName || 'Enabled'}
                onChange={(e) => setLarkBase({ ...larkBase, enabledFieldName: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        </details>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleTestConnection}
            disabled={testing || !larkBase.appId || !larkBase.appSecret || !larkBase.baseUrl || !larkBase.tableId}
            style={{
              padding: '10px 20px',
              backgroundColor: testing ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: testing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSaveConfiguration}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </section>

      <section style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px' }}>Field Validation Requirements</h3>
        <ul style={{ fontSize: '14px', lineHeight: '1.6', color: '#666' }}>
          <li><strong>App ID:</strong> Required, Lark App ID format (e.g., cli_xxx...)</li>
          <li><strong>App Secret:</strong> Required, kept secure (not displayed after saving)</li>
          <li><strong>Base URL:</strong> Required, format: https://[tenant].larksuite.com/base/[baseId] or https://[tenant].feishu.cn/base/[baseId]</li>
          <li><strong>Table ID:</strong> Required, table ID within the base (e.g., tblxxx...)</li>
          <li><strong>View ID:</strong> Optional, specific view to filter data</li>
          <li><strong>Field Names:</strong> Configure which fields in your Lark Base table contain URL, name, and enabled status</li>
        </ul>
      </section>
    </div>
  );
}
