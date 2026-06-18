// src/components/ChatBox.tsx
import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface ChatBoxProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  isOnline?: boolean;
  placeholder?: string;
  suggestedQuestions?: string[];
  height?: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  isLoading = false,
  isOnline = true,
  placeholder = 'اكتب سؤالك هنا...',
  suggestedQuestions = [],
  height = '500px',
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !isOnline) return;
    const message = input.trim();
    setInput('');
    await onSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 flex flex-col`} style={{ height }}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className={`max-w-[75%] ${message.role === 'user' ? 'bg-cyan-500 text-gray-900' : 'bg-gray-800'} rounded-2xl px-4 py-2`}>
              <div className="flex justify-between items-center gap-4 mb-1">
                <span className="text-xs font-medium">
                  {message.role === 'user' ? 'أنت' : 'SADAR AI'}
                </span>
                <span className="text-[10px] opacity-70">{formatTime(message.timestamp)}</span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 pt-1 border-t border-gray-700">
                  <div className="text-[10px] opacity-60 mb-1">📚 المصادر:</div>
                  <div className="flex flex-wrap gap-1">
                    {message.sources.map((source, idx) => (
                      <span key={idx} className="text-[10px] bg-gray-700 px-2 py-0.5 rounded-full">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg">🤖</div>
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && messages.length <= 2 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-2">أسئلة مقترحة:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors"
                onClick={() => setInput(q)}
                disabled={!isOnline}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 flex gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={isOnline ? placeholder : 'المساعد غير متصل...'}
          disabled={isLoading || !isOnline}
          rows={1}
          className="flex-1 bg-gray-800 rounded-2xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || !isOnline}
          className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-gray-900 font-bold"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
};

export default ChatBox;