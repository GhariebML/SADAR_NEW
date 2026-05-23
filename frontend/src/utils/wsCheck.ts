// src/utils/wsCheck.ts
/**
 * يبني WebSocket URL من نفس الـ API_BASE_URL
 * عشان يضمن إنه بيتصل بنفس الـ host والـ port بتاع الـ backend
 */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getWsUrl(path: string): string {
  // http://localhost:8000/api/v1  →  ws://localhost:8000/ws/alerts/
  const httpBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  const wsBase   = httpBase.replace(/^http/, 'ws');
  return `${wsBase}${path}`;
}

/**
 * يعمل WebSocket connection حقيقي ويرجع 'online' | 'offline'
 * @param path  مسار الـ WebSocket مثلاً '/ws/alerts/'
 * @param onStatus callback بيستدعيه لما تتغير الحالة
 * @returns دالة cleanup تغلق الـ connection
 */
export function checkWebSocket(
  path: string,
  onStatus: (status: 'online' | 'offline') => void,
): () => void {
  const url = getWsUrl(path);
  let ws: WebSocket | null = null;
  let closed = false;

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      if (!closed) onStatus('online');
      ws?.close(); // نغلق بعد ما نتأكد — مش محتاجين connection دايم هنا
    };

    ws.onerror = () => {
      if (!closed) onStatus('offline');
    };

    ws.onclose = (e) => {
      // code 1000 = closed cleanly بعد onopen
      if (!closed && e.code !== 1000) onStatus('offline');
    };
  } catch {
    onStatus('offline');
  }

  // timeout fallback لو مفتحش في 5 ثواني
  const timer = setTimeout(() => {
    if (!closed && ws?.readyState !== WebSocket.OPEN) {
      onStatus('offline');
      ws?.close();
    }
  }, 5000);

  return () => {
    closed = true;
    clearTimeout(timer);
    ws?.close();
  };
}
