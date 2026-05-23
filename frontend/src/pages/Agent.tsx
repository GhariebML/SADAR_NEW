// src/pages/Agent.tsx  (v3.0 — Professional Cyberpunk UI/UX Refactor)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { askAgent, getAgentHealth } from '../api/apiClient';
import StatusBadge from '../components/StatusBadge';

interface Message {
  id:              string;
  role:            'user' | 'assistant';
  content:         string;
  timestamp:       Date;
  sources?:        string[];
  intent?:         string;
  signalsAnalyzed?: number;
  model?:          string;
}

const Agent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id:        'welcome',
      role:      'assistant',
      content:   'مرحباً! أنا مساعد SADAR الذكي. يمكنني مساعدتك في تحليل إشارات RF، الإجابة عن أسئلتك حول النظام، وتقديم تقارير مفصلة.\n\nيمكنك أيضاً الضغط على زر 📄 في سجل الإشارات لإنشاء تقرير تلقائي عن أي إشارة.',
      timestamp: new Date(),
    },
  ]);
  const [input,          setInput]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [isAgentOnline,  setIsAgentOnline]  = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  const suggestedQuestions = [
    'ما هي أهم التنبيهات اليوم؟',
    'كم عدد إشارات الطائرات المسجلة؟',
    'ما هو مصدر التشويش الأكثر شيوعاً؟',
    'تحليل أداء نموذج AI',
    'ما هي الترددات الأكثر ازدحاماً؟',
    'تقرير عن إشارات الـ Drone',
  ];

  const checkAgentHealth = useCallback(async () => {
    try {
      const health = await getAgentHealth();
      const ok = health.status === 'ok' || health.status === 'healthy';
      setIsAgentOnline(ok && health.ollama?.ok === true);
    } catch {
      setIsAgentOnline(false);
    }
  }, []);

  useEffect(() => {
    checkAgentHealth();
    const interval = setInterval(checkAgentHealth, 30000);
    return () => clearInterval(interval);
  }, [checkAgentHealth]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    const pending = sessionStorage.getItem('sadar_pending_report');
    if (pending) {
      sessionStorage.removeItem('sadar_pending_report');
      setTimeout(() => sendMessageProgrammatic(pending), 300);
    }
  }, []);

  const sendMessageProgrammatic = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id:        Date.now().toString(),
      role:      'user',
      content:   text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await askAgent(userMessage.content);
      const assistantMessage: Message = {
        id:              (Date.now() + 1).toString(),
        role:            'assistant',
        content:         response.answer,
        timestamp:       new Date(),
        sources:         response.sources,
        intent:          response.intent,
        signalsAnalyzed: response.signals_analyzed,
        model:           response.model,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id:        (Date.now() + 1).toString(),
          role:      'assistant',
          content:   'عذراً، حدث خطأ في الاتصال بالمساعد الذكي. يرجى المحاولة مرة أخرى.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await sendMessageProgrammatic(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([{
      id:        'welcome',
      role:      'assistant',
      content:   'مرحباً! أنا مساعد SADAR الذكي. تم مسح المحادثة. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date(),
    }]);
  };

  const exportChat = () => {
    const content = messages
      .map((m) => {
        const role = m.role === 'user' ? 'المستخدم' : 'المساعد';
        const time = m.timestamp.toLocaleString('ar-EG');
        return `[${time}] ${role}:\n${m.content}\n${m.sources ? `\nالمصادر: ${m.sources.join(', ')}\n` : ''}\n---\n`;
      })
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `sadar_chat_${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="agent-page grid-pattern">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-left">
          <h2 className="title-glow">المساعد الذكي رادار AI</h2>
          <p>اطرح استفسارات فنية لتحليل الطيف الراديوي أو قم بإنشاء تقارير تلقائية</p>
        </div>
        <div className="header-right">
          <div className="agent-status-widget">
            <span className="status-label">مساعد الذكاء الاصطناعي:</span>
            <StatusBadge status={isAgentOnline ? 'online' : 'offline'} size="small" />
          </div>
          <button className="tech-action-btn border-red" onClick={clearChat}>🗑️ مسح</button>
          <button className="tech-action-btn" onClick={exportChat}>📥 تصدير السجل</button>
        </div>
      </div>

      {/* ── Chat workspace ── */}
      <div className="chat-workspace card">
        <div className="messages-area">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`message-bubble-wrapper ${message.role === 'user' ? 'user-side' : 'assistant-side'}`}
            >
              <div className="message-avatar-wrap" style={{
                background: message.role === 'user' ? 'linear-gradient(135deg, var(--primary-color), var(--primary-color))' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${message.role === 'user' ? 'transparent' : 'var(--border-color)'}`,
              }}>
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              
              <div className="message-card">
                <div className="message-bubble-header">
                  <span className="message-sender-name">
                    {message.role === 'user' ? 'المشغل الفني' : 'SADAR CO-PILOT'}
                  </span>
                  <span className="message-timestamp-val">{formatTime(message.timestamp)}</span>
                </div>
                
                <div className="message-bubble-text">{message.content}</div>

                {message.role === 'user' && message.content.startsWith('اكتب تقرير تحليل RF') && (
                  <div className="report-badge-accent">
                    📄 تم تحويل بيانات الإشارة من السجل
                  </div>
                )}

                {message.sources && message.sources.length > 0 && (
                  <div className="message-sources-section">
                    <span className="sources-label-text">📚 المستندات المرجعية:</span>
                    <div className="sources-chips-list">
                      {message.sources.map((src, i) => (
                        <span key={i} className="source-chip-tag">{src}</span>
                      ))}
                    </div>
                  </div>
                )}
                
                {message.signalsAnalyzed !== undefined && (
                  <div className="message-metadata-footer">
                    <span className="meta-footer-item">📊 معالجة {message.signalsAnalyzed} إشارة</span>
                    {message.model && <span className="meta-footer-item">🧠 {message.model}</span>}
                    {message.intent && <span className="meta-footer-item">🎯 النية: {message.intent}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-bubble-wrapper assistant-side">
              <div className="message-avatar-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                🤖
              </div>
              <div className="message-card" style={{ padding: '14px 20px' }}>
                <div className="typing-decrypt">جاري الاستخراج والتحليل</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && (
          <div className="suggestions-prompt-panel">
            <h4>💡 موضوعات مقترحة لبدء التحليل:</h4>
            <div className="suggestions-grid">
              {suggestedQuestions.map((q, i) => (
                <button key={i} className="suggested-prompt-chip" onClick={() => setInput(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-input-panel">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="اسأل المساعد عن تشخيص إشارات الـ Drone أو التشويش..."
            disabled={isLoading}
            rows={1}
            className="chat-textarea"
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>

      <style>{`
        .agent-page {
          padding: 0;
          height: calc(100vh - 90px);
          display: flex;
          flex-direction: column;
          direction: rtl;
        }

        .page-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 24px;
          flex-wrap: wrap; gap: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 14px;
        }
        .header-left h2 { margin-bottom: 6px; font-size: 1.8rem; font-weight: 800; }
        .title-glow {
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
          -webkit-background-clip: text; background-clip: text;
        }
        .header-left p { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
        .header-right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .agent-status-widget { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
        .status-label { color: var(--text-secondary); }

        .tech-action-btn {
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color);
          padding: 6px 14px; border-radius: 12px; font-size: 12.5px; font-weight: 600;
          color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;
        }
        .tech-action-btn:hover {
          background: var(--primary-color, #06b6d4); border-color: transparent; color: #ffffff;
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.25);
        }
        .tech-action-btn.border-red:hover {
          background: var(--drone-color, #ef4444); border-color: transparent; color: #ffffff;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.25);
        }

        .chat-workspace {
          flex: 1; display: flex; flex-direction: column;
          overflow: hidden; padding: 0 !important;
        }

        .messages-area {
          flex: 1; overflow-y: auto; padding: 24px;
          display: flex; flex-direction: column; gap: 20px;
        }

        .message-bubble-wrapper { display: flex; gap: 14px; animation: bubble-fadeIn 0.25s ease-out; }
        .user-side { flex-direction: row-reverse; }

        .message-avatar-wrap {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(0,0,0,0.05);
        }

        .message-card {
          max-width: 75%; background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 18px; padding: 14px 18px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.02);
          position: relative;
        }
        
        .user-side .message-card {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-color));
          color: #ffffff; border-color: transparent;
          box-shadow: 0 4px 15px var(--primary-glow);
        }

        .message-bubble-header {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 8px; font-size: 11.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 4px;
        }
        .user-side .message-bubble-header { border-bottom-color: rgba(255, 255, 255, 0.1); }
        
        .message-sender-name { font-weight: 700; letter-spacing: 0.01em; }
        .message-timestamp-val { color: var(--text-tertiary); font-weight: 500; }
        .user-side .message-timestamp-val { color: rgba(255,255,255,0.7); }

        .message-bubble-text {
          font-size: 13.5px; line-height: 1.6; font-weight: 500;
          white-space: pre-wrap; word-wrap: break-word;
        }

        .report-badge-accent {
          margin-top: 8px; font-size: 10px; font-weight: 700;
          background: rgba(255, 255, 255, 0.15); color: #ffffff;
          border-radius: 6px; padding: 4px 10px; display: inline-block;
        }

        .message-sources-section {
          margin-top: 12px; padding-top: 10px;
          border-top: 1px solid var(--border-color);
        }
        .user-side .message-sources-section { border-top-color: rgba(255,255,255,0.1); }
        .sources-label-text { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
        .user-side .sources-label-text { color: rgba(255,255,255,0.85); }
        .sources-chips-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        
        .source-chip-tag {
          background: var(--primary-glow); padding: 3px 10px; border: 1px solid var(--primary-color);
          border-radius: 12px; font-size: 10px; color: var(--primary-color); font-weight: 600;
        }
        .user-side .source-chip-tag {
          background: rgba(255,255,255,0.12); border-color: transparent; color: #ffffff;
        }

        .message-metadata-footer {
          display: flex; flex-wrap: wrap; gap: 12px;
          margin-top: 12px; padding-top: 10px;
          border-top: 1px solid var(--border-color);
          font-size: 10px; color: var(--text-tertiary); font-weight: 600;
        }
        .user-side .message-metadata-footer { border-top-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
        .meta-footer-item { display: flex; align-items: center; gap: 4px; }

        .typing-decrypt {
          font-family: monospace; font-size: 13.5px; font-weight: 700; color: var(--primary-color);
          display: flex; align-items: center; letter-spacing: 0.05em;
        }
        .typing-decrypt::after {
          content: '...'; width: 24px; text-align: left;
          animation: decrypting 1.5s infinite steps(4, end);
        }
        @keyframes decrypting {
          0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } 100% { content: '...'; }
        }

        .suggestions-prompt-panel {
          padding: 16px 24px; border-top: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.05);
        }
        .suggestions-prompt-panel h4 {
          font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 12px;
        }
        .suggestions-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .suggested-prompt-chip {
          background: rgba(255,255,255,0.02); border: 1px solid var(--border-color);
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
          color: var(--text-secondary); cursor: pointer; transition: all 0.2s ease;
        }
        .suggested-prompt-chip:hover {
          background: var(--primary-color); border-color: transparent; color: #ffffff;
          transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-glow);
        }

        .chat-input-panel {
          display: flex; gap: 14px; padding: 18px 24px;
          border-top: 1px solid var(--border-color); background: rgba(0, 0, 0, 0.02);
          align-items: center;
        }
        .chat-textarea {
          flex: 1; background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-color);
          border-radius: 24px; padding: 12px 20px; color: var(--text-primary);
          font-size: 14px; resize: none; font-family: inherit; max-height: 120px;
          outline: none; transition: border-color 0.2s ease;
        }
        .chat-textarea:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px var(--primary-glow); }
        .chat-textarea:disabled { opacity: 0.5; }

        .chat-send-btn {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--primary-color); border: none;
          font-size: 18px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex; align-items: center; justify-content: center;
          color: #ffffff;
        }
        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.06); box-shadow: 0 4px 15px var(--primary-glow);
        }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        @keyframes bubble-fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .message-card { max-width: 88%; }
          .header-right { width: 100%; justify-content: flex-start; }
          .suggestions-grid { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default Agent;