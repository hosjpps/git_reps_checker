'use client';

import { useState, useCallback } from 'react';
import type { Analysis, ChatResponse } from '@/types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { usePersistedChatHistory } from '@/hooks/useLocalStorage';

interface ChatSectionProps {
  analysis: Analysis;
  onError: (error: string) => void;
}

export function ChatSection({ analysis, onError }: ChatSectionProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = usePersistedChatHistory();
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [currentStreamingQuestion, setCurrentStreamingQuestion] = useState('');
  const [useStreaming] = useState(true); // Toggle for streaming mode

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, []);

  // Handle chat with streaming
  const handleChatStream = useCallback(async () => {
    if (!chatMessage.trim()) return;

    const currentQuestion = chatMessage.trim();
    setChatLoading(true);
    setChatMessage('');
    setStreamingAnswer('');
    setCurrentStreamingQuestion(currentQuestion);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: Date.now().toString(),
          message: currentQuestion,
          previous_analysis: analysis
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Stream error');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Stream complete
              setChatHistory(prev => [...prev, {
                question: currentQuestion,
                answer: fullAnswer
              }]);
              setStreamingAnswer('');
              setCurrentStreamingQuestion('');
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullAnswer += parsed.content;
                  setStreamingAnswer(fullAnswer);
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Ошибка чата');
    } finally {
      setChatLoading(false);
    }
  }, [chatMessage, analysis, onError]);

  // Handle chat without streaming (fallback)
  const handleChatRegular = useCallback(async () => {
    if (!chatMessage.trim()) return;

    const currentQuestion = chatMessage.trim();
    setChatLoading(true);
    setChatMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: Date.now().toString(),
          message: currentQuestion,
          previous_analysis: analysis
        })
      });

      const data: ChatResponse = await response.json();

      if (data.success) {
        setChatHistory(prev => [...prev, {
          question: currentQuestion,
          answer: data.answer
        }]);
      } else {
        onError(data.error || 'Ошибка чата');
      }
    } catch (err) {
      onError('Не удалось отправить сообщение');
    } finally {
      setChatLoading(false);
    }
  }, [chatMessage, analysis, onError]);

  const handleChat = useStreaming ? handleChatStream : handleChatRegular;

  return (
    <div className="chat-section">
      <h3>Задать вопрос</h3>

      {/* История чата */}
      {chatHistory.length > 0 && (
        <div className="chat-history">
          {chatHistory.map((item, i) => (
            <div key={i} className="chat-item">
              <div className="chat-question">
                <span className="chat-label">Вопрос:</span>
                <p>{item.question}</p>
              </div>
              <div className="chat-answer">
                <div className="chat-answer-header">
                  <span className="chat-label">Ответ:</span>
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(item.answer)}
                    title="Копировать"
                  >
                    📋 Копировать
                  </button>
                </div>
                <div className="chat-answer-content">
                  <MarkdownRenderer content={item.answer} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streaming answer */}
      {streamingAnswer && (
        <div className="chat-item streaming">
          <div className="chat-question">
            <span className="chat-label">Вопрос:</span>
            <p>{currentStreamingQuestion}</p>
          </div>
          <div className="chat-answer">
            <span className="chat-label">Ответ:</span>
            <div className="chat-answer-content">
              <MarkdownRenderer content={streamingAnswer} />
            </div>
          </div>
        </div>
      )}

      {/* Форма ввода */}
      <div className="chat-input">
        <input
          type="text"
          placeholder="Как мне сделать первую задачу? Почему это важно?"
          value={chatMessage}
          onChange={e => setChatMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
          disabled={chatLoading}
        />
        <button onClick={handleChat} disabled={chatLoading || !chatMessage.trim()}>
          {chatLoading ? '...' : 'Отправить'}
        </button>
      </div>
    </div>
  );
}
