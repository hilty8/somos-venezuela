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

### 4. 開発サーバーの起動

```bash
pnpm dev
```

アプリケーションは http://localhost:3000 で起動します。

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
│   ├── fetch-donations.ts
│   └── daily-pipeline.ts
└── public/                # 静的ファイル
```

## Railway へのデプロイ

Railway での構成は以下の通りです：

### サービス構成

1. **Web** - Next.jsアプリケーション（Public + Admin + API）
   - Build Command: `pnpm build`
   - Start Command: `pnpm start`
   - Port: 3000

2. **Worker** - バッチジョブ（別プロセス）
   - 日次KGI取得: `pnpm worker:fetch-donations`
   - 日次記事生成: `pnpm worker:daily-pipeline`
   - Cron設定（Railwayの Cron Jobs機能を使用）

3. **PostgreSQL** - データベース
   - Railway の PostgreSQL プラグインを使用

### 環境変数

Railwayの各サービスに以下の環境変数を設定：

- `DATABASE_URL` (Railwayが自動設定)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (デプロイ後のURL)
- LLM関連の環境変数（`.env.example` 参照）

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
