import React, { useState, useRef } from 'react';
import { ExamPackage } from '../types/exam';
import {
  buildAnswerKeyJsonPayload,
  applyAnswerKeyJsonToExam,
} from '../utils/answerKeyImporter';
import {
  X,
  Upload,
  Download,
  FileJson,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  HelpCircle,
  ClipboardPaste,
} from 'lucide-react';

interface AnswerKeyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamPackage;
  onApplyUpdatedExam: (updated: ExamPackage, message: string) => void;
}

export const AnswerKeyImportModal: React.FC<AnswerKeyImportModalProps> = ({
  isOpen,
  onClose,
  exam,
  onApplyUpdatedExam,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showSchemaGuide, setShowSchemaGuide] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleDownloadCurrentKeyJson = () => {
    const payload = buildAnswerKeyJsonPayload(exam);
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const safeSubj = (exam.examSummary.subject || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `Kunci_Pembahasan_${exam.examSummary.examType}_${safeSubj}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFillTemplateToTextarea = () => {
    const payload = buildAnswerKeyJsonPayload(exam);
    setJsonText(JSON.stringify(payload, null, 2));
    setStatus(null);
  };

  const processJsonContent = (content: string) => {
    setStatus(null);
    const result = applyAnswerKeyJsonToExam(exam, content);
    if (result.success && result.updatedExam) {
      const msg = result.message || 'Kunci jawaban dan pembahasan berhasil diimpor!';
      setStatus({ type: 'success', message: msg });
      onApplyUpdatedExam(result.updatedExam, msg);
    } else {
      setStatus({
        type: 'error',
        message: result.error || 'Gagal mengimpor JSON kunci jawaban.',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setJsonText(text);
      processJsonContent(text);
    };
    reader.onerror = () => {
      setStatus({ type: 'error', message: 'Gagal membaca berkas JSON.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result || '');
      setJsonText(text);
      processJsonContent(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-900 via-blue-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <KeyRound className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Impor JSON Kunci Jawaban &amp; Pembahasan</h2>
              <p className="text-xs text-blue-200">
                Memperbarui kunci, level kognitif, dan pembahasan untuk: {exam.examSummary.subject} ({exam.examSummary.grade})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {status && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 ${
                status.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{status.message}</span>
            </div>
          )}

          {/* Template & Export Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-slate-600 font-medium">
              Butuh acuan format sesuai nomor soal naskah ini?
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCurrentKeyJson}
                className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 font-bold flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template JSON Kunci</span>
              </button>
              <button
                type="button"
                onClick={handleFillTemplateToTextarea}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center space-x-1.5 transition"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Muat ke Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSchemaGuide((v) => !v)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center space-x-1 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>{showSchemaGuide ? 'Tutup Panduan' : 'Format JSON'}</span>
              </button>
            </div>
          </div>

          {showSchemaGuide && (
            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 overflow-y-auto space-y-2">
              <div className="text-amber-300 font-sans font-bold text-xs">
                Struktur JSON Kunci Jawaban &amp; Pembahasan (Sesuai Tab Kunci Jawaban):
              </div>
              <pre className="leading-relaxed whitespace-pre">{`{
  "format": "SI-UJIAN-KUNCI-PEMBAHASAN-V1",
  "kunciPilihanGanda": [
    { "nomor": 1, "kunci": "A", "levelKognitif": "L2", "pembahasan": "Penjelasan konsep..." }
  ],
  "kunciPilihanGandaKompleks": [
    { "nomor": 11, "tipe": "multi_select", "kunci": ["A", "C"], "pembahasan": "..." },
    { "nomor": 12, "tipe": "benar_salah", "pernyataan": [{ "indeks": 1, "jawaban": true }], "pembahasan": "..." }
  ],
  "kunciMenjodohkan": [
    { "nomor": 16, "pasangan": [{ "premis": "...", "pasangan": "..." }], "pembahasan": "..." }
  ],
  "kunciIsianSingkat": [
    { "nomor": 18, "kunci": "CPU", "variasiDiterima": ["Processor"], "pembahasan": "..." }
  ],
  "kunciUraian": [
    { "nomor": 21, "ekspektasiJawaban": "Jawaban lengkap...", "rubrik": [{ "kriteria": "...", "poin": 5 }] }
  ]
}`}</pre>
              <div className="text-slate-300 font-sans text-[10.5px]">
                *Juga mendukung format ringkas seperti <code>{`{ "1": "A", "2": { "kunci": "C", "pembahasan": "..." } }`}</code> atau array datar <code>{`[{ "nomor": 1, "kunci": "A", "pembahasan": "..." }]`}</code>.
              </div>
            </div>
          )}

          {/* Drag & Drop File Upload */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center space-y-1.5">
              <div className="p-2 rounded-full bg-indigo-100 text-indigo-700">
                <Upload className="w-4 h-4" />
              </div>
              <div className="font-bold text-slate-800">
                Klik untuk memilih berkas JSON atau seret ke area ini
              </div>
              <div className="text-[11px] text-slate-500">
                Format yang didukung: <code>.json</code> (Kunci &amp; Pembahasan SI-UJIAN, array nomor, atau map nomor:kunci)
              </div>
            </div>
          </div>

          {/* Direct Paste Editor */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <FileJson className="w-3.5 h-3.5 text-indigo-600" />
              <span>Atau tempel (paste) teks JSON Kunci Jawaban &amp; Pembahasan di sini:</span>
            </label>
            <textarea
              rows={7}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Tempel JSON kunci jawaban & pembahasan di sini, lalu klik "Terapkan Kunci & Pembahasan"...'
              className="w-full font-mono text-[11px] p-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => processJsonContent(jsonText)}
              disabled={!jsonText.trim()}
              className="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-300" />
              <span>Terapkan Kunci &amp; Pembahasan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
