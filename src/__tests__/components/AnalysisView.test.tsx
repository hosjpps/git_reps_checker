import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnalysisView } from '@/components/AnalysisView';
import type { Analysis } from '@/types';

const mockAnalysis: Analysis = {
  project_summary: 'Test project summary',
  detected_stage: 'mvp',
  tech_stack: ['TypeScript', 'React', 'Next.js'],
  strengths: [
    { area: 'Documentation', detail: 'Well documented' },
    { area: 'Architecture', detail: 'Clean structure' },
  ],
  issues: [
    { severity: 'high', area: 'Testing', detail: 'No tests', file_path: null },
    { severity: 'medium', area: 'Security', detail: 'Missing validation', file_path: 'src/api.ts' },
    { severity: 'low', area: 'Performance', detail: 'Could optimize', file_path: null },
  ],
  tasks: [
    {
      title: 'Add tests',
      description: 'Write unit tests',
      priority: 'high',
      category: 'technical',
      estimated_minutes: 120,
      depends_on: null,
    },
    {
      title: 'Update docs',
      description: 'Add API docs',
      priority: 'medium',
      category: 'documentation',
      estimated_minutes: 60,
      depends_on: 'Add tests',
    },
  ],
  next_milestone: 'Launch MVP',
};

describe('AnalysisView', () => {
  it('should render project summary', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('Test project summary')).toBeInTheDocument();
  });

  it('should render detected stage badge', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('mvp')).toBeInTheDocument();
  });

  it('should render tech stack', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  it('should render strengths', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Well documented')).toBeInTheDocument();
  });

  it('should render issues with severity', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('Testing')).toBeInTheDocument();
    expect(screen.getByText('No tests')).toBeInTheDocument();
  });

  it('should render tasks with priority', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('Add tests')).toBeInTheDocument();
    expect(screen.getByText('Write unit tests')).toBeInTheDocument();
  });

  it('should render task dependencies', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText(/Зависит от:/)).toBeInTheDocument();
  });

  it('should render next milestone', () => {
    render(<AnalysisView analysis={mockAnalysis} />);
    expect(screen.getByText('Launch MVP')).toBeInTheDocument();
  });

  it('should apply correct severity classes to issues', () => {
    const { container } = render(<AnalysisView analysis={mockAnalysis} />);

    expect(container.querySelector('.severity-high')).toBeInTheDocument();
    expect(container.querySelector('.severity-medium')).toBeInTheDocument();
    expect(container.querySelector('.severity-low')).toBeInTheDocument();
  });

  it('should apply correct priority classes to tasks', () => {
    const { container } = render(<AnalysisView analysis={mockAnalysis} />);

    expect(container.querySelector('.priority-high')).toBeInTheDocument();
    expect(container.querySelector('.priority-medium')).toBeInTheDocument();
  });
});
