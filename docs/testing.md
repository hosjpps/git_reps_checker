# Тестирование

## Быстрый старт

```bash
# Установка
npm install

# Настройка
cp .env.example .env.local
# Заполни OPENROUTER_API_KEY в .env.local

# Запуск
npm run dev
```

## Проверки

```bash
npm run build      # Сборка
npm run lint       # Линтинг
npx tsc --noEmit   # Типы
```

## Тесты API

### POST /api/analyze

```bash
# GitHub URL
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/user/repo",
    "project_description": "Описание проекта"
  }'

# Файлы
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{"path": "README.md", "content": "# Test"}],
    "project_description": "Тест"
  }'
```

### POST /api/chat

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test",
    "message": "Как сделать первую задачу?",
    "previous_analysis": {"project_summary": "Тест", "detected_stage": "mvp", "tech_stack": [], "strengths": [], "issues": [], "tasks": [], "next_milestone": ""}
  }'
```

### POST /api/chat/stream (SSE)

```bash
curl -N http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Тесты UI

1. Открой http://localhost:3000
2. Проверь:
   - [ ] GitHub URL → анализ
   - [ ] Загрузка файлов (drag & drop)
   - [ ] Загрузка ZIP
   - [ ] Чат с Markdown рендерингом
   - [ ] Экспорт JSON/Markdown
   - [ ] Прогресс-индикатор

## Лимиты

- Файл: max 1MB
- ZIP: max 5MB
- Файлов: max 200
- Rate limit: 5 req/min

## Vercel

```bash
# В Vercel Dashboard → Settings → Environment Variables
OPENROUTER_API_KEY=sk-or-v1-xxx
GITHUB_TOKEN=ghp_xxx  # опционально
```

## Отладка

| Проблема | Решение |
|----------|---------|
| Rate limit GitHub | Добавь GITHUB_TOKEN |
| LLM не парсит JSON | Проверь логи, parseAndValidateAnalysisResponse |
| 500 на Vercel | Проверь env vars |
