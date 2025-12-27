# Architecture

## Overview

GitHub Repository Analyzer — система для анализа GitHub репозиториев и генерации персонализированных задач на неделю.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Next.js App                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │   │
│  │  │ Upload Form  │  │  Analysis    │  │  Chat        │   │   │
│  │  │ (files/URL)  │  │  Results     │  │  Follow-up   │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Vercel Serverless)              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  POST /api/analyze     POST /api/chat                    │   │
│  │  - Принимает файлы     - Follow-up вопросы               │   │
│  │  - Принимает GitHub URL - Контекст предыдущего анализа   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  GitHub Fetcher │ │  File Analyzer  │ │   LLM Client    │
│  ─────────────  │ │  ────────────── │ │  ────────────── │
│  - Octokit.js   │ │  - Structure    │ │  - OpenRouter   │
│  - Fetch files  │ │  - Stage detect │ │  - Claude Opus  │
│  - Filter       │ │  - Tech stack   │ │  - Prompts      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        RESPONSE                                  │
│  {                                                               │
│    "analysis": {                                                 │
│      "project_summary": "...",                                   │
│      "detected_stage": "documentation | mvp | launched",         │
│      "issues": [...],                                            │
│      "tasks": [...]                                              │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
git_reps_checker/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── analyze/
│   │   │   │   └── route.ts          # POST /api/analyze
│   │   │   ├── commit-sha/
│   │   │   │   └── route.ts          # GET /api/commit-sha
│   │   │   └── chat/
│   │   │       ├── route.ts          # POST /api/chat
│   │   │       └── stream/
│   │   │           └── route.ts      # POST /api/chat/stream (SSE)
│   │   ├── page.tsx                  # Main page (uses components)
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   │
│   ├── components/                   # React components
│   │   ├── AnalysisView.tsx          # Analysis results display
│   │   ├── ChatSection.tsx           # Chat with streaming
│   │   ├── ExportButtons.tsx         # JSON/Markdown export
│   │   ├── Legend.tsx                # Priority/category legend
│   │   ├── MarkdownRenderer.tsx      # Markdown + syntax highlighting
│   │   ├── ProgressIndicator.tsx     # Analysis progress steps
│   │   └── UploadForm.tsx            # File upload with ZIP
│   │
│   ├── lib/                          # Core logic
│   │   ├── github/
│   │   │   └── fetcher.ts            # GitHub API integration
│   │   ├── llm/
│   │   │   ├── client.ts             # OpenRouter client + Zod validation
│   │   │   └── prompts.ts            # Analysis prompts
│   │   ├── analyzers/
│   │   │   ├── structure.ts          # Project structure analysis
│   │   │   ├── file-selector.ts      # Smart file selection for large repos
│   │   │   ├── file-filter.ts        # File filtering logic
│   │   │   └── stage-detector.ts     # Project stage detection
│   │   └── utils/
│   │       ├── rate-limiter.ts       # IP-based rate limiting
│   │       ├── retry.ts              # Exponential backoff retry
│   │       ├── cache.ts              # In-memory analysis cache (LRU + TTL)
│   │       ├── env.ts                # Environment validation
│   │       └── token-counter.ts      # Token estimation
│   │
│   ├── hooks/                        # React hooks
│   │   ├── useLocalStorage.ts        # Persisted state (description, result, chat)
│   │   └── useAnalysisCache.ts       # Client-side repo analysis cache
│   │
│   ├── __tests__/                    # Unit tests (Vitest)
│   │   ├── analyzers/                # file-selector tests
│   │   ├── components/               # ProgressIndicator, AnalysisView tests
│   │   ├── utils/                    # cache, rate-limiter, env, json-parser tests
│   │   └── setup.ts                  # Test setup with jest-dom
│   │
│   └── types/
│       └── index.ts                  # TypeScript interfaces
│
├── docs/                             # Project documentation
│   ├── architecture.md               # This file
│   ├── changelog.md                  # Version history
│   └── project-status.md             # Current progress
│
├── .env.example                      # Environment variables template
├── .env.local                        # Local env (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.js
├── vitest.config.ts                  # Test configuration
├── vercel.json                       # Vercel configuration
└── Claude.md                         # Original task specification
```

## Components

### 1. GitHub Fetcher (`src/lib/github/fetcher.ts`)

Получает файлы из GitHub репозитория через Octokit.js.

**Функции:**
- `parseRepoUrl(url)` — парсит GitHub URL
- `fetchRepoFiles(url, token?)` — получает список файлов
- `fetchFileContent(owner, repo, path)` — получает содержимое файла
- `shouldFetchFile(path)` — определяет, нужно ли скачивать файл

**Правила фильтрации:**
- Приоритет: README.md, package.json, docs/*.md
- Игнорировать: node_modules/, dist/, build/
- Лимит размера файла: 50KB

### 2. File Analyzer (`src/lib/analyzers/`)

Анализирует структуру проекта локально (без LLM).

**structure.ts:**
- Определяет структуру папок
- Находит ключевые файлы (entry points)
- Определяет tech stack по package.json

**stage-detector.ts:**
- `documentation` — только docs/, минимум кода
- `mvp` — есть src/, но нет деплоя
- `launched` — есть конфиг деплоя
- `growing` — есть признаки продакшена

**file-selector.ts:**
- `selectFilesForAnalysis()` — умный отбор файлов для больших репо
- `getFilePriority()` — приоритет файла (1-10, меньше = важнее)
- `estimateTokens()` — оценка токенов (~4 символа/токен)
- Token limit: 50K (оставляет место для промпта и ответа)
- Автоматическое усечение важных больших файлов
- Приоритеты: README → package.json → docs → entry points → components

### 3. LLM Client (`src/lib/llm/`)

Интеграция с OpenRouter для Claude Opus 4.5.

**client.ts:**
- Подключение к OpenRouter API
- Zod schemas для валидации ответов LLM
- `parseAndValidateAnalysisResponse()` — парсинг и валидация JSON от LLM
- Интеграция с retry logic

**prompts.ts:**
- `buildAnalysisPrompt()` — основной промпт анализа
- `buildClarificationPrompt()` — промпт для уточнений
- `buildChatPrompt()` — промпт для follow-up

### 4. Utilities (`src/lib/utils/`)

**rate-limiter.ts:**
- In-memory rate limiting (IP-based)
- `checkRateLimit(identifier)` — проверка лимита запросов
- `getClientIP(request)` — получение IP из заголовков
- Лимит: 5 запросов в минуту на IP

**retry.ts:**
- Exponential backoff retry utility
- `withRetry<T>(fn, options)` — универсальный retry wrapper
- `withLLMRetry<T>(fn)` — retry для LLM вызовов (3 попытки, 1s base delay)
- `withGitHubRetry<T>(fn)` — retry для GitHub API (3 попытки, 500ms base delay)
- Автоматический jitter для предотвращения thundering herd

**cache.ts:**
- In-memory кэширование результатов анализа (серверное)
- `AnalysisCache<T>` — generic LRU cache с TTL
- `generateKey(repoUrl, commitSha)` — SHA256 ключ из URL + коммита
- Конфигурация: max 100 записей, TTL 1 час
- Автоматическая очистка expired записей
- HTTP заголовки `X-Cache` (HIT/MISS) и `X-Cache-Key`

**env.ts:**
- Валидация переменных окружения при старте
- `validateEnv()` — проверяет наличие OPENROUTER_API_KEY
- `getMissingEnvVars()` — список отсутствующих переменных

### 5. Client-side Cache (`src/hooks/useAnalysisCache.ts`)

Клиентское кэширование для персистентности между деплоями Vercel.

- `useAnalysisCache()` — React хук для работы с кэшем
- Хранит результаты в `localStorage` вместе с `commit_sha`
- `isCacheValid(repoUrl)` — проверяет актуальность через `/api/commit-sha`
- TTL: 24 часа
- Мгновенный результат если репо не изменился (тот же commit SHA)

### 6. React Components (`src/components/`)

**UploadForm.tsx:**
- Drag & drop загрузка файлов
- ZIP-архивы через JSZip
- Фильтрация бинарных файлов
- Лимиты: 1MB/файл, 5MB/ZIP, 200 файлов

**ProgressIndicator.tsx:**
- Показывает шаги анализа: uploading → fetching → analyzing → generating
- Анимированный спиннер для активного шага
- Скрывается при idle/complete

**AnalysisView.tsx:**
- Отображение результатов анализа
- Секции: summary, tech stack, strengths, issues, tasks, next milestone
- Использует Legend для цветовой легенды

**ChatSection.tsx:**
- Чат с поддержкой streaming (SSE)
- История сообщений с кнопками копирования
- Fallback на обычный режим без streaming

**ExportButtons.tsx:**
- Экспорт в JSON — полные данные анализа
- Экспорт в Markdown — форматированный отчёт
- Скачивание файлов через Blob URL

**Legend.tsx:**
- Легенда приоритетов (high/medium/low)
- Легенда категорий (documentation/technical/product/marketing/business)

**MarkdownRenderer.tsx:**
- react-markdown для рендеринга Markdown
- react-syntax-highlighter с темой oneDark
- Поддержка code blocks, inline code, списков, ссылок

### 7. API Routes

**GET /api/commit-sha:**
```typescript
Request: ?repo_url=https://github.com/user/repo

Response:
{
  sha: string,
  repo_url: string
}
```

**POST /api/analyze:**
```typescript
Request:
{
  files?: Array<{path: string, content: string}>,
  repo_url?: string,
  access_token?: string,
  project_description: string,
  user_context?: {
    current_week: number,
    previous_tasks_completed: string[],
    user_goal: string
  }
}

Response:
{
  success: boolean,
  needs_clarification?: boolean,
  questions?: Question[],
  analysis?: Analysis,
  metadata: Metadata
}
```

**POST /api/chat:**
```typescript
Request:
{
  session_id: string,
  message: string,
  previous_analysis: Analysis
}

Response:
{
  answer: string,
  updated_tasks?: Task[]
}
```

**POST /api/chat/stream:**
SSE streaming endpoint for real-time chat responses.

```typescript
Request:
{
  session_id: string,
  message: string,
  previous_analysis: Analysis
}

Response: Server-Sent Events stream
data: {"content": "chunk of text"}
data: {"content": "more text"}
data: [DONE]
```

## Data Flow

```
1. User Input
   ├── Upload files (drag & drop / file picker)
   ├── Upload ZIP archive (auto-extraction via JSZip)
   └── OR GitHub URL
         │
         ▼
2. File Processing
   ├── Parse repo URL
   ├── Fetch file tree via GitHub API
   ├── Filter relevant files
   └── Download content (parallel)
         │
         ▼
3. Local Analysis
   ├── Detect project structure
   ├── Identify tech stack
   ├── Estimate project stage
   └── Prepare context for LLM
         │
         ▼
4. LLM Analysis
   ├── Build prompt with files + description
   ├── Send to Claude Opus via OpenRouter
   ├── Parse structured response
   └── Validate JSON output
         │
         ▼
5. Response
   ├── If needs_clarification → return questions
   └── Else → return full analysis with tasks
```

## External Dependencies

| Dependency | Purpose | Version |
|------------|---------|---------|
| next | Framework | ^14.x |
| @octokit/rest | GitHub API | ^20.x |
| @anthropic-ai/sdk | LLM client | ^0.x |
| zod | Validation | ^3.x |
| jszip | ZIP extraction | ^3.x |
| react-markdown | Markdown rendering | ^9.x |
| react-syntax-highlighter | Code highlighting | ^15.x |

## Environment Variables

```bash
# Required
OPENROUTER_API_KEY=     # OpenRouter API key for Claude

# Optional
GITHUB_TOKEN=           # Default token for public repos
NEXT_PUBLIC_APP_URL=    # App URL for CORS
```

## Security Considerations

1. **API Keys** — храним только на сервере, не экспонируем клиенту
2. **GitHub Tokens** — опциональны, только для приватных репо
3. **Input Validation** — используем Zod для валидации запросов и ответов LLM
4. **Rate Limiting** — in-memory rate limiting (5 req/min per IP) + Vercel edge limits
5. **File Size Limits** — max 1MB на файл, max 5MB для ZIP, max 200 файлов
6. **Binary Detection** — автоматическое определение и фильтрация бинарных файлов
7. **Retry Protection** — exponential backoff с jitter предотвращает перегрузку API

## UI/UX

- **Тема:** GitHub Dark (CSS variables)
- **Цветовая схема:**
  - Background: `#0d1117` (canvas), `#161b22` (primary)
  - Borders: `#30363d`
  - Text: `#c9d1d9` (primary), `#8b949e` (secondary)
  - Accents: blue `#58a6ff`, green `#238636`, red `#f85149`
- **Легенда цветов:** показывает значения приоритетов и категорий
- **История чата:** сохраняется вся переписка с кнопками копирования
