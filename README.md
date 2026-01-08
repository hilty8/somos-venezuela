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
- pnpm（推奨）または npm

### 1. 依存関係のインストール

```bash
pnpm install
# または
npm install
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

### 日次記事生成パイプライン

```bash
pnpm worker:daily-pipeline
```

## プロジェクト構成

```
/
├── docs/                    # Canonドキュメント
├── prisma/                  # Prismaスキーマとマイグレーション
│   ├── schema.prisma       # データベーススキーマ
│   └── seed.ts             # 初期データ
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (public)/      # 公開サイト
│   │   ├── admin/         # 管理画面
│   │   └── api/           # API Routes
│   ├── lib/               # 共通ライブラリ
│   │   ├── db.ts         # Prisma Client
│   │   ├── llm/          # LLM抽象化レイヤー
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
     - Command: `pnpm install && pnpm prisma generate && pnpm worker:fetch-donations`
   - **情報ソース取得** (M1)
     - Schedule: `0 */12 * * *` (12時間ごと)
     - Command: `pnpm install && pnpm prisma generate && pnpm worker:fetch-sources`
   - **日次記事生成** (M1実装後)
     - Schedule: `0 9 * * *` (毎日9:00 UTC)
     - Command: `pnpm install && pnpm prisma generate && pnpm worker:daily-pipeline`

### デプロイ手順

#### 1. Railwayプロジェクトの作成

```bash
# Railway CLIをインストール（初回のみ）
npm install -g @railway/cli

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
