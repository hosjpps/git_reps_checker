'use client';

import { useState, useCallback, useRef } from 'react';
import JSZip from 'jszip';
import type { FileInput } from '@/types';

// Лимиты файлов (увеличены — smart file selector отсеет лишнее)
const MAX_FILE_SIZE = 1024 * 1024; // 1MB для отдельных файлов
const MAX_ZIP_SIZE = 5 * 1024 * 1024; // 5MB для zip-архивов
const MAX_TOTAL_FILES = 200;

// Паттерны для игнорирования
const IGNORE_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^__pycache__\//,
  /^\.venv\//,
  /^venv\//,
  /^target\//,
  /^vendor\//,
  /\.min\.js$/,
  /\.min\.css$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.DS_Store$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.ico$/,
  /\.woff$/,
  /\.woff2$/,
  /\.ttf$/,
  /\.eot$/,
  /\.mp3$/,
  /\.mp4$/,
  /\.pdf$/,
];

function shouldIncludeFile(path: string): boolean {
  return !IGNORE_PATTERNS.some(pattern => pattern.test(path));
}

interface UploadFormProps {
  files: FileInput[];
  onFilesChange: (files: FileInput[]) => void;
  onError: (error: string | null) => void;
  disabled?: boolean;
}

export function UploadForm({ files, onFilesChange, onError, disabled }: UploadFormProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обработка zip-архива
  const handleZipFile = useCallback(async (file: File): Promise<FileInput[]> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const extractedFiles: FileInput[] = [];

    const entries = Object.entries(contents.files);
    let processed = 0;

    for (const [path, zipEntry] of entries) {
      if (zipEntry.dir) continue;
      if (!shouldIncludeFile(path)) continue;

      if (extractedFiles.length >= MAX_TOTAL_FILES) {
        setUploadStatus(`Достигнут лимит ${MAX_TOTAL_FILES} файлов`);
        break;
      }

      try {
        const content = await zipEntry.async('string');
        if (content.length > MAX_FILE_SIZE) continue;
        if (/[\x00-\x08\x0E-\x1F]/.test(content.slice(0, 1000))) continue;

        extractedFiles.push({ path, content });
        processed++;
        setUploadStatus(`Распаковка: ${processed} файлов...`);
      } catch {
        // Skip files that can't be read as text
      }
    }

    return extractedFiles;
  }, []);

  // File handling
  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles: FileInput[] = [];
    setUploadStatus('Обработка файлов...');
    onError(null);

    for (const file of Array.from(fileList)) {
      // ZIP archive handling
      if (file.name.endsWith('.zip')) {
        if (file.size > MAX_ZIP_SIZE) {
          onError(`Zip-архив слишком большой (макс. ${MAX_ZIP_SIZE / 1024 / 1024}MB)`);
          continue;
        }

        try {
          const zipFiles = await handleZipFile(file);
          newFiles.push(...zipFiles);
          setUploadStatus(`Извлечено ${zipFiles.length} файлов из ${file.name}`);
        } catch (err) {
          onError(`Не удалось распаковать ${file.name}`);
          console.error(err);
        }
        continue;
      }

      // Regular files
      if (file.size > MAX_FILE_SIZE) {
        console.log(`Пропущен ${file.name}: слишком большой`);
        continue;
      }

      const path = file.webkitRelativePath || file.name;
      if (!shouldIncludeFile(path)) continue;

      try {
        const content = await file.text();
        if (/[\x00-\x08\x0E-\x1F]/.test(content.slice(0, 1000))) continue;
        newFiles.push({ path, content });
      } catch {
        // Skip files that can't be read
      }
    }

    if (newFiles.length > 0) {
      const combined = [...files, ...newFiles].slice(0, MAX_TOTAL_FILES);
      onFilesChange(combined);
      setUploadStatus(`Добавлено ${newFiles.length} файлов`);
    } else {
      setUploadStatus(null);
    }

    setTimeout(() => setUploadStatus(null), 3000);
  }, [files, onFilesChange, onError, handleZipFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    onFilesChange([]);
    setUploadStatus(null);
  };

  return (
    <div className="form-group">
      <label>Загрузить файлы или ZIP-архив</label>
      <div
        className={`file-upload ${dragOver ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <p>Перетащите файлы или ZIP-архив сюда</p>
        <p style={{ fontSize: 14, color: '#888', marginTop: 8 }}>
          Файлы до 500KB, ZIP до 2MB
        </p>
        {uploadStatus && (
          <p style={{ fontSize: 14, color: '#0070f3', marginTop: 8 }}>
            {uploadStatus}
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*,.zip"
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <span>{files.length} файлов загружено</span>
            <button className="clear-files" onClick={clearAllFiles}>
              Очистить все
            </button>
          </div>
          <div className="file-list-items">
            {files.slice(0, 20).map((file, i) => (
              <div key={i} className="file-item">
                <span>{file.path}</span>
                <button className="remove-file" onClick={() => removeFile(i)}>
                  ✕
                </button>
              </div>
            ))}
            {files.length > 20 && (
              <div className="file-item" style={{ color: '#888' }}>
                ... и ещё {files.length - 20} файлов
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
