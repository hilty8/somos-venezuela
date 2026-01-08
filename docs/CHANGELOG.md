# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## CHANGELOG運用ルール

### 1PR = 1エントリ
各プルリクエスト（PR）は、必ず1つのエントリとしてUnreleasedセクションに記録してください。

### カテゴリ
変更は以下のカテゴリに分類してください：

- **Added**: 新機能の追加
- **Changed**: 既存機能の変更
- **Fixed**: バグ修正
- **Docs**: ドキュメントのみの更新
- **Security**: セキュリティ関連の変更

### 書き方（何を / なぜ）
各エントリは1〜2行で記述し、以下を含めてください：

- **何を**: 変更内容の簡潔な説明
- **なぜ**: 変更の理由や目的（必要に応じて）

**例**:
```markdown
### Added
- /go/{campaign_id} redirect with click tracking for KPI measurement
- Unit tests for donation amount parsing and KGI calculation

### Security
- Random password generation for initial admin user to prevent default password vulnerability
```

### 注意事項
- Epic番号（EPIC-A、EPIC-Dなど）を含めると、開発計画との紐づけが明確になります
- 内部実装の詳細よりも、ユーザーや運用者への影響を重視してください
- 複数の変更を含む場合は、箇条書きで明確に分けてください

---

## [Unreleased]

### Added
- Initial Canon documents (00_PHILOSOPHY.md, 01_SPEC.md, 02_DEV_PLAN.md) for project governance
- CHANGELOG.md with operation rules (1PR=1entry, categorization guidelines)
- EPIC-A: Base project structure (Next.js 15, TypeScript, Tailwind CSS)
- EPIC-A: Prisma schema with all required tables for M0-M2 (admin_users, audit_logs, donation_campaigns, sources, articles, etc.)
- EPIC-A: Database seed script with initial admin user and template/prompt versions
- EPIC-A: Development environment setup (.env.example, comprehensive README with local and Railway deployment guides)
- EPIC-B: Database schema and migrations (Prisma)
- EPIC-C: Admin authentication with NextAuth.js (email + password)
- EPIC-C: Admin dashboard with real-time KGI, campaign count, and 24h click tracking
- EPIC-D: DonationCampaign CRUD API with audit logging for all operations
- EPIC-D: Donation amount fetching logic (PUBLIC_TOTAL_SCRAPE with cheerio, configurable selector/regex/normalization)
- EPIC-D: Manual check endpoint (/api/admin/campaigns/{id}/check) for testing parse configurations
- EPIC-D: Worker script (workers/fetch-donations.ts) for daily donation amount collection
- EPIC-D: Public home page with KGI (cumulative donation amount) display and last update timestamp
- EPIC-D: Admin campaign management UI with test button and error display
- M0 補完: /go/{campaign_id} redirect route with click event tracking (user_agent, referer)
- M0 補完: Unit tests for donation amount parsing and KGI calculation (Vitest)
- EPIC-E: Sources CRUD API (/api/admin/sources) with audit logging for information source management
- EPIC-E: Admin UI for Sources management (whitelist) with create/update/delete functionality
- EPIC-E: RSS Fetcher worker (workers/fetch-sources.ts) with automatic URL deduplication and ethical scraping
- EPIC-E: Unit tests for RSS parsing, URL normalization, and deduplication logic

### Changed
- Admin initial password changed from固定 'admin123' to randomly generated 20-character password (shown once at seed time)
- KGI calculation now includes last update timestamp and supports multiple campaigns
- README expanded with detailed Railway deployment guide, cron configuration, and production verification steps

### Fixed

### Docs
- README: Added Railway deployment procedures with Web/PostgreSQL/Cron configuration
- README: Added production verification workflow (campaign registration → check → cron → Home display)
- README: Added admin password generation explanation and usage instructions
- README: Added Sources management and RSS worker documentation with cron configuration
- .env.example: Added ADMIN_INITIAL_PASSWORD option for custom initial password

### Security
- Random password generation for initial admin user to prevent default password vulnerability (uses crypto.randomBytes)
- Admin passwords are always bcrypt-hashed before storage (salt rounds: 10)
- Click event tracking intentionally excludes IP addresses to protect user privacy
