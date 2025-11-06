# Vercel デプロイガイド

このドキュメントでは、RSS AI Summary Compilation アプリケーションを Vercel にデプロイする手順を説明します。

## 概要

Vercel は以下の制約があります：
- **ファイルシステムは読み取り専用**：実行時にファイルを書き込むことができません
- **常駐プロセス不可**：サーバーレス関数のみが実行できます
- **実行時間制限**：Hobby プランでは 10 秒、Pro プランでは 60 秒
- **Cron Jobs**：`node-cron` は使えないため、Vercel Cron Jobs を使用します

## アーキテクチャの変更点

### ストレージ

ローカル開発では `.ai/feeds.json` を使用しますが、Vercel 環境では **Vercel KV (Redis)** を使用します。

### スケジューリング

ローカル開発では `node-cron` を使用しますが、Vercel 環境では **Vercel Cron Jobs** を使用します。

## デプロイ手順

### 1. Vercel プロジェクトを作成

```bash
# Vercel CLI をインストール（未インストールの場合）
npm install -g vercel

# プロジェクトディレクトリでログイン
vercel login

# プロジェクトを初期化（初回のみ）
vercel
```

### 2. Vercel KV を有効化

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクトを選択
3. **Storage** タブから **Create Database** をクリック
4. **KV** を選択して作成
5. KV データベースをプロジェクトに接続

Vercel が自動的に以下の環境変数を設定します：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 3. 環境変数を設定

Vercel Dashboard の **Settings > Environment Variables** で以下を設定します：

#### 必須の環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `OPENAI_API_KEY` | OpenAI API キー | `sk-...` |
| `LARK_WEBHOOK_URL` | Lark Webhook URL | `https://open.larksuite.com/open-apis/bot/v2/hook/...` |
| `CRON_SECRET` | Cron リクエストの認証用シークレット | ランダムな文字列（例: `uuidgen` で生成） |

#### オプションの環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `OPENAI_MODEL` | `gpt-4o-mini` | 使用する OpenAI モデル |
| `OPENAI_MAX_TOKENS` | `300` | 要約の最大トークン数 |
| `ARTICLES_PER_FEED` | `5` | フィードごとに処理する記事数 |
| `SUMMARY_SYSTEM_PROMPT` | デフォルトプロンプト | AI 要約用のシステムプロンプト |

### 4. 初期設定を KV に保存

Vercel KV に初期設定を保存するには、以下のいずれかの方法を使用します：

#### 方法 A: 環境変数で設定（簡易）

`FEEDS_CONFIG_JSON` 環境変数に設定を JSON 形式で保存します：

\`\`\`json
{
  "feeds": [
    {
      "id": "example-feed",
      "url": "https://example.com/feed.xml",
      "name": "Example Feed",
      "enabled": true,
      "customPrompt": "Summarize this tech news concisely"
    }
  ],
  "webhookUrl": "https://open.larksuite.com/open-apis/bot/v2/hook/...",
  "defaultSystemPrompt": "Summarize the following content concisely and highlight key information.",
  "processSchedule": "*/5 * * * *"
}
\`\`\`

#### 方法 B: Vercel CLI で KV に直接保存

\`\`\`bash
# Vercel KV に設定を保存
vercel env pull .env.local
# .env.local に KV_REST_API_URL などが保存される

# Node.js スクリプトで KV に書き込み
node -e "
import('@vercel/kv').then(async ({kv}) => {
  const config = {
    feeds: [{
      id: 'example-feed',
      url: 'https://example.com/feed.xml',
      name: 'Example Feed',
      enabled: true
    }],
    webhookUrl: process.env.LARK_WEBHOOK_URL,
    defaultSystemPrompt: 'Summarize the following content concisely.',
    processSchedule: '*/5 * * * *'
  };
  await kv.set('rss-feeds-config', config);
  console.log('Config saved to KV');
  process.exit(0);
});
"
\`\`\`

### 5. デプロイ

\`\`\`bash
# 本番環境にデプロイ
vercel --prod

# または Git にプッシュすると自動デプロイ
git push origin main
\`\`\`

### 6. Cron Jobs の動作確認

1. Vercel Dashboard の **Deployments** で最新のデプロイを確認
2. **Functions** タブで `/api/cron` が表示されることを確認
3. **Logs** タブで Cron Job の実行ログを確認

手動でテストする場合：

\`\`\`bash
curl -X POST https://your-project.vercel.app/api/cron \\
  -H "Authorization: Bearer YOUR_CRON_SECRET"
\`\`\`

## トラブルシューティング

### KV 接続エラー

エラー: `Failed to load config from KV`

**解決方法:**
1. Vercel Dashboard で KV が正しく接続されているか確認
2. 環境変数 `KV_REST_API_URL` などが設定されているか確認
3. `FEEDS_CONFIG_JSON` 環境変数をフォールバックとして設定

### Cron が実行されない

**確認事項:**
1. `vercel.json` の `crons` 設定が正しいか確認
2. Vercel の Logs で Cron Job のエラーを確認
3. `CRON_SECRET` が環境変数に設定されているか確認

### タイムアウトエラー

エラー: `Function execution timed out`

**解決方法:**
1. Vercel Pro プランにアップグレード（60 秒の実行時間）
2. `ARTICLES_PER_FEED` を減らす
3. フィード数を減らす、または無効化する

## ローカル開発との併用

ローカル開発では従来通り `.ai/feeds.json` を使用できます。環境変数 `VERCEL` や `VERCEL_ENV` が設定されていない場合は、自動的にファイルシステムベースのストレージが使用されます。

\`\`\`bash
# ローカル開発
npm run dev

# Vercel 環境変数を使用してローカルでテスト
vercel env pull .env.local
vercel dev
\`\`\`

## Cron スケジュールの変更

`vercel.json` の `schedule` を編集してデプロイします：

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 9 * * *"  // 毎日 9:00 AM
    }
  ]
}
\`\`\`

Cron 式の例：
- `*/5 * * * *` - 5 分ごと
- `0 * * * *` - 毎時 0 分
- `0 9 * * *` - 毎日 9:00 AM
- `0 9 * * 1` - 毎週月曜日 9:00 AM

## セキュリティ

- `CRON_SECRET` は強力なランダム文字列を使用してください
- `OPENAI_API_KEY` と `LARK_WEBHOOK_URL` は決してコードにハードコードしないでください
- Vercel KV へのアクセスは環境変数で制御されます

## サポート

問題が発生した場合は、以下を確認してください：
1. [Vercel Documentation](https://vercel.com/docs)
2. [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
3. [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
