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
import { fetchRepoFiles } from '@/lib/github/fetcher';
import { analyzeStructure, detectTechStack, detectStage, countTotalLines } from '@/lib/analyzers/structure';
import { buildAnalysisPrompt } from '@/lib/llm/prompts';
import { sendToLLM, parseJSONResponse } from '@/lib/llm/client';

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

// ===========================================
// LLM Response Type
// ===========================================

interface LLMAnalysisResponse {
  needs_clarification: boolean;
  questions?: Question[];
  partial_analysis?: PartialAnalysis;
  analysis?: Analysis;
}

// ===========================================
// POST /api/analyze
// ===========================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    // Analyze structure locally
    const structure = analyzeStructure(projectFiles);
    const techStack = detectTechStack(projectFiles);
    const detectedStage = detectStage(projectFiles, structure);
    const totalLines = countTotalLines(projectFiles);

    // Build prompt and send to LLM
    const prompt = buildAnalysisPrompt(
      projectFiles,
      project_description,
      structure,
      techStack,
      detectedStage,
      user_context
    );

    const llmResponse = await sendToLLM(prompt);

    // Parse LLM response
    let parsedResponse: LLMAnalysisResponse;
    try {
      parsedResponse = parseJSONResponse<LLMAnalysisResponse>(llmResponse.content);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
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
        files_analyzed: projectFiles.length,
        total_lines: totalLines,
        model_used: llmResponse.model,
        tokens_used: llmResponse.tokens_used,
        analysis_duration_ms: Date.now() - startTime
      }
    };

    return NextResponse.json(response);

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
