import React, { useState, useEffect } from 'react';
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
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { getCmcCorrectList, resolveStatementLabels } from '../utils/questionHelpers';
import { fetchWithAiGateway } from '../utils/apiHelper';

export type EditableQuestionItem =
  | { type: 'multipleChoice'; item: MultipleChoiceQuestion }
  | { type: 'complexMultipleChoice'; item: ComplexMultipleChoiceItem }
  | { type: 'matching'; item: MatchingQuestion }
  | { type: 'shortAnswer'; item: ShortAnswerQuestion }
  | { type: 'essay'; item: EssayQuestion };

interface AiEditQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: EditableQuestionItem | null;
  exam: ExamPackage;
  onApplyRevised: (type: QuestionType, revisedItem: any) => void;
  initialInstruction?: string;
}

const QUICK_PRESETS: { label: string; prompt: string }[] = [
  {
    label: 'Tingkatkan ke HOTS (C4-C6)',
    prompt:
      'Tingkatkan level kognitif soal ini menjadi HOTS (C4/C5 analisis atau evaluasi) dengan stimulus studi kasus kontekstual yang relevan, sambil menjaga topik intinya.',
  },
  {
    label: 'Tambah Stimulus / Wacana',
    prompt:
      'Tambahkan teks stimulus atau ilustrasi studi kasus singkat yang menarik sebelum pertanyaan agar siswa menganalisis konteks terlebih dahulu.',
  },
  {
    label: 'Sederhanakan Bahasa',
    prompt:
      'Perbaiki redaksi kalimat agar lebih singkat, jelas, komunikatif, dan mudah dipahami siswa sesuai jenjang kelas tanpa mengurangi ketepatan konsep.',
  },
  {
    label: 'Perkuat Pengecoh / Opsi',
    prompt:
      'Perbaiki pilihan jawaban agar pengecoh lebih homogen, masuk akal, setara panjangnya, dan kunci jawaban benar-benar akurat.',
  },
  {
    label: 'Lengkapi Pembahasan & Indikator',
    prompt:
      'Pertahankan inti soal namun perbaiki pembahasan ilmiah agar lebih rinci serta lengkapi indikator kisi-kisi yang operasional (ABCD).',
  },
  {
    label: 'Buat Variasi Soal Setara',
    prompt:
      'Ubah konteks dan contoh kasus dalam soal ini menjadi soal baru yang setara tingkat kesulitannya untuk mencegah kebocoran/menyontek.',
  },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  multipleChoice: 'Pilihan Ganda',
  complexMultipleChoice: 'PG Kompleks',
  matching: 'Menjodohkan',
  shortAnswer: 'Isian Singkat',
  essay: 'Uraian / Essay',
};

export const AiEditQuestionModal: React.FC<AiEditQuestionModalProps> = ({
  isOpen,
  onClose,
  target,
  exam,
  onApplyRevised,
  initialInstruction = '',
}) => {
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revisedPreview, setRevisedPreview] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInstruction(initialInstruction || '');
      setError(null);
      setRevisedPreview(null);
      setIsLoading(false);
    }
  }, [isOpen, target?.item?.id, initialInstruction]);

  if (!isOpen || !target) return null;

  const { type, item } = target;

  const handleGenerateRevision = async (customPrompt?: string) => {
    const promptToSend = (customPrompt ?? instruction).trim();
    if (!promptToSend) {
      setError('Tuliskan instruksi revisi terlebih dahulu atau pilih salah satu preset cepat.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchWithAiGateway('/api/edit-question-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionType: type,
          questionData: item,
          instruction: promptToSend,
          subject: exam.examSummary.subject,
          grade: exam.examSummary.grade,
          curriculum: exam.examSummary.curriculum,
          examType: exam.examSummary.examType,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Gagal merevisi soal (HTTP ${res.status}).`);
      }

      setRevisedPreview(json.data);
    } catch (err: any) {
      setError(err?.message || 'Gagal menghubungi layanan AI untuk merevisi soal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!revisedPreview) return;
    onApplyRevised(type, revisedPreview);
    onClose();
  };

  const renderQuestionPreviewBody = (qData: any) => {
    if (!qData) return null;

    if (type === 'matching') {
      const mq = qData as MatchingQuestion;
      return (
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-slate-900 whitespace-pre-line">{mq.instruction}</p>
          <div className="space-y-1 bg-white p-2 rounded border border-slate-200">
            {(mq.pairs || []).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-700">• {p.premise}</span>
                <span className="font-bold text-indigo-800">&rarr; {p.match}</span>
              </div>
            ))}
          </div>
          {mq.explanation && (
            <div className="text-[11px] text-slate-600 italic">Pembahasan: {mq.explanation}</div>
          )}
        </div>
      );
    }

    if (type === 'shortAnswer') {
      const sq = qData as ShortAnswerQuestion;
      return (
        <div className="space-y-1.5 text-xs">
          {sq.stimulus && (
            <div className="p-2 bg-slate-100 border-l-2 border-slate-500 italic text-[11px] whitespace-pre-line">
              {sq.stimulus}
            </div>
          )}
          <p className="font-semibold text-slate-900 whitespace-pre-line">{sq.question}</p>
          <div className="text-[11px] bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-200">
            <strong>Kunci:</strong> {sq.correctAnswer}
            {sq.acceptedAnswers && sq.acceptedAnswers.length > 0 && (
              <span className="ml-2 text-emerald-700">
                (Variasi: {sq.acceptedAnswers.join(' / ')})
              </span>
            )}
          </div>
          {sq.explanation && (
            <div className="text-[11px] text-slate-600 italic">Pembahasan: {sq.explanation}</div>
          )}
        </div>
      );
    }

    if (type === 'essay') {
      const eq = qData as EssayQuestion;
      return (
        <div className="space-y-1.5 text-xs">
          {eq.stimulus && (
            <div className="p-2 bg-slate-100 border-l-2 border-slate-500 italic text-[11px] whitespace-pre-line">
              {eq.stimulus}
            </div>
          )}
          <p className="font-semibold text-slate-900 whitespace-pre-line">{eq.question}</p>
          <div className="text-[11px] bg-emerald-50 text-emerald-950 p-2 rounded border border-emerald-200 whitespace-pre-line">
            <strong className="block mb-0.5">Kunci / Ekspektasi Jawaban:</strong>
            {eq.expectedAnswer}
          </div>
        </div>
      );
    }

    if (type === 'complexMultipleChoice') {
      const cq = qData as ComplexMultipleChoiceItem;
      const hasOptions = Boolean(cq.options && cq.options.length > 0);
      const hasStatements = Boolean(cq.statements && cq.statements.length > 0);
      const correctKeys = getCmcCorrectList(cq.correctAnswer);
      const labels = resolveStatementLabels(cq);

      return (
        <div className="space-y-1.5 text-xs">
          {cq.stimulus && (
            <div className="p-2 bg-slate-100 border-l-2 border-slate-500 italic text-[11px] whitespace-pre-line">
              {cq.stimulus}
            </div>
          )}
          <p className="font-semibold text-slate-900 whitespace-pre-line">{cq.question}</p>
          {hasOptions && (
            <div className="space-y-0.5 pl-2">
              {cq.options!.map((opt) => {
                const isRight = correctKeys.includes(opt.key.trim().toUpperCase());
                return (
                  <div
                    key={opt.key}
                    className={`text-[11px] ${isRight ? 'font-bold text-emerald-800' : 'text-slate-700'}`}
                  >
                    [{isRight ? '✓' : ' '}] {opt.key}. {opt.text}
                  </div>
                );
              })}
            </div>
          )}
          {hasStatements && (
            <div className="space-y-0.5 pl-2">
              {cq.statements!.map((st, idx) => (
                <div key={idx} className="text-[11px] text-slate-700">
                  • {st.statement} &rarr;{' '}
                  <strong className={st.isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                    [{st.isCorrect ? labels.positive : labels.negative}]
                  </strong>
                </div>
              ))}
            </div>
          )}
          {cq.explanation && (
            <div className="text-[11px] text-slate-600 italic">Pembahasan: {cq.explanation}</div>
          )}
        </div>
      );
    }

    const mcq = qData as MultipleChoiceQuestion;
    return (
      <div className="space-y-1.5 text-xs">
        {mcq.stimulus && (
          <div className="p-2 bg-slate-100 border-l-2 border-slate-500 italic text-[11px] whitespace-pre-line">
            {mcq.stimulus}
          </div>
        )}
        <p className="font-semibold text-slate-900 whitespace-pre-line">{mcq.question}</p>
        <div className="space-y-0.5 pl-2">
          {(mcq.options || []).map((opt) => (
            <div
              key={opt.key}
              className={`text-[11px] ${
                opt.key === mcq.correctAnswer ? 'font-bold text-emerald-800' : 'text-slate-700'
              }`}
            >
              {opt.key}. {opt.text} {opt.key === mcq.correctAnswer ? '✓' : ''}
            </div>
          ))}
        </div>
        {mcq.explanation && (
          <div className="text-[11px] text-slate-600 italic">Pembahasan: {mcq.explanation}</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-900 via-blue-900 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Wand2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Edit Butir Soal No. {item.number} dengan AI
              </h2>
              <p className="text-xs text-blue-200">
                {TYPE_LABELS[type]} · {exam.examSummary.subject} ({exam.examSummary.grade})
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
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current question box */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Soal Saat Ini (No. {item.number})
              </span>
              {item.cognitiveLevel && (
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[10px]">
                  {item.cognitiveLevel}
                </span>
              )}
            </div>
            {renderQuestionPreviewBody(item)}
          </div>

          {/* Quick presets */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Preset Revisi Cepat (Klik untuk Mengisi Instruksi):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setInstruction(preset.prompt)}
                  className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 font-semibold text-[11px] transition"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction input */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Instruksi Perubahan / Revisi untuk AI:
            </label>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder='Contoh: "Ganti studi kasus dengan penggunaan rumus Excel di sekolah, tingkatkan ke HOTS C4, dan perjelas pembahasannya."'
              className="w-full p-3 border border-slate-300 rounded-xl bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={isLoading || !instruction.trim()}
                onClick={() => handleGenerateRevision()}
                className="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold flex items-center space-x-2 shadow-xs transition disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                ) : revisedPreview ? (
                  <RefreshCw className="w-4 h-4 text-amber-300" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>
                  {isLoading
                    ? 'AI Sedang Merevisi Soal...'
                    : revisedPreview
                    ? 'Revisi Ulang dengan AI'
                    : 'Proses Revisi dengan AI'}
                </span>
              </button>
            </div>
          </div>

          {/* Revised AI Output Preview */}
          {revisedPreview && (
            <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Hasil Revisi AI (Siap Diterapkan)</span>
                </div>
                {revisedPreview.cognitiveLevel && (
                  <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                    {revisedPreview.cognitiveLevel}
                  </span>
                )}
              </div>
              {renderQuestionPreviewBody(revisedPreview)}
              {(revisedPreview.materialScope || revisedPreview.indicator) && (
                <div className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded border border-emerald-200 space-y-0.5">
                  {revisedPreview.materialScope && (
                    <div>
                      <strong>Lingkup Materi:</strong> {revisedPreview.materialScope}
                    </div>
                  )}
                  {revisedPreview.indicator && (
                    <div>
                      <strong>Indikator Kisi-Kisi:</strong> {revisedPreview.indicator}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!revisedPreview || isLoading}
              onClick={handleApply}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center space-x-1.5 shadow-xs transition disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terapkan Perubahan ke Naskah</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
