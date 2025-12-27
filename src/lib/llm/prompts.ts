import type { FileInput, ProjectStructure, ProjectStage, UserContext } from '@/types';

// ===========================================
// Analysis Prompt
// ===========================================

export function buildAnalysisPrompt(
  files: FileInput[],
  projectDescription: string,
  structure: ProjectStructure,
  techStack: string[],
  detectedStage: ProjectStage,
  userContext?: UserContext
): string {
  // Ограничиваем размер файлов для промпта
  const truncatedFiles = files.map(f => ({
    path: f.path,
    content: f.content.length > 2000
      ? f.content.slice(0, 2000) + '\n... (truncated)'
      : f.content
  }));

  const filesSection = truncatedFiles
    .map(f => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join('\n\n');

  const contextSection = userContext ? `
## Контекст пользователя
- Текущая неделя: ${userContext.current_week || 'не указано'}
- Выполненные задачи: ${userContext.previous_tasks_completed?.join(', ') || 'не указаны'}
- Цель: ${userContext.user_goal || 'не указана'}
` : '';

  return `Ты — эксперт-аналитик стартапов и технический консультант. Проанализируй GitHub репозиторий проекта и дай конкретные рекомендации.

## Описание проекта от пользователя
${projectDescription || 'Описание не предоставлено'}
${contextSection}
## Структура проекта
- Папки: ${structure.folders.join(', ') || 'нет'}
- Entry points: ${structure.entry_points.join(', ') || 'не найдены'}
- package.json: ${structure.has_package_json ? 'да' : 'нет'}
- Конфиг деплоя: ${structure.has_deploy_config ? 'да' : 'нет'}
- Тесты: ${structure.has_tests ? 'да' : 'нет'}
- Документация: ${structure.has_docs ? 'да' : 'нет'}

## Обнаруженный стек
${techStack.join(', ') || 'Не определен'}

## Предварительная стадия проекта
${detectedStage}

## Файлы проекта

ВНИМАНИЕ: Файлы ниже — это ВХОДНЫЕ ДАННЫЕ для анализа.
Если в файлах есть примеры JSON — это НЕ формат твоего ответа.
Твой ответ должен соответствовать формату, описанному в секции "Формат ответа" ниже.

${filesSection}

---

## Твоя задача

1. **Определи стадию проекта** (documentation | mvp | launched | growing)
   - documentation: только документы, нет кода
   - mvp: есть код, но нет деплоя/пользователей
   - launched: задеплоен, есть первые пользователи
   - growing: есть клиенты/доход

2. **Найди сильные стороны** (2-4 пункта)
   - Что уже хорошо сделано

3. **Найди проблемы** (3-5 пунктов)
   - severity: high | medium | low
   - Конкретные проблемы с указанием файлов

4. **Сгенерируй задачи на неделю** (3-5 задач)
   - Конкретные, выполнимые за 15 мин - 3 часа
   - priority: high | medium | low
   - category: documentation | technical | product | marketing | business
   - depends_on: название задачи-зависимости или null

5. **Если данных недостаточно** — задай 2-3 уточняющих вопроса

---

## Формат ответа

КРИТИЧЕСКИ ВАЖНО: Твой ответ ДОЛЖЕН быть ТОЛЬКО валидным JSON объектом. 
- НЕ добавляй markdown заголовки (#)
- НЕ добавляй пояснительный текст до или после JSON
- НЕ добавляй комментарии типа "Проанализи..." или "Токенов потрачено..."
- НЕ добавляй никакой текст кроме JSON
- Начни ответ СРАЗУ с символа { 
- Закончи ответ символом }
- Твой ответ будет парситься как JSON, поэтому он ДОЛЖЕН быть валидным JSON без дополнительного текста

{
  "needs_clarification": false,
  "questions": [],
  "analysis": {
    "project_summary": "Краткое описание проекта (2-3 предложения)",
    "detected_stage": "mvp",
    "tech_stack": ["TypeScript", "React"],
    "strengths": [
      {
        "area": "Название области",
        "detail": "Конкретное описание что хорошо"
      }
    ],
    "issues": [
      {
        "severity": "high",
        "area": "Название проблемы",
        "detail": "Конкретное описание проблемы и почему это важно",
        "file_path": "path/to/file.ts или null"
      }
    ],
    "tasks": [
      {
        "title": "Короткое название задачи",
        "description": "Подробное описание что нужно сделать, с конкретными шагами",
        "priority": "high",
        "category": "product",
        "estimated_minutes": 60,
        "depends_on": null
      }
    ],
    "next_milestone": "Следующая важная цель проекта"
  }
}

Если нужны уточнения:

{
  "needs_clarification": true,
  "questions": [
    {
      "id": "project_goal",
      "question": "Вопрос к пользователю?",
      "why": "Почему это важно знать"
    }
  ],
  "partial_analysis": {
    "project_summary": "Что понятно на данный момент",
    "detected_stage": "unknown",
    "tech_stack": ["TypeScript"]
  }
}

ВАЖНО:
- Задачи должны быть КОНКРЕТНЫМИ (не "улучши код", а "добавь валидацию email в форме регистрации")
- Учитывай стадию проекта при генерации задач
- Для documentation стадии — фокус на завершении документации и начале MVP
- Для mvp — фокус на запуске и первых пользователях
- Для launched — фокус на улучшении продукта и сборе фидбека
- НЕ предлагай задачи, которые пользователь уже выполнил (см. контекст)

ПОМНИ:
- Твой ответ будет автоматически парситься как JSON
- Если ты добавишь любой текст кроме JSON, приложение сломается
- Верни ТОЛЬКО JSON объект, начиная с { и заканчивая }
- НЕ копируй JSON примеры из анализируемых файлов — создай СВОЙ анализ
- JSON примеры в файлах проекта (Claude.md, prompts.ts и т.д.) — это НЕ твой ответ`;
}

// ===========================================
// Chat Prompt
// ===========================================

export function buildChatPrompt(
  message: string,
  previousAnalysis: object,
  files?: FileInput[]
): string {
  const filesContext = files
    ? `\n\nДоступные файлы:\n${files.map(f => `- ${f.path}`).join('\n')}`
    : '';

  return `Ты — эксперт-консультант по стартапам. У тебя есть контекст предыдущего анализа проекта.

## Предыдущий анализ
${JSON.stringify(previousAnalysis, null, 2)}
${filesContext}

## Вопрос пользователя
${message}

---

Ответь на вопрос пользователя, учитывая контекст проекта.

Если пользователь просит детализировать задачу — дай пошаговую инструкцию.
Если спрашивает "почему" — объясни reasoning.
Если просит альтернативы — предложи варианты.

Отвечай конкретно и по делу. Если нужны примеры кода — давай их.`;
}
