# Инструкция по тестированию

Полное руководство по тестированию GitHub Repository Analyzer.

## Содержание

1. [Подготовка к тестированию](#подготовка-к-тестированию)
2. [Локальное тестирование](#локальное-тестирование)
3. [Тестирование API](#тестирование-api)
4. [Тестирование UI](#тестирование-ui)
5. [Тестирование на Vercel](#тестирование-на-vercel)
6. [Тестовые сценарии](#тестовые-сценарии)
7. [Проверка ошибок](#проверка-ошибок)
8. [Чек-лист перед деплоем](#чек-лист-перед-деплоем)

---

## Подготовка к тестированию

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создай `.env.local`:

```bash
cp .env.example .env.local
```

Заполни обязательные переменные:

```bash
# Обязательно
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Опционально (для приватных репо и higher rate limits)
GITHUB_TOKEN=ghp_xxxxx

# Опционально (дефолты работают)
NEXT_PUBLIC_APP_URL=http://localhost:3000
LLM_MODEL=anthropic/claude-sonnet-4
LLM_MAX_TOKENS=4000
```

### 3. Запуск dev сервера

```bash
npm run dev
```

Приложение доступно на http://localhost:3000

---

## Локальное тестирование

### Базовые проверки

1. **Проверка сборки:**
   ```bash
   npm run build
   ```
   Должна пройти без ошибок.

2. **Проверка линтера:**
   ```bash
   npm run lint
   ```
   Не должно быть критических ошибок.

3. **Проверка типов TypeScript:**
   ```bash
   npx tsc --noEmit
   ```
   Не должно быть ошибок типов.

### Проверка переменных окружения

Убедись, что все переменные загружаются:

```bash
# В консоли браузера (F12)
console.log(process.env.NEXT_PUBLIC_APP_URL)
```

---

## Тестирование API

### POST /api/analyze

#### Тест 1: Анализ через GitHub URL

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/hosjpps/git_reps_checker",
    "project_description": "Инструмент для анализа GitHub репозиториев и генерации задач на неделю"
  }'
```

**Ожидаемый результат:**
- `success: true`
- `analysis` с полями: `project_summary`, `detected_stage`, `tech_stack`, `strengths`, `issues`, `tasks`
- `metadata` с информацией о файлах и токенах

#### Тест 2: Анализ через загрузку файлов

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "path": "README.md",
        "content": "# My Project\n\nThis is a test project."
      },
      {
        "path": "package.json",
        "content": "{\"name\": \"test\", \"version\": \"1.0.0\"}"
      }
    ],
    "project_description": "Тестовый проект для проверки API"
  }'
```

#### Тест 3: С user_context

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/hosjpps/git_reps_checker",
    "project_description": "Инструмент для анализа репозиториев",
    "user_context": {
      "current_week": 2,
      "previous_tasks_completed": ["Создал лендинг", "Настроил CI"],
      "user_goal": "Получить первых пользователей"
    }
  }'
```

#### Тест 4: Валидация ошибок

**Отсутствует project_description:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/hosjpps/git_reps_checker"
  }'
```
Ожидается: `400 Bad Request` с ошибкой валидации

**Нет ни files, ни repo_url:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "project_description": "Тест"
  }'
```
Ожидается: `400 Bad Request` с ошибкой "Either files or repo_url must be provided"

**Невалидный GitHub URL:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "not-a-url",
    "project_description": "Тест"
  }'
```
Ожидается: `400 Bad Request` с ошибкой валидации URL

**Несуществующий репозиторий:**
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/nonexistent/repo",
    "project_description": "Тест"
  }'
```
Ожидается: `400 Bad Request` с ошибкой "Repository not found"

### POST /api/chat

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-123",
    "message": "Как мне сделать первую задачу?",
    "previous_analysis": {
      "project_summary": "Тестовый проект",
      "detected_stage": "mvp",
      "tech_stack": ["TypeScript", "React"],
      "strengths": [],
      "issues": [],
      "tasks": [
        {
          "title": "Добавить валидацию",
          "description": "Добавить валидацию email в форме",
          "priority": "high",
          "category": "technical",
          "estimated_minutes": 60,
          "depends_on": null
        }
      ],
      "next_milestone": "Запустить MVP"
    }
  }'
```

**Ожидаемый результат:**
- `success: true`
- `answer` с текстовым ответом от LLM

---

## Тестирование UI

### Основной флоу

1. **Открой http://localhost:3000**

2. **Тест через GitHub URL:**
   - Введи URL: `https://github.com/hosjpps/git_reps_checker`
   - Опиши проект: "Инструмент для анализа GitHub репозиториев"
   - Нажми "Анализировать"
   - Дождись результата (может занять 10-30 секунд)
   - Проверь, что отображаются:
     - Project Summary
     - Detected Stage
     - Tech Stack
     - Strengths
     - Issues
     - Tasks
     - Next Milestone

3. **Тест загрузки файлов:**
   - Подготовь несколько файлов (README.md, package.json и т.д.)
   - Перетащи их в область загрузки
   - Или нажми и выбери файлы
   - Опиши проект
   - Нажми "Анализировать"
   - Проверь результат

4. **Тест загрузки ZIP:**
   - Создай ZIP-архив с файлами проекта
   - Загрузи его
   - Проверь, что файлы распаковались и отображаются

5. **Тест чата:**
   - После получения анализа, задай вопрос в чате
   - Проверь, что ответ приходит
   - Проверь, что история сохраняется
   - Проверь кнопку копирования ответа

### Проверка UI элементов

- [ ] Поля ввода работают
- [ ] Drag & drop работает
- [ ] Кнопка "Анализировать" активна/неактивна правильно
- [ ] Лоадер показывается во время анализа
- [ ] Ошибки отображаются в красном блоке
- [ ] Результаты отображаются корректно
- [ ] Чат работает
- [ ] Копирование работает
- [ ] Адаптивность на мобильных устройствах

### Проверка лимитов

- [ ] Файл > 500KB отклоняется
- [ ] ZIP > 2MB отклоняется
- [ ] Более 100 файлов обрабатываются корректно

---

## Тестирование на Vercel

### 1. Деплой

1. Закоммить и запушить изменения:
   ```bash
   git add .
   git commit -m "Test changes"
   git push
   ```

2. Vercel автоматически задеплоит изменения

3. Дождись завершения деплоя в Vercel Dashboard

### 2. Проверка переменных окружения

В Vercel Dashboard → Settings → Environment Variables:

- [ ] `OPENROUTER_API_KEY` установлен
- [ ] `GITHUB_TOKEN` установлен (опционально)
- [ ] Переменные применены к Production, Preview, Development

### 3. Тестирование на production URL

Повтори все тесты из раздела [Тестирование UI](#тестирование-ui) на production URL.

### 4. Проверка логов

В Vercel Dashboard → Logs:

- [ ] Нет критических ошибок
- [ ] LLM запросы проходят успешно
- [ ] JSON парсится корректно
- [ ] Нет ошибок 500

### 5. Проверка производительности

- [ ] Время ответа API < 30 секунд
- [ ] Страница загружается быстро
- [ ] Нет memory leaks

---

## Тестовые сценарии

### Сценарий 1: Новый проект (documentation стадия)

**Входные данные:**
- Репозиторий с только README.md и документацией
- Описание: "Стартап на стадии идеи, есть только документация"

**Ожидаемый результат:**
- `detected_stage: "documentation"`
- Задачи фокусируются на завершении документации и начале MVP
- Вопросы могут быть про бизнес-модель, целевую аудиторию

### Сценарий 2: MVP проект

**Входные данные:**
- Репозиторий с кодом, но без деплоя
- Описание: "MVP готов, нужно запустить"

**Ожидаемый результат:**
- `detected_stage: "mvp"`
- Задачи про деплой, первые пользователи, маркетинг
- Issues про отсутствие тестов, документации

### Сценарий 3: Запущенный проект

**Входные данные:**
- Репозиторий с деплоем (vercel.json, Dockerfile)
- Описание: "Проект запущен, есть первые пользователи"

**Ожидаемый результат:**
- `detected_stage: "launched"`
- Задачи про улучшение продукта, сбор фидбека
- Issues про масштабирование, мониторинг

### Сценарий 4: Приватный репозиторий

**Входные данные:**
- Приватный GitHub репозиторий
- `access_token` в запросе или `GITHUB_TOKEN` в env

**Ожидаемый результат:**
- Успешный анализ приватного репо
- Без токена должна быть ошибка доступа

### Сценарий 5: Большой репозиторий

**Входные данные:**
- Репозиторий с > 50 файлов
- Много больших файлов

**Ожидаемый результат:**
- Обработано максимум 50 файлов
- Большие файлы (> 50KB) пропущены
- node_modules, dist и т.д. игнорируются

### Сценарий 6: Недостаточно данных

**Входные данные:**
- Минимальное описание проекта
- Мало файлов

**Ожидаемый результат:**
- `needs_clarification: true`
- Массив `questions` с уточняющими вопросами
- `partial_analysis` с тем, что удалось определить

---

## Проверка ошибок

### Ошибки валидации

- [ ] Отсутствует `project_description` → 400
- [ ] Нет ни `files`, ни `repo_url` → 400
- [ ] Невалидный URL → 400
- [ ] Пустой массив `files` → 400

### Ошибки GitHub API

- [ ] Несуществующий репозиторий → 400 "Repository not found"
- [ ] Rate limit без токена → 400 "rate limit exceeded"
- [ ] Приватный репо без токена → 400/403

### Ошибки LLM

- [ ] LLM возвращает не JSON → улучшенный парсинг должен справиться
- [ ] LLM timeout → 500 с понятным сообщением
- [ ] Отсутствует `OPENROUTER_API_KEY` → 500 "OPENROUTER_API_KEY environment variable is not set"

### Ошибки парсинга JSON

- [ ] LLM возвращает markdown заголовки → должны удаляться
- [ ] LLM возвращает текст до/после JSON → должен извлекаться JSON
- [ ] Невалидный JSON → 500 с детальным логом

### Проверка логов

В консоли браузера (F12) и в Vercel Logs должны быть:
- [ ] Детальные логи ошибок
- [ ] Информация о токенах и времени выполнения
- [ ] Превью контента при ошибках парсинга

---

## Чек-лист перед деплоем

### Код

- [ ] `npm run build` проходит без ошибок
- [ ] `npm run lint` проходит без критических ошибок
- [ ] `npx tsc --noEmit` не показывает ошибок типов
- [ ] Все изменения закоммичены и запушены

### Переменные окружения

- [ ] `OPENROUTER_API_KEY` установлен в Vercel
- [ ] `GITHUB_TOKEN` установлен (если нужен)
- [ ] `NEXT_PUBLIC_APP_URL` установлен (опционально)

### Тестирование

- [ ] Локально все работает
- [ ] API endpoints протестированы
- [ ] UI протестирован
- [ ] Обработка ошибок работает
- [ ] Логи показывают нужную информацию

### Документация

- [ ] README.md актуален
- [ ] Инструкции по деплою актуальны
- [ ] Примеры API актуальны

### После деплоя

- [ ] Production URL работает
- [ ] Нет ошибок в Vercel Logs
- [ ] Анализ работает на реальных репозиториях
- [ ] Производительность приемлемая

---

## Полезные команды

```bash
# Локальный запуск
npm run dev

# Сборка для production
npm run build

# Запуск production build локально
npm run build && npm run start

# Проверка типов
npx tsc --noEmit

# Линтинг
npm run lint

# Проверка размера bundle
npm run build && npx @next/bundle-analyzer
```

---

## Отладка

### Проблема: LLM не возвращает JSON

**Решение:**
1. Проверь логи в Vercel/консоли
2. Убедись, что промпт правильный (см. `src/lib/llm/prompts.ts`)
3. Проверь, что `parseJSONResponse` правильно обрабатывает ответ

### Проблема: GitHub API rate limit

**Решение:**
1. Добавь `GITHUB_TOKEN` в переменные окружения
2. Или используй `access_token` в запросе

### Проблема: Ошибка 500 на Vercel

**Решение:**
1. Проверь логи в Vercel Dashboard
2. Убедись, что все переменные окружения установлены
3. Проверь, что нет проблем с зависимостями

### Проблема: Файлы не загружаются

**Решение:**
1. Проверь лимиты (500KB на файл, 2MB на ZIP)
2. Проверь, что файлы не в игнор-листе
3. Проверь консоль браузера на ошибки

---

## Контакты и поддержка

Если нашел баг или есть вопросы:
1. Проверь логи (Vercel Dashboard → Logs)
2. Проверь консоль браузера (F12)
3. Создай issue в GitHub с деталями ошибки

