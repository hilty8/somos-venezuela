# Changelog

All notable changes to this project will be documented in this file.

Format: 1 PR = 1 entry (in chronological order)

---

## [EPIC-G / G1] Automation & Operations - 2026-01-09

### Added

**Database Schema:**
- Added `PROCESSING` and `HOLD` to `RawItemStatus` enum
- Added `retryCount`, `lastAttemptAt`, `processingStartedAt` to `RawItem`
- Added index on `processingStartedAt` for stale detection

**State Transition Logic:**
```
NEW → PROCESSING → PROCESSED (success: article PUBLISHED)
               → HOLD (review failed)
               → FAILED (error)
```

**Worker (`workers/daily-pipeline.ts`):**
- Railway cron entry point for automated daily execution
- Respects environment-based limits (max items per run/source)
- Auto-retry for FAILED items (within retry limit)
- Collects items from all active sources
- Resets FAILED to NEW for retry

**Admin Ops Dashboard (`/admin/ops`):**
- Real-time stats (raw items by status, articles by status)
- Today's pipeline runs with results
- Failed items list with error reasons and retry counts
- Hold articles list with review feedback
- Stale PROCESSING detection and recovery
- Batch operations: Retry failed, Recover stale

**Admin Ops API:**
- `GET /api/admin/ops/stats`: Operational statistics
- `GET /api/admin/ops/failed`: Failed items list
- `GET /api/admin/ops/hold`: Hold articles list
- `POST /api/admin/ops/retry-failed`: Retry selected failed items
- `POST /api/admin/ops/recover-stale`: Recover stale PROCESSING items

**Donation Link Integration:**
- `GET /go/[id]`: Redirect to donation campaign with click tracking
- `GET /api/public/campaigns`: List active campaigns
- Support buttons added to article detail pages (planned)

**Tests:**
- `state-transitions.test.ts`: PROCESSING lock, retry limits, stale detection

### Configuration

**Environment Variables (暴走防止):**
- `PIPELINE_MAX_ITEMS_PER_RUN="10"` - Max items per run
- `PIPELINE_MAX_ITEMS_PER_SOURCE="5"` - Max items per source
- `PIPELINE_MAX_LLM_CALLS_PER_RUN="50"` - Max LLM calls per run
- `PIPELINE_STALE_PROCESSING_MINUTES="120"` - Stale threshold (minutes)
- `PIPELINE_MAX_RETRY_PER_ITEM="2"` - Max retry attempts

### Features

**PROCESSING Lock:**
- Prevents duplicate processing of same raw_item
- Automatically set when pipeline starts processing
- Cleared when processing completes (success/fail/hold)

**Retry Logic:**
- FAILED items can be retried up to MAX_RETRY times
- Each retry increments retryCount
- Items at retry limit cannot be retried automatically
- Manual retry possible from Admin Ops dashboard

**Stale PROCESSING Recovery:**
- Items PROCESSING longer than threshold are "stale"
- Admin can recover to NEW (retry) or FAILED (give up)
- Prevents locked items from blocking pipeline forever

**HOLD Management:**
- Review-failed articles go to HOLD status
- Associated raw_items also marked as HOLD
- Admin can review reasons and manually retry with updated prompts
- Prevents auto-publishing of low-quality content

**Daily Automation:**
- Railway cron executes `pnpm worker:daily-pipeline`
- Processes NEW and retryable FAILED items
- Respects per-run and per-source limits
- Logs all results to PipelineRun table

### Documentation

**Specification Updates:**
- Updated `docs/01_SPEC.md` with G0/G1 review criteria (0-100 scale)
- Added state transition diagram
- Added暴走防止 limits specification
- Added stale recovery specification

**Environment Configuration:**
- Updated `.env.example` with all G1 variables
- Documented recommended values and meanings

---

## [EPIC-G / G0] Manual Article Generation Pipeline - 2026-01-09

### Added

**Database Schema:**
- Added `RawItemStatus` enum (NEW, PROCESSED, FAILED)
- Added `status` and `errorReason` fields to `RawItem`
- Added `slug` (unique), `sourceIds`, `rawItemIds`, `category`, `classifyConfidence` fields to `Article`
- Added `hardFailReasons`, `suggestions`, `scoreTotal` fields to `ReviewRun`
- Renamed `ReviewRun.score` to `scoresByCategory` for clarity
- Created `PipelineRun` model with `status`, `stats`, `logs` fields
- Created `PipelineStatus` enum (RUNNING, COMPLETED, FAILED)

**Core Pipeline Logic (`src/lib/pipeline/`):**
- `run-pipeline.ts`: Main pipeline executor (raw_items → generate → validate → classify → review → rewrite × 2 → publish/hold)
- `generate-article.ts`: Article generation using active writer prompt + template
- `classify-article.ts`: Article categorization using active classify prompt
- `review-article.ts`: Quality review with Hard Fail rules + LLM scoring (0-100 scale)
- `rewrite-article.ts`: Auto-fix based on review feedback
- `validate-blocks.ts`: FACT blocks must have evidence_urls (else → UNVERIFIED)
- `hard-fail-rules.ts`: Political evaluation/condemnation/incitement detection (PHILOSOPHY compliance)
- `slug-generator.ts`: Unique slug generation with date prefix (YYYYMMDD-title)
- `get-active-prompts.ts`: Fetch active prompts/templates from DB (Prompt as Code integration)
- `types.ts`: TypeScript types for pipeline

**LLM Client (`src/lib/llm/client.ts`):**
- Unified LLM interface for OpenAI, Anthropic, Groq
- Task-specific model/temperature configuration
- Retry logic with exponential backoff
- Timeout handling

**Admin API:**
- `POST /api/admin/pipeline/run`: Execute pipeline with optional sourceId/limit
- `GET /api/admin/pipeline/runs`: List all pipeline runs
- `GET /api/admin/pipeline/runs/[id]`: Get specific run details with full logs

**Admin UI:**
- `/admin/pipeline`: Pipeline execution page with source selection, limit input, live logs
- `/admin/pipeline/runs/[id]`: Pipeline run detail page with stats and full logs

**Public API:**
- `GET /api/news`: List published articles
- `GET /api/news/[slug]`: Get article by slug (with blocks and evidence URLs)

**Public UI:**
- `/news`: Published articles list page
- `/news/[slug]`: Article detail page with:
  - Block labels (FACT/INFERENCE/UNVERIFIED) with color coding
  - Evidence URLs display for FACT blocks
  - Accessibility: Labels + background colors (not color-only)

**Tests:**
- `validate-blocks.test.ts`: FACT → UNVERIFIED conversion when no evidence
- `slug-generator.test.ts`: Slug generation and uniqueness logic
- `review-attempts.test.ts`: Max 2 rewrite attempts (3 total reviews) enforcement

### Configuration

**Environment Variables:**
- Review scores now use 0-100 scale:
  - `REVIEW_PASS_SCORE_MIN="70"` (minimum per category)
  - `REVIEW_PASS_SCORE_AVG="80"` (minimum average)
- `REVIEW_MAX_AUTOFIX_ATTEMPTS="2"` (max rewrite attempts)

### Features

**Hard Fail Rules:**
- Political evaluation keywords (独裁, 圧政, etc.)
- Condemnation expressions (非難すべき, 断罪, etc.)
- Incitement language (打倒, 革命, etc.)
- Excessive subjective/emotional language detection
- Clickbait pattern detection in titles

**Pipeline Flow:**
1. Fetch raw items (status = NEW)
2. For each raw item:
   - Generate article (writer prompt + template → JSON with blocks)
   - Validate blocks (FACT must have evidence_urls)
   - Classify article (category + confidence)
   - Review article (Hard Fail + LLM scoring 0-100)
   - If fail: rewrite (max 2 times)
   - If pass: publish (status = PUBLISHED)
   - If still fail: hold (status = HOLD)
3. Update raw_item status (PROCESSED/FAILED)
4. Save pipeline run with stats and logs

**Article Structure:**
- Blocks with type labels (FACT/INFERENCE/UNVERIFIED)
- FACT blocks require evidence URLs (minimum 1)
- Automatic conversion to UNVERIFIED if evidence missing
- Slug format: YYYYMMDD-title (with uniqueness check)

### Technical Details

- Prompt as Code integration: All active prompts/templates fetched from DB
- Review scoring: 5 categories (evidence, neutrality, overclaim, dignity, scope) × 0-100
- Max 3 review attempts total (initial + 2 rewrites)
- Audit logging for pipeline runs
- Failed articles go to HOLD status (not published)
- All logs saved to `pipeline_runs.logs` for debugging

---

## [EPIC-F] Production Safety & Score Scale Unification - 2026-01-09

### Changed

**Sync API Safety:**
- Blocked sync API execution in production by default (`NODE_ENV=production`)
- Added `ALLOW_SYNC_API=true` environment variable for emergency use
- Updated error messages to direct users to local/CI execution
- Updated README to emphasize recommended sync workflow

**Review Score Scale:**
- Updated `prompts/reviewer.md` from v1 to v2
- Changed all scores from 0-10 to 0-100 scale for EPIC-G compatibility
- Updated pass criteria: 70 min per category, 80.0 average (from 7 and 8.0)
- Updated `.env.example` with new `REVIEW_PASS_SCORE_MIN` and `REVIEW_PASS_SCORE_AVG`

---

## [EPIC-F] Prompt as Code (Templates & Prompts Management) - 2026-01-09

### Added

**Database Schema:**
- Added `SourceType` enum (FILE, ADMIN)
- Added `version`, `description`, `sourceType`, `filePath`, `contentHash` fields to `PromptVersion` and `TemplateVersion`
- Added `createdByAdminId` foreign key to track admin creators

**Prompts (`prompts/`):**
- `writer.md` (v1): Daily article generation with strict neutrality guidelines
- `reviewer.md` (v2): 5-category review (0-100 scores)
- `rewrite.md` (v1): Auto-fix for failed articles
- `classify.md` (v1): Article categorization
- `summarize.md` (v1): 3-point summaries

**Templates (`templates/`):**
- `article_template_v1.md`: Daily article structure (headline_3points, impact_life, numbers, unknowns, support)

**Sync Scripts:**
- `scripts/sync-prompts.ts`: SHA256 hash-based sync with version tracking
- `scripts/sync-templates.ts`: Template sync with JSON extraction
- Package scripts: `pnpm prompts:sync`, `pnpm templates:sync`

**Admin UI:**
- `/admin/prompts`: Prompt management (grouped by type)
- `/admin/prompts/[name]`: Version list with activate/rollback
- `/admin/templates`: Template management
- `/admin/templates/[name]`: Template version detail

**Admin API:**
- `GET /api/admin/prompts`: List all prompts
- `GET /api/admin/prompts/[name]`: Get prompt versions
- `POST /api/admin/prompts/[name]/activate`: Activate specific version
- `POST /api/admin/prompts/sync`: Sync prompts from files (dev only)
- Similar endpoints for templates

**Tests:**
- `prompt-sync.test.ts`: Hash calculation, frontmatter parsing, version comparison, active management

### Configuration

**Package Manager:**
- Unified to pnpm (removed npm alternatives)
- Added `postinstall: "prisma generate"` script
- Simplified Railway cron commands (no redundant `pnpm install`)

**Environment Variables:**
- `ALLOW_SYNC_API=true`: Enable sync API in production (not recommended)

---

## [EPIC-E] Sources Management and RSS Fetcher - 2026-01-09

### Added

**Database Schema:**
- Created `Source` model (name, url, category, fetchMethod, isActive)
- Created `RawItem` model (sourceId, url, title, content, publishedAt, fetchedAt)

**Admin UI:**
- `/admin/sources`: Source CRUD with active/inactive toggle
- Source categories: humanitarian, un, ngo, etc.
- Fetch method: rss, scrape (future)

**Admin API:**
- `GET /api/admin/sources`: List all sources
- `POST /api/admin/sources`: Create source
- `PUT /api/admin/sources/[id]`: Update source
- `DELETE /api/admin/sources/[id]`: Delete source

**Worker:**
- `workers/fetch-sources.ts`: RSS feed fetcher using rss-parser
- Railway cron command: `pnpm worker:fetch-sources`

---

## [M0 Completion] Production-Ready Enhancements - 2026-01-08

### Added

**KGI Tracking:**
- Hourly donation amount fetching (Railway cron)
- Click event tracking with user agent and referer
- KGI calculation: Total clicks → donation page

**Tests:**
- `kgi-calculation.test.ts`: Click tracking and KGI metrics
- `rss-fetch.test.ts`: RSS parsing logic
- `fetch-donation-amount.test.ts`: Scraping and parsing

**Railway Deployment:**
- Cron jobs for donation fetching
- PostgreSQL integration
- Environment variable configuration

---

## [M0 Complete] KGI Site Functionality - 2026-01-07

### Added

**Database Schema:**
- Created `DonationCampaign` model with flexible parse config (JSON)
- Created `DonationSnapshot` model for amount tracking
- Created `ClickEvent` model for KGI measurement
- Created `AdminUser` model with bcrypt password hashing
- Created `AuditLog` model for admin action tracking

**Admin System:**
- `/admin/login`: Admin authentication with NextAuth 5
- `/admin/dashboard`: Overview with KGI metrics
- `/admin/campaigns`: Donation campaign CRUD
- Audit logging for all admin actions

**Public Site:**
- `/`: Homepage with donation campaigns display
- Click tracking for KGI measurement
- Responsive design with Tailwind CSS

**Worker:**
- `workers/fetch-donations.ts`: Scheduled donation amount scraper
- Cheerio-based HTML parsing with configurable selectors

**Tests:**
- Unit tests for donation amount fetching and parsing
- Vitest configuration

**Infrastructure:**
- Next.js 15 with App Router
- Prisma ORM with PostgreSQL
- NextAuth 5 for authentication
- TypeScript with strict mode
