import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  FileInput,
  Analysis,
  PartialAnalysis,
  Question
} from '@/types';
import { fetchRepoFiles, getLatestCommitSha } from '@/lib/github/fetcher';
import { analyzeStructure, detectTechStack, detectStage, countTotalLines } from '@/lib/analyzers/structure';
import { selectFilesForAnalysis, getExcludedFilesSummary } from '@/lib/analyzers/file-selector';
import { buildAnalysisPrompt } from '@/lib/llm/prompts';
import { sendToLLM, parseAndValidateAnalysisResponse, type LLMAnalysisResponse } from '@/lib/llm/client';
import { checkRateLimit, getClientIP, RATE_LIMIT_CONFIG } from '@/lib/utils/rate-limiter';
import { analysisCache, AnalysisCache } from '@/lib/utils/cache';
import { validateEnv, getMissingEnvVars } from '@/lib/utils/env';

// ===========================================
// Request Validation
// ===========================================

const FileInputSchema = z.object({
  path: z.string(),
  content: z.string()
});

const UserContextSchema = z.object({
  current_week: z.number().optional(),
  previous_tasks_completed: z.array(z.string()).optional(),
  user_goal: z.string().optional()
}).optional();

const AnalyzeRequestSchema = z.object({
  files: z.array(FileInputSchema).optional(),
  repo_url: z.string().url().optional(),
  access_token: z.string().optional(),
  project_description: z.string().min(1, 'Project description is required'),
  user_context: UserContextSchema
}).refine(
  data => data.files || data.repo_url,
  { message: 'Either files or repo_url must be provided' }
);

// LLMAnalysisResponse type is imported from '@/lib/llm/client'

// ===========================================
// POST /api/analyze
// ===========================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Validate environment variables
  try {
    validateEnv();
  } catch (error) {
    const missing = getMissingEnvVars();
    return NextResponse.json(
      {
        success: false,
        error: `Server configuration error: Missing required environment variables: ${missing.join(', ')}`,
        metadata: {
          files_analyzed: 0,
          total_lines: 0,
          model_used: '',
          tokens_used: 0,
          analysis_duration_ms: Date.now() - startTime
        }
      } satisfies AnalyzeResponse,
      { status: 500 }
    );
  }

  // Rate limiting
  const clientIP = getClientIP(request);
  const rateLimit = checkRateLimit(clientIP);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Превышен лимит запросов. Попробуйте через ${rateLimit.resetIn} секунд. Лимит: ${RATE_LIMIT_CONFIG.maxRequests} запросов в минуту.`,
        metadata: {
          files_analyzed: 0,
          total_lines: 0,
          model_used: '',
          tokens_used: 0,
          analysis_duration_ms: Date.now() - startTime
        }
      } satisfies AnalyzeResponse,
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetIn.toString()
        }
      }
    );
  }

  try {
    // Parse request body
    const body = await request.json() as AnalyzeRequest;

    // Validate request
    const validation = AnalyzeRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
          metadata: {
            files_analyzed: 0,
            total_lines: 0,
            model_used: '',
            tokens_used: 0,
            analysis_duration_ms: Date.now() - startTime
          }
        } satisfies AnalyzeResponse,
        { status: 400 }
      );
    }

    const { files, repo_url, access_token, project_description, user_context } = validation.data;

    // Check cache for GitHub repos
    let cacheKey: string | null = null;
    let commitSha: string | null = null;

    if (repo_url) {
      // Get latest commit SHA for cache key
      commitSha = await getLatestCommitSha(repo_url, access_token);

      if (commitSha) {
        cacheKey = AnalysisCache.generateKey(repo_url, commitSha);

        // Check cache
        const cachedResult = analysisCache.get(cacheKey) as AnalyzeResponse | null;
        if (cachedResult) {
          // Return cached result with updated duration
          return NextResponse.json({
            ...cachedResult,
            metadata: {
              ...cachedResult.metadata,
              analysis_duration_ms: Date.now() - startTime,
              cached: true
            }
          }, {
            headers: {
              'X-Cache': 'HIT',
              'X-Cache-Key': cacheKey
            }
          });
        }
      }
    }

    // Get files from GitHub if repo_url provided
    let projectFiles: FileInput[];

    if (repo_url) {
      try {
        projectFiles = await fetchRepoFiles(repo_url, access_token);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch repository',
            metadata: {
              files_analyzed: 0,
              total_lines: 0,
              model_used: '',
              tokens_used: 0,
              analysis_duration_ms: Date.now() - startTime
            }
          } satisfies AnalyzeResponse,
          { status: 400 }
        );
      }
    } else {
      projectFiles = files!;
    }

    // Check if we have any files
    if (projectFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No files found to analyze',
          metadata: {
            files_analyzed: 0,
            total_lines: 0,
            model_used: '',
            tokens_used: 0,
            analysis_duration_ms: Date.now() - startTime
          }
        } satisfies AnalyzeResponse,
        { status: 400 }
      );
    }

    // Smart file selection for large repos (prioritize important files, limit context)
    const originalFileCount = projectFiles.length;
    const selection = selectFilesForAnalysis(projectFiles);
    const selectedFiles = selection.files;

    // Log if files were excluded (for debugging)
    if (selection.excludedFiles.length > 0) {
      console.log(`Large repo handling: ${getExcludedFilesSummary(selection.excludedFiles)}`);
      console.log(`Selected ${selection.stats.outputFiles}/${selection.stats.inputFiles} files (~${selection.totalTokens} tokens)`);
    }

    // Analyze structure locally (use selected files)
    const structure = analyzeStructure(selectedFiles);
    const techStack = detectTechStack(selectedFiles);
    const detectedStage = detectStage(selectedFiles, structure);
    const totalLines = countTotalLines(selectedFiles);

    // Build prompt and send to LLM
    const prompt = buildAnalysisPrompt(
      selectedFiles,
      project_description,
      structure,
      techStack,
      detectedStage,
      user_context
    );

    const llmResponse = await sendToLLM(prompt);

    // Parse and validate LLM response with Zod
    let parsedResponse: LLMAnalysisResponse;
    try {
      parsedResponse = parseAndValidateAnalysisResponse(llmResponse.content);
    } catch (parseError) {
      console.error('Failed to parse/validate LLM response:', parseError);
      console.error('LLM response content (first 2000 chars):', llmResponse.content.slice(0, 2000));
      throw new Error(`Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Build response
    const response: AnalyzeResponse = {
      success: true,
      needs_clarification: parsedResponse.needs_clarification,
      questions: parsedResponse.questions,
      partial_analysis: parsedResponse.partial_analysis,
      analysis: parsedResponse.analysis,
      metadata: {
        files_analyzed: selectedFiles.length,
        files_total: originalFileCount,
        files_truncated: selection.truncatedFiles.length,
        total_lines: totalLines,
        model_used: llmResponse.model,
        tokens_used: llmResponse.tokens_used,
        analysis_duration_ms: Date.now() - startTime
      }
    };

    // Store in cache if we have a cache key (GitHub repos only)
    if (cacheKey && response.success) {
      analysisCache.set(cacheKey, response);
    }

    return NextResponse.json(response, {
      headers: cacheKey ? {
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey
      } : {}
    });

  } catch (error) {
    console.error('Analyze error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        metadata: {
          files_analyzed: 0,
          total_lines: 0,
          model_used: '',
          tokens_used: 0,
          analysis_duration_ms: Date.now() - startTime
        }
      } satisfies AnalyzeResponse,
      { status: 500 }
    );
  }
}
