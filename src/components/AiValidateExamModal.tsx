import React, { useState, useEffect, useMemo } from 'react';
import {
  ExamPackage,
  QuestionType,
  MultipleChoiceQuestion,
  ComplexMultipleChoiceItem,
  MatchingQuestion,
  ShortAnswerQuestion,
  EssayQuestion,
} from '../types/exam';
import {
  ExamValidationReport,
  QuestionValidationReport,
  ValidationIssueCategory,
} from '../types/examValidation';
import { EditableQuestionItem } from './AiEditQuestionModal';
import { fetchWithAiGateway } from '../utils/apiHelper';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  Wand2,
  Sparkles,
  Layers,
  Filter,
  ArrowRight,
} from 'lucide-react';

interface AiValidateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamPackage;
  onUpdateExam: (updated: ExamPackage) => void;
  onOpenCustomEditAi: (target: EditableQuestionItem, presetInstruction?: string) => void;
}

const CATEGORY_META: Record<
  ValidationIssueCategory | string,
  { label: string; className: string }
> = {
  double_key: {
    label: 'Potensi Kunci Ganda / Ambigu',
    className: 'bg-rose-100 text-rose-900 border-rose-300',
  },
  key_error: {
    label: 'Kesalahan Kunci Jawaban',
    className: 'bg-red-100 text-red-900 border-red-300',
  },
  hallucination: {
    label: 'Indikasi Halusinasi / Fakta Keliru',
    className: 'bg-purple-100 text-purple-900 border-purple-300',
  },
  redundancy: {
    label: 'Redundan / Double Pengukuran',
    className: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  clue_leakage: {
    label: 'Bocor Clue Antar Soal',
    className: 'bg-orange-100 text-orange-900 border-orange-300',
  },
  bias: {
    label: 'Indikasi Bias',
    className: 'bg-pink-100 text-pink-900 border-pink-300',
  },
  out_of_context: {
    label: 'Tidak Sesuai Konteks Mapel/Jenjang',
    className: 'bg-sky-100 text-sky-900 border-sky-300',
  },
  cognitive_mismatch: {
    label: 'Level Kognitif Tidak Sesuai',
    className: 'bg-indigo-100 text-indigo-900 border-indigo-300',
  },
  construction: {
    label: 'Konstruksi Soal Lemah',
    className: 'bg-slate-200 text-slate-800 border-slate-300',
  },
  language: {
    label: 'Bahasa / Redaksi EYD',
    className: 'bg-teal-100 text-teal-900 border-teal-300',
  },
};

const TYPE_BADGE: Record<QuestionType, string> = {
  multipleChoice: 'PG',
  complexMultipleChoice: 'PG Kompleks',
  matching: 'Menjodohkan',
  shortAnswer: 'Isian Singkat',
  essay: 'Uraian',
};

function findQuestionItem(
  exam: ExamPackage,
  type: QuestionType,
  id: string,
  number: number
): EditableQuestionItem | null {
  if (type === 'multipleChoice') {
    const found =
      exam.multipleChoice.find((q) => q.id === id) ||
      exam.multipleChoice.find((q) => q.number === number);
    return found ? { type: 'multipleChoice', item: found as MultipleChoiceQuestion } : null;
  }
  if (type === 'complexMultipleChoice') {
    const found =
      exam.complexMultipleChoice.find((q) => q.id === id) ||
      exam.complexMultipleChoice.find((q) => q.number === number);
    return found ? { type: 'complexMultipleChoice', item: found as ComplexMultipleChoiceItem } : null;
  }
  if (type === 'matching') {
    const found =
      exam.matching.find((q) => q.id === id) || exam.matching.find((q) => q.number === number);
    return found ? { type: 'matching', item: found as MatchingQuestion } : null;
  }
  if (type === 'shortAnswer') {
    const found =
      exam.shortAnswer.find((q) => q.id === id) ||
      exam.shortAnswer.find((q) => q.number === number);
    return found ? { type: 'shortAnswer', item: found as ShortAnswerQuestion } : null;
  }
  const found = exam.essay.find((q) => q.id === id) || exam.essay.find((q) => q.number === number);
  return found ? { type: 'essay', item: found as EssayQuestion } : null;
}

function getStemPreview(target: EditableQuestionItem | null): string {
  if (!target) return '';
  if (target.type === 'matching') return target.item.instruction || '';
  return target.item.question || '';
}

function buildFixInstructionFromReport(itemReport: QuestionValidationReport): string {
  const details = itemReport.issues
    .map(
      (iss, i) =>
        `${i + 1}. [${iss.title}] ${iss.detail} -> Saran perbaikan: ${iss.fixSuggestion}`
    )
    .join('\n');
  return `Perbaiki butir soal ini agar 100% VALID sesuai standar mutu terkini (pastikan tidak ada kunci ganda pada PG tunggal, bebas halusinasi/kesalahan fakta, bebas bias, tidak redundan, serta sesuai mapel, jenjang, dan level kognitif):\n${details}`;
}

export const AiValidateExamModal: React.FC<AiValidateExamModalProps> = ({
  isOpen,
  onClose,
  exam,
  onUpdateExam,
  onOpenCustomEditAi,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ExamValidationReport | null>(null);
  const [filterMode, setFilterMode] = useState<'issues' | 'all' | 'critical' | 'valid'>('issues');
  const [fixingKeys, setFixingKeys] = useState<Record<string, boolean>>({});
  const [fixedKeys, setFixedKeys] = useState<Record<string, boolean>>({});
  const [batchProgress, setBatchProgress] = useState<{
    running: boolean;
    done: number;
    total: number;
  }>({ running: false, done: 0, total: 0 });

  const runFullAudit = async (examToAudit: ExamPackage = exam) => {
    setIsAuditing(true);
    setError(null);
    setFixedKeys({});
    try {
      const res = await fetchWithAiGateway('/api/validate-exam-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examPackage: examToAudit }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Gagal mengaudit naskah (HTTP ${res.status}).`);
      }
      const auditData = json.data as ExamValidationReport;
      setReport(auditData);
      if (auditData.criticalCount + auditData.warningCount > 0) {
        setFilterMode('issues');
      } else {
        setFilterMode('all');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menjalankan validasi AI menyeluruh.');
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setReport(null);
      setFixedKeys({});
      setFixingKeys({});
      setBatchProgress({ running: false, done: 0, total: 0 });
      runFullAudit(exam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exam.id]);

  const applySingleRevisedItem = (
    baseExam: ExamPackage,
    type: QuestionType,
    revisedItem: any
  ): ExamPackage => {
    const now = new Date().toISOString();
    if (type === 'multipleChoice') {
      return {
        ...baseExam,
        updatedAt: now,
        multipleChoice: baseExam.multipleChoice.map((q) =>
          q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
        ),
      };
    }
    if (type === 'complexMultipleChoice') {
      return {
        ...baseExam,
        updatedAt: now,
        complexMultipleChoice: baseExam.complexMultipleChoice.map((q) =>
          q.id === revisedItem.id ? { ...revisedItem, id: q.id, number: q.number } : q
        ),
      };
    }
    if (type === 'matching') {
      return {
        ...baseExam,
        updatedAt: now,
        matching: baseExam.matching.map((q) =>
          q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
        ),
      };
    }
    if (type === 'shortAnswer') {
      return {
        ...baseExam,
        updatedAt: now,
        shortAnswer: baseExam.shortAnswer.map((q) =>
          q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
        ),
      };
    }
    return {
      ...baseExam,
      updatedAt: now,
      essay: baseExam.essay.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      ),
    };
  };

  const requestAiRepair = async (
    currentExamState: ExamPackage,
    itemReport: QuestionValidationReport
  ) => {
    const found = findQuestionItem(
      currentExamState,
      itemReport.questionType,
      itemReport.questionId,
      itemReport.questionNumber
    );
    if (!found) {
      throw new Error(`Butir soal No. ${itemReport.questionNumber} tidak ditemukan.`);
    }

    const instruction = buildFixInstructionFromReport(itemReport);
    const res = await fetchWithAiGateway('/api/edit-question-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionType: found.type,
        questionData: found.item,
        instruction,
        subject: currentExamState.examSummary.subject,
        grade: currentExamState.examSummary.grade,
        curriculum: currentExamState.examSummary.curriculum,
        examType: currentExamState.examSummary.examType,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success || !json.data) {
      throw new Error(json.error || `Gagal memperbaiki soal No. ${itemReport.questionNumber}.`);
    }
    return { type: found.type, revisedItem: json.data };
  };

  const handleAutoFixOne = async (itemReport: QuestionValidationReport) => {
    const key = `${itemReport.questionType}:${itemReport.questionId}`;
    setFixingKeys((prev) => ({ ...prev, [key]: true }));
    setError(null);
    try {
      const { type, revisedItem } = await requestAiRepair(exam, itemReport);
      const nextExam = applySingleRevisedItem(exam, type, revisedItem);
      onUpdateExam(nextExam);
      setFixedKeys((prev) => ({ ...prev, [key]: true }));
    } catch (err: any) {
      setError(err?.message || `Gagal memperbaiki soal No. ${itemReport.questionNumber}.`);
    } finally {
      setFixingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const pendingProblemItems = useMemo(() => {
    if (!report) return [];
    return report.itemReports.filter((r) => {
      const key = `${r.questionType}:${r.questionId}`;
      return r.status !== 'valid' && !fixedKeys[key];
    });
  }, [report, fixedKeys]);

  const handleAutoFixAll = async () => {
    if (pendingProblemItems.length === 0) return;
    setError(null);
    setBatchProgress({ running: true, done: 0, total: pendingProblemItems.length });
    let workingExam = exam;
    let doneCount = 0;

    for (const itemReport of pendingProblemItems) {
      const key = `${itemReport.questionType}:${itemReport.questionId}`;
      setFixingKeys((prev) => ({ ...prev, [key]: true }));
      try {
        const { type, revisedItem } = await requestAiRepair(workingExam, itemReport);
        workingExam = applySingleRevisedItem(workingExam, type, revisedItem);
        onUpdateExam(workingExam);
        setFixedKeys((prev) => ({ ...prev, [key]: true }));
      } catch (err: any) {
        setError(
          err?.message || `Sebagian soal gagal diperbaiki otomatis (No. ${itemReport.questionNumber}).`
        );
      } finally {
        setFixingKeys((prev) => ({ ...prev, [key]: false }));
        doneCount++;
        setBatchProgress({
          running: true,
          done: doneCount,
          total: pendingProblemItems.length,
        });
      }
    }

    setBatchProgress({ running: false, done: doneCount, total: pendingProblemItems.length });
  };

  const displayedItems = useMemo(() => {
    if (!report) return [];
    return report.itemReports.filter((item) => {
      const key = `${item.questionType}:${item.questionId}`;
      const isFixed = Boolean(fixedKeys[key]);
      if (filterMode === 'issues') return item.status !== 'valid' || isFixed;
      if (filterMode === 'critical') return item.status === 'critical_error' && !isFixed;
      if (filterMode === 'valid') return item.status === 'valid' || isFixed;
      return true;
    });
  }, [report, filterMode, fixedKeys]);

  if (!isOpen) return null;

  const scoreColor =
    (report?.overallScore ?? 0) >= 85
      ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
      : (report?.overallScore ?? 0) >= 65
      ? 'text-amber-700 bg-amber-50 border-amber-300'
      : 'text-rose-700 bg-rose-50 border-rose-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-blue-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Validasi & Audit Mutu Naskah Menyeluruh (AI)
              </h2>
              <p className="text-xs text-blue-200">
                Standar Mutu Asesmen Terkini · Anti-Kunci Ganda, Anti-Halu, Anti-Redundansi, Anti-Bias & Kesesuaian Konteks
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isAuditing || batchProgress.running}
              onClick={() => runFullAudit(exam)}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>Audit Ulang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 bg-slate-50/70">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {isAuditing && (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
              <Loader2 className="w-10 h-10 text-indigo-700 animate-spin" />
              <div className="text-sm font-bold text-slate-900">
                AI Sedang Mengaudit Seluruh Butir Soal...
              </div>
              <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                Memeriksa kesesuaian materi {exam.examSummary.subject} ({exam.examSummary.grade}),
                mendeteksi potensi kunci ganda pada PG tunggal, indikasi halusinasi/fakta keliru,
                soal redundan/double pengukuran, kebocoran clue antar nomor, serta bias bahasa.
              </p>
            </div>
          )}

          {!isAuditing && report && (
            <>
              {/* Score & Dimension Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className={`lg:col-span-4 rounded-2xl border p-4 flex flex-col justify-between ${scoreColor}`}>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                      Skor Validitas Naskah
                    </div>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span className="text-4xl font-black">{report.overallScore}</span>
                      <span className="text-sm font-bold opacity-75">/ 100</span>
                    </div>
                    <div className="mt-1.5 inline-block px-2.5 py-0.5 rounded-md bg-white/80 font-bold text-[11px] border border-current/20">
                      {report.qualityGrade}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-current/15 text-center">
                    <div className="bg-white/75 rounded-lg p-1.5">
                      <div className="text-base font-black text-rose-700">{report.criticalCount}</div>
                      <div className="text-[10px] font-semibold text-slate-700">Kritis</div>
                    </div>
                    <div className="bg-white/75 rounded-lg p-1.5">
                      <div className="text-base font-black text-amber-700">{report.warningCount}</div>
                      <div className="text-[10px] font-semibold text-slate-700">Perlu Revisi</div>
                    </div>
                    <div className="bg-white/75 rounded-lg p-1.5">
                      <div className="text-base font-black text-emerald-700">{report.validCount}</div>
                      <div className="text-[10px] font-semibold text-slate-700">Valid</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                  <div>
                    <div className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-1">
                      Ringkasan Reviewer Mutu AI
                    </div>
                    <p className="text-slate-700 leading-relaxed">{report.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                    {[
                      { label: 'Validitas Isi & Konteks', val: report.dimensionScores.contentValidity },
                      { label: 'Validitas Konstruk & Kognitif', val: report.dimensionScores.constructValidity },
                      { label: 'Integritas Kunci & Anti-Kunci Ganda', val: report.dimensionScores.keyAndDistractorIntegrity },
                      { label: 'Bebas Bias & Bahasa EYD V', val: report.dimensionScores.languageAndBias },
                      { label: 'Anti-Redundansi / Double Pengukuran', val: report.dimensionScores.antiRedundancy },
                    ].map((dim) => (
                      <div key={dim.label} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>{dim.label}</span>
                          <span className="font-bold">{Math.round(dim.val)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              dim.val >= 85
                                ? 'bg-emerald-500'
                                : dim.val >= 65
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(4, Math.min(100, dim.val))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Batch Auto-Fix Banner */}
              {pendingProblemItems.length > 0 && (
                <div className="bg-indigo-950 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        Ditemukan {pendingProblemItems.length} butir soal yang perlu diperbaiki agar valid
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200">
                      Anda dapat memperbaiki satu per satu atau menjalankan perbaikan AI otomatis untuk seluruh soal bermasalah.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={batchProgress.running}
                    onClick={handleAutoFixAll}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center space-x-2 shadow-sm transition disabled:opacity-60"
                  >
                    {batchProgress.running ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          Memperbaiki {batchProgress.done}/{batchProgress.total}...
                        </span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Perbaiki Semua Otomatis ({pendingProblemItems.length} Soal)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {pendingProblemItems.length === 0 && Object.keys(fixedKeys).length > 0 && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Semua butir bermasalah telah diperbarui! Klik <strong>Audit Ulang</strong> untuk memverifikasi skor mutu terbaru.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => runFullAudit(exam)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Audit Ulang Sekarang</span>
                  </button>
                </div>
              )}

              {/* Cross-Question Holistic Findings */}
              {report.crossQuestionFindings.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center space-x-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    <span>Analisis Lintas Soal (Redundansi, Bocor Clue & Keseimbangan Tes)</span>
                  </div>
                  <div className="space-y-2">
                    {report.crossQuestionFindings.map((cf, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border ${
                          cf.severity === 'critical'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : cf.severity === 'warning'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-xs">{cf.title}</span>
                          {cf.affectedNumbers.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white/90 border border-current/20 font-bold text-[10px]">
                              Terkait Soal No. {cf.affectedNumbers.join(', ')}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] opacity-90">{cf.description}</p>
                        <div className="mt-1.5 text-[11px] font-semibold flex items-start space-x-1">
                          <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Rekomendasi: {cf.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Tabs for Per-Question Reports */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Rincian Audit Per Butir Soal ({report.itemReports.length} Soal):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      id: 'issues' as const,
                      label: `Bermasalah (${report.criticalCount + report.warningCount})`,
                    },
                    { id: 'critical' as const, label: `Kritis (${report.criticalCount})` },
                    { id: 'valid' as const, label: `Valid (${report.validCount})` },
                    { id: 'all' as const, label: `Semua (${report.itemReports.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterMode(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        filterMode === tab.id
                          ? 'bg-indigo-700 text-white border-indigo-800'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-Question Cards */}
              <div className="space-y-3">
                {displayedItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-600">
                    Tidak ada butir soal pada kategori filter ini.
                  </div>
                ) : (
                  displayedItems.map((itemReport) => {
                    const key = `${itemReport.questionType}:${itemReport.questionId}`;
                    const isFixing = Boolean(fixingKeys[key]);
                    const isFixed = Boolean(fixedKeys[key]);
                    const liveTarget = findQuestionItem(
                      exam,
                      itemReport.questionType,
                      itemReport.questionId,
                      itemReport.questionNumber
                    );
                    const stemPreview = getStemPreview(liveTarget);

                    return (
                      <div
                        key={key}
                        className={`bg-white rounded-2xl border p-4 space-y-2.5 shadow-2xs ${
                          isFixed
                            ? 'border-emerald-300 bg-emerald-50/20'
                            : itemReport.status === 'critical_error'
                            ? 'border-rose-300'
                            : itemReport.status === 'needs_revision'
                            ? 'border-amber-300'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[11px]">
                              No. {itemReport.questionNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                              {TYPE_BADGE[itemReport.questionType] || itemReport.questionType}
                            </span>
                            {isFixed ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-300 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Sudah Diperbaiki AI</span>
                              </span>
                            ) : itemReport.status === 'critical_error' ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold text-[10px] border border-rose-300 flex items-center space-x-1">
                                <ShieldAlert className="w-3 h-3" />
                                <span>Kesalahan Kritis</span>
                              </span>
                            ) : itemReport.status === 'needs_revision' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300 flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Perlu Penyempurnaan</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Valid</span>
                              </span>
                            )}
                          </div>

                          {liveTarget && (itemReport.status !== 'valid' || isFixed) && (
                            <div className="flex items-center space-x-1.5">
                              {!isFixed && (
                                <button
                                  type="button"
                                  disabled={isFixing || batchProgress.running}
                                  onClick={() => handleAutoFixOne(itemReport)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-[11px] flex items-center space-x-1 shadow-2xs disabled:opacity-50"
                                >
                                  {isFixing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Wand2 className="w-3 h-3 text-amber-300" />
                                  )}
                                  <span>
                                    {isFixing ? 'Memperbaiki...' : 'Perbaiki Otomatis (AI)'}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const instr =
                                    itemReport.issues.length > 0
                                      ? buildFixInstructionFromReport(itemReport)
                                      : '';
                                  onOpenCustomEditAi(liveTarget, instr);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-[11px]"
                              >
                                Tinjau / Edit AI
                              </button>
                            </div>
                          )}
                        </div>

                        {stemPreview && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/80 line-clamp-2">
                            {stemPreview}
                          </div>
                        )}

                        {itemReport.issues.length > 0 && !isFixed && (
                          <div className="space-y-2 pt-1">
                            {itemReport.issues.map((issue, idx) => {
                              const catMeta = CATEGORY_META[issue.category] || {
                                label: issue.category,
                                className: 'bg-slate-100 text-slate-800 border-slate-300',
                              };
                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1"
                                >
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catMeta.className}`}
                                    >
                                      {catMeta.label}
                                    </span>
                                    <span className="font-bold text-slate-900 text-[11px]">
                                      {issue.title}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-700 leading-relaxed">
                                    {issue.detail}
                                  </p>
                                  <p className="text-[11px] text-indigo-900 font-semibold">
                                    Saran perbaikan: {issue.fixSuggestion}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Perubahan otomatis tersimpan ke naskah, kunci jawaban, kisi-kisi, rubrik, dan bank soal.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold"
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
};
