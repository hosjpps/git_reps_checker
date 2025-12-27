'use client';

export type AnalysisStep =
  | 'idle'
  | 'uploading'
  | 'fetching'
  | 'analyzing'
  | 'generating'
  | 'complete'
  | 'error';

interface ProgressIndicatorProps {
  currentStep: AnalysisStep;
}

const STEPS: { step: AnalysisStep; label: string }[] = [
  { step: 'uploading', label: 'Загрузка файлов' },
  { step: 'fetching', label: 'Получение данных' },
  { step: 'analyzing', label: 'Анализ структуры' },
  { step: 'generating', label: 'Генерация рекомендаций' },
];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  if (currentStep === 'idle' || currentStep === 'complete') {
    return null;
  }

  const currentIndex = STEPS.findIndex(s => s.step === currentStep);

  return (
    <div className="progress-indicator">
      {STEPS.map((step, index) => {
        let status: 'pending' | 'active' | 'done' = 'pending';

        if (currentStep === 'error') {
          status = index <= currentIndex ? 'done' : 'pending';
        } else if (index < currentIndex) {
          status = 'done';
        } else if (index === currentIndex) {
          status = 'active';
        }

        return (
          <div key={step.step} className={`progress-step ${status}`}>
            {status === 'done' && (
              <svg className="checkmark" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            )}
            {status === 'active' && <span className="spinner-small" />}
            {status === 'pending' && <span className="step-number">{index + 1}</span>}
            <span className="progress-step-label">{step.label}</span>
          </div>
        );
      })}

      <style jsx>{`
        .progress-indicator {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          justify-content: center;
          padding: 20px;
          margin: 20px 0;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 24px;
          font-size: 14px;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .progress-step.pending {
          color: var(--color-fg-muted);
          background: transparent;
        }

        .progress-step.active {
          color: #fff;
          background: #3d444d;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .progress-step.done {
          color: #3fb950;
          background: rgba(46, 160, 67, 0.15);
          border: 1px solid rgba(46, 160, 67, 0.4);
        }

        .step-number {
          font-weight: 500;
          font-size: 13px;
          opacity: 0.7;
        }

        .checkmark {
          width: 16px;
          height: 16px;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
