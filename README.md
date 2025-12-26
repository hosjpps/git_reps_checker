# GitHub Repository Analyzer

Инструмент для анализа GitHub репозиториев и генерации персонализированных задач на неделю.

## Возможности

- **GitHub URL** — анализ публичных репозиториев
- **Загрузка файлов** — drag & drop или file picker
- **ZIP-архивы** — автоматическая распаковка и фильтрация
- **Умный анализ** — определение стадии, tech stack, проблем
- **Генерация задач** — конкретные шаги на неделю
- **Follow-up чат** — история вопросов с копированием
- **GitHub Dark тема** — современный UI

## Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/hosjpps/git_reps_checker.git
cd git_reps_checker
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

```bash
cp .env.example .env.local
```

Заполнить `.env.local`:

```bash
# Обязательно — ключ OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Опционально — для приватных репо и higher rate limits
GITHUB_TOKEN=ghp_xxxxx
```

### 4. Запустить

```bash
npm run dev
```

Открыть http://localhost:3000

## Использование

### Через веб-интерфейс

1. Введи **GitHub URL** репозитория
   - Или загрузи **файлы** (drag & drop)
   - Или загрузи **ZIP-архив** (до 2MB)
2. **Опиши проект** в текстовом поле
3. Нажми **"Анализировать"**
4. Получи результат с задачами
5. Задавай **follow-up вопросы** в чате (история сохраняется)

### Лимиты

- **Файлы:** до 500KB каждый
- **ZIP-архив:** до 2MB
- **Количество файлов:** до 100
- **Игнорируются:** node_modules, dist, build, бинарные файлы

### Через API

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/username/repo",
    "project_description": "Описание проекта"
  }'
```

## Как описывать проект

Чем лучше описание — тем точнее рекомендации. Включай:

### Обязательно:
- **Что делает проект** — какую проблему решает
- **Для кого** — целевая аудитория

### Желательно:
- **Текущая стадия** — идея / документация / MVP / запущен
- **Цель на ближайшее время** — что хочешь достичь
- **Контекст** — что уже сделано, какие ограничения

### Примеры хороших описаний:

**Пример 1 — Стартап на ранней стадии:**
```
Сервис клининга в Саванне. Хочу найти первых клиентов через соцсети.
Сейчас есть только документация и структура папок.
Цель — запустить лендинг и получить первые заявки за 2 недели.
```

**Пример 2 — Техническое приложение:**
```
CLI инструмент для автоматизации деплоя Docker контейнеров.
Целевая аудитория — DevOps инженеры.
MVP готов, хочу добавить поддержку Kubernetes и улучшить документацию.
```

**Пример 3 — Коммерческий продукт:**
```
SaaS платформа для управления задачами команды.
Есть 50 платящих пользователей, MRR $500.
Основная проблема — высокий churn. Нужно улучшить onboarding.
```

### Чего избегать:
- ❌ "Мой проект" (непонятно что делает)
- ❌ Слишком техническое описание без бизнес-контекста
- ❌ Описание на 10 страниц (достаточно 2-5 предложений)

## API Reference

### POST /api/analyze

Основной endpoint для анализа репозитория.

**Request:**
```json
{
  "repo_url": "https://github.com/username/repo",
  "project_description": "Описание проекта",
  "access_token": "ghp_xxx",  // опционально, для приватных репо
  "user_context": {           // опционально
    "current_week": 2,
    "previous_tasks_completed": ["Создал лендинг", "Настроил CI"],
    "user_goal": "Получить первых пользователей"
  }
}
```

Или с загрузкой файлов:
```json
{
  "files": [
    { "path": "README.md", "content": "# My Project..." },
    { "path": "package.json", "content": "{...}" }
  ],
  "project_description": "Описание проекта"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "project_summary": "Краткое описание проекта",
    "detected_stage": "mvp",
    "tech_stack": ["TypeScript", "React"],
    "strengths": [...],
    "issues": [...],
    "tasks": [...],
    "next_milestone": "Следующая цель"
  },
  "metadata": {
    "files_analyzed": 23,
    "total_lines": 1500,
    "tokens_used": 15000,
    "analysis_duration_ms": 8500
  }
}
```

### POST /api/chat

Follow-up вопросы после анализа.

**Request:**
```json
{
  "session_id": "unique-id",
  "message": "Как мне сделать первую задачу?",
  "previous_analysis": { ... }
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Чтобы сделать первую задачу, тебе нужно..."
}
```

## Стадии проекта

| Стадия | Признаки | Фокус рекомендаций |
|--------|----------|-------------------|
| `documentation` | Только docs, минимум кода | Доработать документацию, начать MVP |
| `mvp` | Есть код, нет деплоя | Запустить, получить первых пользователей |
| `launched` | Задеплоен, есть пользователи | Улучшить продукт, собрать фидбек |
| `growing` | Есть клиенты/доход | Масштабировать, автоматизировать |

## Технологии

- **Frontend/Backend:** Next.js 14 (App Router)
- **LLM:** Claude через OpenRouter
- **GitHub API:** Octokit.js
- **ZIP:** JSZip (client-side extraction)
- **Validation:** Zod
- **UI:** GitHub Dark theme (CSS Variables)
- **Deploy:** Vercel

## Деплой на Vercel

1. Форкни репозиторий
2. Импортируй в [Vercel](https://vercel.com)
3. Добавь Environment Variables:
   - `OPENROUTER_API_KEY`
   - `GITHUB_TOKEN` (опционально)
4. Deploy!

## Тестирование

Подробная инструкция по тестированию: [docs/testing.md](docs/testing.md)

Быстрый старт:
```bash
# Локальное тестирование
npm run dev

# Проверка сборки
npm run build

# Линтинг
npm run lint
```

## Структура проекта

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/route.ts   # POST /api/analyze
│   │   │   └── chat/route.ts      # POST /api/chat
│   │   ├── page.tsx               # Главная + Legend + AnalysisView
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # GitHub Dark theme
│   ├── lib/
│   │   ├── github/fetcher.ts      # GitHub API
│   │   ├── llm/
│   │   │   ├── client.ts          # OpenRouter (lazy init)
│   │   │   └── prompts.ts         # Промпты
│   │   └── analyzers/structure.ts # Анализаторы
│   └── types/index.ts
├── docs/
│   ├── architecture.md            # Архитектура системы
│   ├── changelog.md               # История изменений
│   ├── project-status.md          # Статус проекта
│   └── testing.md                 # Инструкция по тестированию
├── .env.example
└── Claude.md                      # Исходное ТЗ
```

## Лицензия

MIT
