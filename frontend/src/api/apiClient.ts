// src/api/apiClient.ts
import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─── Client عادي للـ APIs السريعة ───────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 ثانية كافية للـ REST APIs
  headers: { 'Content-Type': 'application/json' },
});

// ─── Client خاص للـ LLM (وقت أطول بكثير) ────────────────────────────────────
const llmClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // دقيقتين للـ AI generation
  headers: { 'Content-Type': 'application/json' },
});

// ─── Interceptors لمعالجة الأخطاء ────────────────────────────────────────────
const errorInterceptor = (error: AxiosError) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
    return Promise.reject(new Error('السيرفر غير متصل - تأكد من تشغيل الـ Backend'));
  }
  if (error.code === 'ECONNABORTED') {
    return Promise.reject(new Error('انتهى وقت الاتصال - قد يكون الـ AI مشغولاً، حاول مرة أخرى'));
  }
  if (error.response?.status === 422) {
    return Promise.reject(new Error('بيانات غير صحيحة - تحقق من المدخلات'));
  }
  if (error.response?.status && error.response.status >= 500) {
    return Promise.reject(new Error('خطأ في السيرفر - حاول لاحقاً'));
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, errorInterceptor);
llmClient.interceptors.response.use((r) => r, errorInterceptor);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Signal {
  id: number;
  label: string;
  confidence: number;
  frequency: number;
  snr: number;
  strength: number;
  source: string;
  station: string;
  direction: string;
  inference_time_ms: number;
  model_version: string;
  timestamp: string;
}

export interface Alert {
  id: number;
  signal_id: number;
  alert_type: string;
  status: string;
  location: string;
  timestamp: string;
}

export interface Statistics {
  total_signals: number;
  label_counts: Record<string, number>;
  alert_count: number;
  alert_threshold: number;
}

export interface AgentResponse {
  answer: string;
  sources: string[];
  used_cache: boolean;
  used_fallback: boolean;
  intent: string;
  signals_analyzed: number;
  model: string;
}

export interface AgentHealth {
  status: string;
  ollama: {
    ok: boolean;
    model: string;
  };
}

export interface PredictionsResponse {
  total: number;
  page: number;
  limit: number;
  signals: Signal[];
}

export interface ReportResponse {
  markdown: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/** فحص اتصال الـ Backend الأساسي */
export const getHealth = async (): Promise<{ status: string }> => {
  const response = await apiClient.get('/health');
  return response.data;
};

/** فحص اتصال الـ Agent (Ollama + LLM) */
export const getAgentHealth = async (): Promise<AgentHealth> => {
  // timeout أقل لأن ده مجرد health check
  const response = await apiClient.get('/agent/health', { timeout: 8000 });
  return response.data;
};

export const getStatistics = async (): Promise<Statistics> => {
  const response = await apiClient.get('/statistics');
  return response.data;
};

export const getPredictions = async (
  limit: number = 100,
  label?: string
): Promise<PredictionsResponse> => {
  const params: { limit: number; label?: string } = { limit };
  if (label) params.label = label;
  const response = await apiClient.get('/predictions', { params });
  return response.data;
};

export const getAlerts = async (): Promise<Alert[]> => {
  const response = await apiClient.get('/alerts');
  return response.data;
};

/** سؤال الـ Agent - يستخدم llmClient لأن LLM بياخد وقت */
export const askAgent = async (
  question: string,
  top_k?: number
): Promise<AgentResponse> => {
  const response = await llmClient.post('/agent/ask', { question, top_k });
  return response.data;
};

/** إنشاء تقرير - يستخدم llmClient لأن الـ generation بياخد وقت أطول */
export const generateReport = async (payload: {
  label: string;
  confidence: number;
  frequency_mhz?: number;   // ← اسم الحقل الصحيح كما هو في الـ Backend
  snr_db?: number;
  source?: string;
  location?: string;
  analyst_notes?: string;
}): Promise<ReportResponse> => {
  const response = await llmClient.post('/agent/report', payload);
  return response.data;
};

export default apiClient;
