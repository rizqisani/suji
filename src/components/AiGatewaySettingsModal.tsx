import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  Settings2,
  X,
} from 'lucide-react';
import {
  AiGatewayConfig,
  loadAiGatewayConfig,
  parseApiResponse,
  saveAiGatewayConfig,
} from '../utils/apiHelper';

interface AiGatewaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AiGatewayConfig | null) => void;
}

function buildGatewayConfig(baseUrl: string, model: string, apiKey: string): AiGatewayConfig {
  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const trimmedModel = model.trim();
  const trimmedApiKey = apiKey.trim();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedBaseUrl);
  } catch {
    throw new Error('Masukkan Base URL yang valid, termasuk https://.');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('URL endpoint harus menggunakan HTTP atau HTTPS.');
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Jangan masukkan kredensial di URL; gunakan kolom API key.');
  }
  if (!trimmedModel || !trimmedApiKey) {
    throw new Error('Model dan API key wajib diisi.');
  }

  return { baseUrl: trimmedBaseUrl, model: trimmedModel, apiKey: trimmedApiKey };
}

function getStoredApiKeySuffix(apiKey?: string): string | null {
  if (!apiKey) return null;
  return apiKey.length > 3 ? apiKey.slice(-3) : '';
}

export const AiGatewaySettingsModal: React.FC<AiGatewaySettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [savedApiKeySuffix, setSavedApiKeySuffix] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = loadAiGatewayConfig();
      setBaseUrl(config?.baseUrl || '');
      setModel(config?.model || '');
      setApiKey(config?.apiKey || '');
      setSavedApiKeySuffix(getStoredApiKeySuffix(config?.apiKey));
      setError('');
      setSaved(false);
      setIsTesting(false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSaved(false);

    let config: AiGatewayConfig;
    try {
      config = buildGatewayConfig(baseUrl, model, apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konfigurasi gateway tidak valid.');
      return;
    }

    try {
      saveAiGatewayConfig(config);
      onSave(config);
      setSavedApiKeySuffix(getStoredApiKeySuffix(config.apiKey));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.');
    }
  };

  const handleTestConnection = async () => {
    setError('');
    setTestResult(null);

    let config: AiGatewayConfig;
    try {
      config = buildGatewayConfig(baseUrl, model, apiKey);
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Konfigurasi gateway tidak valid.',
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/ai-gateway/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const result = await parseApiResponse<{ message: string }>(response);
      setTestResult({ type: 'success', message: result.message });
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Uji koneksi gagal karena kesalahan tidak diketahui.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemove = () => {
    try {
      saveAiGatewayConfig(null);
      onSave(null);
      setBaseUrl('');
      setModel('');
      setApiKey('');
      setSavedApiKeySuffix(null);
      setSaved(false);
      setError('');
      setTestResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus konfigurasi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-linear-to-r from-blue-900 via-indigo-900 to-blue-800 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <Settings2 className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-bold">Pengaturan AI Gateway</h2>
              <p className="text-xs text-blue-100">Gunakan model dari Ciora atau gateway OpenAI-compatible</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Tutup">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 p-6">
          <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Link2 className="h-4 w-4 text-blue-600" /> Base URL
            </span>
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setTestResult(null);
                setError('');
              }}
              placeholder="https://gateway-anda/v1"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="block text-xs text-slate-500">
              Isi Base URL dari dashboard gateway; akhiran /chat/completions akan ditambahkan otomatis.
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Model</span>
            <input
              type="text"
              value={model}
              onChange={(event) => {
                setModel(event.target.value);
                setTestResult(null);
                setError('');
              }}
              placeholder="Nama model sesuai dashboard gateway"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <KeyRound className="h-4 w-4 text-amber-600" /> API key
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setTestResult(null);
                setError('');
              }}
              placeholder="Masukkan API key gateway"
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {savedApiKeySuffix !== null && (
              <span className="block text-xs text-slate-500">
                API key tersimpan (3 karakter terakhir):{' '}
                {savedApiKeySuffix ? (
                  <code className="font-semibold text-slate-700">••••••{savedApiKeySuffix}</code>
                ) : (
                  'akhiran disembunyikan karena kunci terlalu pendek'
                )}
              </span>
            )}
          </label>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            API key disimpan di penyimpanan browser ini dan dikirim ke server aplikasi saat meminta AI. Jangan
            gunakan pada perangkat bersama; gunakan HTTPS bila aplikasi diakses melalui jaringan.
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Konfigurasi gateway berhasil disimpan.
            </div>
          )}
          {testResult && (
            <div
              role={testResult.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                testResult.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {testResult.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleRemove}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Hapus konfigurasi
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-2 rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isTesting ? 'Menguji...' : 'Uji koneksi'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
              >
                Simpan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
