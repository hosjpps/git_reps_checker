import { describe, it, expect } from 'vitest';
import { parseJSONResponse } from '@/lib/llm/client';

describe('parseJSONResponse', () => {
  describe('clean JSON', () => {
    it('should parse valid JSON', () => {
      const input = '{"name": "test", "value": 123}';
      expect(parseJSONResponse(input)).toEqual({ name: 'test', value: 123 });
    });

    it('should handle nested objects', () => {
      const input = '{"outer": {"inner": "value"}}';
      expect(parseJSONResponse(input)).toEqual({ outer: { inner: 'value' } });
    });

    it('should handle arrays', () => {
      const input = '{"items": [1, 2, 3]}';
      expect(parseJSONResponse(input)).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('markdown code blocks', () => {
    it('should extract JSON from ```json blocks', () => {
      const input = '```json\n{"name": "test"}\n```';
      expect(parseJSONResponse(input)).toEqual({ name: 'test' });
    });

    it('should extract JSON from ``` blocks', () => {
      const input = '```\n{"name": "test"}\n```';
      expect(parseJSONResponse(input)).toEqual({ name: 'test' });
    });
  });

  describe('text before/after JSON', () => {
    it('should handle text before JSON', () => {
      const input = 'Here is the analysis:\n{"name": "test"}';
      expect(parseJSONResponse(input)).toEqual({ name: 'test' });
    });

    it('should handle text after JSON', () => {
      const input = '{"name": "test"}\n\nHope this helps!';
      expect(parseJSONResponse(input)).toEqual({ name: 'test' });
    });

    it('should handle markdown headers before JSON', () => {
      const input = '# Analysis\n\n{"name": "test"}';
      expect(parseJSONResponse(input)).toEqual({ name: 'test' });
    });
  });

  describe('common JSON errors', () => {
    it('should handle trailing commas', () => {
      const input = '{"name": "test", "value": 123,}';
      expect(parseJSONResponse(input)).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JavaScript comments', () => {
      const input = '{"name": "test" // comment\n}';
      expect(parseJSONResponse(input)).toEqual({ name: 'test' });
    });
  });

  describe('brace balancing', () => {
    it('should handle nested braces in strings', () => {
      const input = '{"code": "function() { return {}; }"}';
      expect(parseJSONResponse(input)).toEqual({ code: 'function() { return {}; }' });
    });

    it('should handle escaped quotes in strings', () => {
      const input = '{"text": "He said \\"hello\\""}';
      expect(parseJSONResponse(input)).toEqual({ text: 'He said "hello"' });
    });
  });

  describe('LLM analysis response format', () => {
    it('should parse needs_clarification response', () => {
      const input = `{
        "needs_clarification": true,
        "questions": [
          {"id": "q1", "question": "What?", "why": "Because"}
        ],
        "partial_analysis": {
          "project_summary": "Summary",
          "detected_stage": "unknown",
          "tech_stack": ["TypeScript"]
        }
      }`;
      const result = parseJSONResponse<{ needs_clarification: boolean }>(input);
      expect(result.needs_clarification).toBe(true);
    });

    it('should parse full analysis response', () => {
      const input = `{
        "needs_clarification": false,
        "questions": [],
        "analysis": {
          "project_summary": "A test project",
          "detected_stage": "mvp",
          "tech_stack": ["TypeScript", "React"],
          "strengths": [],
          "issues": [],
          "tasks": [],
          "next_milestone": "Launch"
        }
      }`;
      const result = parseJSONResponse<{ analysis: { project_summary: string } }>(input);
      expect(result.analysis.project_summary).toBe('A test project');
    });
  });

  describe('error handling', () => {
    it('should throw on non-JSON content', () => {
      expect(() => parseJSONResponse('This is not JSON')).toThrow();
    });

    it('should throw on empty input', () => {
      expect(() => parseJSONResponse('')).toThrow();
    });
  });
});
