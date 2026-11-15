import React, { useState } from 'react';
import { ExamPackage, SchoolKopConfig } from '../types/exam';
import { FileText, Sparkles, X, AlertCircle } from 'lucide-react';
import { DEFAULT_GENERAL_INSTRUCTIONS } from '../data/curriculumData';
import { fetchWithAiGateway, parseApiResponse } from '../utils/apiHelper';

interface TextToExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  kopConfig: SchoolKopConfig;
  onExamGenerated: (exam: ExamPackage) => void;
}

export const TextToExamModal: React.FC<TextToExamModalProps> = ({
  isOpen,
  onClose,
  kopConfig,
  onExamGenerated,
}) => {
  const [rawText, setRawText] = useState('');
  const [subject, setSubject] = useState('Bahasa Indonesia');
  const [grade, setGrade] = useState('Kelas VIII');
  const [examType, setExamType] = useState('PSAS');
  const [mcCount, setMcCount] = useState(8);
  const [complexMcCount, setComplexMcCount] = useState(2);
  const [matchingCount, setMatchingCount] = useState(1);
  const [shortAnswerCount, setShortAnswerCount] = useState(2);
  const [essayCount, setEssayCount] = useState(1);
  const [pgStyle, setPgStyle] = useState<'standard' | 'with_tf' | 'with_association' | 'mixed'>('standard');
  const [pgkStyle, setPgkStyle] = useState<'mixed' | 'multi_select' | 'benar_salah' | 'true_false' | 'ya_tidak'>('mixed');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim().length < 40) {
      setErrorMessage('Mohon tempelkan teks materi atau rangkuman yang lebih lengkap (minimal 40 karakter).');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetchWithAiGateway('/api/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText,
          subject,
          grade,
          examType,
          questionCounts: {
            multipleChoice: Number(mcCount) || 0,
            complexMultipleChoice: Number(complexMcCount) || 0,
            matching: Number(matchingCount) || 0,
            shortAnswer: Number(shortAnswerCount) || 0,
            essay: Number(essayCount) || 0,
          },
          pgStyle,
          pgkStyle,
        }),
      });

      const result = await parseApiResponse<{ success: boolean; data: any; error?: string }>(response);
      const generatedData = result.data;

      const mcList = (generatedData.multipleChoice || []).map((q: any, i: number) => ({
        ...q,
        id: `mc-txt-${i + 1}-${Date.now()}`,
        number: i + 1,
      }));
      const cmcList = (generatedData.complexMultipleChoice || []).map((q: any, i: number) => ({
        ...q,
        id: `cmc-txt-${i + 1}-${Date.now()}`,
        number: mcList.length + i + 1,
      }));
      const mList = (generatedData.matching || []).map((q: any, i: number) => ({
        ...q,
        id: `m-txt-${i + 1}-${Date.now()}`,
        number: mcList.length + cmcList.length + i + 1,
      }));
      const saList = (generatedData.shortAnswer || []).map((q: any, i: number) => ({
        ...q,
        id: `sa-txt-${i + 1}-${Date.now()}`,
        number: mcList.length + cmcList.length + mList.length + i + 1,
      }));
      const esList = (generatedData.essay || []).map((q: any, i: number) => ({
        ...q,
        id: `es-txt-${i + 1}-${Date.now()}`,
        number: mcList.length + cmcList.length + mList.length + saList.length + i + 1,
      }));

      const rawPts = {
        mc: mcList.length * 1,
        cmc: cmcList.length * 2,
        m: mList.length * 3,
        sa: saList.length * 2,
        es: esList.length * 5,
      };
      const totalPts = rawPts.mc + rawPts.cmc + rawPts.m + rawPts.sa + rawPts.es || 1;
      const mcWeight = Math.round((rawPts.mc / totalPts) * 100);
      const complexMcWeight = Math.round((rawPts.cmc / totalPts) * 100);
      const matchingWeight = Math.round((rawPts.m / totalPts) * 100);
      const shortAnswerWeight = Math.round((rawPts.sa / totalPts) * 100);
      const essayWeight = Math.max(0, 100 - (mcWeight + complexMcWeight + matchingWeight + shortAnswerWeight));

      const newPackage: ExamPackage = {
        id: `exam-text-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kopConfig,
        examSummary: {
          title: `PENILAIAN SUMATIF (${examType}) - ${subject.toUpperCase()}`,
          examType: (examType as any) || 'PSAS',
          schoolLevel: 'SMP',
          grade,
          subject,
          curriculum: 'Kurikulum Merdeka',
          academicYear: '2024/2025',
          semester: 'Ganjil',
          duration: '60 Menit',
          generalInstructions: DEFAULT_GENERAL_INSTRUCTIONS,
        },
        multipleChoice: mcList,
        complexMultipleChoice: cmcList,
        matching: mList,
        shortAnswer: saList,
        essay: esList,
        scoringGuidelines: {
          mcWeight,
          complexMcWeight,
          matchingWeight,
          shortAnswerWeight,
          essayWeight,
          formula: 'Nilai Akhir = (Skor Perolehan / Total Skor Maksimal) x 100',
        },
      };

      onExamGenerated(newPackage);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat naskah dari materi teks.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Buat Soal dari Teks Materi / Modul Ajar</h2>
              <p className="text-xs text-emerald-100">
                Tempel artikel, bab buku, atau catatan guru; AI akan otomatis mengekstrak berbagai bentuk soal ujian
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kelas / Tingkat</label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Asesmen</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="PSAS">PSAS (Penilaian Sumatif Akhir Semester)</option>
                <option value="STS">STS (Sumatif Tengah Sem.)</option>
                <option value="UH">UH (Ulangan Harian / Kuis)</option>
                <option value="PSAJ">PSAJ (Akhir Jenjang)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tempelkan Teks Materi / Rangkuman Bab / Wacana di Sini: <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              required
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Contoh: Rangkuman materi Tata Surya, atau paragraf tentang Teks Eksplanasi, atau cuplikan modul ajar..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Pilihan Ganda</label>
              <input
                type="number"
                min={0}
                max={25}
                value={mcCount}
                onChange={(e) => setMcCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">PG Kompleks</label>
              <input
                type="number"
                min={0}
                max={10}
                value={complexMcCount}
                onChange={(e) => setComplexMcCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Menjodohkan</label>
              <input
                type="number"
                min={0}
                max={5}
                value={matchingCount}
                onChange={(e) => setMatchingCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Isian Singkat</label>
              <input
                type="number"
                min={0}
                max={10}
                value={shortAnswerCount}
                onChange={(e) => setShortAnswerCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Uraian / Essay</label>
              <input
                type="number"
                min={0}
                max={5}
                value={essayCount}
                onChange={(e) => setEssayCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-xs font-bold p-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Variasi Pilihan Ganda</label>
              <select
                value={pgStyle}
                onChange={(e) => setPgStyle(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="standard">Standar (1 Jawaban Benar)</option>
                <option value="with_tf">Campuran PG + True/False (T/F)</option>
                <option value="with_association">Campuran PG + Asosiasi/Sebab-Akibat</option>
                <option value="mixed">Lengkap (Standar, T/F, Asosiasi)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Format PG Kompleks</label>
              <select
                value={pgkStyle}
                onChange={(e) => setPgkStyle(e.target.value as any)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="mixed">Campuran (Multi-Pilih & Tabel B/S / T/F)</option>
                <option value="multi_select">Multi-Pilih Centang (Lebih dari 1 Jawaban)</option>
                <option value="benar_salah">Tabel Benar / Salah (B/S)</option>
                <option value="true_false">Tabel True / False (T/F)</option>
                <option value="ya_tidak">Tabel Ya / Tidak</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm flex items-center space-x-2 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{isLoading ? 'Sedang Memproses Materi...' : 'Konversi Jadi Naskah Ujian'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
