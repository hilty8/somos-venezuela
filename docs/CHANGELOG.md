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
- EPIC-F: Prompt as Code infrastructure with prompts/ and templates/ directories (Git as正本)
- EPIC-F: Prompt/Template sync scripts with SHA256 hash-based change detection and version management
- EPIC-F: Admin UI for prompts management with version list, active switching, and rollback capability
- EPIC-F: Admin UI for templates management with JSON content preview and version control
- EPIC-F: prompts/ directory with 5 initial prompts (writer, reviewer, rewrite, classify, summarize) in Markdown+YAML frontmatter
- EPIC-F: templates/ directory with article_template_v1.md (Daily記事テンプレート定義)
- EPIC-G / G0: Manual article generation pipeline with generate → classify → review → rewrite (up to 2 attempts) → publish/hold workflow
- EPIC-G / G0: LLM abstraction layer supporting OpenAI, Anthropic, and Groq with provider switching via environment variables
- EPIC-G / G0: Article review system with 0-100 scoring across 5 categories (Evidence, Neutrality, Overclaim, Dignity, Scope)
- EPIC-G / G0: Hard Fail rules for immediate rejection (political evaluation, condemnation, incitement expressions)
- EPIC-G / G0: Article blocks system with FACT/INFERENCE/UNVERIFIED types and evidence URL tracking for transparency
- EPIC-G / G0: Admin pipeline execution UI (/admin/pipeline) with manual run and result display
- EPIC-G / G0: Public news list and detail pages with color-coded blocks and evidence source links
- EPIC-G / G1: raw_items state machine (NEW → PROCESSING → PROCESSED/HOLD/FAILED) with PROCESSING lock to prevent concurrent processing
- EPIC-G / G1: Automatic retry logic for FAILED items with configurable retry limits (MAX_RETRY_PER_ITEM=2)
- EPIC-G / G1: Stale PROCESSING detection and recovery system (PIPELINE_STALE_PROCESSING_MINUTES=120)
- EPIC-G / G1: Pipeline runaway prevention with environment-based limits (MAX_ITEMS_PER_RUN, MAX_LLM_CALLS_PER_RUN)
- EPIC-G / G1: Daily pipeline worker (workers/daily-pipeline.ts) for Railway cron automation
- EPIC-G / G1: Admin Ops dashboard (/admin/ops) with stats, failed items management, hold articles review, and stale recovery
- EPIC-G / G1: Ops API endpoints (/api/admin/ops/*) for stats, failed/hold lists, retry, and stale recovery
- Production Runbook: Comprehensive deployment guide in README with Railway services structure, environment variables, migration procedures, and 7-step verification workflow
- Production Runbook: UTC/JST timezone handling documentation for Railway Cron (UTC-based schedules with conversion examples)
- Support button: Priority-based campaign selection with highest priority active campaign displayed on article detail pages
- Support button: /go/{campaign_id} redirect with click tracking for KGI measurement (already implemented in G1)
- Launch Readiness Gate: JSON repair logic with 1 retry attempt for malformed LLM outputs
- Launch Readiness Gate: Enhanced evidence_urls validation (raw_item.url priority, domain check, deduplication, max 5 URLs)
- Launch Readiness Gate: Operational kill switches (PIPELINE_ENABLED, FETCH_SOURCES_ENABLED, FETCH_DONATIONS_ENABLED)
- Launch Readiness Gate: Summary logs for all workers (1-line monitoring format with status/metrics/duration_ms)
- Launch Readiness Gate: Standardized PipelineRun.stats keys (total, published, hold, failed, duration_ms, llm_calls)
- Launch Readiness Gate: Unit tests for JSON repair and failure handling

### Changed
- Admin initial password changed from固定 'admin123' to randomly generated 20-character password (shown once at seed time)
- KGI calculation now includes last update timestamp and supports multiple campaigns
- README expanded with detailed Railway deployment guide, cron configuration, and production verification steps
- Prisma schema updated with SourceType enum (FILE/ADMIN) and Prompt as Code support fields (filePath, contentHash, version, description)
- Prisma schema: DonationCampaign model now includes priority field (default: 0) for support button campaign selection
- Prisma schema: RawItem model now includes status, retryCount, lastAttemptAt, processingStartedAt for G1 state machine
- package.json: Added postinstall script for automatic `prisma generate` to optimize Railway deployment
- Railway cron commands simplified to `pnpm worker:xxx` (removing redundant `pnpm install && prisma generate`)
- Article detail pages now display support button with highest priority active campaign

### Fixed

### Docs
- README: Added Railway deployment procedures with Web/PostgreSQL/Cron configuration
- README: Added production verification workflow (campaign registration → check → cron → Home display)
- README: Added admin password generation explanation and usage instructions
- README: Added Sources management and RSS worker documentation with cron configuration
- README: Added Prompt as Code section with運用フロー (Git編集 → sync → Active切替)
- README: Unified package manager references to pnpm (removed npm alternatives)
- README: Added Operational Kill Switches and JSON Repair Policy sections to Production Runbook
- .env.example: Added ADMIN_INITIAL_PASSWORD option for custom initial password
- .env.example: Added operational kill switches (PIPELINE_ENABLED, FETCH_SOURCES_ENABLED, FETCH_DONATIONS_ENABLED)
- docs/01_SPEC.md: Added Section 10.4 evidence_urls validation rules (raw_item.url priority, domain check, deduplication, max 5 URLs)

### Security
- Random password generation for initial admin user to prevent default password vulnerability (uses crypto.randomBytes)
- Admin passwords are always bcrypt-hashed before storage (salt rounds: 10)
- Click event tracking intentionally excludes IP addresses to protect user privacy
