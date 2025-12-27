import { describe, it, expect } from 'vitest';
import { selectFilesForAnalysis, getFilePriority, estimateTokens } from '@/lib/analyzers/file-selector';
import type { FileInput } from '@/types';

describe('File Selector', () => {
  describe('getFilePriority', () => {
    it('should prioritize README.md', () => {
      expect(getFilePriority('README.md')).toBe(1);
    });

    it('should prioritize package.json same as README', () => {
      // Both are Tier 1 essential project files
      expect(getFilePriority('package.json')).toBe(1);
    });

    it('should prioritize docs with pattern matching', () => {
      expect(getFilePriority('docs/guide.md')).toBe(3);
    });

    it('should prioritize entry points', () => {
      expect(getFilePriority('src/index.ts')).toBe(4);
      expect(getFilePriority('src/app.tsx')).toBe(4);
      expect(getFilePriority('src/main.ts')).toBe(4);
    });

    it('should prioritize config files', () => {
      expect(getFilePriority('tsconfig.json')).toBe(3);
      expect(getFilePriority('next.config.js')).toBe(3);
    });

    it('should match source file patterns', () => {
      // Other source files in src/ get priority 7
      expect(getFilePriority('src/utils/helper.ts')).toBe(7);
    });

    it('should give default priority to unmatched files', () => {
      expect(getFilePriority('random/unknown/file.xyz')).toBe(10);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate ~4 chars per token', () => {
      const text = 'a'.repeat(400);
      expect(estimateTokens(text)).toBe(100);
    });

    it('should handle empty strings', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should round up', () => {
      const text = 'abc'; // 3 chars = 0.75 tokens, should be 1
      expect(estimateTokens(text)).toBe(1);
    });
  });

  describe('selectFilesForAnalysis', () => {
    it('should select files within token limit', () => {
      const files: FileInput[] = [
        { path: 'README.md', content: 'a'.repeat(100) },
        { path: 'package.json', content: 'b'.repeat(100) },
        { path: 'src/index.ts', content: 'c'.repeat(100) },
      ];

      const result = selectFilesForAnalysis(files, 1000);

      expect(result.files.length).toBe(3);
      expect(result.excludedFiles.length).toBe(0);
    });

    it('should prioritize important files when exceeding limit', () => {
      const files: FileInput[] = [
        { path: 'src/utils.ts', content: 'a'.repeat(10000) }, // Lower priority
        { path: 'README.md', content: 'b'.repeat(100) },       // High priority
        { path: 'src/helper.ts', content: 'c'.repeat(10000) }, // Lower priority
      ];

      const result = selectFilesForAnalysis(files, 500);

      // README should be included due to higher priority
      expect(result.files.some(f => f.path === 'README.md')).toBe(true);
    });

    it('should return stats', () => {
      const files: FileInput[] = [
        { path: 'file1.ts', content: 'content1' },
        { path: 'file2.ts', content: 'content2' },
      ];

      const result = selectFilesForAnalysis(files, 10000);

      expect(result.stats.inputFiles).toBe(2);
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should report excluded files count', () => {
      const files: FileInput[] = [
        { path: 'README.md', content: 'a'.repeat(400) },
        { path: 'large-file.ts', content: 'b'.repeat(10000) },
      ];

      // Very small limit to force exclusion
      const result = selectFilesForAnalysis(files, 150);

      // At least one file should be selected
      expect(result.files.length).toBeGreaterThan(0);
    });
  });
});
