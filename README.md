# RssAiSummaryCompilation

RSSフィードを自動取得し、OpenAI APIで要約してLarkに投稿する自律型RSSフィードアグリゲーターです。

## 機能

- **RSSフィード取得**: 複数のRSSフィードから記事を自動取得
- **Lark Base統合**: Lark Base（飞书多维表格）からRSSフィードURLを自動取得 🆕
- **AI要約**: OpenAI API（gpt-5-nano）を使用して記事を要約
- **Lark連携**: Webhook経由でLarkグループチャットに直接投稿
- **設定UIWeb**: Lark Base連携の設定をブラウザから管理 🆕
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
# バックエンド開発モード（スケジュール実行）
npm run dev

# 1回だけ実行して終了
npm run dev -- --once

# 新着記事のみ処理（1回実行）
npm run dev -- --once --new

# 設定UIサーバーを起動 🆕
npm run dev:next
# → http://localhost:3000 でアクセス

# ビルド（バックエンド + フロントエンド）
npm run build

# バックエンドのみビルド
npm run build:backend

# フロントエンドのみビルド
npm run build:frontend

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
└── cron.ts                        # Vercel Cron Jobsエンドポイント
app/                               # Next.js App Router 🆕
├── layout.tsx                    # レイアウト
├── page.tsx                      # 設定UI（メインページ）
└── api/                          # APIルート
    ├── config/route.ts           # 設定管理API
    └── lark-base/
        ├── test/route.ts         # Lark Base接続テスト
        └── fetch/route.ts        # Lark Baseからフィード取得
src/
├── index.ts                       # メインエントリーポイント（ローカル開発用）
├── types.ts                       # 型定義
└── services/
    ├── rss.service.ts            # RSSフィード取得
    ├── summarizer.service.ts     # OpenAI API統合
    ├── lark.service.ts           # Lark Webhook投稿
    ├── lark-base.service.ts      # Lark Base API統合 🆕
    ├── config.service.ts         # 設定管理（ファイルシステム/KV対応）
    ├── storage.service.ts        # ストレージ抽象化（Vercel KV対応）
    └── processor.service.ts      # フィード処理とスケジューリング
next.config.js                     # Next.js設定 🆕
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

## Lark Base統合 🆕

Lark Base（飛书多維表格 / Feishu Base）からRSSフィードURLを自動取得できます。これにより、RSSフィードの管理をLark Baseで一元化できます。

### Lark Base設定

#### 1. Larkアプリの作成

1. [Lark Open Platform](https://open.larksuite.com/) または [Feishu Open Platform](https://open.feishu.cn/) にアクセス
2. 新しいアプリを作成
3. **App ID** と **App Secret** を取得
4. アプリに以下の権限を付与：
   - `bitable:app` - Base（多維表格）へのアクセス
   - `bitable:app:readonly` - Baseデータの読み取り

#### 2. Lark Baseの準備

Lark Baseに以下のフィールドを持つテーブルを作成：

| フィールド名 | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `URL` | テキスト | ✅ | RSSフィードのURL |
| `Name` | テキスト | ❌ | フィードの表示名 |
| `Enabled` | チェックボックス | ❌ | 有効/無効の切り替え |

**注意:** フィールド名は設定UIでカスタマイズできます。

#### 3. Base URLとTable IDの取得

1. Lark BaseのURLを開く（例：`https://example.larksuite.com/base/abc123?table=tblxxx&view=vewyyy`）
2. **Base URL**: `https://example.larksuite.com/base/abc123`
3. **Table ID**: URLの`table=`パラメータ（例：`tblxxx`）
4. **View ID**（オプション）: URLの`view=`パラメータ（例：`vewyyy`）

#### 4. 設定UIで設定

```bash
npm run dev:next
```

http://localhost:3000 にアクセスして、以下を入力：

- **Lark App ID**: `cli_xxx...`
- **Lark App Secret**: アプリのシークレット
- **Base URL**: `https://example.larksuite.com/base/abc123`
- **Table ID**: `tblxxx`
- **View ID**（オプション）: 特定のビューのみ取得する場合

「Test Connection」ボタンで接続を確認後、「Save Configuration」で保存します。

#### 5. フィールド名のカスタマイズ（オプション）

設定UIの「Advanced: Field Names」セクションで、Lark Baseのフィールド名をカスタマイズできます：

- **URL Field Name**: RSSフィードURLが入っているフィールド（デフォルト: `URL`）
- **Name Field Name**: フィード名が入っているフィールド（デフォルト: `Name`）
- **Enabled Field Name**: 有効/無効を管理するフィールド（デフォルト: `Enabled`）

### フィールドバリデーション

Lark Base設定には以下のバリデーションが適用されます：

- **App ID**: 必須、Lark App ID形式（例：`cli_xxx...`）
- **App Secret**: 必須、セキュアに保管
- **Base URL**: 必須、以下の形式：
  - `https://[tenant].larksuite.com/base/[baseId]`
  - `https://[tenant].feishu.cn/base/[baseId]`
- **Table ID**: 必須、テーブルID（例：`tblxxx...`）
- **View ID**: オプション、ビューID（例：`vewxxx...`）
- **フィールド名**: 空文字列は不可

### Lark Base統合の動作

1. フィード処理開始時に、Lark BaseからRSSフィードURLを取得
2. 取得したフィードと設定ファイル内のフィードをマージ（Lark Baseが優先）
3. 有効なフィードのみを処理
4. Lark Base取得に失敗した場合は、設定ファイルのフィードにフォールバック

### プログラムでの設定（JSON）

`.ai/feeds.json` または Vercel KVに直接設定することもできます：

```json
{
  "feeds": [...],
  "webhookUrl": "...",
  "defaultSystemPrompt": "...",
  "processSchedule": "0 9 * * *",
  "larkBase": {
    "appId": "cli_xxx...",
    "appSecret": "your-secret",
    "baseUrl": "https://example.larksuite.com/base/abc123",
    "tableId": "tblxxx",
    "viewId": "vewyyy",
    "urlFieldName": "URL",
    "nameFieldName": "Name",
    "enabledFieldName": "Enabled"
  }
}
```

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

### Lark Baseサービス 🆕
- Lark App認証（App ID + App Secret）
- Lark Base APIとの通信
- レコードの取得とフィード設定への変換
- フィールドバリデーションとエラーハンドリング
- 接続テスト機能

### プロセッサーサービス
- フィード処理のオーケストレーション
- Lark Baseからのフィード自動取得 🆕
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
