// src/pages/Reports.tsx  (v2.1 — single station SDR-01 + light mode card fix)
import React, { useState, useRef } from 'react';
import { generateReport } from '../api/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportFormData {
  label:         string;
  confidence:    number;
  frequency_mhz: number;
  snr_db:        number;
  source:        string;
  location:      string;
  analyst_notes: string;
}

// ─── Station registry — محطة واحدة حقيقية ────────────────────────────────────

const STATION_OPTIONS = [
  { value: 'SDR-01', label: 'SDR-01', name: 'Main Station', flag: '🟢' },
];

const LABEL_OPTIONS = [
  { value: 'Drone',   icon: '🚁', color: '#f59e0b' },
  { value: 'Jamming', icon: '📡', color: '#ef4444' },
  { value: 'Normal',  icon: '✅', color: '#10b981' },
];

const THREAT_COLORS: Record<string, string> = {
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#dc2626',
};

// ─── Markdown Renderer ────────────────────────────────────────────────────────

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i} style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`'))
        return <code key={i} style={{ background: 'var(--primary-glow)', padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: 'var(--primary-color)' }}>{part.slice(1, -1)}</code>;
      return <span key={i}>{part}</span>;
    });
  };

  const lines   = content.split('\n');
  const result: React.ReactNode[] = [];
  let tableRows: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inTable   = false;
  let inList    = false;

  const flushTable = () => {
    if (!tableRows.length) return;
    result.push(
      <div key={`t${result.length}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl', fontSize: 12 }}>
          <tbody>{tableRows}</tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable   = false;
  };

  const flushList = () => {
    if (!listItems.length) return;
    result.push(
      <ul key={`l${result.length}`} style={{ margin: '8px 0', paddingRight: 22, listStyle: 'none' }}>
        {listItems}
      </ul>
    );
    listItems = [];
    inList    = false;
  };

  lines.forEach((line, idx) => {
    const isTable  = line.startsWith('|');
    const isBullet = line.startsWith('- ') || line.startsWith('* ');

    if (!isTable && inTable)  flushTable();
    if (!isBullet && inList)  flushList();

    // H1
    if (line.startsWith('# ')) {
      result.push(
        <div key={idx} style={{ margin: '0 0 16px', paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-color)', margin: 0, letterSpacing: '-0.02em' }}>
            {line.slice(2)}
          </h1>
        </div>
      );
      return;
    }
    // H2
    if (line.startsWith('## ')) {
      result.push(
        <h2 key={idx} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '18px 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 14, background: 'var(--primary-color)', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
          {line.slice(3)}
        </h2>
      );
      return;
    }
    // H3
    if (line.startsWith('### ')) {
      result.push(
        <h3 key={idx} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {line.slice(4)}
        </h3>
      );
      return;
    }
    // HR
    if (line.trim() === '---') {
      result.push(<hr key={idx} style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />);
      return;
    }
    // Table
    if (isTable) {
      inTable = true;
      const cells = line.split('|').filter(Boolean).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return; // separator
      const isHeader = idx < lines.length - 1 && lines[idx + 1]?.includes('---');
      tableRows.push(
        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
          {cells.map((cell, ci) => {
            const Tag = isHeader ? 'th' : 'td';
            const bold = cell.startsWith('**') && cell.endsWith('**');
            const text = bold ? cell.slice(2, -2) : cell;
            return (
              <Tag key={ci} style={{
                padding: '7px 12px',
                fontSize: 12,
                fontWeight: isHeader || bold ? 700 : 400,
                color: isHeader || bold ? 'var(--primary-color)' : 'var(--text-secondary)',
                textAlign: 'right',
                background: isHeader ? 'var(--primary-glow)' : 'transparent',
                whiteSpace: 'nowrap',
              }}>
                {renderInline(text)}
              </Tag>
            );
          })}
        </tr>
      );
      return;
    }
    // Bullet
    if (isBullet) {
      inList = true;
      const text = line.slice(2);
      listItems.push(
        <li key={idx} style={{ fontSize: 13, lineHeight: 1.65, margin: '4px 0', color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--primary-color)', marginTop: 2, flexShrink: 0 }}>◆</span>
          <span>{renderInline(text)}</span>
        </li>
      );
      return;
    }
    // Italic footer
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      result.push(
        <p key={idx} style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '8px 0 0', textAlign: 'center' }}>
          {line.slice(1, -1)}
        </p>
      );
      return;
    }
    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      result.push(
        <div key={idx} style={{ display: 'flex', gap: 10, margin: '5px 0', alignItems: 'flex-start' }}>
          <span style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)', borderRadius: 4, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {numMatch[1]}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)', paddingTop: 2 }}>
            {renderInline(numMatch[2])}
          </span>
        </div>
      );
      return;
    }
    // Empty
    if (!line.trim()) {
      result.push(<div key={idx} style={{ height: 6 }} />);
      return;
    }
    // Paragraph
    result.push(
      <p key={idx} style={{ fontSize: 13, lineHeight: 1.7, margin: '3px 0', color: 'var(--text-secondary)' }}>
        {renderInline(line)}
      </p>
    );
  });

  flushTable();
  flushList();

  return <div style={{ direction: 'rtl', textAlign: 'right' }}>{result}</div>;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const [formData, setFormData] = useState<ReportFormData>({
    label:         'Drone',
    confidence:    0.85,
    frequency_mhz: 2400,
    snr_db:        15,
    source:        'SDR-01',       // ✅ المحطة الحقيقية الوحيدة
    location:      '',
    analyst_notes: '',
  });

  const [isLoading,      setIsLoading]      = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [progress,       setProgress]       = useState(0);
  const [viewMode,       setViewMode]       = useState<'rendered' | 'raw'>('rendered');
  const [copyDone,       setCopyDone]       = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedStation = STATION_OPTIONS.find(s => s.value === formData.source) ?? STATION_OPTIONS[0];
  const selectedLabel   = LABEL_OPTIONS.find(l => l.value === formData.label)    ?? LABEL_OPTIONS[0];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['confidence', 'frequency_mhz', 'snr_db'].includes(name)
        ? parseFloat(value)
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setReportMarkdown(null);
    setProgress(0);

    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 88) { clearInterval(intervalRef.current!); return p; }
        return p + Math.random() * 6;
      });
    }, 1100);

    try {
      const res = await generateReport({
        label:         formData.label,
        confidence:    formData.confidence,
        frequency_mhz: formData.frequency_mhz,
        snr_db:        formData.snr_db,
        source:        formData.source        || undefined,
        location:      formData.location      || undefined,
        analyst_notes: formData.analyst_notes || undefined,
      });
      setProgress(100);
      setReportMarkdown(res.markdown);
      setViewMode('rendered');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في إنشاء التقرير');
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!reportMarkdown) return;
    const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sadar_${formData.label}_${formData.source}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!reportMarkdown) return;
    await navigator.clipboard.writeText(reportMarkdown);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  };

  const confidencePct = Math.round(formData.confidence * 100);
  const confColor     = confidencePct >= 80 ? '#ef4444' : confidencePct >= 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="rp-root">

      {/* ── Page header ── */}
      <div className="rp-header">
        <div className="rp-header-left">
          <span className="rp-badge">RF ANALYSIS</span>
          <h2>توليد التقارير</h2>
          <p>إنشاء تقارير تحليلية مفصّلة بواسطة الذكاء الاصطناعي</p>
        </div>
        <div className="rp-station-info">
          <span className="rp-station-dot" />
          <span className="rp-station-info-label">المحطة النشطة</span>
          <span className="rp-station-info-name">SDR-01 — Main Station</span>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="rp-grid">

        {/* ── Form card ── */}
        <div className="rp-card">
          <div className="rp-card-title">
            <span>⚙️</span>
            <span>بيانات الإشارة</span>
          </div>

          <form onSubmit={handleSubmit} className="rp-form">

            {/* Label selector */}
            <div className="rp-field-group">
              <label className="rp-label">نوع الإشارة</label>
              <div className="rp-label-pills">
                {LABEL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rp-pill ${formData.label === opt.value ? 'rp-pill--active' : ''}`}
                    style={formData.label === opt.value ? { borderColor: opt.color, background: `${opt.color}22`, color: opt.color } : {}}
                    onClick={() => setFormData(p => ({ ...p, label: opt.value }))}
                  >
                    {opt.icon} {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence slider */}
            <div className="rp-field-group">
              <div className="rp-label-row">
                <label className="rp-label">مستوى الثقة</label>
                <span className="rp-conf-val" style={{ color: confColor }}>
                  {confidencePct}%
                </span>
              </div>
              <div className="rp-slider-wrap">
                <input
                  type="range" name="confidence"
                  min="0" max="1" step="0.01"
                  value={formData.confidence}
                  onChange={handleChange}
                  className="rp-slider"
                  style={{ '--fill': confColor } as React.CSSProperties}
                />
                <div className="rp-slider-track">
                  <div className="rp-slider-fill" style={{ width: `${confidencePct}%`, background: confColor }} />
                </div>
              </div>
              <div className="rp-slider-hints">
                <span>منخفض</span><span>متوسط</span><span>مرتفع</span>
              </div>
            </div>

            {/* Freq + SNR */}
            <div className="rp-row">
              <div className="rp-field-group">
                <label className="rp-label">التردد (MHz)</label>
                <div className="rp-input-wrap">
                  <input
                    type="number" name="frequency_mhz"
                    value={formData.frequency_mhz}
                    onChange={handleChange}
                    className="rp-input"
                    placeholder="2400"
                  />
                  <span className="rp-input-unit">MHz</span>
                </div>
              </div>
              <div className="rp-field-group">
                <label className="rp-label">نسبة الإشارة إلى الضوضاء</label>
                <div className="rp-input-wrap">
                  <input
                    type="number" name="snr_db"
                    value={formData.snr_db}
                    onChange={handleChange}
                    className="rp-input"
                    placeholder="15"
                  />
                  <span className="rp-input-unit">dB</span>
                </div>
              </div>
            </div>

            {/* ✅ محطة واحدة — عرض ثابت بدل select */}
            <div className="rp-field-group">
              <label className="rp-label">المحطة المصدر</label>
              <div className="rp-station-display">
                <span className="rp-station-dot rp-station-dot--lg" />
                <div className="rp-station-display-text">
                  <span className="rp-station-display-id">SDR-01</span>
                  <span className="rp-station-display-name">Main Station</span>
                </div>
                <span className="rp-station-active-badge">نشط</span>
              </div>
            </div>

            {/* Location (optional override) */}
            <div className="rp-field-group">
              <label className="rp-label">
                الموقع <span className="rp-optional">(اختياري — يُستخدم اسم المحطة افتراضياً)</span>
              </label>
              <input
                type="text" name="location"
                value={formData.location}
                onChange={handleChange}
                className="rp-input"
                placeholder="مثال: المنطقة الشرقية، القاهرة"
              />
            </div>

            {/* Notes */}
            <div className="rp-field-group">
              <label className="rp-label">ملاحظات المحلل <span className="rp-optional">(اختياري)</span></label>
              <textarea
                name="analyst_notes"
                value={formData.analyst_notes}
                onChange={handleChange}
                className="rp-textarea"
                rows={3}
                placeholder="أضف أي ملاحظات أو سياق إضافي للتحليل..."
              />
            </div>

            {/* Summary strip */}
            <div className="rp-summary">
              <div className="rp-summary-item">
                <span className="rp-summary-icon">{selectedLabel.icon}</span>
                <span style={{ color: selectedLabel.color, fontWeight: 700, fontSize: 12 }}>
                  {formData.label}
                </span>
              </div>
              <div className="rp-summary-sep" />
              <div className="rp-summary-item">
                <span className="rp-summary-icon">📶</span>
                <span style={{ fontSize: 12 }}>{formData.frequency_mhz} MHz</span>
              </div>
              <div className="rp-summary-sep" />
              <div className="rp-summary-item">
                <span className="rp-summary-icon">📍</span>
                <span style={{ fontSize: 12 }}>{selectedStation.name}</span>
              </div>
            </div>

            <button type="submit" className="rp-submit" disabled={isLoading}>
              {isLoading
                ? <><span className="rp-btn-spinner" />  AI يحلل البيانات...</>
                : <>📄  إنشاء التقرير بالذكاء الاصطناعي</>
              }
            </button>
          </form>
        </div>

        {/* ── Report card ── */}
        <div className="rp-card">
          <div className="rp-card-title-row">
            <div className="rp-card-title">
              <span>📋</span>
              <span>التقرير</span>
            </div>
            {reportMarkdown && (
              <div className="rp-actions">
                <button
                  className={`rp-view-btn ${viewMode === 'rendered' ? 'rp-view-btn--active' : ''}`}
                  onClick={() => setViewMode('rendered')}
                >معروض</button>
                <button
                  className={`rp-view-btn ${viewMode === 'raw' ? 'rp-view-btn--active' : ''}`}
                  onClick={() => setViewMode('raw')}
                >Markdown</button>
                <div className="rp-action-sep" />
                <button className="rp-action-btn" onClick={handleCopy}>
                  {copyDone ? '✅ تم' : '📋 نسخ'}
                </button>
                <button className="rp-action-btn" onClick={handleDownload}>
                  💾 تحميل
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rp-error">
              <span className="rp-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="rp-loading">
              <div className="rp-loading-rings">
                <div className="rp-ring rp-ring-1" />
                <div className="rp-ring rp-ring-2" />
                <div className="rp-ring rp-ring-3" />
                <span className="rp-loading-icon">🧠</span>
              </div>
              <div className="rp-loading-text">AI يقوم بتحليل البيانات...</div>
              <div className="rp-progress">
                <div className="rp-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <div className="rp-progress-info">
                <span style={{ color: '#00e5ff', fontWeight: 700 }}>{Math.round(progress)}%</span>
                <span>قد يستغرق حتى دقيقتين</span>
              </div>
            </div>
          )}

          {/* Report body */}
          {reportMarkdown && !isLoading && (
            <div className="rp-report-body">
              {viewMode === 'rendered'
                ? <MarkdownRenderer content={reportMarkdown} />
                : <pre className="rp-raw">{reportMarkdown}</pre>
              }
            </div>
          )}

          {/* Empty state */}
          {!reportMarkdown && !isLoading && !error && (
            <div className="rp-empty">
              <div className="rp-empty-visual">
                <div className="rp-pulse-ring" />
                <div className="rp-pulse-ring rp-pulse-ring--2" />
                <span className="rp-empty-icon">📡</span>
              </div>
              <div className="rp-empty-title">جاهز للتحليل</div>
              <div className="rp-empty-sub">اختر بيانات الإشارة واضغط على زر الإنشاء</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Root ── */
        .rp-root {
          padding: 0;
          font-family: inherit;
          direction: rtl;
        }

        .rp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .rp-header-left { display: flex; flex-direction: column; gap: 4px; }
        .rp-badge {
          display: inline-block;
          background: rgba(0,229,255,0.12);
          color: #00e5ff;
          border: 1px solid rgba(0,229,255,0.3);
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          width: fit-content;
        }
        .rp-header h2 { margin: 0; font-size: 22px; font-weight: 800; }
        .rp-header p  { margin: 0; color: var(--text-secondary, #94a3b8); font-size: 13px; }

        /* station info pill in header */
        .rp-station-info {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--card-bg, #0d1b2a);
          border: 1px solid var(--border-color, rgba(255,255,255,0.08));
          border-radius: 10px;
          padding: 8px 14px;
        }
        .rp-station-info-label {
          font-size: 10px;
          color: var(--text-secondary, #64748b);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .rp-station-info-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary, #f1f5f9);
        }

        /* ── Grid ── */
        .rp-grid {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 20px;
          align-items: start;
        }

        /* ── Card — light mode safe ── */
        .rp-card {
          background: var(--card-bg, #0d1b2a);
          border: 1px solid var(--border-color, rgba(0,0,0,0.1));
          border-radius: 18px;
          padding: 24px;
        }
        .rp-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 22px;
          color: var(--text-primary, #f1f5f9);
        }
        .rp-card-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .rp-card-title-row .rp-card-title { margin-bottom: 0; }

        /* ── Form ── */
        .rp-form { display: flex; flex-direction: column; gap: 18px; }
        .rp-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .rp-field-group { display: flex; flex-direction: column; gap: 7px; }
        .rp-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .rp-optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: #475569; }
        .rp-label-row { display: flex; justify-content: space-between; align-items: center; }

        /* ── Label pills ── */
        .rp-label-pills { display: flex; gap: 8px; }
        .rp-pill {
          flex: 1;
          padding: 8px 0;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #94a3b8;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .rp-pill:hover { border-color: rgba(0,229,255,0.3); color: #e2e8f0; }

        /* ── Confidence slider ── */
        .rp-conf-val  { font-size: 18px; font-weight: 800; transition: color 0.3s; }
        .rp-slider-wrap { position: relative; }
        .rp-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 0;
          outline: none;
          position: relative;
          z-index: 2;
          background: transparent;
          cursor: pointer;
          margin-bottom: -4px;
        }
        .rp-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: var(--fill, #00e5ff);
          border: 3px solid #0d1b2a;
          box-shadow: 0 0 8px var(--fill, #00e5ff);
          cursor: pointer;
          transition: transform 0.15s;
          margin-top: -7px;
        }
        .rp-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .rp-slider::-webkit-slider-runnable-track {
          height: 4px; border-radius: 99px;
          background: rgba(255,255,255,0.08);
        }
        .rp-slider-track {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 4px;
          display: none; /* actual track is on the input */
        }
        .rp-slider-hints {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #475569;
          margin-top: 4px;
        }

        /* ── Inputs — light mode safe ── */
        .rp-input-wrap { position: relative; }
        .rp-input {
          width: 100%;
          background: var(--bg-primary, rgba(255,255,255,0.04));
          border: 1px solid var(--border-color, rgba(0,0,0,0.12));
          border-radius: 10px;
          padding: 9px 12px;
          color: var(--text-primary, #f1f5f9);
          font-size: 13px;
          font-family: inherit;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .rp-input:focus {
          outline: none;
          border-color: #00e5ff;
          background: rgba(0,229,255,0.04);
        }
        .rp-input-unit {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          pointer-events: none;
        }
        .rp-input-wrap .rp-input { padding-left: 42px; }

        /* ── Station display (single station, read-only) ── */
        .rp-station-display {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--card-bg, #0d1b2a);
          border: 1px solid rgba(0,229,255,0.25);
          border-radius: 10px;
          padding: 10px 14px;
        }
        .rp-station-display-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
        }
        .rp-station-display-id {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary, #f1f5f9);
        }
        .rp-station-display-name {
          font-size: 11px;
          color: var(--text-secondary, #64748b);
        }
        .rp-station-active-badge {
          font-size: 10px;
          font-weight: 700;
          background: rgba(16,185,129,0.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.3);
          border-radius: 4px;
          padding: 2px 7px;
          letter-spacing: 0.04em;
        }
        .rp-station-dot {
          width: 7px; height: 7px;
          background: #00e5ff;
          border-radius: 50%;
          box-shadow: 0 0 6px #00e5ff;
          animation: rp-pulse-dot 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        .rp-station-dot--lg {
          width: 10px; height: 10px;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        @keyframes rp-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }

        /* ── Textarea — light mode safe ── */
        .rp-textarea {
          width: 100%;
          background: var(--bg-primary, rgba(255,255,255,0.04));
          border: 1px solid var(--border-color, rgba(0,0,0,0.12));
          border-radius: 10px;
          padding: 9px 12px;
          color: var(--text-primary, #f1f5f9);
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          transition: border-color 0.2s;
          box-sizing: border-box;
          line-height: 1.6;
        }
        .rp-textarea:focus { outline: none; border-color: #00e5ff; }

        /* ── Summary strip ── */
        .rp-summary {
          display: flex;
          align-items: center;
          gap: 0;
          background: rgba(0,229,255,0.05);
          border: 1px solid rgba(0,229,255,0.12);
          border-radius: 10px;
          padding: 10px 14px;
          overflow: hidden;
        }
        .rp-summary-item { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: center; color: #cbd5e1; }
        .rp-summary-icon { font-size: 14px; }
        .rp-summary-sep  { width: 1px; height: 20px; background: rgba(255,255,255,0.1); }

        /* ── Submit ── */
        .rp-submit {
          background: linear-gradient(135deg, #00e5ff, #0ea5e9);
          border: none;
          border-radius: 12px;
          padding: 13px;
          font-size: 14px;
          font-weight: 800;
          color: #040d18;
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
        }
        .rp-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,229,255,0.35);
        }
        .rp-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .rp-btn-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(4,13,24,0.3);
          border-top-color: #040d18;
          border-radius: 50%;
          animation: rp-spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes rp-spin { to { transform: rotate(360deg); } }

        /* ── Report actions — light mode safe ── */
        .rp-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .rp-view-btn {
          background: var(--bg-tertiary, rgba(0,0,0,0.06));
          border: 1px solid var(--border-color, rgba(0,0,0,0.12));
          border-radius: 8px;
          padding: 4px 11px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary, #64748b);
          font-family: inherit;
        }
        .rp-view-btn--active {
          background: rgba(0,229,255,0.15);
          border-color: rgba(0,229,255,0.4);
          color: #00e5ff;
        }
        .rp-action-sep { width: 1px; height: 20px; background: var(--border-color, rgba(0,0,0,0.1)); }
        .rp-action-btn {
          background: var(--bg-tertiary, rgba(0,0,0,0.06));
          border: 1px solid var(--border-color, rgba(0,0,0,0.12));
          border-radius: 8px;
          padding: 4px 11px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-secondary, #64748b);
          font-family: inherit;
        }
        .rp-action-btn:hover {
          background: rgba(0,229,255,0.1);
          border-color: rgba(0,229,255,0.3);
          color: #00e5ff;
        }

        /* ── Error ── */
        .rp-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 10px;
          padding: 12px 14px;
          color: #f87171;
          font-size: 13px;
          margin-bottom: 14px;
        }
        .rp-error-icon { font-size: 18px; flex-shrink: 0; }

        /* ── Loading ── */
        .rp-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 50px 20px;
        }
        .rp-loading-rings {
          position: relative;
          width: 72px; height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rp-ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #00e5ff;
          animation: rp-spin linear infinite;
        }
        .rp-ring-1 { width: 72px; height: 72px; animation-duration: 1.2s; opacity: 0.9; }
        .rp-ring-2 { width: 54px; height: 54px; animation-duration: 1.8s; border-top-color: #0ea5e9; opacity: 0.6; animation-direction: reverse; }
        .rp-ring-3 { width: 36px; height: 36px; animation-duration: 0.9s; border-top-color: #38bdf8; opacity: 0.4; }
        .rp-loading-icon { font-size: 22px; position: relative; z-index: 1; }
        .rp-loading-text { font-size: 13px; color: #94a3b8; }
        .rp-progress {
          width: 100%; max-width: 260px; height: 4px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px; overflow: hidden;
        }
        .rp-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00e5ff, #0ea5e9);
          border-radius: 99px;
          transition: width 0.9s ease;
        }
        .rp-progress-info {
          display: flex;
          justify-content: space-between;
          width: 100%;
          max-width: 260px;
          font-size: 11px;
          color: #475569;
        }

        /* ── Report body — light mode safe ── */
        .rp-report-body {
          background: var(--bg-primary, rgba(0,0,0,0.15));
          border: 1px solid var(--border-color, rgba(0,0,0,0.1));
          border-radius: 12px;
          padding: 20px;
          max-height: 560px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(0,229,255,0.2) transparent;
        }
        .rp-report-body::-webkit-scrollbar { width: 5px; }
        .rp-report-body::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 99px; }
        .rp-raw {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.65;
          color: #94a3b8;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
        }

        /* ── Empty state ── */
        .rp-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 70px 20px;
          text-align: center;
        }
        .rp-empty-visual {
          position: relative;
          width: 80px; height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rp-pulse-ring {
          position: absolute;
          width: 80px; height: 80px;
          border-radius: 50%;
          border: 1.5px solid rgba(0,229,255,0.25);
          animation: rp-pulse-ring 2.4s ease-out infinite;
        }
        .rp-pulse-ring--2 {
          width: 56px; height: 56px;
          border-color: rgba(0,229,255,0.15);
          animation-delay: -1.2s;
        }
        @keyframes rp-pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .rp-empty-icon  { font-size: 32px; position: relative; z-index: 1; }
        .rp-empty-title { font-size: 15px; font-weight: 700; color: #64748b; }
        .rp-empty-sub   { font-size: 12px; color: #475569; line-height: 1.6; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .rp-grid { grid-template-columns: 1fr; }
          .rp-header { flex-direction: column; align-items: flex-start; gap: 12px; }
        }
        @media (max-width: 640px) {
          .rp-row { grid-template-columns: 1fr; }
          .rp-label-pills { flex-direction: column; }
          .rp-card { padding: 16px; }
          .rp-card-title-row { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
};

export default Reports;