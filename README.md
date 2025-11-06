# RssAiSummaryCompilation

RSSフィードを自動取得し、OpenAI APIで要約してLarkに投稿する自律型RSSフィードアグリゲーターです。

## 機能

- **RSSフィード取得**: 複数のRSSフィードから記事を自動取得
- **AI要約**: OpenAI API（gpt-5-nano）を使用して記事を要約
- **Lark連携**: Webhook経由でLarkグループチャットに直接投稿
- **柔軟な設定**: カスタマイズ可能なプロンプトと処理スケジュール
- **スケジュール実行**: Cron形式での自動処理
- **リアルタイムモニタリング**: 短い間隔（デフォルト5分）で新着記事をチェック
- **新着記事のみ処理**: `lastProcessed`タイムスタンプで重複を防止
- **型安全性**: 厳密な型チェックを備えたTypeScript実装
- **Vercelデプロイ対応**: サーバーレス環境での動作に対応

## セットアップ

### 必要な環境

1. **Node.js** (v18以上)
2. **OpenAI API キー**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys) から取得
3. **Lark Webhook URL**: Larkでボットを作成してWebhook URLを取得

### インストール

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してAPIキーを追加
```

### 環境変数

```env
# OpenAI API設定
OPENAI_API_KEY=sk-...

# Lark Webhook
LARK_WEBHOOK_URL=https://open.larksuite.com/open-apis/bot/v2/hook/...

# フィード処理スケジュール（cron形式）
FEED_PROCESS_SCHEDULE=0 9 * * *  # 毎日9時

# 設定ファイルの場所（ローカル開発用）
FEEDS_CONFIG_FILE=.ai/feeds.json
```

## 使用方法

### ローカル開発

```bash
# 開発モード（スケジュール実行）
npm run dev

# 1回だけ実行して終了
npm run dev -- --once

# 新着記事のみ処理（1回実行）
npm run dev -- --once --new

# ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint
```

### Vercelへのデプロイ

詳細は [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) を参照してください。

## プロジェクト構造

```
api/
└── cron.ts                    # Vercel Cron Jobsエンドポイント
src/
├── index.ts                   # メインエントリーポイント（ローカル開発用）
├── types.ts                   # 型定義
└── services/
    ├── rss.service.ts        # RSSフィード取得
    ├── summarizer.service.ts # OpenAI API統合
    ├── lark.service.ts       # Lark Webhook投稿
    ├── config.service.ts     # 設定管理（ファイルシステム/KV対応）
    ├── storage.service.ts    # ストレージ抽象化（Vercel KV対応）
    └── processor.service.ts  # フィード処理とスケジューリング
```

## 設定

### フィード設定ファイル

`.ai/feeds.json` を作成してRSSフィードを設定します：

```json
{
  "feeds": [
    {
      "id": "hn",
      "url": "https://news.ycombinator.com/rss",
      "name": "Hacker News",
      "enabled": true,
      "customPrompt": "開発者向けに技術的な内容を要約してください"
    }
  ],
  "webhookUrl": "https://open.larksuite.com/open-apis/bot/v2/hook/...",
  "defaultSystemPrompt": "簡潔に要約し、重要な情報を強調してください",
  "processSchedule": "0 9 * * *",
  "realtimeMonitoring": true,
  "realtimeIntervalMinutes": 5
}
```

### 設定項目の説明

#### フィード設定 (`feeds`)

| 項目 | 必須 | 説明 | 例 |
|------|------|------|-----|
| `id` | ✅ | フィードの一意識別子 | `"hn"` |
| `url` | ✅ | RSSフィードのURL | `"https://example.com/rss"` |
| `name` | ✅ | フィードの表示名 | `"技術ブログ"` |
| `enabled` | ✅ | 有効/無効 | `true` / `false` |
| `customPrompt` | ❌ | このフィード専用の要約プロンプト | `"技術的な内容を要約"` |
| `lastProcessed` | ❌ | 最後に処理した日時（自動管理） | `"2024-01-15T09:00:00Z"` |

#### グローバル設定

| 項目 | 必須 | 説明 | デフォルト |
|------|------|------|-----------|
| `webhookUrl` | ✅ | Lark Webhook URL | - |
| `defaultSystemPrompt` | ✅ | デフォルトの要約プロンプト | - |
| `processSchedule` | ✅ | Cron形式のスケジュール | `"0 9 * * *"` |
| `realtimeMonitoring` | ❌ | リアルタイムモニタリングを有効化 | `false` |
| `realtimeIntervalMinutes` | ❌ | リアルタイムモニタリングの間隔（分） | `5` |

### Cronスケジュール形式

- `0 9 * * *` - 毎日9時
- `0 */6 * * *` - 6時間ごと
- `*/30 * * * *` - 30分ごと
- `0 0 * * 0` - 毎週日曜日の0時
- `0 9 * * 1-5` - 平日の9時

### リアルタイムモニタリング

`realtimeMonitoring: true` を設定すると、指定した間隔（デフォルト5分）でRSSフィードをチェックし、新着記事のみを処理してLarkに送信します。

**動作の仕組み：**
1. 起動時に初期処理を実行（新着記事のみ）
2. 指定間隔でRSSフィードをチェック
3. `lastProcessed`以降の新着記事のみを処理
4. 処理完了後に`lastProcessed`を更新
5. 新着記事をLarkに送信

## APIサービス

### RSSサービス
- RSSフィードURLから記事を取得
- フィードメタデータとコンテンツを解析
- フィードURLの検証
- 日時フィルタリングによる新着記事の抽出

### 要約サービス
- OpenAI API（gpt-5-nano）との統合
- カスタム要約プロンプトのサポート
- バッチ要約処理

### Larkサービス
- Webhook経由でLarkにメッセージを投稿
- リンクとメタデータを含むフォーマット済みメッセージ
- Webhook URLの検証

### 設定サービス
- フィード設定の読み込み/保存
- ローカル環境: ファイルシステム（`.ai/feeds.json`）
- Vercel環境: Vercel KV（Redis）または環境変数
- フィードライフサイクルの管理
- 処理タイムスタンプの追跡

### ストレージサービス
- Vercel KVや環境変数からの設定読み込み
- 環境に応じた自動切り替え
- フォールバック機能（KV → 環境変数 → デフォルト）

### プロセッサーサービス
- フィード処理のオーケストレーション
- Cron式によるスケジューリング
- リアルタイムモニタリング機能
- 要約と投稿のワークフロー管理

## 開発

### 型安全性

このプロジェクトは厳密なTypeScript設定を使用しています。型チェックを実行：

```bash
npm run typecheck
```

### コード品質

```bash
npm run lint           # ESLintを実行
npm run lint -- --fix # リントエラーを自動修正
```

### ビルド

```bash
npm run build  # TypeScriptをコンパイルして ./dist に出力
```

## アーキテクチャ

### サービスレイヤー

すべてのビジネスロジックはサービスに整理されています：
- 各サービスは単一の責任を持つ
- サービス間の明確なインターフェース
- 独立性の高いテスト可能な設計

### 設定駆動型

- すべての設定が環境変数と設定ファイルに外部化
- ハードコードされた値なし
- 異なる環境に簡単にカスタマイズ可能

### エラーハンドリング

- 包括的なエラーメッセージ
- 適切な失敗モード
- デバッグ用のログ出力

### 環境対応

- **ローカル開発**: ファイルシステムベースのストレージと`node-cron`
- **Vercel環境**: Vercel KVとVercel Cron Jobs
- 環境変数による自動検出と切り替え

## デプロイ

### ローカル環境

ローカル開発では従来通り`.ai/feeds.json`を使用できます。

### Vercel環境

Vercelにデプロイする場合、以下の変更が自動的に適用されます：

- ストレージ: Vercel KV（Redis）または環境変数
- スケジューリング: Vercel Cron Jobs（`vercel.json`で設定）
- 設定管理: Vercel KVまたは`FEEDS_CONFIG_JSON`環境変数

詳細は [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) を参照してください。

## トラブルシューティング

### 記事が取得されない

1. フィードURLが有効か確認
2. フィードが有効になっているか確認（`enabled: true`）
3. RSSフィードの構文が正しいか確認

### Larkにメッセージが届かない

1. Webhook URLが正しいか確認
2. Larkボットがグループに追加されているか確認
3. アプリケーションのログでエラーを確認

### Vercel環境での問題

詳細は [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) のトラブルシューティングセクションを参照してください。

## ライセンス

MIT License - LICENSEファイルを参照してください

## ステータス

✅ **実装完了**
- コア機能を実装
- Vercelデプロイ対応
- 本番環境対応の設定
