import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment variables for tests
process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
