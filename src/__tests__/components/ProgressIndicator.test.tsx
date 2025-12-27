import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressIndicator, type AnalysisStep } from '@/components/ProgressIndicator';

describe('ProgressIndicator', () => {
  it('should not render when idle', () => {
    const { container } = render(<ProgressIndicator currentStep="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when complete', () => {
    const { container } = render(<ProgressIndicator currentStep="complete" />);
    expect(container.firstChild).toBeNull();
  });

  it('should render all steps when active', () => {
    render(<ProgressIndicator currentStep="analyzing" />);

    expect(screen.getByText('Загрузка файлов')).toBeInTheDocument();
    expect(screen.getByText('Получение данных')).toBeInTheDocument();
    expect(screen.getByText('Анализ структуры')).toBeInTheDocument();
    expect(screen.getByText('Генерация рекомендаций')).toBeInTheDocument();
  });

  it('should show spinner for active step', () => {
    const { container } = render(<ProgressIndicator currentStep="analyzing" />);
    const spinners = container.querySelectorAll('.spinner-small');
    expect(spinners.length).toBe(1);
  });

  it('should show checkmarks for completed steps', () => {
    const { container } = render(<ProgressIndicator currentStep="generating" />);
    const checkmarks = container.querySelectorAll('.checkmark');
    // uploading, fetching, analyzing should be done
    expect(checkmarks.length).toBe(3);
  });

  it('should handle error state', () => {
    const { container } = render(<ProgressIndicator currentStep="error" />);
    // Should still render steps
    expect(screen.getByText('Загрузка файлов')).toBeInTheDocument();
  });
});
