# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- Integration tests for API endpoints

## [0.3.5] - 2024-12-27

### Added
- **Client-side caching** for GitHub repos (survives Vercel deployments!)
  - `useAnalysisCache` hook with localStorage persistence
  - `/api/commit-sha` endpoint for cache validation
  - 24-hour TTL on cached results
  - Instant results if repo hasn't changed (same commit SHA)
- **Unit tests** — 68 tests with Vitest
  - Utilities: cache, rate-limiter, JSON parser, env validation
  - Analyzers: file-selector, token estimation
  - Components: ProgressIndicator, AnalysisView
- New metadata fields: `commit_sha`, `repo_url`
- Streaming chat now shows the actual question (not "...")

### Fixed
- Upload form now shows correct limits (1MB files, 5MB ZIP)
- Chat question display during streaming

### Technical
- Added `src/hooks/useAnalysisCache.ts`
- Added `src/app/api/commit-sha/route.ts`
- Added `vitest.config.ts` and test setup
- Created `src/__tests__/` directory structure

## [0.3.4] - 2024-12-27

### Added
- Smart file selector for large repositories
- Token estimation for context limits (50K tokens default)
- File priority system (tiers 1-10 based on importance)
- Automatic file truncation for important large files
- New metadata fields: `files_total`, `files_truncated`
- Cache hit indicator in UI ("(кэш)")

### Technical
- Added `src/lib/analyzers/file-selector.ts`:
  - `selectFilesForAnalysis()` — prioritizes and limits files
  - `estimateTokens()` — token estimation (~4 chars/token)
  - `getFilePriority()` — assigns priority by file path
  - `getExcludedFilesSummary()` — summary for logs
- Updated analyze route to use smart selection
- Extended Metadata type with new fields

## [0.3.3] - 2024-12-27

### Added
- In-memory caching for GitHub repo analysis by `repo_url + commit_sha`
- `getLatestCommitSha()` function in GitHub fetcher
- Cache utility with LRU eviction and TTL (1 hour)
- `X-Cache` and `X-Cache-Key` headers in API responses
- `cached` field in metadata for cached responses

### Technical
- Added `src/lib/utils/cache.ts` — AnalysisCache class with:
  - SHA256 key generation from repo URL + commit
  - LRU eviction when max entries reached (100)
  - TTL-based expiration (1 hour)
  - Cache hit/miss tracking

## [0.3.2] - 2024-12-27

### Added
- localStorage persistence — saves description, repo URL, result, chat history
- `useLocalStorage` hook for hydration-safe persistence
- "Clear" button to reset all saved data

## [0.3.1] - 2024-12-27

### Added
- Markdown rendering in chat — react-markdown + react-syntax-highlighter
- Code syntax highlighting with Prism (oneDark theme)
- Inline code styling

### Changed
- testing.md simplified to essential info only

---

## [0.3.0] - 2024-12-27

### Added

**API Security & Reliability:**
- Rate Limiting — IP-based protection against spam (5 requests/minute)
- Zod validation for LLM responses — schema validation ensures correct response format
- Retry logic with exponential backoff — auto-retry for LLM and GitHub API failures
- Streaming chat responses — real-time SSE-based answer generation

**Component Architecture (Refactoring):**
- `src/components/Legend.tsx` — priority and category color legend
- `src/components/AnalysisView.tsx` — full analysis display (summary, tech stack, issues, tasks)
- `src/components/ChatSection.tsx` — chat with streaming support
- `src/components/UploadForm.tsx` — file upload with drag & drop, ZIP handling
- `src/components/ProgressIndicator.tsx` — step-by-step analysis progress
- `src/components/ExportButtons.tsx` — download results as JSON or Markdown

**New Features:**
- Export to JSON — download full analysis data
- Export to Markdown — download formatted report
- Progress indicator — shows current analysis step (uploading, fetching, analyzing, generating)

**New API Endpoint:**
- `POST /api/chat/stream` — SSE streaming endpoint for chat responses

### Changed
- `page.tsx` refactored from 600+ lines to ~180 lines using component composition
- Chat now uses streaming by default for real-time responses
- Rate limiting applied to both `/api/analyze` and `/api/chat`

### Technical
- Added `src/lib/utils/rate-limiter.ts` — in-memory rate limiting
- Added `src/lib/utils/retry.ts` — exponential backoff retry utility
- Extended `src/lib/llm/client.ts` with Zod schemas and validation
- Created `src/app/api/chat/stream/route.ts` for SSE streaming

---

## [0.2.0] - 2024-12-26

### Added

**ZIP Archive Support:**
- JSZip integration for browser-side extraction
- Automatic file filtering during extraction
- Support for nested directories in archives
- File size limits: 500KB per file, 2MB per archive
- Binary file detection and filtering

**Chat History:**
- Full conversation history preserved
- Copy-to-clipboard button for each answer
- Fallback for older browsers (execCommand)

**Color Legend:**
- Priority/severity indicators (high/medium/low)
- Category badges (documentation, technical, product, marketing, business)
- Visual legend in results section

**UI Improvements:**
- Complete redesign with GitHub Dark theme
- CSS variables for consistent theming
- Custom scrollbar styling
- Improved form inputs with focus states
- Better responsive layout

### Changed
- File size limits increased (50KB → 500KB)
- Max files per upload increased (100 files)
- Chat state changed from single response to history array
- Improved file list display with "clear all" button

### Technical
- Added `jszip` dependency
- CSS refactored to use CSS variables
- Added ignore patterns for common build artifacts

---

## [0.1.0] - 2024-12-26

### Added

**Core Infrastructure:**
- Next.js 14 project with App Router
- TypeScript configuration (ES2017 target)
- Package dependencies (next, react, octokit, openai, zod)

**GitHub Integration:**
- `src/lib/github/fetcher.ts` — GitHub API client
- Repository URL parsing (supports various formats)
- Smart file filtering (priority files, ignore patterns)
- File content fetching with size limits (50KB)

**LLM Integration:**
- `src/lib/llm/client.ts` — OpenRouter client (OpenAI SDK compatible)
- Lazy initialization (avoids build-time errors)
- `src/lib/llm/prompts.ts` — Analysis and chat prompts
- JSON response parsing with markdown cleanup

**Analyzers:**
- `src/lib/analyzers/structure.ts` — Project structure analysis
- Tech stack detection (React, Vue, Python, Go, etc.)
- Project stage detection (documentation/mvp/launched/growing)
- Line counting

**API Routes:**
- `POST /api/analyze` — Main analysis endpoint
  - Accepts files array OR GitHub URL
  - Project description required
  - Optional user context (week, previous tasks, goal)
  - Returns analysis with tasks, issues, strengths
- `POST /api/chat` — Follow-up questions endpoint
  - Contextual responses based on previous analysis

**Frontend:**
- `src/app/page.tsx` — Main page with full UI
- GitHub URL input
- File upload (drag & drop)
- Project description textarea
- Results display (stages, issues, tasks)
- Chat interface for follow-up questions
- Responsive CSS styling

**Documentation:**
- `docs/architecture.md` — System architecture
- `docs/changelog.md` — This file
- `docs/project-status.md` — Progress tracking
- `.env.example` — Environment variables template

**Types:**
- `src/types/index.ts` — Full TypeScript interfaces
- API request/response types
- Analysis types (Stage, Priority, Category, etc.)

### Technical Decisions
- Next.js API Routes instead of Express (native Vercel support)
- OpenRouter for LLM access (Claude Opus 4.5 / Sonnet 4)
- Lazy client initialization (build without API key)
- Zod for request validation

---

## [0.0.1] - 2024-12-26

### Added
- Initial project planning
- Created Claude.md (task specification)
- Defined project requirements
