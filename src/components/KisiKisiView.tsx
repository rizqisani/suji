import React, { useState } from 'react';
import { ExamPackage, QuestionType } from '../types/exam';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentKopHeader } from './DocumentKopHeader';
import { fetchWithAiGateway } from '../utils/apiHelper';
import {
  getMcVariantBadgeLabel,
  getCmcVariantBadgeLabel,
  resolveQuestionMaterialScope,
} from '../utils/questionHelpers';
import { Sparkles, Edit3, Loader2, AlertCircle } from 'lucide-react';

interface KisiKisiViewProps {
  exam: ExamPackage;
  onOpenPrintModal?: () => void;
  onUpdateExam?: (updated: ExamPackage) => void;
  onNotify?: (msg: string) => void;
}

export const KisiKisiView: React.FC<KisiKisiViewProps> = ({
  exam,
  onOpenPrintModal,
  onUpdateExam,
  onNotify,
}) => {
  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } =
    exam;

  const [isEditing, setIsEditing] = useState(false);
  const [isEnrichingAi, setIsEnrichingAi] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  // Build uniform list of matrix rows
  const matrixRows: {
    no: number;
    questionType: QuestionType;
    questionId: string;
    materi: string;
    indikator: string;
    level: string;
    bentuk: string;
    noSoal: number;
    skor: number;
  }[] = [];

  multipleChoice.forEach((q) => {
    matrixRows.push({
      no: matrixRows.length + 1,
      questionType: 'multipleChoice',
      questionId: q.id,
      materi: resolveQuestionMaterialScope(q, examSummary.subject),
      indikator:
        q.indicator ||
        'Disajikan stimulus atau rumusan pertanyaan, peserta didik dapat menentukan jawaban yang tepat.',
      level: q.cognitiveLevel || 'L2 (Aplikasi)',
      bentuk: getMcVariantBadgeLabel(q),
      noSoal: q.number,
      skor: q.score ?? 2,
    });
  });

  complexMultipleChoice.forEach((q) => {
    matrixRows.push({
      no: matrixRows.length + 1,
      questionType: 'complexMultipleChoice',
      questionId: q.id,
      materi: resolveQuestionMaterialScope(q, examSummary.subject),
      indikator:
        q.indicator ||
        'Peserta didik dapat menganalisis dan menentukan pilihan jawaban yang benar.',
      level: q.cognitiveLevel || 'L3 (Penalaran / HOTS)',
      bentuk: getCmcVariantBadgeLabel(q),
      noSoal: q.number,
      skor: q.score ?? 3,
    });
  });

  matching.forEach((q) => {
    matrixRows.push({
      no: matrixRows.length + 1,
      questionType: 'matching',
      questionId: q.id,
      materi: resolveQuestionMaterialScope(q, examSummary.subject),
      indikator:
        q.indicator ||
        'Peserta didik dapat memasangkan konsep premis dengan respon yang sesuai.',
      level: q.cognitiveLevel || 'L2 (Aplikasi)',
      bentuk: 'Menjodohkan',
      noSoal: q.number,
      skor: q.score ?? 4,
    });
  });

  shortAnswer.forEach((q) => {
    matrixRows.push({
      no: matrixRows.length + 1,
      questionType: 'shortAnswer',
      questionId: q.id,
      materi: resolveQuestionMaterialScope(q, examSummary.subject),
      indikator:
        q.indicator ||
        'Peserta didik dapat melengkapi istilah atau nilai dengan tepat.',
      level: q.cognitiveLevel || 'L1 (Pengetahuan/Pemahaman)',
      bentuk: 'Isian Singkat',
      noSoal: q.number,
      skor: q.score ?? 2,
    });
  });

  essay.forEach((q) => {
    matrixRows.push({
      no: matrixRows.length + 1,
      questionType: 'essay',
      questionId: q.id,
      materi: resolveQuestionMaterialScope(q, examSummary.subject),
      indikator:
        q.indicator ||
        'Disajikan studi kasus kontekstual, peserta didik dapat memecahkan masalah dan merumuskan solusi komprehensif.',
      level: q.cognitiveLevel || 'L3 (Penalaran / HOTS C4-C6)',
      bentuk: 'Uraian / Essay',
      noSoal: q.number,
      skor: q.score ?? 10,
    });
  });

  const handlePatchRow = (
    questionType: QuestionType,
    questionId: string,
    patch: { materialScope?: string; indicator?: string; cognitiveLevel?: string; score?: number }
  ) => {
    if (!onUpdateExam) return;
    const now = new Date().toISOString();
    if (questionType === 'multipleChoice') {
      onUpdateExam({
        ...exam,
        updatedAt: now,
        multipleChoice: multipleChoice.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      });
    } else if (questionType === 'complexMultipleChoice') {
      onUpdateExam({
        ...exam,
        updatedAt: now,
        complexMultipleChoice: complexMultipleChoice.map((q) =>
          q.id === questionId ? { ...q, ...patch } : q
        ),
      });
    } else if (questionType === 'matching') {
      onUpdateExam({
        ...exam,
        updatedAt: now,
        matching: matching.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      });
    } else if (questionType === 'shortAnswer') {
      onUpdateExam({
        ...exam,
        updatedAt: now,
        shortAnswer: shortAnswer.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      });
    } else if (questionType === 'essay') {
      onUpdateExam({
        ...exam,
        updatedAt: now,
        essay: essay.map((q) => (q.id === questionId ? { ...q, ...patch } : q)),
      });
    }
  };

  const handleEnrichMaterialScopeAi = async () => {
    if (!onUpdateExam) return;
    setIsEnrichingAi(true);
    setEnrichError(null);
    try {
      const res = await fetchWithAiGateway('/api/enrich-kisi-kisi-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examPackage: exam }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || `Gagal memperkaya Lingkup Materi (HTTP ${res.status}).`);
      }

      const byKey = new Map<string, { materialScope?: string; indicator?: string }>();
      const byNum = new Map<number, { materialScope?: string; indicator?: string }>();
      json.data.forEach((item: any) => {
        byKey.set(`${item.questionType}:${item.questionId}`, item);
        if (item.questionNumber != null) {
          byNum.set(Number(item.questionNumber), item);
        }
      });

      const applyPatch = <T extends { id: string; number: number; materialScope?: string; indicator?: string }>(
        type: QuestionType,
        arr: T[]
      ): T[] =>
        arr.map((q) => {
          const hit = byKey.get(`${type}:${q.id}`) || byNum.get(Number(q.number));
          if (!hit) return q;
          return {
            ...q,
            ...(hit.materialScope ? { materialScope: String(hit.materialScope).trim() } : {}),
            ...(!q.indicator?.trim() && hit.indicator
              ? { indicator: String(hit.indicator).trim() }
              : {}),
          };
        });

      const updated: ExamPackage = {
        ...exam,
        updatedAt: new Date().toISOString(),
        multipleChoice: applyPatch('multipleChoice', multipleChoice),
        complexMultipleChoice: applyPatch('complexMultipleChoice', complexMultipleChoice),
        matching: applyPatch('matching', matching),
        shortAnswer: applyPatch('shortAnswer', shortAnswer),
        essay: applyPatch('essay', essay),
      };

      onUpdateExam(updated);
      onNotify?.('Lingkup Materi pada Kisi-Kisi berhasil disempurnakan dengan AI!');
    } catch (err: any) {
      setEnrichError(err?.message || 'Gagal menyempurnakan Lingkup Materi dengan AI.');
    } finally {
      setIsEnrichingAi(false);
    }
  };

  const gradeAlreadyHasContext =
    /fase/i.test(examSummary.grade) ||
    (examSummary.schoolLevel &&
      examSummary.grade.toLowerCase().includes(examSummary.schoolLevel.toLowerCase()));
  const gradeLevelDisplay =
    gradeAlreadyHasContext || !examSummary.schoolLevel
      ? examSummary.grade
      : `${examSummary.grade} (${examSummary.schoolLevel})`;

  return (
    <div className="space-y-4">
      <DocumentToolbar
        title="Kisi-Kisi Penulisan Soal (Matrix Standar Kemdikbud)"
        elementId="printable-kisi-kisi"
        docFileName={`Kisi_Kisi_${examSummary.examType}_${examSummary.subject}`}
        docType="kisi-kisi"
        exam={exam}
        onOpenPrintModal={onOpenPrintModal}
      />

      {onUpdateExam && (
        <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-600">
            <strong className="text-slate-800">Lingkup Materi</strong> otomatis disesuaikan dari topik/indikator tiap soal (bukan sekadar nama mata pelajaran).
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isEnrichingAi || matrixRows.length === 0}
              onClick={handleEnrichMaterialScopeAi}
              className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {isEnrichingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-700" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
              )}
              <span>
                {isEnrichingAi ? 'Menyusun Lingkup Materi...' : 'Lengkapi Lingkup Materi (AI)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center space-x-1.5 transition ${
                isEditing
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Selesai Edit' : 'Edit Kisi-Kisi'}</span>
            </button>
          </div>
        </div>
      )}

      {enrichError && (
        <div className="no-print p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{enrichError}</span>
        </div>
      )}

      <div className="print-container bg-slate-200/70 p-2 sm:p-6 rounded-2xl flex justify-center">
        <div
          id="printable-kisi-kisi"
          className="bg-white text-black shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] rounded-sm font-serif border border-slate-300 print:border-none text-[10pt] leading-normal"
        >
          {/* Header Kop Resmi */}
          <DocumentKopHeader kopConfig={kopConfig} className="mb-4" />

          <div className="text-center my-3">
            <h2 className="text-[12.5pt] font-black uppercase tracking-wide">
              KISI-KISI PENULISAN SOAL ASESMEN / UJIAN SEKOLAH
            </h2>
            <div className="text-[10.5pt] font-bold uppercase">
              {examSummary.title} - TAHUN AJARAN {examSummary.academicYear}
            </div>
          </div>

          {/* Tabel Identitas Kisi-Kisi */}
          <table className="w-full border-collapse text-[9.5pt] mb-3">
            <tbody>
              <tr>
                <td className="w-36 font-bold py-0.5">Satuan Pendidikan</td>
                <td>: {kopConfig.schoolName}</td>
                <td className="w-32 font-bold py-0.5">Alokasi Waktu</td>
                <td>: {examSummary.duration}</td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Mata Pelajaran</td>
                <td>: {examSummary.subject}</td>
                <td className="font-bold py-0.5">Jumlah Butir Soal</td>
                <td>: {matrixRows.length} Butir</td>
              </tr>
              <tr>
                <td className="font-bold py-0.5">Kelas / Fase</td>
                <td>: {gradeLevelDisplay}</td>
                <td className="font-bold py-0.5">Kurikulum Acuan</td>
                <td>: {examSummary.curriculum}</td>
              </tr>
            </tbody>
          </table>

          {/* Tabel Matriks Kisi-Kisi */}
          <table className="w-full border-collapse border border-black text-[9pt]">
            <thead>
              <tr className="bg-slate-100 font-bold text-center">
                <th className="border border-black p-1.5 w-8">No</th>
                <th className="border border-black p-1.5 w-36 text-left">Lingkup Materi</th>
                <th className="border border-black p-1.5 text-left">Indikator Pencapaian Kompetensi / Soal</th>
                <th className="border border-black p-1.5 w-20">Level Kognitif</th>
                <th className="border border-black p-1.5 w-24">Bentuk Soal</th>
                <th className="border border-black p-1.5 w-12">No. Soal</th>
                <th className="border border-black p-1.5 w-10">Skor</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={`${row.questionType}-${row.questionId}`} className="break-inside-avoid">
                  <td className="border border-black p-1.5 text-center font-bold">{row.no}</td>
                  <td className="border border-black p-1.5 font-medium">
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={row.materi}
                        onChange={(e) =>
                          handlePatchRow(row.questionType, row.questionId, {
                            materialScope: e.target.value,
                          })
                        }
                        className="no-print w-full text-[8.5pt] p-1 border border-slate-300 rounded font-serif bg-white"
                      />
                    ) : (
                      row.materi
                    )}
                  </td>
                  <td className="border border-black p-1.5 leading-relaxed text-justify">
                    {isEditing ? (
                      <textarea
                        rows={2}
                        value={row.indikator}
                        onChange={(e) =>
                          handlePatchRow(row.questionType, row.questionId, {
                            indicator: e.target.value,
                          })
                        }
                        className="no-print w-full text-[8.5pt] p-1 border border-slate-300 rounded font-serif bg-white"
                      />
                    ) : (
                      row.indikator
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center font-sans text-[8.5pt]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.level}
                        onChange={(e) =>
                          handlePatchRow(row.questionType, row.questionId, {
                            cognitiveLevel: e.target.value,
                          })
                        }
                        className="no-print w-full text-[8.5pt] p-1 border border-slate-300 rounded text-center bg-white"
                      />
                    ) : (
                      row.level
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center">{row.bentuk}</td>
                  <td className="border border-black p-1.5 text-center font-bold">{row.noSoal}</td>
                  <td className="border border-black p-1.5 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        min={0}
                        value={row.skor}
                        onChange={(e) =>
                          handlePatchRow(row.questionType, row.questionId, {
                            score: Number(e.target.value) || 0,
                          })
                        }
                        className="no-print w-12 text-[8.5pt] p-1 border border-slate-300 rounded text-center bg-white"
                      />
                    ) : (
                      row.skor
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pengesahan */}
          <div className="mt-8 pt-4 border-t border-black break-inside-avoid">
            <div className="flex justify-between items-start text-center text-[10pt]">
              <div className="w-[45%]">
                <div>Mengetahui,</div>
                <div className="font-bold">Kepala Sekolah</div>
                <div className="h-14"></div>
                <div className="font-bold underline uppercase">{kopConfig.headmasterName || '........................................'}</div>
                {kopConfig.headmasterNip?.trim() && <div>NIP. {kopConfig.headmasterNip}</div>}
              </div>

              <div className="w-[45%]">
                <div>{kopConfig.cityDate?.trim() || '........................, ..............................'}</div>
                <div className="font-bold">Penyusun Kisi-Kisi / Guru Mapel</div>
                <div className="h-14"></div>
                <div className="font-bold underline uppercase">{kopConfig.teacherName || '........................................'}</div>
                {kopConfig.teacherNip?.trim() && <div>NIP. {kopConfig.teacherNip}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
