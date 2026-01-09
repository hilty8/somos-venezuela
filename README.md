# Somos Venezuela（ソモス・ベネズエラ）

**あなたの関心が、ベネズエラへの架け橋になります。**

ベネズエラの復興を、世界中のチームで支えるためのオープンソース寄付プラットフォーム。

## ドキュメント（Canon）

プロジェクトの価値観・仕様・開発計画は、以下のCanonドキュメントで管理されています：

- [00_PHILOSOPHY.md](./docs/00_PHILOSOPHY.md) - 価値観・編集方針の唯一の正本
- [01_SPEC.md](./docs/01_SPEC.md) - システム仕様の唯一の正本
- [02_DEV_PLAN.md](./docs/02_DEV_PLAN.md) - 開発計画の唯一の正本
- [CHANGELOG.md](./docs/CHANGELOG.md) - 変更履歴

## 技術スタック

- **Next.js 14+** (App Router) - Web（Public + Admin + API）
- **TypeScript** - 型安全性
- **Prisma** - ORM
- **PostgreSQL** - データベース
- **NextAuth.js** - 管理画面認証
- **Tailwind CSS** - スタイリング

## 開発環境のセットアップ

### 必要条件

- Node.js 20以上
- PostgreSQL 14以上
- pnpm（このプロジェクトはpnpmで管理されています）

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な値を設定します。

```bash
cp .env.example .env
```

最低限必要な環境変数：
- `DATABASE_URL` - PostgreSQL接続文字列
- `NEXTAUTH_SECRET` - 認証用のシークレット（32文字以上のランダム文字列）
- `NEXTAUTH_URL` - アプリケーションのURL（ローカルは `http://localhost:3000`）

### 3. データベースのセットアップ

```bash
# Prisma Clientの生成
pnpm prisma generate

# マイグレーション実行
pnpm db:migrate

# 初期データ投入（管理者ユーザー等）
pnpm db:seed
```

**重要**: `pnpm db:seed` を実行すると、ランダムな初回パスワードが生成され、コンソールに1回だけ表示されます。このパスワードを必ず保存してください！

```
🔑 INITIAL PASSWORD (save this - shown only once):
    xK8@mP2#qR5!vN9...
    Please change this password after first login!
```

環境変数 `ADMIN_INITIAL_PASSWORD` を設定することで、固定パスワードを使用することもできます（開発環境のみ推奨）。

### 4. 開発サーバーの起動

```bash
pnpm dev
```

アプリケーションは http://localhost:3000 で起動します。

管理画面: http://localhost:3000/admin/dashboard
- Email: `admin@somos-venezuela.org`
- Password: seed時に表示されたパスワード

### 5. データベース管理（Prisma Studio）

```bash
pnpm db:studio
```

ブラウザでデータベースの内容を確認・編集できます。

## Workerジョブの実行

### 寄付金額取得（KGI）

```bash
pnpm worker:fetch-donations
```

### 情報ソース取得（RSS/Scrape）

```bash
pnpm worker:fetch-sources
```

このWorkerは、登録された情報ソース（ホワイトリスト）からRSS/スクレイプで記事を収集し、`raw_items` テーブルに保存します。URL重複は自動的に排除されます。

### 日次記事生成パイプライン（G0: 手動実行）

```bash
pnpm worker:daily-pipeline
```

または、Admin UI (`/admin/pipeline`) から手動実行できます。

**パイプラインの流れ:**
1. raw_items（status=NEW）を取得
2. 各アイテムに対して:
   - 記事生成（writer prompt + template）
   - ブロック検証（FACT must have evidence_urls）
   - 分類（classify prompt）
   - レビュー（Hard Fail rules + LLM scoring 0-100）
   - 不合格の場合: リライト（最大2回）
   - 合格: 公開（PUBLISHED）
   - 不合格: 保留（HOLD）
3. 統計とログを保存

**レビュー基準（0-100スケール）:**
- 各カテゴリ最低スコア: 70点（Evidence, Neutrality, Overclaim, Dignity, Scope）
- 平均スコア: 80.0点以上
- Hard Fail違反（政治的評価語/断罪/煽動）は即不合格

**環境変数:**
- `REVIEW_PASS_SCORE_MIN="70"` - カテゴリ別最低スコア（0-100）
- `REVIEW_PASS_SCORE_AVG="80"` - 平均最低スコア（0-100）
- `REVIEW_MAX_AUTOFIX_ATTEMPTS="2"` - リライト最大回数

## Prompt as Code（プロンプト・テンプレート管理）

このプロジェクトでは、プロンプトとテンプレートを **Git上のMarkdownファイル** として管理しています（Prompt as Code）。

### ファイル構成

- `prompts/` - AIプロンプトの正本（writer.md, reviewer.md, rewrite.md, classify.md, summarize.md）
- `templates/` - 記事テンプレートの正本（article_template_v1.md）

各ファイルはYAML frontmatterでメタデータを含みます：

```markdown
---
name: writer
version: v1
type: DRAFT
description: Daily記事生成用プロンプト
---

プロンプト内容...
```

### 運用フロー

#### 1. プロンプト/テンプレートの変更

```bash
# prompts/*.md または templates/*.md を編集
git add prompts/writer.md
git commit -m "Update writer prompt for better neutrality"
git push
```

#### 2. DBへの同期

**推奨: ローカルまたはCIで実行**

```bash
# ローカル環境で同期（推奨）
pnpm prompts:sync
pnpm templates:sync
```

**開発環境のみ**: Admin UI (`/admin/prompts`, `/admin/templates`) の「同期」ボタンから実行可能。

**本番環境では同期APIは無効化されています**。本番での同期が必要な場合（緊急時のみ）:
- 環境変数 `ALLOW_SYNC_API=true` を設定
- ただし、通常はCI/CDパイプラインまたはローカルで実行を推奨

#### 3. Active版の切替

- Admin UIでバージョン一覧から「Activeにする」をクリック
- 実行時は常にActive版が使用される
- Rollback = 過去版をActiveにする

### バージョン管理のルール

- **ファイルのversion（frontmatter）を変更しない限り、再syncしても新バージョンは作成されない**
- Content変更時は必ずversionをインクリメント（例: v1 → v2）
- 同一versionで内容変更した場合、syncスクリプトが警告を表示

### DBの役割

- **正本**: Git上のMarkdownファイル
- **DB**: Activeバージョンの参照と履歴管理のみ
- DBで直接編集しない（SourceType=FILEは読み取り専用）

## プロジェクト構成

```
/
├── docs/                    # Canonドキュメント
├── prompts/                 # AIプロンプト（正本・Prompt as Code）
│   ├── writer.md           # 記事生成プロンプト
│   ├── reviewer.md         # レビュープロンプト
│   ├── rewrite.md          # 改修プロンプト
│   ├── classify.md         # 分類プロンプト
│   └── summarize.md        # 要約プロンプト
├── templates/               # 記事テンプレート（正本）
│   └── article_template_v1.md
├── scripts/                 # 運用スクリプト
│   ├── sync-prompts.ts     # プロンプト同期
│   └── sync-templates.ts   # テンプレート同期
├── prisma/                  # Prismaスキーマとマイグレーション
│   ├── schema.prisma       # データベーススキーマ
│   └── seed.ts             # 初期データ
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (public)/      # 公開サイト
│   │   ├── news/          # 記事一覧・詳細（公開）
│   │   ├── admin/         # 管理画面
│   │   │   └── pipeline/  # パイプライン実行UI
│   │   └── api/           # API Routes
│   ├── lib/               # 共通ライブラリ
│   │   ├── db.ts         # Prisma Client
│   │   ├── llm/          # LLM抽象化レイヤー（OpenAI/Anthropic/Groq）
│   │   ├── pipeline/     # 記事生成パイプライン
│   │   └── utils/        # ユーティリティ
│   └── components/        # Reactコンポーネント
├── workers/               # バッチジョブスクリプト
│   ├── fetch-donations.ts  # KGI取得
│   ├── fetch-sources.ts    # 情報ソース取得（RSS/Scrape）
│   └── daily-pipeline.ts   # 日次記事生成
└── public/                # 静的ファイル
```

## Railway へのデプロイ

Railway での構成は以下の通りです：

### サービス構成

1. **Web** - Next.jsアプリケーション（Public + Admin + API）
   - Build Command: `pnpm install && pnpm prisma generate && pnpm build`
   - Start Command: `pnpm start`
   - Port: 3000
   - 環境変数:
     - `DATABASE_URL` (PostgreSQLサービスから自動設定)
     - `NEXTAUTH_SECRET` (ランダム文字列32文字以上)
     - `NEXTAUTH_URL` (デプロイ後のURL、例: `https://your-app.up.railway.app`)
     - LLM関連の環境変数（`.env.example` 参照）

2. **PostgreSQL** - データベース
   - Railway の PostgreSQL プラグインを使用
   - 自動的に `DATABASE_URL` が Web サービスに注入される

3. **Cron Jobs** - バッチジョブ（Railwayの Cron Jobs機能）
   - **日次KGI取得**
     - Schedule: `0 */6 * * *` (6時間ごと)
     - Command: `pnpm worker:fetch-donations`
   - **情報ソース取得** (M1)
     - Schedule: `0 */12 * * *` (12時間ごと)
     - Command: `pnpm worker:fetch-sources`
   - **日次記事生成** (M1実装後)
     - Schedule: `0 9 * * *` (毎日9:00 UTC)
     - Command: `pnpm worker:daily-pipeline`

   **注**: Railwayのcron jobsは、Webサービスと同じビルド済みイメージを使用するため、依存関係のインストールは不要です。Webサービスのビルド時に `pnpm install && pnpm prisma generate` が実行されます。

### デプロイ手順

#### 1. Railwayプロジェクトの作成

```bash
# Railway CLIをインストール（初回のみ）
npm install -g @railway/cli
# または
pnpm add -g @railway/cli

# Railwayにログイン
railway login

# 新規プロジェクト作成
railway init
```

#### 2. PostgreSQLの追加

Railway ダッシュボードで:
1. "New Service" → "Database" → "PostgreSQL" を選択
2. 自動的に `DATABASE_URL` が生成される

#### 3. Webサービスのデプロイ

```bash
# プロジェクトをRailwayにリンク
railway link

# デプロイ
railway up
```

#### 4. 環境変数の設定

Railway ダッシュボードで Web サービスに以下を設定:
- `NEXTAUTH_SECRET`: `openssl rand -base64 32` で生成
- `NEXTAUTH_URL`: デプロイ後の URL (例: `https://your-app.up.railway.app`)
- `ADMIN_INITIAL_PASSWORD`: (オプション) 初回管理者パスワード

#### 5. データベースマイグレーション

```bash
# Railwayのシェルで実行
railway run pnpm db:migrate:deploy
railway run pnpm db:seed
```

**重要**: `pnpm db:seed` 実行時に表示される初回パスワードを保存してください！

#### 6. Cron Jobsの設定

Railway ダッシュボードで:
1. "New Service" → "Cron Job" を選択
2. 環境変数を Web サービスと同じに設定（`DATABASE_URL` も必要）
3. Schedule と Command を設定（上記参照）

### 本番環境での動作確認手順

#### 1. 管理画面ログイン

1. `https://your-app.up.railway.app/admin/login` にアクセス
2. Email: `admin@somos-venezuela.org`
3. Password: seed時に出力されたパスワード

#### 2. 寄付キャンペーン登録

1. `/admin/campaigns` で「新規キャンペーン」をクリック
2. 以下を入力:
   - 名前: 例 "UNHCR Venezuela Emergency"
   - カテゴリ: "refugee"
   - 提供元: "UNHCR"
   - 公開合計URL: キャンペーンページのURL
   - Parse Config (JSON):
     ```json
     {
       "selector": ".total-amount",
       "regex": "\\$([\\d,]+(?:\\.\\d{2})?)",
       "currency": "USD"
     }
     ```
   - 寄付URL: 実際の寄付ページURL

#### 3. 情報ソース登録（M1以降）

1. `/admin/sources` で「新規ソース」をクリック
2. 以下を入力:
   - 名前: 例 "UNHCR Venezuela News"
   - URL: RSS FeedまたはウェブページのURL
   - カテゴリ: "humanitarian" / "un" / "ngo" など
   - 取得方式: "rss" (推奨) または "scrape"
   - 有効: チェック

#### 4. 手動チェック実行

1. キャンペーン一覧で「テスト」ボタンをクリック
2. 成功すれば金額が取得され、スナップショットが保存される
3. 失敗した場合はエラーメッセージを確認し、Parse Configを調整

#### 5. Cron実行確認

1. Railway ダッシュボードで Cron Job のログを確認
2. 正常に実行されていることを確認
3. `/admin/dashboard` でKGIが更新されていることを確認
4. （M1以降）情報ソース取得Cronが動作していることを確認

#### 6. Public Homeで確認

1. `https://your-app.up.railway.app/` にアクセス
2. KGI（累計寄付金額）が表示されていることを確認
3. 最終更新日時が正しいことを確認

### トラブルシューティング

#### KGIが0のまま

- Cron Jobが実行されているか確認（Railwayダッシュボード）
- キャンペーンの `isActive` が `true` になっているか確認
- Parse Configが正しいか「テスト」ボタンで確認

#### 管理画面にログインできない

- `NEXTAUTH_SECRET` と `NEXTAUTH_URL` が正しく設定されているか確認
- パスワードは seed 実行時に表示されたものを使用

#### Prisma エラー

- `DATABASE_URL` が正しく設定されているか確認
- デプロイ後に `railway run pnpm prisma generate` を実行

## Production Runbook（本番運用手順書）

このセクションでは、Railway本番環境への初回デプロイから日次運用までの完全な手順を記載します。

### 前提条件

- Railway アカウントとプロジェクトが作成済み
- GitHub リポジトリが Railway に接続済み
- Railway CLI がインストール済み（`npm install -g @railway/cli`）

### サービス構成（Railway）

本番環境は以下の3つのサービスで構成されます：

1. **Web Service** - Next.js アプリケーション（Public + Admin + API）
   - ビルド: `pnpm install && pnpm prisma generate && pnpm build`
   - 起動: `pnpm start`
   - ポート: 3000
   - 公開URL: Railway が自動生成

2. **PostgreSQL Service** - データベース
   - Railway の PostgreSQL プラグイン
   - `DATABASE_URL` が Web Service に自動注入される

3. **Cron Job Services** - バッチ処理（3つ）
   - **KGI取得**: `0 */6 * * *` (UTC基準: 6時間ごと)
   - **ソース取得**: `0 */12 * * *` (UTC基準: 12時間ごと)
   - **記事生成**: `0 0 * * *` (UTC基準: 毎日0:00 = JST 9:00)

**重要: UTC/JST時刻の扱い**
- Railway Cron は **UTC基準** でスケジュール実行されます
- JST (日本時間) = UTC + 9時間
- 例: JST 9:00 に実行したい場合 → `0 0 * * *` (UTC 0:00)
- 例: JST 18:00 に実行したい場合 → `0 9 * * *` (UTC 9:00)
- アプリケーション内部では `new Date().toLocaleString("ja-JP")` で JST 表示

### 初回デプロイ手順

#### 1. PostgreSQL Service の追加

Railway ダッシュボードで:
1. "New Service" → "Database" → "PostgreSQL" を選択
2. `DATABASE_URL` が自動生成される（Web Service から参照可能）

#### 2. Web Service の環境変数設定

Railway ダッシュボード → Web Service → Variables で以下を設定:

**認証関連（必須）:**
```bash
NEXTAUTH_SECRET="<32文字以上のランダム文字列>"  # openssl rand -base64 32 で生成
NEXTAUTH_URL="https://your-app.up.railway.app"    # デプロイ後のURL
ADMIN_INITIAL_PASSWORD="<初回パスワード>"         # Seed用（必須）
```

**LLM関連（必須）:**
```bash
# プロバイダー選択（デフォルトは openai）
LLM_PROVIDER="openai"  # "openai" | "anthropic" | "groq"

# OpenAI（推奨）
OPENAI_API_KEY="sk-..."
LLM_MODEL_WRITER="gpt-4o-mini"
LLM_MODEL_REVIEWER="gpt-4o-mini"
LLM_MODEL_CLASSIFY="gpt-4o-mini"
LLM_MODEL_REWRITE="gpt-4o-mini"
LLM_MODEL_SUMMARIZE="gpt-4o-mini"
```

**パイプライン制御（G1: 暴走防止）:**
```bash
PIPELINE_MAX_ITEMS_PER_RUN="10"           # 1回の実行で処理する最大アイテム数
PIPELINE_MAX_ITEMS_PER_SOURCE="5"         # 1ソースあたりの最大アイテム数
PIPELINE_MAX_LLM_CALLS_PER_RUN="50"       # 1回の実行での最大LLM呼び出し数
PIPELINE_STALE_PROCESSING_MINUTES="120"   # PROCESSINGをstaleとみなす時間（分）
PIPELINE_MAX_RETRY_PER_ITEM="2"           # アイテムごとの最大リトライ回数
```

**レビュー基準（0-100スケール）:**
```bash
REVIEW_PASS_SCORE_MIN="70"      # カテゴリ別最低スコア（0-100）
REVIEW_PASS_SCORE_AVG="80"      # 平均最低スコア（0-100）
REVIEW_MAX_AUTOFIX_ATTEMPTS="2" # リライト最大回数
```

**Prompt as Code（セキュリティ）:**
```bash
ALLOW_SYNC_API="false"  # 本番では必ず false（Admin UIから同期不可）
```

#### 3. データベースマイグレーション

Railway CLI を使用してマイグレーションを実行:

```bash
# Railway環境にログイン
railway login

# プロジェクトにリンク
railway link

# マイグレーション実行（本番用）
railway run --service web pnpm prisma migrate deploy

# 初期データ投入（管理者ユーザー作成）
railway run --service web pnpm db:seed
```

**重要**: `pnpm db:seed` 実行時に **初回パスワードがコンソールに1回だけ表示されます**。このパスワードを必ず保存してください！

```
🔑 INITIAL PASSWORD (save this - shown only once):
    xK8@mP2#qR5!vN9...
    Please change this password after first login!
```

環境変数 `ADMIN_INITIAL_PASSWORD` を設定している場合は、そのパスワードが使用されます。

#### 4. Cron Job Services の設定

Railway ダッシュボードで各Cron Jobを作成:

**Cron Job 1: KGI取得**
- Schedule: `0 */6 * * *` (6時間ごと、UTC基準)
- Command: `pnpm worker:fetch-donations`
- 環境変数: Web Service と同じ設定をコピー（`DATABASE_URL` も必要）

**Cron Job 2: ソース取得**
- Schedule: `0 */12 * * *` (12時間ごと、UTC基準)
- Command: `pnpm worker:fetch-sources`
- 環境変数: Web Service と同じ設定をコピー

**Cron Job 3: 日次記事生成（G1）**
- Schedule: `0 0 * * *` (UTC 0:00 = JST 9:00)
- Command: `pnpm worker:daily-pipeline`
- 環境変数: Web Service と同じ設定をコピー（LLM APIキーも必須）

**注意**: Cron Job Services は Web Service と同じビルド済みイメージを使用するため、依存関係のインストールは不要です。

### 本番環境の検証手順（必須）

以下の手順を **順番通りに** 実行して、本番環境が正しく動作することを確認してください。

#### Step 1: 情報ソースの登録

1. `https://your-app.up.railway.app/admin/login` にアクセス
2. Email: `admin@somos-venezuela.org`
3. Password: seed時に保存したパスワード
4. `/admin/sources` で「新規ソース」をクリック
5. 以下を入力:
   - 名前: 例 "UNHCR Venezuela News"
   - URL: RSS FeedのURL（例: `https://www.unhcr.org/news/rss`）
   - カテゴリ: "humanitarian"
   - 取得方式: "rss"
   - 有効: チェック
6. 「保存」をクリック

#### Step 2: ソース取得の手動実行

Railway CLI で手動実行してデータが取得できることを確認:

```bash
railway run --service web pnpm worker:fetch-sources
```

**確認ポイント**:
- 実行ログに "Fetched X items from [ソース名]" が表示される
- `/admin/sources` で「Last Fetch」が更新されている
- Prisma Studio または Admin UI で `raw_items` テーブルにデータが保存されている（status=NEW）

#### Step 3: Prompts/Templates の同期

**推奨方法: ローカル環境から同期**

```bash
# ローカルで実行（Railway の DATABASE_URL を使用）
railway run pnpm prompts:sync
railway run pnpm templates:sync
```

**または Railway CLI で実行**:
```bash
railway run --service web pnpm prompts:sync
railway run --service web pnpm templates:sync
```

**確認ポイント**:
- `/admin/prompts` でバージョン一覧が表示される
- 各プロンプトタイプ（DRAFT, REVIEW, REWRITE, CLASSIFY, SUMMARIZE）にActive版が設定されている
- `/admin/templates` でテンプレートバージョンが表示され、Active版が設定されている

**重要**: 本番環境では `ALLOW_SYNC_API=false` のため、Admin UI の「同期」ボタンは無効化されています。同期は必ずローカルまたはCIから実行してください。

#### Step 4: 日次パイプラインの手動実行

Railway CLI で手動実行して記事生成が成功することを確認:

```bash
railway run --service web pnpm worker:daily-pipeline
```

**確認ポイント**:
- 実行ログに "Pipeline completed" が表示される
- `raw_items` の status が NEW → PROCESSING → PROCESSED/HOLD/FAILED に遷移
- 成功した場合、`articles` テーブルに新規記事が保存される（status=PUBLISHED または HOLD）
- `/admin/ops` で PipelineRun の統計が表示される（published/hold/failed 件数）

#### Step 5: 公開サイトで記事を確認

1. `https://your-app.up.railway.app/news` にアクセス
2. 記事一覧が表示されることを確認
3. 記事タイトルをクリックして詳細ページを確認
4. **FACT/INFERENCE/UNVERIFIED ブロックが正しく表示**されることを確認
5. FACT ブロックに **evidence_urls のリンク**が表示されることを確認

**確認ポイント**:
- 記事が公開されている（status=PUBLISHED）
- 記事詳細ページが正しく表示される
- メタデータ（カテゴリ、公開日時）が正しい

#### Step 6: Admin Ops ダッシュボードで運用状態を確認

1. `/admin/ops` にアクセス
2. 以下が正しく表示されることを確認:
   - **Raw Items stats**: NEW, PROCESSING, PROCESSED, HOLD, FAILED の件数
   - **Article stats**: PUBLISHED, HOLD, DRAFT の件数
   - **Today's Pipeline Runs**: 実行履歴（Run ID, Status, Results）
   - **Stale PROCESSING**: 0件（正常時）
   - **Failed Items**: 失敗したアイテム一覧（エラー理由、リトライ回数）
   - **Hold Articles**: 保留記事一覧（レビュー結果、Hard Fail理由）

**確認ポイント**:
- Stale PROCESSING が 0 件（または正常範囲内）
- Failed Items のエラー理由が明確
- Hold Articles のレビュー結果が詳細に表示される

#### Step 7: /go リダイレクトとクリック追跡の確認

1. `/admin/campaigns` で寄付キャンペーンを登録:
   - 名前: "Test Campaign"
   - カテゴリ: "general"
   - 提供元: "Test"
   - 寄付URL: 実際の寄付ページURL（例: UNHCR）
   - 有効: チェック
2. キャンペーンIDをコピー（例: `cm123abc`）
3. ブラウザで `/go/cm123abc` にアクセス
4. 寄付ページにリダイレクトされることを確認
5. Prisma Studio または Admin UI で `click_events` テーブルを確認
6. クリックイベントが保存されていることを確認（campaignId, clickedAt, userAgent, referer）

**確認ポイント**:
- `/go/{id}` が正しくリダイレクトする（302 status）
- `click_events` テーブルにイベントが記録される
- KGI測定のための基本データが収集できている

### 日次運用フロー（G1）

#### 自動実行（Cron）

以下が自動的に実行されます：

1. **毎日 UTC 0:00 (JST 9:00)**: 日次記事生成パイプライン
   - raw_items（status=NEW）を最大10件処理
   - 失敗アイテム（FAILED）を自動リトライ（retry_count < 2）
   - 記事を生成 → レビュー → 公開/保留

2. **6時間ごと**: KGI取得（寄付金額スナップショット）

3. **12時間ごと**: 情報ソース取得（RSS/Scrape）

#### 管理者の日次タスク

1. **Morning Check（毎朝）**:
   - `/admin/ops` で昨日のパイプライン実行結果を確認
   - Stale PROCESSING があれば回収（NEW または FAILED に戻す）
   - Failed Items を確認し、必要に応じて再試行

2. **Hold Articles Review（週1回程度）**:
   - `/admin/ops` の Hold Articles セクションを確認
   - レビュー不合格の理由を確認
   - 必要に応じて手動で修正して公開

3. **Error Monitoring**:
   - Railway ダッシュボードで Cron Job のログを確認
   - エラーがあれば原因を調査（LLM API制限、DB接続エラー等）

#### トラブルシューティング

**Stale PROCESSING が発生した場合**:
1. `/admin/ops` で件数を確認
2. 原因を調査（Railway ログでエラーを確認）
3. "NEW に戻す" または "FAILED にする" で回収
4. 必要に応じてパイプラインを手動実行

**Failed Items が増えている場合**:
1. エラー理由を確認（LLM API エラー、ネットワークエラー等）
2. 環境変数を確認（LLM APIキー、接続設定等）
3. リトライ上限（MAX_RETRY_PER_ITEM=2）に達していないか確認
4. 問題解決後、バッチで再試行

**Hold Articles が増えている場合**:
1. レビュー結果を確認（Hard Fail 理由、スコア）
2. Prompt を改善して再デプロイ
3. 手動で記事を修正して公開

### セキュリティチェックリスト

- [ ] `NEXTAUTH_SECRET` が32文字以上のランダム文字列
- [ ] `ADMIN_INITIAL_PASSWORD` が強力なパスワード（本番環境）
- [ ] `ALLOW_SYNC_API=false` に設定（本番環境）
- [ ] LLM APIキーが安全に管理されている（Railway Variables）
- [ ] PostgreSQL の `DATABASE_URL` が外部に漏れていない
- [ ] Audit Logs が有効化されている（管理者操作の記録）

### Operational Kill Switches（運用キルスイッチ）

本番環境で問題が発生した場合、各 worker を即座に停止できるキルスイッチが用意されています。

**環境変数**:
- `PIPELINE_ENABLED="true"` - 日次記事生成パイプラインの有効/無効
- `FETCH_SOURCES_ENABLED="true"` - 情報ソース取得の有効/無効
- `FETCH_DONATIONS_ENABLED="true"` - KGI寄付金額取得の有効/無効

**使用方法**:
1. Railway ダッシュボード → 該当サービス → Variables で環境変数を `false` に設定
2. 次回の Cron 実行時、worker はスキップされ、ログに理由が記録される
3. 問題解決後、環境変数を `true` に戻す

**注意事項**:
- `false` に設定すると、worker は何も実行せず即座に終了します
- PipelineRun または worker ログに「kill switch」による停止理由が記録されます
- 緊急時（LLM API制限、予算超過、データ品質問題等）に使用してください

**監視**:
- 各 worker のログに1行サマリーが出力されます（status=skipped reason=kill_switch）
- `/admin/ops` で停止中のパイプラインを確認できます

### JSON Repair Policy（JSON修復方針）

LLMが生成する JSON が不正な形式の場合、自動修復機能が動作します。

**修復フロー**:
1. **初回 Parse**: LLM の出力を JSON.parse で解析
2. **Parse 失敗時**: LLM に「JSONとして修復して返す」短いプロンプトを送信（1回のみ）
3. **修復成功**: 修復済み JSON で記事生成を続行
4. **修復失敗**: raw_item を FAILED にマーク、errorReason に "INVALID_JSON:" プレフィックス付きエラーを記録

**リトライルール**:
- JSON 修復失敗は通常の FAILED として扱われる
- `PIPELINE_MAX_RETRY_PER_ITEM` の上限内で自動リトライされる（デフォルト: 2回）
- 3回目も失敗した場合、管理者が `/admin/ops` で確認・手動対処

**監視ポイント**:
- `/admin/ops` の Failed Items で "INVALID_JSON" エラーを確認
- 頻発する場合、writer prompt またはテンプレートの見直しが必要

**ログ例**:
```
[generate-article] JSON parse failed, attempting repair: Unexpected token...
[generate-article] JSON repair successful
```
または
```
[generate-article] JSON parse failed, attempting repair: Unexpected token...
INVALID_JSON: Failed to parse and repair LLM response. Original error: ..., Repair error: ...
```

### パフォーマンスチューニング

**パイプライン制御の調整**:
- `PIPELINE_MAX_ITEMS_PER_RUN`: 1回の実行で処理するアイテム数（デフォルト: 10）
  - 増やすと処理速度向上、LLMコスト増加
  - 減らすとコスト削減、処理速度低下
- `PIPELINE_MAX_LLM_CALLS_PER_RUN`: LLM呼び出し上限（デフォルト: 50）
  - 暴走防止の最終防御線
  - 1記事あたり最大5回のLLM呼び出し（生成+分類+レビュー+リライト×2）

**レビュー基準の調整**:
- `REVIEW_PASS_SCORE_MIN`: 厳しくすると品質向上、Hold記事増加
- `REVIEW_PASS_SCORE_AVG`: 全体的な品質基準

### Day-0 本番リハーサル（Railway）

本番環境への初回デプロイ後、cron 自動運用を開始する前に、**全機能を手動で一度完走**してください。

このリハーサルの目的は：
- 各 worker の動作確認
- 環境変数の調整（レビュー基準、パイプライン上限）
- 初期データの品質確認
- 運用手順の習熟

#### (1) 事前準備チェックリスト

**Kill Switch（必須）**:
- [ ] `PIPELINE_ENABLED="true"` に設定
- [ ] `FETCH_SOURCES_ENABLED="true"` に設定
- [ ] `FETCH_DONATIONS_ENABLED="true"` に設定

**パイプライン設定（初回は小さめ推奨）**:
- [ ] `PIPELINE_MAX_ITEMS_PER_RUN="3"` に設定（初回は 3 件で様子見）
- [ ] `PIPELINE_MAX_ITEMS_PER_SOURCE="2"` に設定
- [ ] `PIPELINE_MAX_LLM_CALLS_PER_RUN="20"` に設定（コスト管理）
- [ ] `PIPELINE_STALE_PROCESSING_MINUTES="120"` （デフォルト維持）
- [ ] `PIPELINE_MAX_RETRY_PER_ITEM="2"` （デフォルト維持）

**レビュー基準（初回はやや甘め推奨）**:
- [ ] `REVIEW_PASS_SCORE_MIN="65"` に設定（初回は 65 点でテスト、後で 70 に上げる）
- [ ] `REVIEW_PASS_SCORE_AVG="75"` に設定（初回は 75 点でテスト、後で 80 に上げる）
- [ ] `REVIEW_MAX_AUTOFIX_ATTEMPTS="2"` （デフォルト維持）

**データ投入（初回は少なめ推奨）**:
- [ ] Sources は **3〜5件** に絞る（信頼性の高いもののみ: UNHCR, UNICEF, WFP など）
- [ ] Campaigns は **1件のみ** active にする（priority=10 など高い値を設定）

**推奨 Cron スケジュール（初回は daily-pipeline のみ有効化）**:
- [ ] **日次記事生成**: `0 0 * * *` (UTC 0:00 = JST 9:00) - 有効化
- [ ] **ソース取得**: `0 */12 * * *` (12時間ごと) - 初回は手動のみ、安定後に有効化
- [ ] **KGI取得**: `0 */6 * * *` (6時間ごと) - 初回は手動のみ、安定後に有効化

#### (2) 実行手順（手動完走）

以下の手順を **順番通りに** 実行してください。

**Step 1: データベース準備**

```bash
# Railway環境にログイン（初回のみ）
railway login
railway link

# マイグレーション実行
railway run --service web pnpm prisma migrate deploy

# 初期データ投入
railway run --service web pnpm db:seed
```

**確認**:
- [ ] Seed 実行時に表示された初回パスワードを保存
- [ ] `/admin/login` でログイン成功

---

**Step 2: KGI取得（寄付金額）の手動実行**

```bash
# KGI取得 worker を手動実行
railway run --service web pnpm worker:fetch-donations
```

**確認**:
- [ ] ログに `[fetch-donations] status=success total=1 success=1 failed=0 duration_ms=...` が表示される
- [ ] Home (`/`) で KGI（累計寄付金額）が表示される
- [ ] 最終更新日時が現在時刻に近い

**トラブルシューティング**:
- 失敗した場合: `/admin/campaigns` で Parse Config を確認・調整

---

**Step 3: 情報ソース取得の手動実行**

```bash
# 情報ソース取得 worker を手動実行
railway run --service web pnpm worker:fetch-sources
```

**確認**:
- [ ] ログに `[fetch-sources] status=success total=3 added=12 skipped=3 duration_ms=...` が表示される
- [ ] `/admin/sources` で「Last Fetch」が更新されている
- [ ] Prisma Studio または DB で `raw_items` テーブルを確認、status=NEW のアイテムが増加

**期待値**:
- 3〜5 sources から合計 10〜30 件の raw_items が追加される（初回）

---

**Step 4: Prompts/Templates の同期**

```bash
# ローカルから Railway DB に同期（推奨）
railway run pnpm prompts:sync
railway run pnpm templates:sync
```

**確認**:
- [ ] `/admin/prompts` で 5 つのプロンプトタイプにそれぞれ Active 版が設定されている
- [ ] `/admin/templates` で article_template_v1 が Active になっている

---

**Step 5: 日次パイプラインの手動実行（最重要）**

```bash
# 日次記事生成パイプラインを手動実行
railway run --service web pnpm worker:daily-pipeline
```

**確認**:
- [ ] ログに `[daily-pipeline] status=success processed=3 published=2 hold=1 failed=0 duration_ms=...` が表示される
- [ ] Prisma Studio で `raw_items` の status 変化を確認:
  - NEW → PROCESSING → PROCESSED (成功)
  - NEW → PROCESSING → HOLD (レビュー不合格)
  - NEW → PROCESSING → FAILED (エラー)
- [ ] `articles` テーブルに新規記事が保存されている（status=PUBLISHED または HOLD）
- [ ] `/admin/ops` で PipelineRun の統計が表示される

**期待値**:
- 処理数: 3 件（PIPELINE_MAX_ITEMS_PER_RUN=3 の場合）
- 公開: 1〜2 件（レビュー基準次第）
- 保留: 0〜1 件
- 失敗: 0 件（理想）

**トラブルシューティング**:
- HOLD が多い場合: REVIEW_PASS_SCORE を下げる or プロンプト改善
- FAILED が多い場合: errorReason を確認（INVALID_JSON, LLM timeout など）

---

**Step 6: 公開記事の確認**

```bash
# ブラウザで確認
```

**確認**:
- [ ] `/news` で記事一覧が表示される（PUBLISHED のみ）
- [ ] 記事タイトルをクリックして詳細ページを開く
- [ ] **FACT/INFERENCE/UNVERIFIED ブロック**が色分けされて表示される
- [ ] FACT ブロックに **evidence_urls のリンク**が表示される
- [ ] **支援ボタン**が表示され、キャンペーン名が正しい

---

**Step 7: 支援ボタンとクリック追跡の確認**

**確認**:
- [ ] `/news/[slug]` の支援ボタンをクリック
- [ ] `/go/{campaign_id}` にリダイレクトされる
- [ ] 寄付ページ（UNHCR など）が開く
- [ ] Prisma Studio で `click_events` テーブルを確認
- [ ] クリックイベントが 1 件記録されている（campaignId, clickedAt, userAgent, referer）

---

**Step 8: Admin Ops ダッシュボードの確認**

```bash
# ブラウザで確認
```

**確認**:
- [ ] `/admin/ops` で以下のセクションが表示される:
  - **Stats Overview**: Raw Items (NEW, PROCESSING, PROCESSED, HOLD, FAILED の件数)
  - **Article Stats**: PUBLISHED, HOLD, DRAFT の件数
  - **Today's Pipeline Runs**: 実行履歴（Run ID, Status, Results）
  - **Stale PROCESSING**: 0 件（正常時）
  - **Failed Items**: 失敗したアイテム一覧（もしあれば）
  - **Hold Articles**: 保留記事一覧（もしあれば）
- [ ] **最低1つずつ** 画面上で内容を確認:
  - Hold Article のレビュー結果（スコア、Hard Fail 理由、改善案）を読む
  - Failed Item のエラー理由を読む

---

#### (3) リハーサル後の調整

リハーサル実行後、以下の結果に応じて環境変数を調整してください。

**HOLD が多い場合（合格率 < 50%）**:

1. **レビュー基準を緩める**:
   ```bash
   REVIEW_PASS_SCORE_MIN="60"  # 70 → 60 に下げる
   REVIEW_PASS_SCORE_AVG="70"  # 80 → 70 に下げる
   ```
2. **プロンプト改善**（中期的対応）:
   - `prompts/writer.md` で中立表現を強調
   - `prompts/reviewer.md` でスコアリング基準を調整
   - 改善後、`railway run pnpm prompts:sync` で再同期

**FAILED が多い場合（失敗率 > 20%）**:

1. **エラー理由を確認** (`/admin/ops` の Failed Items):
   - **INVALID_JSON**: Template の JSON 構造を簡素化、writer prompt で JSON 出力を強調
   - **LLM timeout**: `LLM_TIMEOUT_MS` を増やす（30000 → 60000）
   - **Evidence not found**: Sources の品質を見直し（RSS Feed が不完全な場合、scrape に変更）

2. **Sources 品質の見直し**:
   - 不安定な sources を `isActive=false` に設定
   - 信頼性の高い sources のみ残す

3. **Template JSON の簡素化**:
   - `templates/article_template_v1.md` の構造をシンプルにする
   - セクション数を減らす（5 → 3）

**コスト管理（LLM API 使用量）**:

1. **初回運用の推奨設定**:
   - `PIPELINE_MAX_ITEMS_PER_RUN="5"`（日次 5 件程度）
   - `PIPELINE_MAX_ITEMS_PER_SOURCE="2"`（1 ソースあたり 2 件）
   - 1 記事あたり LLM 呼び出し: 2〜5 回（生成 + 分類 + レビュー + リライト×0〜2）
   - **1 日あたり推定 LLM 呼び出し**: 5 件 × 平均 3 回 = **15 calls/day**

2. **安定後の設定**:
   - `PIPELINE_MAX_ITEMS_PER_RUN="10"`（標準）
   - `PIPELINE_MAX_ITEMS_PER_SOURCE="5"`（標準）
   - **1 日あたり推定 LLM 呼び出し**: 10 件 × 平均 3 回 = **30 calls/day**

3. **コスト監視**:
   - `/admin/ops` の Pipeline Runs で duration_ms を確認
   - Railway ログで `[daily-pipeline] ... llm_calls=X` を確認（将来実装予定）
   - OpenAI Dashboard で API 使用量を定期的に確認

**Cron 自動化の段階的有効化**:

1. **Phase 1: 日次記事生成のみ**（初回 1〜2 週間）:
   - daily-pipeline の Cron のみ有効化
   - sources/donations は手動実行（週 1〜2 回）
   - 品質とコストを監視

2. **Phase 2: 情報ソース取得を自動化**（安定後）:
   - fetch-sources の Cron を有効化（12 時間ごと）
   - raw_items の増加ペースを監視

3. **Phase 3: KGI 取得を自動化**（安定後）:
   - fetch-donations の Cron を有効化（6 時間ごと）
   - Home の KGI が定期的に更新されることを確認

---

#### (4) Day-0 完了チェックリスト

リハーサル完了後、以下を確認してください：

- [ ] 各 worker が正常に動作した（fetch-donations, fetch-sources, daily-pipeline）
- [ ] 記事が公開された（最低 1 件の PUBLISHED 記事）
- [ ] 支援ボタンが動作し、クリック追跡が記録された
- [ ] `/admin/ops` で運用状態を確認できた
- [ ] 環境変数を調整した（レビュー基準、パイプライン上限）
- [ ] `docs/ops/day0_report.md` に結果を記録した（テンプレート: `docs/ops/day0_report_template.md`）
- [ ] 次のアクションを決定した（プロンプト改善 or sources 見直し or 上限調整）

**Day-0 完了後**: daily-pipeline の Cron を有効化し、毎日自動実行されることを確認してください。

---

## 開発ワークフロー

### ブランチ戦略

- `main` - 本番環境
- `develop` - 開発環境
- `feature/*` - 機能開発
- `claude/*` - Claude Codeによる自動実装

### コミットメッセージ

変更は必ず `docs/CHANGELOG.md` の Unreleased セクションに記録し、以下のカテゴリで分類：

- **Added** - 新機能
- **Changed** - 既存機能の変更
- **Fixed** - バグ修正
- **Docs** - ドキュメント更新
- **Security** - セキュリティ関連

## コントリビューション

### Contributionの種類

- **Donation** - 寄付
- **Development** - 機能改善
- **Prompt Engineering** - 読者の理解と関心をつなぐ言葉の改善
- **Awareness** - 周囲へ伝える（煽りではなく理解を促す形で）

詳細は [00_PHILOSOPHY.md](./docs/00_PHILOSOPHY.md) を参照してください。

## ライセンス

TBD

## お問い合わせ

- GitHub Issues: 誤り報告・機能提案
- Pull Requests: コード貢献

---

**Somos Venezuela** - 私たちはベネズエラ（運命共同体）
