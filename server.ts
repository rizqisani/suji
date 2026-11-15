import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  createSessionToken,
  SESSION_TTL_SECONDS,
  validateAuthConfiguration,
  verifyLogin,
  verifySessionToken,
} from './src/server/auth.ts';
import { initializeDatabase, loadAppState, saveAppState } from './src/server/database.ts';
import { Packer, Document } from 'docx';
import { type NaskahUjianData, validateNaskahUjian } from './src/schema/naskahUjianSchema.ts';
import type { ExamPackage } from './src/types/exam.ts';
import { generateDocxDocument } from './src/renderer/docx.ts';
import { generatePdfFromData, convertDocxToPdf } from './src/renderer/pdf.ts';
import {
  createDocumentByDocType,
  getExportFilename,
  type ExportDocType,
} from './src/renderer/documentFactory.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

const SESSION_COOKIE_NAME = 'si_ujian_session';

function getSessionToken(req: Request): string | null {
  const cookie = req.get('cookie');
  if (!cookie) return null;
  const entry = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  return entry ? entry.slice(SESSION_COOKIE_NAME.length + 1) : null;
}

function setSessionCookie(res: Response, token: string, maxAge: number): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`
  );
}

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !verifyLogin(username, password)) {
    return res.status(401).json({ success: false, error: 'Nama pengguna atau kata sandi salah.' });
  }
  setSessionCookie(res, createSessionToken(username), SESSION_TTL_SECONDS);
  return res.json({ success: true });
});

app.get('/api/auth/session', (req, res) => {
  const token = getSessionToken(req);
  return res.json({ authenticated: Boolean(token && verifySessionToken(token)) });
});

app.post('/api/auth/logout', (_req, res) => {
  setSessionCookie(res, '', 0);
  return res.json({ success: true });
});

app.use('/api', (req, res, next) => {
  const token = getSessionToken(req);
  if (!token || !verifySessionToken(token)) {
    return res.status(401).json({ success: false, error: 'Silakan login untuk melanjutkan.' });
  }
  next();
});

app.get('/api/app-state', async (_req, res) => {
  try {
    return res.json({ success: true, state: await loadAppState() });
  } catch (error: any) {
    console.error('Error loading app data:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal memuat data aplikasi.' });
  }
});

app.put('/api/app-state', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, error: 'Data aplikasi tidak valid.' });
    }
    await saveAppState(req.body);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving app data:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menyimpan data aplikasi.' });
  }
});

// Export DOCX (OOXML .docx) endpoint for all exam document types
app.post('/api/export-docx', async (req, res) => {
  try {
    let doc: Document;
    let filename: string;

    const docType: ExportDocType = req.body.docType || 'naskah';
    const options = req.body.options;
    const examPackage: ExamPackage | undefined =
      req.body.exam || (req.body.examSummary ? req.body : undefined);

    if (examPackage) {
      doc = await createDocumentByDocType(examPackage, docType, options);
      filename = getExportFilename(examPackage, docType, 'docx');
    } else {
      // Direct NaskahUjianData payload fallback
      const data: NaskahUjianData = req.body.data || req.body;
      const validation = validateNaskahUjian(data);
      if (!validation.valid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }
      doc = await generateDocxDocument(data);
      const subjectClean = (data.identitas?.mataPelajaran || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
      const classClean = (data.identitas?.kelas || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      filename = `Naskah_Ujian_${subjectClean}_${classClean}.docx`;
    }

    const buffer = await Packer.toBuffer(doc);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error: any) {
    console.error('Error generating DOCX:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal membuat file DOCX naskah ujian.',
    });
  }
});

// Export PDF (rendered from DOCX via headless LibreOffice for 100% fidelity) for all document types
app.post('/api/export-pdf', async (req, res) => {
  try {
    let doc: Document;
    let filename: string;

    const docType: ExportDocType = req.body.docType || 'naskah';
    const options = req.body.options;
    const examPackage: ExamPackage | undefined =
      req.body.exam || (req.body.examSummary ? req.body : undefined);

    if (examPackage) {
      doc = await createDocumentByDocType(examPackage, docType, options);
      filename = getExportFilename(examPackage, docType, 'pdf');
    } else {
      // Direct NaskahUjianData payload fallback
      const data: NaskahUjianData = req.body.data || req.body;
      const validation = validateNaskahUjian(data);
      if (!validation.valid) {
        return res.status(400).json({ success: false, errors: validation.errors });
      }
      doc = await generateDocxDocument(data);
      const subjectClean = (data.identitas?.mataPelajaran || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
      const classClean = (data.identitas?.kelas || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      filename = `Naskah_Ujian_${subjectClean}_${classClean}.pdf`;
    }

    const docxBuffer = await Packer.toBuffer(doc);
    const pdfBuffer = await convertDocxToPdf(docxBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    console.warn('[PDF Export Info]', error?.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal membuat file PDF dokumen ujian.',
    });
  }
});


interface AiGatewayConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

function validateAiGatewayConfig(value: unknown): AiGatewayConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Konfigurasi AI Gateway tidak valid.');
  }

  const config = value as Partial<AiGatewayConfig>;
  if (
    typeof config.baseUrl !== 'string' ||
    typeof config.model !== 'string' ||
    typeof config.apiKey !== 'string' ||
    !config.baseUrl.trim() ||
    !config.model.trim() ||
    !config.apiKey.trim()
  ) {
    throw new Error('Base URL, model, dan API key AI Gateway wajib diisi.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.baseUrl.trim());
  } catch {
    throw new Error('Base URL AI Gateway tidak valid. Pastikan URL menyertakan https:// atau http://.');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Base URL AI Gateway harus menggunakan HTTP atau HTTPS.');
  }
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Jangan masukkan kredensial di URL; gunakan kolom API key.');
  }

  return {
    baseUrl: parsedUrl.toString().replace(/\/+$/, ''),
    model: config.model.trim(),
    apiKey: config.apiKey.trim(),
  };
}

function getAiGatewayConfig(req: Request): AiGatewayConfig | null {
  const rawConfig = req.get('x-ai-gateway-config');
  if (!rawConfig) return null;

  let config: unknown;
  try {
    config = JSON.parse(rawConfig);
  } catch {
    throw new Error('Konfigurasi AI Gateway tidak valid. Silakan simpan ulang pengaturan gateway.');
  }

  return validateAiGatewayConfig(config);
}

// Use the browser-configured OpenAI-compatible gateway when provided; otherwise use Gemini.
function getAiClient(req: Request): GoogleGenAI | AiGatewayConfig {
  const gatewayConfig = getAiGatewayConfig(req);
  if (gatewayConfig) return gatewayConfig;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI Gateway belum dikonfigurasi dan GEMINI_API_KEY tidak tersedia.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function toOpenAiJsonSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return schema;
  const converted: Record<string, any> = { ...schema };
  if (typeof schema.type === 'string') {
    converted.type = schema.type.toLowerCase();
  }
  if (schema.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        toOpenAiJsonSchema(value),
      ])
    );
  }
  if (schema.items) {
    converted.items = toOpenAiJsonSchema(schema.items);
  }
  return converted;
}

function extractPromptText(contents: any): string {
  if (typeof contents === 'string') return contents;
  if (Array.isArray(contents)) {
    return contents.map(extractPromptText).filter(Boolean).join('\n');
  }
  if (contents && typeof contents === 'object') {
    if (typeof contents.text === 'string') return contents.text;
    if (Array.isArray(contents.parts)) return extractPromptText(contents.parts);
  }
  return '';
}

async function generateWithAiGateway(
  config: AiGatewayConfig,
  requestPayload: any,
  signal?: AbortSignal
): Promise<{ text: string }> {
  const endpoint = new URL(config.baseUrl);
  const basePath = endpoint.pathname.replace(/\/+$/, '');
  if (!basePath.endsWith('/chat/completions')) {
    endpoint.pathname = `${basePath}/chat/completions`;
  }

  const generationConfig = requestPayload.config || {};
  const messages = [];
  if (generationConfig.systemInstruction) {
    messages.push({
      role: 'system',
      content: extractPromptText(generationConfig.systemInstruction),
    });
  }
  messages.push({ role: 'user', content: extractPromptText(requestPayload.contents) });

  const requestBody: Record<string, any> = {
    model: config.model,
    messages,
  };
  if (generationConfig.responseSchema) {
    requestBody.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'ai_response',
        strict: false,
        schema: toOpenAiJsonSchema(generationConfig.responseSchema),
      },
    };
  } else if (generationConfig.responseMimeType === 'application/json') {
    requestBody.response_format = { type: 'json_object' };
  }

  const sendRequest = async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    });
    const responseText = await response.text();
    let responseBody: any;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }
    return { response, responseText, responseBody };
  };

  let { response, responseText, responseBody } = await sendRequest();
  const errorMessage = String(
    responseBody?.error?.message || responseBody?.message || responseText
  );
  if (
    !response.ok &&
    [400, 422].includes(response.status) &&
    requestBody.response_format?.type === 'json_schema' &&
    /response_format|json_schema|structured output/i.test(errorMessage)
  ) {
    requestBody.response_format = { type: 'json_object' };
    ({ response, responseText, responseBody } = await sendRequest());
  }

  if (!response.ok) {
    const message = responseBody?.error?.message || responseBody?.message || responseText;
    throw new Error(
      `AI Gateway (${response.status}): ${String(message || response.statusText).slice(0, 1000)}`
    );
  }

  const content = responseBody?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((item: any) => item?.text || '').join('')
      : '';
  if (!text) {
    throw new Error('AI Gateway mengembalikan respons kosong atau format respons tidak dikenali.');
  }
  return { text };
}

function formatAiGatewayTestError(error: unknown, apiKey: string): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const message = apiKey ? rawMessage.split(apiKey).join('[disamarkan]') : rawMessage;
  const statusMatch = message.match(/AI Gateway \((\d{3})\):\s*([\s\S]*)/);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  const detail = statusMatch?.[2]?.trim().slice(0, 500);

  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
    return 'Gateway tidak merespons dalam 20 detik. Periksa URL dan ketersediaan layanan gateway.';
  }
  if (status === 401) {
    return `API key ditolak (401). Pastikan key masih aktif dan benar.${detail ? ` Detail: ${detail}` : ''}`;
  }
  if (status === 403) {
    return `Akses ditolak (403). Periksa izin API key untuk menggunakan model ini.${detail ? ` Detail: ${detail}` : ''}`;
  }
  if (status === 404) {
    return `Endpoint atau model tidak ditemukan (404). Periksa Base URL dan nama model; aplikasi menambahkan /chat/completions otomatis.${detail ? ` Detail: ${detail}` : ''}`;
  }
  if (status === 400 || status === 422) {
    return `Gateway menolak permintaan (${status}). Periksa nama model dan pastikan endpoint mendukung OpenAI-compatible Chat Completions.${detail ? ` Detail: ${detail}` : ''}`;
  }
  if (status === 429) {
    return `Batas penggunaan atau kuota gateway tercapai (429). Periksa saldo, kuota, atau rate limit.${detail ? ` Detail: ${detail}` : ''}`;
  }
  if (status !== null && status >= 500) {
    return `Gateway atau penyedia model sedang mengalami gangguan (HTTP ${status}). Coba lagi nanti.${detail ? ` Detail: ${detail}` : ''}`;
  }
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|certificate|network/i.test(message)) {
    return 'Server aplikasi tidak dapat menjangkau Base URL. Periksa alamat host, port, koneksi jaringan, firewall, dan sertifikat HTTPS.';
  }

  return `Uji koneksi gagal: ${message.slice(0, 600)}`;
}

app.post('/api/ai-gateway/test-connection', async (req, res) => {
  let config: AiGatewayConfig;
  try {
    config = validateAiGatewayConfig(req.body?.config);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Konfigurasi AI Gateway tidak valid.',
    });
  }

  try {
    await generateWithAiGateway(
      config,
      { contents: 'Reply with the single word OK.' },
      AbortSignal.timeout(20_000)
    );
    return res.json({
      success: true,
      message: `Koneksi berhasil. Model "${config.model}" dapat merespons.`,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      error: formatAiGatewayTestError(error, config.apiKey),
    });
  }
});

// Clean and parse JSON from AI response (stripping markdown code blocks or stray prose)
function parseAiJsonResponse(rawText: string) {
  let cleaned = (rawText || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // Fallback: extract outermost balanced JSON object/array if stray text surrounds JSON
    const firstObj = cleaned.indexOf('{');
    const lastObj = cleaned.lastIndexOf('}');
    if (firstObj !== -1 && lastObj > firstObj) {
      return JSON.parse(cleaned.slice(firstObj, lastObj + 1));
    }
    const firstArr = cleaned.indexOf('[');
    const lastArr = cleaned.lastIndexOf(']');
    if (firstArr !== -1 && lastArr > firstArr) {
      return JSON.parse(cleaned.slice(firstArr, lastArr + 1));
    }
    throw initialErr;
  }
}

// Per-model temporary cooldown tracking when a model hits 429 quota/rate limits
const modelCooldownUntil = new Map<string, number>();

function isQuotaOrRateLimitMessage(msg: string): boolean {
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded') ||
    msg.includes('rate-limit')
  );
}

function getQuotaCooldownMs(msg: string): number {
  const delayMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (delayMatch) {
    // Cap in-memory cooldown at 30 minutes so server remains self-healing
    return Math.min(Math.max(Number(delayMatch[1]) * 1000, 15_000), 30 * 60 * 1000);
  }
  if (msg.includes('PerDay') || msg.includes('free_tier_requests')) {
    return 30 * 60 * 1000;
  }
  return 60 * 1000;
}

function getActiveModelOrder(): string[] {
  const preferred = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  const now = Date.now();
  const available = preferred.filter((m) => (modelCooldownUntil.get(m) ?? 0) <= now);
  if (available.length > 0) {
    return available;
  }
  // If all models are in cooldown, try flash-lite first as highest-throughput fallback
  return ['gemini-3.1-flash-lite', 'gemini-4-hydrogen'];
}

// Resilient AI generation with model cooldown awareness and JSON parsing inside the retry loop
async function generateJsonWithRetry<T = any>(
  ai: GoogleGenAI | AiGatewayConfig,
  requestPayload: any,
  options: { maxAttemptsPerModel?: number } = {}
): Promise<T> {
  if ('baseUrl' in ai) {
    const { text } = await generateWithAiGateway(ai, requestPayload);
    if (!text.trim()) throw new Error('AI Gateway mengembalikan respons kosong.');
    return parseAiJsonResponse(text) as T;
  }
  const maxAttemptsPerModel = options.maxAttemptsPerModel ?? 2;
  const models = getActiveModelOrder();
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...requestPayload,
          model,
        });
        const rawText = response?.text || '';
        if (!rawText.trim()) {
          throw new Error(`Model ${model} mengembalikan respons kosong.`);
        }
        return parseAiJsonResponse(rawText) as T;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || '');

        // If this model hit 429 quota/rate limit, put it on cooldown immediately and move to fallback model
        if (isQuotaOrRateLimitMessage(msg)) {
          const cooldownMs = getQuotaCooldownMs(msg);
          const alreadyCooling = (modelCooldownUntil.get(model) ?? 0) > Date.now();
          modelCooldownUntil.set(model, Date.now() + cooldownMs);
          if (!alreadyCooling) {
            console.info(
              `[AI] Model ${model} quota/rate-limit reached; cooling down ${Math.round(
                cooldownMs / 1000
              )}s and switching fallback.`
            );
          }
          break;
        }

        const isJsonErr =
          err instanceof SyntaxError ||
          msg.includes('JSON') ||
          msg.includes('Unterminated string') ||
          msg.includes('respons kosong');

        console.warn(
          `[AI] Model ${model} attempt ${attempt}/${maxAttemptsPerModel} failed (${
            isJsonErr ? 'JSON/Output error' : 'API error'
          }): ${msg.slice(0, 220)}`
        );

        if (attempt < maxAttemptsPerModel) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }
  }
  throw lastError;
}

// Tight per-question-type response schema prevents Flash-Lite degenerate string/field loops
function buildSingleQuestionResponseSchema(
  questionType: string,
  isCmcMulti: boolean,
  includeScore = false
) {
  const commonFields: Record<string, any> = {
    explanation: { type: Type.STRING },
    cognitiveLevel: { type: Type.STRING },
    materialScope: {
      type: Type.STRING,
      description: 'Lingkup Materi / Sub-bab spesifik soal ini (2-6 kata, bukan nama mapel)',
    },
    indicator: { type: Type.STRING },
    ...(includeScore ? { score: { type: Type.NUMBER } } : {}),
  };

  if (questionType === 'multipleChoice') {
    return {
      type: Type.OBJECT,
      properties: {
        variant: { type: Type.STRING },
        stimulus: { type: Type.STRING },
        question: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              key: { type: Type.STRING },
              text: { type: Type.STRING },
            },
            required: ['key', 'text'],
          },
        },
        correctAnswer: { type: Type.STRING },
        ...commonFields,
      },
      required: ['question', 'options', 'correctAnswer', 'explanation'],
    };
  }

  if (questionType === 'complexMultipleChoice') {
    if (isCmcMulti) {
      return {
        type: Type.OBJECT,
        properties: {
          variant: { type: Type.STRING },
          stimulus: { type: Type.STRING },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING },
                text: { type: Type.STRING },
              },
              required: ['key', 'text'],
            },
          },
          correctAnswersArray: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Array huruf kunci benar, minimal 2 huruf, contoh ["A", "C"]',
          },
          ...commonFields,
        },
        required: ['question', 'options', 'correctAnswersArray', 'explanation'],
      };
    }

    return {
      type: Type.OBJECT,
      properties: {
        variant: { type: Type.STRING },
        stimulus: { type: Type.STRING },
        question: { type: Type.STRING },
        statements: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              statement: { type: Type.STRING },
              isCorrect: { type: Type.BOOLEAN },
            },
            required: ['statement', 'isCorrect'],
          },
        },
        statementLabels: {
          type: Type.OBJECT,
          properties: {
            positive: { type: Type.STRING },
            negative: { type: Type.STRING },
            positiveCode: { type: Type.STRING },
            negativeCode: { type: Type.STRING },
          },
          required: ['positive', 'negative'],
        },
        ...commonFields,
      },
      required: ['question', 'statements', 'explanation'],
    };
  }

  if (questionType === 'matching') {
    return {
      type: Type.OBJECT,
      properties: {
        instruction: { type: Type.STRING },
        pairs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              premise: { type: Type.STRING },
              match: { type: Type.STRING },
            },
            required: ['premise', 'match'],
          },
        },
        distractors: { type: Type.ARRAY, items: { type: Type.STRING } },
        ...commonFields,
      },
      required: ['instruction', 'pairs', 'explanation'],
    };
  }

  if (questionType === 'shortAnswer') {
    return {
      type: Type.OBJECT,
      properties: {
        stimulus: { type: Type.STRING },
        question: { type: Type.STRING },
        correctAnswer: { type: Type.STRING },
        acceptedAnswers: { type: Type.ARRAY, items: { type: Type.STRING } },
        ...commonFields,
      },
      required: ['question', 'correctAnswer', 'explanation'],
    };
  }

  return {
    type: Type.OBJECT,
    properties: {
      stimulus: { type: Type.STRING },
      question: { type: Type.STRING },
      expectedAnswer: { type: Type.STRING },
      scoringRubric: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            criteria: { type: Type.STRING },
            points: { type: Type.NUMBER },
          },
          required: ['criteria', 'points'],
        },
      },
      ...commonFields,
    },
    required: ['question', 'expectedAnswer', 'scoringRubric', 'explanation'],
  };
}

function sanitizeQuestionDataForAi(questionType: string, q: any) {
  const clamp = (val: any, max = 3500) => {
    if (typeof val !== 'string') return val;
    return val.length > max ? val.slice(0, max) : val;
  };
  const base: Record<string, any> = {
    cognitiveLevel: clamp(q?.cognitiveLevel, 120),
    materialScope: clamp(q?.materialScope, 200),
    indicator: clamp(q?.indicator, 500),
    explanation: clamp(q?.explanation, 1500),
  };

  if (questionType === 'multipleChoice') {
    return {
      variant: q?.variant,
      stimulus: clamp(q?.stimulus),
      question: clamp(q?.question),
      options: Array.isArray(q?.options)
        ? q.options.map((o: any) => ({ key: String(o?.key || ''), text: clamp(String(o?.text || ''), 800) }))
        : [],
      correctAnswer: q?.correctAnswer,
      ...base,
    };
  }
  if (questionType === 'complexMultipleChoice') {
    return {
      variant: q?.variant,
      stimulus: clamp(q?.stimulus),
      question: clamp(q?.question),
      ...(Array.isArray(q?.options) && q.options.length > 0
        ? {
            options: q.options.map((o: any) => ({
              key: String(o?.key || ''),
              text: clamp(String(o?.text || ''), 800),
            })),
            correctAnswer: q?.correctAnswer,
          }
        : {}),
      ...(Array.isArray(q?.statements) && q.statements.length > 0
        ? {
            statements: q.statements.map((s: any) => ({
              statement: clamp(String(s?.statement || ''), 800),
              isCorrect: Boolean(s?.isCorrect),
            })),
            statementLabels: q?.statementLabels,
          }
        : {}),
      ...base,
    };
  }
  if (questionType === 'matching') {
    return {
      instruction: clamp(q?.instruction),
      pairs: Array.isArray(q?.pairs)
        ? q.pairs.map((p: any) => ({
            premise: clamp(String(p?.premise || ''), 600),
            match: clamp(String(p?.match || ''), 600),
          }))
        : [],
      distractors: Array.isArray(q?.distractors)
        ? q.distractors.map((d: any) => clamp(String(d || ''), 400))
        : [],
      ...base,
    };
  }
  if (questionType === 'shortAnswer') {
    return {
      stimulus: clamp(q?.stimulus),
      question: clamp(q?.question),
      correctAnswer: clamp(q?.correctAnswer, 400),
      acceptedAnswers: Array.isArray(q?.acceptedAnswers)
        ? q.acceptedAnswers.map((a: any) => clamp(String(a || ''), 400))
        : [],
      ...base,
    };
  }
  return {
    stimulus: clamp(q?.stimulus),
    question: clamp(q?.question),
    expectedAnswer: clamp(q?.expectedAnswer, 2500),
    scoringRubric: Array.isArray(q?.scoringRubric)
      ? q.scoringRubric.map((r: any) => ({
          criteria: clamp(String(r?.criteria || ''), 600),
          points: Number(r?.points || 0),
        }))
      : [],
    ...base,
  };
}

// Format error message to be human-friendly and in Indonesian
function formatAiErrorMessage(error: any): string {
  let msg = error?.message || 'Terjadi kesalahan pada layanan AI.';
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.message) {
      msg = parsed.error.message;
    }
  } catch {}

  if (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('spikes in demand') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded')
  ) {
    return 'Layanan AI sedang mengalami antrean padat atau batas kuota sementara tercapai. Silakan coba jalankan ulang dalam beberapa saat.';
  }

  if (
    error instanceof SyntaxError ||
    msg.includes('Unterminated string') ||
    msg.includes('JSON')
  ) {
    return 'Respons AI terpotong sebelum selesai sehingga format JSON belum lengkap. Silakan klik proses ulang untuk mencoba kembali.';
  }

  return msg;
}

const STATEMENT_PRESET_MAP: Record<string, { positive: string; negative: string; positiveCode: string; negativeCode: string }> = {
  benar_salah: { positive: 'Benar', negative: 'Salah', positiveCode: 'B', negativeCode: 'S' },
  true_false: { positive: 'True', negative: 'False', positiveCode: 'T', negativeCode: 'F' },
  ya_tidak: { positive: 'Ya', negative: 'Tidak', positiveCode: 'Y', negativeCode: 'T' },
  setuju_tidak: { positive: 'Setuju', negative: 'Tidak Setuju', positiveCode: 'S', negativeCode: 'TS' },
  fakta_opini: { positive: 'Fakta', negative: 'Opini', positiveCode: 'F', negativeCode: 'O' },
};

function buildPgkGuidance(pgkStyle: string): string {
  switch (pgkStyle) {
    case 'multi_select':
      return 'Semua soal PG Kompleks WAJIB memakai format MULTI-PILIH (isi field `options` A-D/E dan `correctAnswer` array minimal 2 huruf, contoh `["A", "C"]`, kosongkan `statements`, dan isi `variant: "multi_select"`).';
    case 'true_false':
      return 'Semua soal PG Kompleks WAJIB memakai format TABEL TRUE / FALSE (isi field `statements` minimal 3 pernyataan dengan `isCorrect` boolean, isi `variant: "true_false"`, dan `statementLabels: { positive: "True", negative: "False", positiveCode: "T", negativeCode: "F" }`, kosongkan `options`).';
    case 'ya_tidak':
      return 'Semua soal PG Kompleks WAJIB memakai format TABEL YA / TIDAK (isi `statements`, `variant: "binary_table"`, `statementLabels: { positive: "Ya", negative: "Tidak", positiveCode: "Y", negativeCode: "T" }`).';
    case 'setuju_tidak':
      return 'Semua soal PG Kompleks WAJIB memakai format TABEL SETUJU / TIDAK SETUJU (isi `statements`, `variant: "binary_table"`, `statementLabels: { positive: "Setuju", negative: "Tidak Setuju", positiveCode: "S", negativeCode: "TS" }`).';
    case 'benar_salah':
      return 'Semua soal PG Kompleks WAJIB memakai format TABEL BENAR / SALAH (isi `statements` minimal 3 pernyataan dengan `isCorrect` boolean, `variant: "benar_salah"`, `statementLabels: { positive: "Benar", negative: "Salah", positiveCode: "B", negativeCode: "S" }`).';
    default:
      return 'Gunakan CAMPURAN variasi PG Kompleks AKM: sebagian soal memakai format Multi-Pilih (`options` A-D/E + array `correctAnswer` contoh `["A","C"]`, `variant: "multi_select"`), dan sebagian memakai format Tabel Pernyataan (`statements` + `statementLabels` Benar/Salah atau True/False).';
  }
}

function buildPgGuidance(pgStyle: string, optionsCount: number): string {
  switch (pgStyle) {
    case 'mixed':
      return `Variasikan butir Pilihan Ganda: mayoritas soal PG standar ${optionsCount} opsi (variant: "standard"), sisipkan 1-2 butir soal True/False tunggal 2 opsi A. True / B. False atau A. Benar / B. Salah (variant: "true_false"), dan 1-2 butir PG Asosiasi pernyataan (1),(2),(3),(4) atau Sebab-Akibat (variant: "association" atau "cause_effect").`;
    case 'with_tf':
      return `Mayoritas soal PG standar ${optionsCount} opsi (variant: "standard"), dan sisipkan ~25-30% soal True/False (T/F) dengan tepat 2 opsi (A. True, B. False atau A. Benar, B. Salah) serta field variant: "true_false".`;
    case 'true_false_only':
      return 'Semua butir di bagian Pilihan Ganda WAJIB berbentuk True/False (T/F) dengan 2 opsi (key "A" text "True" atau "Benar", key "B" text "False" atau "Salah") dan field variant: "true_false".';
    case 'with_association':
      return `Mayoritas soal PG standar ${optionsCount} opsi (variant: "standard"), disertai beberapa soal PG Asosiasi (pernyataan 1, 2, 3, 4 di dalam teks soal) dan PG Hubungan Sebab-Akibat (Pernyataan & Alasan) dengan opsi A-D/E.`;
    default:
      return `Semua butir PG menggunakan format standar ${optionsCount} opsi (A-${optionsCount === 5 ? 'E' : 'D'}) dengan 1 jawaban benar (variant: "standard").`;
  }
}

function normalizeComplexItemsFromAi(items: any[], pgkStyle?: string) {
  const preset = pgkStyle && STATEMENT_PRESET_MAP[pgkStyle] ? STATEMENT_PRESET_MAP[pgkStyle] : undefined;
  return (items || []).map((q: any) => {
    const hasStatements = Array.isArray(q.statements) && q.statements.length > 0;
    const hasOptions = Array.isArray(q.options) && q.options.length > 0;
    const resolvedLabels =
      q.statementLabels?.positive && q.statementLabels?.negative
        ? q.statementLabels
        : hasStatements && preset
        ? preset
        : hasStatements && q.variant === 'true_false'
        ? STATEMENT_PRESET_MAP.true_false
        : undefined;
    return {
      ...q,
      ...(q.variant ? { variant: q.variant } : hasOptions && !hasStatements ? { variant: 'multi_select' } : {}),
      ...(resolvedLabels ? { statementLabels: resolvedLabels } : {}),
      ...(hasStatements ? { statements: q.statements } : { statements: undefined }),
      ...(hasOptions ? { options: q.options } : { options: undefined }),
    };
  });
}

// API endpoint to generate complete exam package
app.post('/api/generate-exam', async (req, res) => {
  try {
    const {
      examType = 'PSAS',
      examTitle = 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)',
      schoolLevel = 'SMP',
      grade = 'Kelas VII (Fase D)',
      subject = 'Ilmu Pengetahuan Alam (IPA)',
      curriculum = 'Kurikulum Merdeka',
      academicYear = '2024/2025',
      semester = 'Ganjil',
      duration = '90 Menit',
      topic = 'Ekosistem dan Interaksi Makhluk Hidup',
      learningObjectives = '',
      counts = {
        multipleChoice: 15,
        multipleChoiceOptionsCount: 4,
        complexMultipleChoice: 3,
        matching: 2,
        shortAnswer: 3,
        essay: 2,
      },
      pgStyle = 'standard',
      pgkStyle = 'mixed',
      difficulty = { easy: 30, medium: 50, hard: 20 },
      includeStimulus = true,
      customInstructions = '',
    } = req.body;

    const ai = getAiClient(req);
    const mcOptionsCount = counts.multipleChoiceOptionsCount || (schoolLevel === 'SMA' || schoolLevel === 'SMK' || schoolLevel === 'MA' ? 5 : 4);

    const systemInstruction = `Anda adalah Tim Ahli Penyusun Naskah Soal Ujian dan Asesmen Standar Nasional Kementerian Pendidikan Kebudayaan Riset dan Teknologi Indonesia (Kemendikbudristek) dan Kemenag.
Tugas Anda adalah merancang naskah soal ujian resmi (PSAS / STS / PSAJ / SAT / AM) yang komprehensif, berkualitas tinggi, pedagogis, berbasis HOTS dan Asesmen Kompetensi Minimum (AKM), menggunakan bahasa Indonesia yang baku, jelas, tidak ambigu, dan siap cetak.

Aturan Pembuatan Soal:
1. Pilihan Ganda (PG):
   - Standar: 4 opsi (SD/SMP) atau 5 opsi (SMA/SMK/MA), 1 kunci jawaban benar.
   - Variasi lain jika diminta: True/False tunggal (2 opsi A/B), PG Asosiasi (memilih kombinasi pernyataan 1, 2, 3, 4 yang benar), dan PG Hubungan Sebab-Akibat.
2. Pilihan Ganda Kompleks (PGK):
   - Mendukung mode Multi-Pilih Centang (opsi A-D/E dengan \`correctAnswer\` array berisi 2 atau lebih kunci, mis. ["A","C"]), DAN mode Tabel Evaluasi Biner (\`statements\` dengan \`statementLabels\`, misalnya Benar/Salah, True/False (T/F), Ya/Tidak, atau Setuju/Tidak Setuju).
3. Menjodohkan (Matching):
   - Pasangan premis (kolom kiri) dan respon (kolom kanan) disertai 1-2 pengecoh (\`distractors\`) bila relevan.
4. Isian Singkat:
   - Jawaban singkat berupa kata kunci, istilah, angka, atau rumus pasti.
5. Uraian / Essay:
   - Soal analisis tingkat tinggi (C4-C6), wajib menyertakan Rubrik Penilaian & Pedoman Penskoran lengkap.
6. Kisi-kisi Soal:
   - Wajib memuat \`materialScope\` (Lingkup Materi / Sub-Materi / Elemen CP spesifik per butir soal, BUKAN mengulang nama mata pelajaran; contoh: "Sistem Komputer – Perangkat Masukan (Input)" atau "Ekosistem – Aliran Energi"), Indikator Soal, Level Kognitif (C1-C6 / L1-L3), dan Bobot Skor.`;

    const userPrompt = `Buatkan paket lengkap naskah ujian resmi dengan data berikut:
- Jenis Ujian: ${examType} (${examTitle})
- Jenjang: ${schoolLevel}
- Kelas/Fase: ${grade}
- Mata Pelajaran: ${subject}
- Kurikulum: ${curriculum}
- Tahun Ajaran / Semester: ${academicYear} / ${semester}
- Alokasi Waktu: ${duration}
- Ruang Lingkup Materi / Topik: ${topic}
${learningObjectives ? `- Capaian Pembelajaran / Tujuan Pembelajaran: ${learningObjectives}` : ''}
- Rincian Jumlah Soal yang diminta:
  * Pilihan Ganda (PG): ${counts.multipleChoice} butir -> ${buildPgGuidance(pgStyle, mcOptionsCount)}
  * Pilihan Ganda Kompleks: ${counts.complexMultipleChoice} butir -> ${buildPgkGuidance(pgkStyle)}
  * Menjodohkan: ${counts.matching} butir
  * Isian Singkat: ${counts.shortAnswer} butir
  * Uraian / Essay: ${counts.essay} butir
- Distribusi Kesukaran: Mudah ~${difficulty.easy}%, Sedang ~${difficulty.medium}%, Sukar/HOTS ~${difficulty.hard}%
- Pakai Stimulus Narasi/Kasus Kontekstual: ${includeStimulus ? 'Ya, sertakan stimulus teks kontekstual menarik' : 'Secara proporsional'}
${customInstructions ? `- Instruksi Tambahan Guru: ${customInstructions}` : ''}

Hasil WAJIB dalam format JSON terstruktur persis sesuai skema yang diminta.`;

    const parsed = await generateJsonWithRetry(ai, {
      contents: userPrompt,
      config: {
        systemInstruction,
        maxOutputTokens: 32768,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            examSummary: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                grade: { type: Type.STRING },
                curriculum: { type: Type.STRING },
                academicYear: { type: Type.STRING },
                semester: { type: Type.STRING },
                duration: { type: Type.STRING },
                generalInstructions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['title', 'subject', 'grade', 'curriculum', 'generalInstructions'],
            },
            multipleChoice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  variant: { type: Type.STRING, description: 'standard, true_false, association, atau cause_effect' },
                  stimulus: { type: Type.STRING, description: 'Teks pengantar/bacaan/kasus jika ada, kosongkan jika tidak ada' },
                  question: { type: Type.STRING, description: 'Kalimat rumusan pertanyaan utama' },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING, description: 'A, B, C, D, atau E' },
                        text: { type: Type.STRING },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  correctAnswer: { type: Type.STRING, description: 'Kunci jawaban, contoh: A' },
                  explanation: { type: Type.STRING, description: 'Pembahasan singkat' },
                  cognitiveLevel: { type: Type.STRING, description: 'C1, C2, C3, C4, C5, atau C6' },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING, description: 'Indikator capaian soal' },
                  score: { type: Type.NUMBER },
                },
                required: ['number', 'question', 'options', 'correctAnswer', 'explanation'],
              },
            },
            complexMultipleChoice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  variant: { type: Type.STRING, description: 'multi_select, benar_salah, true_false, atau binary_table' },
                  statementLabels: {
                    type: Type.OBJECT,
                    properties: {
                      positive: { type: Type.STRING, description: 'Benar, True, Ya, Setuju, atau Fakta' },
                      negative: { type: Type.STRING, description: 'Salah, False, Tidak, Tidak Setuju, atau Opini' },
                      positiveCode: { type: Type.STRING, description: 'B, T, Y, S, atau F' },
                      negativeCode: { type: Type.STRING, description: 'S, F, T, TS, atau O' },
                    },
                  },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    description: 'Diisi jika mode Multi-Pilih Centang (lebih dari 1 jawaban benar)',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  correctAnswer: {
                    type: Type.ARRAY,
                    description: 'Diisi jika menggunakan options multi-pilih, contoh: ["A", "C"]',
                    items: { type: Type.STRING },
                  },
                  statements: {
                    type: Type.ARRAY,
                    description: 'Diisi jika mode tabel pernyataan biner (Benar/Salah, True/False, Ya/Tidak, dll)',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        statement: { type: Type.STRING },
                        isCorrect: { type: Type.BOOLEAN },
                      },
                      required: ['statement', 'isCorrect'],
                    },
                  },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['number', 'question', 'explanation'],
              },
            },
            matching: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  instruction: { type: Type.STRING },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        premise: { type: Type.STRING, description: 'Pernyataan / Konsep di kolom kiri' },
                        match: { type: Type.STRING, description: 'Pasangan jawaban yang benar di kolom kanan' },
                      },
                      required: ['premise', 'match'],
                    },
                  },
                  distractors: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Pengecoh tambahan di kolom kanan jika ada',
                  },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['number', 'instruction', 'pairs', 'explanation'],
              },
            },
            shortAnswer: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['number', 'question', 'correctAnswer', 'explanation'],
              },
            },
            essay: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  expectedAnswer: { type: Type.STRING },
                  scoringRubric: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        criteria: { type: Type.STRING },
                        points: { type: Type.NUMBER },
                      },
                      required: ['criteria', 'points'],
                    },
                  },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['number', 'question', 'expectedAnswer', 'scoringRubric'],
              },
            },
            scoringGuidelines: {
              type: Type.OBJECT,
              properties: {
                mcWeight: { type: Type.NUMBER },
                complexMcWeight: { type: Type.NUMBER },
                matchingWeight: { type: Type.NUMBER },
                shortAnswerWeight: { type: Type.NUMBER },
                essayWeight: { type: Type.NUMBER },
                formula: { type: Type.STRING },
              },
              required: ['formula'],
            },
          },
          required: ['examSummary', 'multipleChoice', 'essay'],
        },
      },
    });

    if (Array.isArray(parsed.complexMultipleChoice)) {
      parsed.complexMultipleChoice = normalizeComplexItemsFromAi(parsed.complexMultipleChoice, pgkStyle);
    }
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating exam:', error);
    return res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// API endpoint to regenerate or generate a single question
app.post('/api/generate-single-question', async (req, res) => {
  try {
    const {
      type = 'multipleChoice',
      subVariant = 'standard',
      customLabels,
      subject = 'Ilmu Pengetahuan Alam',
      grade = 'Kelas VII',
      topic = 'Rantai Makanan',
      cognitiveLevel = 'C4 (HOTS)',
      optionsCount = 4,
      instruction = '',
    } = req.body;

    const ai = getAiClient(req);
    const systemInstruction = `Anda adalah ahli pembuat butir soal ujian sekolah Indonesia. Buat 1 butir soal berkualitas tinggi sesuai format yang diminta, tingkat kognitif ${cognitiveLevel}, untuk mata pelajaran ${subject} ${grade}, topik: ${topic}.`;

    let formatRule = '';
    if (type === 'multipleChoice') {
      if (subVariant === 'true_false') {
        formatRule = `Bentuk: Pilihan Ganda True/False (2 opsi: A. True, B. False atau A. Benar, B. Salah). Isi variant: "true_false", options (2 item), correctAnswer ("A" atau "B").`;
      } else if (subVariant === 'association') {
        formatRule = `Bentuk: Pilihan Ganda Asosiasi (sajikan pernyataan bernomor (1), (2), (3), (4) di dalam teks question, lalu opsi A-D/E berisi kombinasi nomor mis. "(1), (2), dan (3)"). Isi variant: "association", options (${optionsCount} item), correctAnswer.`;
      } else if (subVariant === 'cause_effect') {
        formatRule = `Bentuk: Pilihan Ganda Hubungan Sebab-Akibat (Pernyataan ... SEBAB ... di dalam teks question, lalu opsi A-E analisis hubungan pernyataan & alasan). Isi variant: "cause_effect", options (${optionsCount} item), correctAnswer.`;
      } else {
        formatRule = `Bentuk: Pilihan Ganda Standar dengan ${optionsCount} opsi (A-${optionsCount === 5 ? 'E' : 'D'}) dan 1 correctAnswer.`;
      }
    } else if (type === 'complexMultipleChoice') {
      if (subVariant === 'multi_select') {
        formatRule = `Bentuk: PG Kompleks Multi-Pilih Centang. WAJIB isi \`options\` (${optionsCount} opsi A-${optionsCount === 5 ? 'E' : 'D'}) dan \`correctAnswer\` berupa array berisi 2-3 huruf kunci benar (mis. ["A", "C"]). JANGAN isi \`statements\`. Isi variant: "multi_select".`;
      } else {
        const lbl =
          customLabels?.positive && customLabels?.negative
            ? customLabels
            : STATEMENT_PRESET_MAP[subVariant] || STATEMENT_PRESET_MAP.benar_salah;
        formatRule = `Bentuk: PG Kompleks Tabel Evaluasi Biner (${lbl.positive} / ${lbl.negative}). WAJIB isi \`statements\` (3-4 pernyataan dengan \`statement\` dan \`isCorrect\` boolean) dan \`statementLabels\`: ${JSON.stringify(lbl)}. JANGAN isi \`options\`.`;
      }
    } else if (type === 'matching') {
      formatRule = 'Bentuk: Menjodohkan. WAJIB isi `instruction`, `pairs` (3-4 pasangan `premise` dan `match`), dan `distractors` (1-2 pengecoh).';
    } else if (type === 'shortAnswer') {
      formatRule = 'Bentuk: Isian Singkat. WAJIB isi `question`, `correctAnswer` (singkat & pasti), dan `acceptedAnswers` (array variasi penulisan benar jika ada).';
    } else {
      formatRule = 'Bentuk: Uraian/Essay. WAJIB isi `question`, `expectedAnswer`, dan `scoringRubric` (array `{ criteria, points }`).';
    }

    const prompt = `Buatkan 1 butir soal ujian dengan ketentuan:
- Mata Pelajaran / Kelas: ${subject} / ${grade}
- Tingkat Kognitif: ${cognitiveLevel}
- Topik / Indikator: ${topic}
- ${formatRule}
${instruction ? `- Catatan spesifik guru: ${instruction}` : ''}

Kembalikan HANYA 1 objek JSON butir soal sesuai struktur field di atas.`;

    const isSingleCmcMulti = type === 'complexMultipleChoice' && subVariant === 'multi_select';
    const parsed = await generateJsonWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: 6144,
        responseMimeType: 'application/json',
        responseSchema: buildSingleQuestionResponseSchema(type, isSingleCmcMulti, true),
      },
    });

    // Normalize returned payload to strictly match frontend ExamPackage types
    if (type === 'complexMultipleChoice') {
      if (subVariant === 'multi_select') {
        const arr =
          Array.isArray(parsed.correctAnswersArray) && parsed.correctAnswersArray.length > 0
            ? parsed.correctAnswersArray.map((s: string) => s.trim().toUpperCase())
            : String(parsed.correctAnswer || 'A, B')
                .split(/[,;\s]+/)
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
        parsed.correctAnswer = arr;
        parsed.variant = 'multi_select';
        delete parsed.statements;
        delete parsed.statementLabels;
      } else {
        const lbl =
          customLabels?.positive && customLabels?.negative
            ? customLabels
            : STATEMENT_PRESET_MAP[subVariant] || parsed.statementLabels || STATEMENT_PRESET_MAP.benar_salah;
        parsed.statementLabels = lbl;
        parsed.variant = subVariant === 'true_false' ? 'true_false' : subVariant === 'benar_salah' ? 'benar_salah' : 'binary_table';
        delete parsed.options;
        delete parsed.correctAnswer;
      }
      delete parsed.correctAnswersArray;
    } else if (type === 'multipleChoice') {
      if (subVariant !== 'standard' && !parsed.variant) {
        parsed.variant = subVariant;
      }
      delete parsed.correctAnswersArray;
    }

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error single question:', error);
    return res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// API endpoint to revise/edit an existing generated or imported question with AI assistance
app.post('/api/edit-question-ai', async (req, res) => {
  try {
    const {
      questionType,
      questionData,
      instruction,
      subject = 'Umum',
      grade = 'Umum',
      curriculum = 'Kurikulum Merdeka',
      examType = 'PSAS',
    } = req.body;

    if (!questionType || !questionData || !instruction || !String(instruction).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Data butir soal dan instruksi revisi untuk AI wajib diisi.',
      });
    }

    const ai = getAiClient(req);
    const isCmcMulti =
      questionType === 'complexMultipleChoice' &&
      Boolean(questionData.options && questionData.options.length > 0) &&
      !(questionData.statements && questionData.statements.length > 0);

    const systemInstruction = `Anda adalah editor & ahli konstruksi soal ujian sekolah Indonesia (${curriculum}, asesmen ${examType}). Tugas Anda adalah merevisi butir soal yang sudah ada sesuai instruksi guru, sambil menjaga ketepatan konsep, kunci jawaban, pembahasan, dan indikator kisi-kisi.`;

    let structureRule = '';
    if (questionType === 'multipleChoice') {
      const optKeys = Array.isArray(questionData.options)
        ? questionData.options.map((o: any) => o.key).join(', ')
        : 'A, B, C, D';
      structureRule = `Pertahankan tipe Pilihan Ganda (variant: "${questionData.variant || 'standard'}"). Wajib kembalikan \`question\`, \`options\` (kunci huruf: ${optKeys}, kecuali guru meminta ubah jumlah opsi), \`correctAnswer\` (1 huruf kunci benar), \`explanation\`, \`cognitiveLevel\`, dan \`indicator\`.`;
    } else if (questionType === 'complexMultipleChoice') {
      if (isCmcMulti) {
        structureRule = `Pertahankan tipe PG Kompleks Multi-Pilih Centang (\`variant: "multi_select"\`). Wajib kembalikan \`question\`, \`options\` (A-D/E), \`correctAnswersArray\` (array huruf kunci benar minimal 2, contoh ["A", "C"]), \`explanation\`, \`cognitiveLevel\`, dan \`indicator\`. JANGAN isi \`statements\`.`;
      } else {
        const lbl = questionData.statementLabels || STATEMENT_PRESET_MAP.benar_salah;
        structureRule = `Pertahankan tipe PG Kompleks Tabel Biner (\`variant: "${questionData.variant || 'benar_salah'}"\`) dengan label ${lbl.positive}/${lbl.negative}. Wajib kembalikan \`question\`, \`statements\` (array \`{ statement, isCorrect }\`), \`statementLabels\`, \`explanation\`, \`cognitiveLevel\`, dan \`indicator\`. JANGAN isi \`options\`.`;
      }
    } else if (questionType === 'matching') {
      structureRule = `Pertahankan tipe Menjodohkan. Wajib kembalikan \`instruction\`, \`pairs\` (array \`{ premise, match }\`), \`distractors\` (array string jika ada pengecoh), \`explanation\`, \`cognitiveLevel\`, dan \`indicator\`.`;
    } else if (questionType === 'shortAnswer') {
      structureRule = `Pertahankan tipe Isian Singkat. Wajib kembalikan \`question\`, \`correctAnswer\` (singkat & pasti), \`acceptedAnswers\` (array variasi jawaban benar jika relevan), \`explanation\`, \`cognitiveLevel\`, dan \`indicator\`.`;
    } else {
      structureRule = `Pertahankan tipe Uraian / Essay. Wajib kembalikan \`question\`, \`expectedAnswer\`, \`scoringRubric\` (array \`{ criteria, points }\`), \`cognitiveLevel\`, dan \`indicator\`.`;
    }

    const sanitizedQuestion = sanitizeQuestionDataForAi(questionType, questionData);

    const prompt = `Revisi butir soal berikut untuk Mata Pelajaran ${subject} (${grade}):

DATA SOAL SAAT INI (JSON):
${JSON.stringify(sanitizedQuestion, null, 2)}

INSTRUKSI REVISI DARI GURU:
"${String(instruction).trim()}"

ATURAN STRUKTUR OUTPUT:
- ${structureRule}
- Jika soal saat ini memiliki \`stimulus\` atau instruksi meminta menambah/mengubah stimulus, isi/perbarui field \`stimulus\`. Jika stimulus memang tidak diperlukan atau diminta dihapus, boleh dikosongkan.
- Pastikan kunci jawaban dan pembahasan 100% konsisten dengan isi soal revisi.
- Tulis setiap field secara ringkas, padat, baku, dan JANGAN mengulang teks atau karakter berlebih.`;

    const parsed = await generateJsonWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: 6144,
        responseMimeType: 'application/json',
        responseSchema: buildSingleQuestionResponseSchema(questionType, isCmcMulti, false),
      },
    });

    // Preserve immutable identity metadata and normalize per questionType
    const revised: any = {
      ...questionData,
      ...parsed,
      id: questionData.id,
      number: questionData.number,
      score: questionData.score,
    };

    if (!parsed.stimulus || !String(parsed.stimulus).trim()) {
      delete revised.stimulus;
    }

    if (questionType === 'complexMultipleChoice') {
      if (isCmcMulti) {
        const arr =
          Array.isArray(parsed.correctAnswersArray) && parsed.correctAnswersArray.length > 0
            ? parsed.correctAnswersArray.map((s: string) => String(s).trim().toUpperCase())
            : Array.isArray(parsed.correctAnswer)
            ? parsed.correctAnswer.map((s: string) => String(s).trim().toUpperCase())
            : String(parsed.correctAnswer || 'A, B')
                .split(/[,;\s]+/)
                .map((s) => s.trim().toUpperCase())
                .filter(Boolean);
        revised.correctAnswer = arr;
        revised.variant = 'multi_select';
        delete revised.statements;
        delete revised.statementLabels;
      } else {
        revised.statementLabels =
          parsed.statementLabels?.positive && parsed.statementLabels?.negative
            ? parsed.statementLabels
            : questionData.statementLabels || STATEMENT_PRESET_MAP.benar_salah;
        revised.variant = questionData.variant || 'benar_salah';
        delete revised.options;
        delete revised.correctAnswer;
      }
      delete revised.correctAnswersArray;
    } else if (questionType === 'multipleChoice') {
      if (questionData.variant) {
        revised.variant = parsed.variant || questionData.variant;
      }
      if (typeof revised.correctAnswer === 'string') {
        revised.correctAnswer = revised.correctAnswer.trim().toUpperCase();
      }
      delete revised.correctAnswersArray;
    } else if (questionType === 'shortAnswer') {
      if (revised.correctAnswer) {
        revised.expectedAnswer = parsed.expectedAnswer || revised.correctAnswer;
      }
      delete revised.correctAnswersArray;
    } else {
      delete revised.correctAnswersArray;
    }

    return res.json({ success: true, data: revised });
  } catch (error: any) {
    console.error('Error editing question with AI:', error);
    return res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// Helper: deterministic structural & duplication pre-checks for holistic exam audit
function runDeterministicExamPreChecks(exam: any) {
  const flatItems: Array<{
    questionType: 'multipleChoice' | 'complexMultipleChoice' | 'matching' | 'shortAnswer' | 'essay';
    questionId: string;
    questionNumber: number;
    stemNormalized: string;
    structuralAlerts: Array<{
      category: string;
      severity: 'critical' | 'warning';
      title: string;
      detail: string;
      fixSuggestion: string;
    }>;
  }> = [];

  const normalizeText = (txt: string) =>
    String(txt || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const tokenize = (txt: string) =>
    new Set(
      normalizeText(txt)
        .split(' ')
        .filter((w) => w.length > 2)
    );

  const pushItem = (
    questionType: 'multipleChoice' | 'complexMultipleChoice' | 'matching' | 'shortAnswer' | 'essay',
    q: any,
    stemRaw: string
  ) => {
    const alerts: Array<{
      category: string;
      severity: 'critical' | 'warning';
      title: string;
      detail: string;
      fixSuggestion: string;
    }> = [];

    if (!String(stemRaw || '').trim()) {
      alerts.push({
        category: 'construction',
        severity: 'critical',
        title: 'Pokok soal / instruksi kosong',
        detail: `Butir soal nomor ${q.number} tidak memiliki teks pertanyaan atau instruksi.`,
        fixSuggestion: 'Lengkapi pokok soal yang jelas dan sesuai indikator kisi-kisi.',
      });
    }

    if (questionType === 'multipleChoice') {
      const opts = Array.isArray(q.options) ? q.options : [];
      if (opts.length < 2) {
        alerts.push({
          category: 'construction',
          severity: 'critical',
          title: 'Jumlah opsi pilihan ganda kurang',
          detail: `Soal nomor ${q.number} hanya memiliki ${opts.length} opsi jawaban.`,
          fixSuggestion: 'Lengkapi minimal 4–5 opsi jawaban yang homogen (kecuali tipe True/False 2 opsi).',
        });
      }
      const keySet = new Set(opts.map((o: any) => String(o.key || '').trim().toUpperCase()));
      const ansKey = String(q.correctAnswer || '').trim().toUpperCase();
      if (!ansKey || !keySet.has(ansKey)) {
        alerts.push({
          category: 'key_error',
          severity: 'critical',
          title: 'Kunci jawaban tidak cocok dengan daftar opsi',
          detail: `Kunci jawaban "${ansKey || '(kosong)'}" tidak ditemukan pada opsi [${Array.from(keySet).join(', ')}].`,
          fixSuggestion: 'Tetapkan satu kunci jawaban yang tepat sesuai huruf opsi yang tersedia.',
        });
      }
      const seenTexts = new Map<string, string>();
      for (const o of opts) {
        const normOpt = normalizeText(o.text);
        if (!normOpt) {
          alerts.push({
            category: 'construction',
            severity: 'critical',
            title: `Teks opsi ${o.key} kosong`,
            detail: `Opsi ${o.key} pada soal nomor ${q.number} tidak memiliki teks.`,
            fixSuggestion: `Isi opsi ${o.key} dengan pengecoh yang logis dan homogen.`,
          });
        } else if (seenTexts.has(normOpt)) {
          alerts.push({
            category: 'double_key',
            severity: 'critical',
            title: `Opsi ${o.key} dan ${seenTexts.get(normOpt)} identik`,
            detail: `Terdapat dua opsi dengan isi identik ("${o.text}") sehingga berisiko kunci ganda.`,
            fixSuggestion: 'Ubah salah satu opsi agar unik dan berfungsi sebagai pengecoh yang valid.',
          });
        } else {
          seenTexts.set(normOpt, String(o.key));
        }
      }
    } else if (questionType === 'complexMultipleChoice') {
      const hasOpts = Array.isArray(q.options) && q.options.length > 0;
      const hasStmts = Array.isArray(q.statements) && q.statements.length > 0;
      if (!hasOpts && !hasStmts) {
        alerts.push({
          category: 'construction',
          severity: 'critical',
          title: 'PG Kompleks tidak memiliki opsi maupun pernyataan',
          detail: `Butir soal PG Kompleks nomor ${q.number} belum memiliki daftar opsi centang atau pernyataan tabel.`,
          fixSuggestion: 'Tambahkan daftar opsi multi-pilih atau tabel pernyataan B/S.',
        });
      }
      if (hasOpts && !hasStmts) {
        const corr = Array.isArray(q.correctAnswer)
          ? q.correctAnswer
          : String(q.correctAnswer || '')
              .split(/[,;\s]+/)
              .filter(Boolean);
        if (corr.length < 2) {
          alerts.push({
            category: 'key_error',
            severity: 'warning',
            title: 'Kunci PG Kompleks Multi-Pilih kurang dari 2 jawaban',
            detail: `PG Kompleks multi-pilih seharusnya memiliki minimal 2 jawaban benar, saat ini hanya tercatat ${corr.length}.`,
            fixSuggestion: 'Pastikan tersedia minimal 2 jawaban benar yang akurat atau ubah ke PG standar.',
          });
        }
      }
    } else if (questionType === 'matching') {
      const pairs = Array.isArray(q.pairs) ? q.pairs : [];
      if (pairs.length < 2) {
        alerts.push({
          category: 'construction',
          severity: 'critical',
          title: 'Pasangan menjodohkan terlalu sedikit',
          detail: `Soal menjodohkan nomor ${q.number} hanya memiliki ${pairs.length} pasangan.`,
          fixSuggestion: 'Lengkapi minimal 3–5 pasangan premis dan jawaban ditambah pengecoh di kolom kanan.',
        });
      }
    } else if (questionType === 'shortAnswer') {
      if (!String(q.correctAnswer || q.expectedAnswer || '').trim()) {
        alerts.push({
          category: 'key_error',
          severity: 'critical',
          title: 'Kunci jawaban isian singkat kosong',
          detail: `Soal isian singkat nomor ${q.number} belum memiliki kunci jawaban.`,
          fixSuggestion: 'Tambahkan kunci jawaban singkat dan variasi penulisan yang dapat diterima.',
        });
      }
    } else if (questionType === 'essay') {
      if (!String(q.expectedAnswer || '').trim()) {
        alerts.push({
          category: 'key_error',
          severity: 'critical',
          title: 'Pedoman jawaban uraian kosong',
          detail: `Soal uraian nomor ${q.number} belum memiliki ekspektasi/kunci jawaban.`,
          fixSuggestion: 'Lengkapi ekspektasi jawaban lengkap beserta poin-poin penilaiannya.',
        });
      }
      if (!Array.isArray(q.scoringRubric) || q.scoringRubric.length === 0) {
        alerts.push({
          category: 'construction',
          severity: 'warning',
          title: 'Rubrik penskoran uraian belum terisi',
          detail: `Soal uraian nomor ${q.number} belum memiliki rincian rubrik penskoran objektif.`,
          fixSuggestion: 'Tambahkan kriteria penskoran bertahap agar penilaian objektif.',
        });
      }
    }

    flatItems.push({
      questionType,
      questionId: String(q.id || `${questionType}-${q.number}`),
      questionNumber: Number(q.number || flatItems.length + 1),
      stemNormalized: normalizeText(stemRaw),
      structuralAlerts: alerts,
    });
  };

  (exam.multipleChoice || []).forEach((q: any) => pushItem('multipleChoice', q, q.question));
  (exam.complexMultipleChoice || []).forEach((q: any) => pushItem('complexMultipleChoice', q, q.question));
  (exam.matching || []).forEach((q: any) => pushItem('matching', q, q.instruction));
  (exam.shortAnswer || []).forEach((q: any) => pushItem('shortAnswer', q, q.question));
  (exam.essay || []).forEach((q: any) => pushItem('essay', q, q.question));

  // Cross-item stem similarity check (near-duplicate detection)
  const nearDuplicatePairs: Array<{ numbers: [number, number]; similarity: number }> = [];
  for (let i = 0; i < flatItems.length; i++) {
    const tokA = tokenize(flatItems[i].stemNormalized);
    if (tokA.size < 4) continue;
    for (let j = i + 1; j < flatItems.length; j++) {
      const tokB = tokenize(flatItems[j].stemNormalized);
      if (tokB.size < 4) continue;
      let intersect = 0;
      tokA.forEach((w) => {
        if (tokB.has(w)) intersect++;
      });
      const union = tokA.size + tokB.size - intersect;
      const jaccard = union > 0 ? intersect / union : 0;
      if (jaccard >= 0.72) {
        nearDuplicatePairs.push({
          numbers: [flatItems[i].questionNumber, flatItems[j].questionNumber],
          similarity: Math.round(jaccard * 100),
        });
      }
    }
  }

  return { flatItems, nearDuplicatePairs };
}

// API endpoint to comprehensively audit & validate an entire exam package with AI
app.post('/api/validate-exam-ai', async (req, res) => {
  try {
    const { examPackage } = req.body || {};
    if (!examPackage || !examPackage.examSummary) {
      return res.status(400).json({
        success: false,
        error: 'Data naskah ujian tidak lengkap untuk divalidasi.',
      });
    }

    const totalCount =
      (examPackage.multipleChoice?.length || 0) +
      (examPackage.complexMultipleChoice?.length || 0) +
      (examPackage.matching?.length || 0) +
      (examPackage.shortAnswer?.length || 0) +
      (examPackage.essay?.length || 0);

    if (totalCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'Naskah belum memiliki butir soal untuk divalidasi.',
      });
    }

    const { flatItems, nearDuplicatePairs } = runDeterministicExamPreChecks(examPackage);

    // Build compact audit payload keeping every essential field
    const compactExam = {
      examSummary: {
        title: examPackage.examSummary.title,
        examType: examPackage.examSummary.examType,
        schoolLevel: examPackage.examSummary.schoolLevel,
        grade: examPackage.examSummary.grade,
        subject: examPackage.examSummary.subject,
        curriculum: examPackage.examSummary.curriculum,
        semester: examPackage.examSummary.semester,
      },
      multipleChoice: (examPackage.multipleChoice || []).map((q: any) => ({
        questionType: 'multipleChoice',
        questionId: q.id,
        number: q.number,
        variant: q.variant || 'standard',
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        stimulus: q.stimulus,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
      complexMultipleChoice: (examPackage.complexMultipleChoice || []).map((q: any) => ({
        questionType: 'complexMultipleChoice',
        questionId: q.id,
        number: q.number,
        variant: q.variant,
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        stimulus: q.stimulus,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        statements: q.statements,
        statementLabels: q.statementLabels,
        explanation: q.explanation,
      })),
      matching: (examPackage.matching || []).map((q: any) => ({
        questionType: 'matching',
        questionId: q.id,
        number: q.number,
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        instruction: q.instruction,
        pairs: q.pairs,
        distractors: q.distractors,
        explanation: q.explanation,
      })),
      shortAnswer: (examPackage.shortAnswer || []).map((q: any) => ({
        questionType: 'shortAnswer',
        questionId: q.id,
        number: q.number,
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        stimulus: q.stimulus,
        question: q.question,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        explanation: q.explanation,
      })),
      essay: (examPackage.essay || []).map((q: any) => ({
        questionType: 'essay',
        questionId: q.id,
        number: q.number,
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        stimulus: q.stimulus,
        question: q.question,
        expectedAnswer: q.expectedAnswer,
        scoringRubric: q.scoringRubric,
      })),
    };

    const ai = getAiClient(req);
    const systemInstruction = `Anda adalah Tim Reviewer & Auditor Mutu Soal Nasional (Standar Asesmen Pendidikan Kemendikbudristek, Kurikulum Merdeka, & AKM).
Tugas Anda mengaudit SELURUH naskah ujian secara teliti, objektif, dan jujur tanpa mengada-ada.

FOKUS AUDIT WAJIB (6 PILAR VALIDITAS MUTU TERKINI):
1. ANTI-KUNCI GANDA & INTEGRITAS KUNCI ("double_key" / "key_error"):
   - Pada Pilihan Ganda tunggal (diminta memilih 1 jawaban), pastikan TIDAK ADA lebih dari 1 opsi yang secara keilmuan bisa dibenarkan atau sama-sama benar!
   - Verifikasi kunci jawaban yang tertulis: apakah kunci jawaban memang benar secara fakta/hitungan/tata bahasa?
   - Pastikan pengecoh (distractor) masuk akal, homogen, dan tidak terlalu panjang/mencolok dibanding opsi lain.
2. ANTI-HALUSINASI & KEBENARAN KEILMUAN ("hallucination"):
   - Cek kebenaran fakta, rumus, perhitungan matematika/IPA, istilah sejarah/bahasa, dan konsistensi dengan teks stimulus!
   - Jika soal menyebut "berdasarkan teks/tabel di atas", pastikan informasinya benar-benar ada di stimulus tersebut (tidak halu).
3. ANTI-REDUNDANSI & ANTI-BOCOR ("redundancy" / "clue_leakage"):
   - Bandingkan antar-nomor soal! Tandai jika ada dua nomor yang menanyakan konsep/indikator identik (double pengukuran).
   - Tandai jika stimulus/pernyataan di satu nomor secara tidak langsung membocorkan jawaban nomor lainnya.
4. ANTI-BIAS ("bias"):
   - Pastikan bebas bias SARA, gender, stereotip sosial-ekonomi/daerah, bahasa menghakimi, atau kata penentu mutlak ("selalu", "tidak pernah") yang membocorkan pola jawaban.
5. KESESUAIAN KONTEKS & LEVEL KOGNITIF ("out_of_context" / "cognitive_mismatch"):
   - Pastikan topik & kedalaman materi sesuai Mata Pelajaran (${compactExam.examSummary.subject}), Jenjang/Kelas (${compactExam.examSummary.schoolLevel} ${compactExam.examSummary.grade}), Kurikulum (${compactExam.examSummary.curriculum}), dan Jenis Asesmen (${compactExam.examSummary.examType}).
   - Pastikan klaim \`cognitiveLevel\` (C1-C6 / L1-L3) sesuai tuntutan berpikir aktual (misal klaim C4 tetapi soalnya ternyata hafalan C1).
6. KONSTRUKSI & BAHASA BAKU EYD V ("construction" / "language"):
   - Pokok soal (stem) jelas, tidak memakai negasi ganda, opsi tidak tumpang tindih, dan uraian punya rubrik yang terukur.

ATURAN OUTPUT PENTING:
- Kembalikan \`itemReports\` untuk SETIAP butir soal yang ada di naskah (jumlah itemReports harus sama dengan ${totalCount} soal, urut nomor, sertakan \`questionId\`, \`questionType\`, \`questionNumber\`).
- Untuk soal yang sudah bagus & valid, set \`status: "valid"\` dan \`issues: []\`. Jangan memaksakan mencari kesalahan jika soal memang sudah valid!
- Untuk soal yang bermasalah fatal (kunci salah, kunci ganda / lebih dari 1 jawaban benar pada PG tunggal, halu/fakta keliru, melenceng jauh dari mapel/jenjang, atau duplikat), set \`status: "critical_error"\`.
- Untuk soal yang masih perlu penyempurnaan (pengecoh lemah, klaim HOTS tidak cocok, redaksi kurang efektif, indikator kurang tajam, bias ringan), set \`status: "needs_revision"\`.
- Setiap temuan wajib disertai \`fixSuggestion\` yang konkret dan siap langsung dipakai untuk merevisi soal tersebut.`;

    const prompt = `Audit naskah ujian berikut secara menyeluruh:

KONTEKS UJIAN:
${JSON.stringify(compactExam.examSummary, null, 2)}

PRE-CHECK STRUKTURAL OTOMATIS SERVER:
- Pasangan indikasi kemiripan stem tinggi: ${JSON.stringify(nearDuplicatePairs)}
- Catatan struktural awal: ${JSON.stringify(
      flatItems
        .filter((f) => f.structuralAlerts.length > 0)
        .map((f) => ({ number: f.questionNumber, alerts: f.structuralAlerts }))
    )}

SELURUH BUTIR SOAL (${totalCount} BUTIR):
${JSON.stringify(
  [
    ...compactExam.multipleChoice,
    ...compactExam.complexMultipleChoice,
    ...compactExam.matching,
    ...compactExam.shortAnswer,
    ...compactExam.essay,
  ],
  null,
  2
)}

Berikan laporan audit komprehensif dalam format JSON sesuai schema.`;

    const parsed = await generateJsonWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            qualityGrade: { type: Type.STRING },
            summary: { type: Type.STRING },
            dimensionScores: {
              type: Type.OBJECT,
              properties: {
                contentValidity: { type: Type.NUMBER },
                constructValidity: { type: Type.NUMBER },
                languageAndBias: { type: Type.NUMBER },
                keyAndDistractorIntegrity: { type: Type.NUMBER },
                antiRedundancy: { type: Type.NUMBER },
              },
              required: [
                'contentValidity',
                'constructValidity',
                'languageAndBias',
                'keyAndDistractorIntegrity',
                'antiRedundancy',
              ],
            },
            crossQuestionFindings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  affectedNumbers: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  recommendation: { type: Type.STRING },
                },
                required: ['type', 'severity', 'affectedNumbers', 'title', 'description', 'recommendation'],
              },
            },
            itemReports: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionType: { type: Type.STRING },
                  questionId: { type: Type.STRING },
                  questionNumber: { type: Type.INTEGER },
                  status: { type: Type.STRING },
                  checks: {
                    type: Type.OBJECT,
                    properties: {
                      noDoubleKey: { type: Type.BOOLEAN },
                      noHallucination: { type: Type.BOOLEAN },
                      noBias: { type: Type.BOOLEAN },
                      noRedundancy: { type: Type.BOOLEAN },
                      contextAligned: { type: Type.BOOLEAN },
                      constructionValid: { type: Type.BOOLEAN },
                    },
                    required: [
                      'noDoubleKey',
                      'noHallucination',
                      'noBias',
                      'noRedundancy',
                      'contextAligned',
                      'constructionValid',
                    ],
                  },
                  issues: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        severity: { type: Type.STRING },
                        title: { type: Type.STRING },
                        detail: { type: Type.STRING },
                        fixSuggestion: { type: Type.STRING },
                      },
                      required: ['category', 'severity', 'title', 'detail', 'fixSuggestion'],
                    },
                  },
                },
                required: ['questionType', 'questionId', 'questionNumber', 'status', 'checks', 'issues'],
              },
            },
          },
          required: [
            'overallScore',
            'qualityGrade',
            'summary',
            'dimensionScores',
            'crossQuestionFindings',
            'itemReports',
          ],
        },
      },
    });

    // Merge guaranteed deterministic structural alerts if AI omitted any
    const aiReportsByKey = new Map<string, any>();
    (Array.isArray(parsed.itemReports) ? parsed.itemReports : []).forEach((r: any) => {
      aiReportsByKey.set(`${r.questionType}:${r.questionId}`, r);
      aiReportsByKey.set(`num:${r.questionNumber}`, r);
    });

    const mergedItemReports = flatItems.map((f) => {
      const matched =
        aiReportsByKey.get(`${f.questionType}:${f.questionId}`) ||
        aiReportsByKey.get(`num:${f.questionNumber}`);

      const issues: any[] = Array.isArray(matched?.issues) ? [...matched.issues] : [];
      const checks = {
        noDoubleKey: matched?.checks?.noDoubleKey ?? true,
        noHallucination: matched?.checks?.noHallucination ?? true,
        noBias: matched?.checks?.noBias ?? true,
        noRedundancy: matched?.checks?.noRedundancy ?? true,
        contextAligned: matched?.checks?.contextAligned ?? true,
        constructionValid: matched?.checks?.constructionValid ?? true,
      };

      f.structuralAlerts.forEach((alert) => {
        const alreadyMentioned = issues.some(
          (i) =>
            String(i.category || '') === alert.category ||
            String(i.title || '').toLowerCase().includes(alert.title.toLowerCase().slice(0, 14))
        );
        if (!alreadyMentioned) {
          issues.unshift(alert);
        }
        if (alert.category === 'double_key' || alert.category === 'key_error') checks.noDoubleKey = false;
        if (alert.category === 'construction') checks.constructionValid = false;
      });

      const hasCritical = issues.some((i) => i.severity === 'critical');
      const hasWarning = issues.some((i) => i.severity === 'warning' || i.severity === 'suggestion');
      const status =
        hasCritical || matched?.status === 'critical_error'
          ? 'critical_error'
          : hasWarning || matched?.status === 'needs_revision'
          ? 'needs_revision'
          : 'valid';

      return {
        questionType: f.questionType,
        questionId: f.questionId,
        questionNumber: f.questionNumber,
        status,
        checks,
        issues,
      };
    });

    const criticalCount = mergedItemReports.filter((r) => r.status === 'critical_error').length;
    const warningCount = mergedItemReports.filter((r) => r.status === 'needs_revision').length;
    const validCount = mergedItemReports.filter((r) => r.status === 'valid').length;

    const crossFindings: any[] = Array.isArray(parsed.crossQuestionFindings)
      ? [...parsed.crossQuestionFindings]
      : [];

    nearDuplicatePairs.forEach((pair) => {
      const alreadyReported = crossFindings.some(
        (cf) =>
          Array.isArray(cf.affectedNumbers) &&
          cf.affectedNumbers.includes(pair.numbers[0]) &&
          cf.affectedNumbers.includes(pair.numbers[1])
      );
      if (!alreadyReported) {
        crossFindings.unshift({
          type: 'redundancy',
          severity: 'critical',
          affectedNumbers: pair.numbers,
          title: `Indikasi Soal Redundan / Duplikat (No. ${pair.numbers[0]} & No. ${pair.numbers[1]})`,
          description: `Kemiripan teks pokok soal mencapai ~${pair.similarity}%. Mengukur materi yang sama berulang kali mengurangi validitas cakupan tes.`,
          recommendation: `Ganti atau modifikasi salah satu soal (mis. No. ${pair.numbers[1]}) ke sub-materi atau level kognitif yang berbeda.`,
        });
      }
    });

    return res.json({
      success: true,
      data: {
        overallScore: Math.max(0, Math.min(100, Math.round(Number(parsed.overallScore ?? 80)))),
        qualityGrade: parsed.qualityGrade || 'Valid dengan Catatan',
        summary: parsed.summary || 'Audit mutu menyeluruh telah selesai.',
        auditedAt: new Date().toISOString(),
        totalQuestionsAudited: mergedItemReports.length,
        criticalCount,
        warningCount,
        validCount,
        dimensionScores: parsed.dimensionScores || {
          contentValidity: 85,
          constructValidity: 85,
          languageAndBias: 90,
          keyAndDistractorIntegrity: 85,
          antiRedundancy: 90,
        },
        crossQuestionFindings: crossFindings,
        itemReports: mergedItemReports,
      },
    });
  } catch (error: any) {
    console.error('Error validating exam with AI:', error);
    return res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// API endpoint to generate exam from user uploaded text or notes
app.post('/api/generate-from-text', async (req, res) => {
  try {
    const {
      rawText,
      subject,
      grade,
      examType,
      questionCounts,
      pgStyle = 'standard',
      pgkStyle = 'mixed',
      optionsCount = 4,
    } = req.body;
    if (!rawText || rawText.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Teks materi terlalu pendek.' });
    }

    const mcNum = Number(questionCounts?.multipleChoice ?? 8);
    const cmcNum = Number(questionCounts?.complexMultipleChoice ?? 0);
    const matchNum = Number(questionCounts?.matching ?? 0);
    const saNum = Number(questionCounts?.shortAnswer ?? 2);
    const esNum = Number(questionCounts?.essay ?? 1);

    const ai = getAiClient(req);
    const prompt = `Berdasarkan teks materi/modul pembelajaran berikut ini, susunlah butir-butir soal ujian ${examType || 'PSAS'} untuk ${subject || 'Mata Pelajaran'} (${grade || 'Umum'}):
--- MATERI ---
${rawText}
--- AKHIR MATERI ---

Rincian jumlah & format soal yang WAJIB dibuat:
- Pilihan Ganda: ${mcNum} butir -> ${buildPgGuidance(pgStyle, optionsCount)}
- Pilihan Ganda Kompleks: ${cmcNum} butir -> ${cmcNum > 0 ? buildPgkGuidance(pgkStyle) : 'Kosongkan array (0 butir).'}
- Menjodohkan: ${matchNum} butir
- Isian Singkat: ${saNum} butir
- Uraian / Essay: ${esNum} butir

Hasil WAJIB mengikuti JSON schema yang disediakan.`;

    const parsed = await generateJsonWithRetry(ai, {
      contents: prompt,
      config: {
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            multipleChoice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  variant: { type: Type.STRING },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['question', 'options', 'correctAnswer', 'explanation'],
              },
            },
            complexMultipleChoice: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  variant: { type: Type.STRING },
                  statementLabels: {
                    type: Type.OBJECT,
                    properties: {
                      positive: { type: Type.STRING },
                      negative: { type: Type.STRING },
                      positiveCode: { type: Type.STRING },
                      negativeCode: { type: Type.STRING },
                    },
                  },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        text: { type: Type.STRING },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  correctAnswer: { type: Type.ARRAY, items: { type: Type.STRING } },
                  statements: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        statement: { type: Type.STRING },
                        isCorrect: { type: Type.BOOLEAN },
                      },
                      required: ['statement', 'isCorrect'],
                    },
                  },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['question', 'explanation'],
              },
            },
            matching: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  instruction: { type: Type.STRING },
                  pairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        premise: { type: Type.STRING },
                        match: { type: Type.STRING },
                      },
                      required: ['premise', 'match'],
                    },
                  },
                  distractors: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['instruction', 'pairs', 'explanation'],
              },
            },
            shortAnswer: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['question', 'correctAnswer', 'explanation'],
              },
            },
            essay: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  stimulus: { type: Type.STRING },
                  question: { type: Type.STRING },
                  expectedAnswer: { type: Type.STRING },
                  scoringRubric: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        criteria: { type: Type.STRING },
                        points: { type: Type.NUMBER },
                      },
                      required: ['criteria', 'points'],
                    },
                  },
                  cognitiveLevel: { type: Type.STRING },
                  materialScope: { type: Type.STRING, description: 'Lingkup Materi / Sub-bab spesifik soal ini (bukan nama mapel)' },
                  indicator: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ['question', 'expectedAnswer', 'scoringRubric'],
              },
            },
          },
          required: ['multipleChoice'],
        },
      },
    });

    if (Array.isArray(parsed.complexMultipleChoice)) {
      parsed.complexMultipleChoice = normalizeComplexItemsFromAi(parsed.complexMultipleChoice, pgkStyle);
    }
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error generating from text:', error);
    return res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});

// API endpoint to enrich/populate accurate Lingkup Materi (materialScope) & indicators for Kisi-Kisi
app.post('/api/enrich-kisi-kisi-ai', async (req, res) => {
  try {
    const { examPackage } = req.body || {};
    if (!examPackage || !examPackage.examSummary) {
      return res.status(400).json({
        success: false,
        error: 'Data naskah ujian tidak lengkap.',
      });
    }

    const items: Array<{
      questionType: string;
      questionId: string;
      questionNumber: number;
      stem: string;
      indicator: string;
      cognitiveLevel: string;
    }> = [];

    const collect = (type: string, arr: any[]) => {
      (arr || []).forEach((q) => {
        items.push({
          questionType: type,
          questionId: String(q.id || `${type}-${q.number}`),
          questionNumber: Number(q.number || items.length + 1),
          stem: String(q.question || q.instruction || '').slice(0, 260),
          indicator: String(q.indicator || ''),
          cognitiveLevel: String(q.cognitiveLevel || ''),
        });
      });
    };

    collect('multipleChoice', examPackage.multipleChoice);
    collect('complexMultipleChoice', examPackage.complexMultipleChoice);
    collect('matching', examPackage.matching);
    collect('shortAnswer', examPackage.shortAnswer);
    collect('essay', examPackage.essay);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Naskah belum memiliki butir soal.',
      });
    }

    const ai = getAiClient(req);
    const { subject, grade, schoolLevel, curriculum } = examPackage.examSummary;

    const systemInstruction = `Anda adalah ahli penyusun Kisi-Kisi Asesmen Pendidikan Indonesia (${curriculum}).
Tugas Anda mengisi kolom "Lingkup Materi" (\`materialScope\`) yang AKURAT untuk setiap butir soal.
ATURAN KETAT:
1. \`materialScope\` WAJIB berupa Elemen Capaian Pembelajaran / Bab / Sub-Materi spesifik yang diukur soal (contoh untuk Informatika: "Sistem Komputer: Komponen Hardware & Software", "Perangkat Keras: Peranti Masukan (Input)", "Memori & Penyimpanan (RAM/SSD)").
2. DILARANG hanya menulis nama mata pelajaran ("${subject}").
3. Buat singkat, padat, baku, dan konsisten (2–6 kata).
4. Jika \`indicator\` sudah spesifik dan bagus, pertahankan atau rapikan saja; jika masih kosong/terlalu umum, tulis \`indicator\` operasional (ABCD) yang akurat.`;

    const prompt = `Mata Pelajaran: ${subject} (${schoolLevel} ${grade})
Kurikulum: ${curriculum}

Daftar butir soal (${items.length} soal):
${JSON.stringify(items, null, 2)}

Kembalikan \`items\` berisi \`questionType\`, \`questionId\`, \`questionNumber\`, \`materialScope\`, dan \`indicator\` untuk setiap nomor soal.`;

    const parsed = await generateJsonWithRetry(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionType: { type: Type.STRING },
                  questionId: { type: Type.STRING },
                  questionNumber: { type: Type.INTEGER },
                  materialScope: { type: Type.STRING },
                  indicator: { type: Type.STRING },
                },
                required: ['questionType', 'questionId', 'questionNumber', 'materialScope'],
              },
            },
          },
          required: ['items'],
        },
      },
    });

    return res.json({ success: true, data: parsed.items || [] });
  } catch (error: any) {
    console.error('Error enriching kisi-kisi materialScope:', error);
    return res.status(500).json({
      success: false,
      error: formatAiErrorMessage(error),
    });
  }
});


// Setup Vite development or production serving
async function setupServer() {
  validateAuthConfiguration();
  await initializeDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

setupServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
