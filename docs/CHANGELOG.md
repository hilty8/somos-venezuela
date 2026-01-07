# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Initial Canon documents (00_PHILOSOPHY.md, 01_SPEC.md, 02_DEV_PLAN.md)
- CHANGELOG.md for tracking changes
- EPIC-A: Base project structure (Next.js 15, TypeScript, Tailwind CSS)
- EPIC-A: Prisma schema with all required tables (admin_users, audit_logs, donation_campaigns, donation_snapshots, sources, articles, etc.)
- EPIC-A: Database seed script with initial admin user and template/prompt versions
- EPIC-A: Development environment setup with .env.example and comprehensive README
- EPIC-B: Database schema and migrations (Prisma)
- EPIC-C: Admin authentication with NextAuth.js (email + password)
- EPIC-C: Admin dashboard with KGI summary and quick links
- EPIC-D: DonationCampaign CRUD API with audit logging
- EPIC-D: Donation amount fetching logic (PUBLIC_TOTAL_SCRAPE with cheerio)
- EPIC-D: Manual check endpoint for testing campaign configurations
- EPIC-D: Worker script for daily donation amount fetching
- EPIC-D: Public home page with KGI (cumulative donation amount) display
- EPIC-D: Admin campaign management UI

### Changed

### Fixed

### Docs

### Security
