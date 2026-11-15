import { notifyAppStateChanged } from './appStateEvents';

/**
 * Safe API response parser to prevent "Unexpected token '<', <!doctype... is not valid JSON"
 */
export async function parseApiResponse<T = any>(response: Response): Promise<T> {
  const text = await response.text();
  let json: any = null;

  try {
    json = JSON.parse(text);
  } catch (_e) {
    // If not JSON, handle HTTP status codes gracefully
    if (!response.ok) {
      if (response.status === 504 || response.status === 502) {
        throw new Error(
          'Permintaan ke AI membutuhkan waktu terlalu lama (Gateway Timeout). Coba kurangi jumlah butir soal agar proses lebih cepat, lalu coba lagi.'
        );
      }
      if (response.status === 503) {
        throw new Error(
          'Layanan AI sedang mengalami lonjakan antrean sementara (503 Service Unavailable). Silakan klik "Buat Naskah" lagi dalam beberapa saat.'
        );
      }
      throw new Error(`Server mengembalikan error (${response.status}). Silakan coba beberapa saat lagi.`);
    }
    throw new Error('Respon dari server tidak valid (bukan JSON). Silakan coba lagi.');
  }

  if (!response.ok || (json && json.success === false)) {
    throw new Error(json?.error || `Gagal memproses permintaan (Status: ${response.status}).`);
  }

  return json;
}
export interface AiGatewayConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const STORAGE_KEY_AI_GATEWAY = 'si_ujian_ai_gateway_v1';

export function loadAiGatewayConfig(): AiGatewayConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_GATEWAY);
    if (!raw) return null;
    const config = JSON.parse(raw) as Partial<AiGatewayConfig>;
    if (
      typeof config.baseUrl !== 'string' ||
      typeof config.model !== 'string' ||
      typeof config.apiKey !== 'string'
    ) {
      throw new Error('Konfigurasi gateway AI tersimpan tidak valid.');
    }
    return { baseUrl: config.baseUrl, model: config.model, apiKey: config.apiKey };
  } catch (error) {
    console.error('Gagal memuat konfigurasi gateway AI', error);
    return null;
  }
}

export function saveAiGatewayConfig(config: AiGatewayConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEY_AI_GATEWAY, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEY_AI_GATEWAY);
    }
    notifyAppStateChanged();
  } catch (error) {
    console.error('Gagal menyimpan konfigurasi gateway AI', error);
    throw new Error('Konfigurasi tidak dapat disimpan di browser ini.');
  }
}

export function fetchWithAiGateway(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const config = loadAiGatewayConfig();
  if (config) {
    headers.set('x-ai-gateway-config', JSON.stringify(config));
  } else {
    headers.delete('x-ai-gateway-config');
  }
  return fetch(input, { ...init, headers });
}

