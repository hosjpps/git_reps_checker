import OpenAI from 'openai';
import { z } from 'zod';
import { withLLMRetry } from '@/lib/utils/retry';

// ===========================================
// OpenRouter Client (Compatible with OpenAI SDK)
// Lazy initialization to avoid build-time errors
// ===========================================

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    _client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'GitHub Repository Analyzer'
      }
    });
  }
  return _client;
}

function getDefaultModel(): string {
  return process.env.LLM_MODEL || 'anthropic/claude-sonnet-4';
}

function getMaxTokens(): number {
  return parseInt(process.env.LLM_MAX_TOKENS || '4000', 10);
}

// ===========================================
// Send Message to LLM
// ===========================================

export interface LLMResponse {
  content: string;
  model: string;
  tokens_used: number;
}

export async function sendToLLM(
  prompt: string,
  model?: string
): Promise<LLMResponse> {
  const startTime = Date.now();
  const client = getClient();
  const modelToUse = model || getDefaultModel();

  return withLLMRetry(async () => {
    try {
      const response = await client.chat.completions.create({
        model: modelToUse,
        max_tokens: getMaxTokens(),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.choices[0]?.message?.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;

      console.log(`LLM response in ${Date.now() - startTime}ms, tokens: ${tokensUsed}`);

      return {
        content,
        model: response.model || modelToUse,
        tokens_used: tokensUsed
      };
    } catch (error) {
      console.error('LLM Error:', error);
      throw new Error(
        error instanceof Error
          ? `LLM Error: ${error.message}`
          : 'Unknown LLM error'
      );
    }
  });
}

// ===========================================
// Zod Schemas for LLM Response Validation
// ===========================================

const StrengthSchema = z.object({
  area: z.string(),
  detail: z.string()
});

const IssueSchema = z.object({
  severity: z.enum(['high', 'medium', 'low']),
  area: z.string(),
  detail: z.string(),
  file_path: z.string().nullable()
});

const TaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['documentation', 'technical', 'product', 'marketing', 'business']),
  estimated_minutes: z.number(),
  depends_on: z.string().nullable()
});

const QuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  why: z.string()
});

const AnalysisSchema = z.object({
  project_summary: z.string(),
  detected_stage: z.enum(['documentation', 'mvp', 'launched', 'growing', 'unknown']),
  tech_stack: z.array(z.string()),
  strengths: z.array(StrengthSchema),
  issues: z.array(IssueSchema),
  tasks: z.array(TaskSchema),
  next_milestone: z.string()
});

const PartialAnalysisSchema = z.object({
  project_summary: z.string(),
  detected_stage: z.enum(['documentation', 'mvp', 'launched', 'growing', 'unknown']),
  tech_stack: z.array(z.string())
});

export const LLMAnalysisResponseSchema = z.object({
  needs_clarification: z.boolean(),
  questions: z.array(QuestionSchema).optional(),
  partial_analysis: PartialAnalysisSchema.optional(),
  analysis: AnalysisSchema.optional()
});

export type LLMAnalysisResponse = z.infer<typeof LLMAnalysisResponseSchema>;

// ===========================================
// Parse JSON Response
// ===========================================

/**
 * Исправляет распространённые ошибки JSON, которые делают LLM
 */
function fixCommonJSONErrors(json: string): string {
  let fixed = json;

  // Удаляем trailing commas перед ] или }
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // Исправляем одинарные кавычки на двойные (но осторожно - не внутри строк)
  // Это сложно сделать правильно, поэтому только если JSON не парсится

  // Удаляем комментарии в стиле JavaScript (// и /* */)
  fixed = fixed.replace(/\/\/[^\n]*/g, '');
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');

  // Удаляем управляющие символы кроме \n, \r, \t
  fixed = fixed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return fixed;
}

/**
 * Извлекает JSON из строки с балансировкой скобок
 */
function extractJSONWithBalance(content: string): string | null {
  const firstBrace = content.indexOf('{');
  if (firstBrace === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = firstBrace; i < content.length; i++) {
    const char = content[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return content.substring(firstBrace, i + 1);
        }
      }
    }
  }

  return null;
}

export function parseJSONResponse<T>(content: string): T {
  let cleaned = content.trim();

  // Удаляем markdown блоки кода
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');

  // Удаляем markdown заголовки (# заголовки)
  cleaned = cleaned.replace(/^#+\s+.*$/gm, '');

  // Удаляем текст до первого { (LLM иногда пишет пояснения перед JSON)
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    throw new Error('No JSON object found in response');
  }
  cleaned = cleaned.substring(firstBrace);

  // Попытка 1: Извлечь JSON с правильным балансом скобок
  const balanced = extractJSONWithBalance(cleaned);
  if (balanced) {
    try {
      return JSON.parse(balanced);
    } catch {
      // Пробуем исправить и парсить
      const fixed = fixCommonJSONErrors(balanced);
      try {
        return JSON.parse(fixed);
      } catch {
        // Продолжаем с другими попытками
      }
    }
  }

  // Попытка 2: Простая обрезка по последней }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace !== -1) {
    const simple = cleaned.substring(0, lastBrace + 1);
    try {
      return JSON.parse(simple);
    } catch {
      const fixed = fixCommonJSONErrors(simple);
      try {
        return JSON.parse(fixed);
      } catch {
        // Продолжаем
      }
    }
  }

  // Попытка 3: Ищем JSON объект с needs_clarification или analysis (наш формат)
  const analysisMatch = cleaned.match(/\{[\s\S]*?"needs_clarification"[\s\S]*?\}/);
  if (analysisMatch) {
    // Находим полный объект
    const startIdx = cleaned.indexOf(analysisMatch[0]);
    const extracted = extractJSONWithBalance(cleaned.substring(startIdx));
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {
        const fixed = fixCommonJSONErrors(extracted);
        try {
          return JSON.parse(fixed);
        } catch {
          // Финальная ошибка
        }
      }
    }
  }

  // Финальная ошибка с диагностикой
  console.error('JSON Parse Error - all attempts failed');
  console.error('Content length:', content.length);
  console.error('Content preview (first 500 chars):', content.slice(0, 500));
  console.error('Content preview (last 300 chars):', content.slice(-300));

  throw new Error(`Failed to parse LLM response as JSON. Response may not contain valid JSON.`);
}

/**
 * Parse and validate LLM analysis response with Zod schema
 * Returns validated response or throws with detailed error
 */
export function parseAndValidateAnalysisResponse(content: string): LLMAnalysisResponse {
  // First, parse JSON
  const parsed = parseJSONResponse<unknown>(content);

  // Then validate with Zod
  const validation = LLMAnalysisResponseSchema.safeParse(parsed);

  if (!validation.success) {
    const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    console.error('LLM Response validation failed:', errors);
    console.error('Parsed response:', JSON.stringify(parsed, null, 2).slice(0, 2000));

    // Try to salvage partial data
    throw new Error(`LLM response validation failed: ${errors}`);
  }

  return validation.data;
}

// ===========================================
// Chat Messages
// ===========================================

export async function sendChatMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  model?: string
): Promise<LLMResponse> {
  const client = getClient();
  const modelToUse = model || getDefaultModel();

  try {
    const response = await client.chat.completions.create({
      model: modelToUse,
      max_tokens: getMaxTokens(),
      messages
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model || modelToUse,
      tokens_used: response.usage?.total_tokens || 0
    };
  } catch (error) {
    console.error('Chat Error:', error);
    throw new Error(
      error instanceof Error
        ? `Chat Error: ${error.message}`
        : 'Unknown chat error'
    );
  }
}
