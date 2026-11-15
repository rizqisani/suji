import React, { useState } from 'react';
import {
  ExamPackage,
  QuestionType,
  MultipleChoiceQuestion,
  ComplexMultipleChoiceItem,
  MatchingQuestion,
  ShortAnswerQuestion,
  EssayQuestion,
} from '../types/exam';
import { DocumentKopHeader } from './DocumentKopHeader';
import {
  Columns,
  Square,
  Type as TypeIcon,
  Edit3,
  Trash2,
  PlusCircle,
  Shuffle,
  Printer,
  Download,
  FileText,
  CheckCircle,
  Loader2,
  Wand2,
  ShieldCheck,
} from 'lucide-react';
import { exportExamToWord, exportExamToPdf } from '../utils/exportWord';
import { AiEditQuestionModal, EditableQuestionItem } from './AiEditQuestionModal';
import {
  computeMcInstruction,
  computeCmcInstruction,
  resolveStatementLabels,
  STATEMENT_LABEL_PRESETS,
  getCmcCorrectList,
  getMcVariantBadgeLabel,
  getCmcVariantBadgeLabel,
} from '../utils/questionHelpers';

interface ExamDocumentViewProps {
  exam: ExamPackage;
  onUpdateExam: (updated: ExamPackage) => void;
  onOpenSingleQuestionModal: () => void;
  onShuffleExam: () => void;
  onOpenPrintModal?: () => void;
  onOpenValidateModal?: () => void;
}

export const ExamDocumentView: React.FC<ExamDocumentViewProps> = ({
  exam,
  onUpdateExam,
  onOpenSingleQuestionModal,
  onShuffleExam,
  onOpenPrintModal,
  onOpenValidateModal,
}) => {
  const [columnsMode, setColumnsMode] = useState<'1' | '2'>('1');
  const [fontFamily, setFontFamily] = useState<'times' | 'arial' | 'calibri'>('times');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [isEditable, setIsEditable] = useState(false);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [aiEditTarget, setAiEditTarget] = useState<EditableQuestionItem | null>(null);

  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } =
    exam;

  // Dynamic Roman numeral mapping for active sections only
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
  let sectionIdx = 0;
  const mcRoman = multipleChoice.length > 0 ? romanNumerals[sectionIdx++] : '';
  const cmcRoman = complexMultipleChoice.length > 0 ? romanNumerals[sectionIdx++] : '';
  const matchingRoman = matching.length > 0 ? romanNumerals[sectionIdx++] : '';
  const saRoman = shortAnswer.length > 0 ? romanNumerals[sectionIdx++] : '';
  const essayRoman = essay.length > 0 ? romanNumerals[sectionIdx++] : '';

  // Dynamic instructions from helpers
  const mcInstruction = computeMcInstruction(multipleChoice);
  const cmcInstruction = computeCmcInstruction(complexMultipleChoice);

  // Grade / Level display without duplicating "Fase" or level
  const gradeAlreadyHasContext =
    /fase/i.test(examSummary.grade) ||
    (examSummary.schoolLevel &&
      examSummary.grade.toLowerCase().includes(examSummary.schoolLevel.toLowerCase()));
  const gradeLevelDisplay =
    gradeAlreadyHasContext || !examSummary.schoolLevel
      ? examSummary.grade
      : `${examSummary.grade} (${examSummary.schoolLevel})`;

  // Font styling map
  const fontClass =
    fontFamily === 'times'
      ? 'font-serif font-["Times_New_Roman"]'
      : fontFamily === 'arial'
      ? 'font-sans font-["Arial"]'
      : 'font-sans font-["Calibri"]';

  const sizeClass =
    fontSize === 'sm' ? 'text-[10pt] leading-[1.3]' : fontSize === 'lg' ? 'text-[12pt] leading-[1.5]' : 'text-[11pt] leading-[1.4]';

  // Sequential renumbering across all 5 active sections
  const renumberAll = (nextPkg: ExamPackage): ExamPackage => {
    let n = 1;
    const mc = nextPkg.multipleChoice.map((q) => ({ ...q, number: n++ }));
    const cmc = nextPkg.complexMultipleChoice.map((q) => ({ ...q, number: n++ }));
    const mat = nextPkg.matching.map((q) => ({ ...q, number: n++ }));
    const sa = nextPkg.shortAnswer.map((q) => ({ ...q, number: n++ }));
    const es = nextPkg.essay.map((q) => ({ ...q, number: n++ }));
    return {
      ...nextPkg,
      multipleChoice: mc,
      complexMultipleChoice: cmc,
      matching: mat,
      shortAnswer: sa,
      essay: es,
    };
  };

  // Handlers for deleting individual questions
  const handleDeleteMC = (id: string) => {
    onUpdateExam(renumberAll({ ...exam, multipleChoice: multipleChoice.filter((q) => q.id !== id) }));
  };

  const handleDeleteCMC = (id: string) => {
    onUpdateExam(
      renumberAll({ ...exam, complexMultipleChoice: complexMultipleChoice.filter((q) => q.id !== id) })
    );
  };

  const handleDeleteMatching = (id: string) => {
    onUpdateExam(renumberAll({ ...exam, matching: matching.filter((q) => q.id !== id) }));
  };

  const handleDeleteSA = (id: string) => {
    onUpdateExam(renumberAll({ ...exam, shortAnswer: shortAnswer.filter((q) => q.id !== id) }));
  };

  const handleDeleteEssay = (id: string) => {
    onUpdateExam(renumberAll({ ...exam, essay: essay.filter((q) => q.id !== id) }));
  };

  // Handlers for editing MC
  const handleUpdateMCField = (id: string, patch: Partial<MultipleChoiceQuestion>) => {
    const updated = multipleChoice.map((q) => (q.id === id ? { ...q, ...patch } : q));
    onUpdateExam({ ...exam, multipleChoice: updated });
  };

  const handleUpdateMCOption = (qId: string, optKey: string, optText: string) => {
    const updated = multipleChoice.map((q) => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map((opt) => (opt.key === optKey ? { ...opt, text: optText } : opt)),
        };
      }
      return q;
    });
    onUpdateExam({ ...exam, multipleChoice: updated });
  };

  const handleAddMCOption = (qId: string) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const updated = multipleChoice.map((q) => {
      if (q.id !== qId || q.options.length >= 6) return q;
      const nextKey = letters[q.options.length];
      return { ...q, options: [...q.options, { key: nextKey, text: `Pilihan ${nextKey}` }] };
    });
    onUpdateExam({ ...exam, multipleChoice: updated });
  };

  const handleRemoveMCOption = (qId: string, optKey: string) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const updated = multipleChoice.map((q) => {
      if (q.id !== qId || q.options.length <= 2) return q;
      const remaining = q.options.filter((o) => o.key !== optKey);
      const oldCorrectText = q.options.find((o) => o.key === q.correctAnswer)?.text;
      const rekeyed = remaining.map((o, idx) => ({ key: letters[idx], text: o.text }));
      const newCorrect =
        rekeyed.find((o) => o.text === oldCorrectText)?.key || rekeyed[0]?.key || 'A';
      return { ...q, options: rekeyed, correctAnswer: newCorrect };
    });
    onUpdateExam({ ...exam, multipleChoice: updated });
  };

  // Convert MC item into another variant or section
  const handleConvertMC = (
    q: MultipleChoiceQuestion,
    target:
      | 'standard'
      | 'true_false'
      | 'association'
      | 'cause_effect'
      | 'to_cmc_multi'
      | 'to_cmc_bs'
      | 'to_cmc_tf'
      | 'to_matching'
  ) => {
    if (target === 'standard') {
      const baseOpts =
        q.options.length >= 4
          ? q.options
          : [
              { key: 'A', text: q.options[0]?.text || 'Opsi A' },
              { key: 'B', text: q.options[1]?.text || 'Opsi B' },
              { key: 'C', text: 'Opsi C' },
              { key: 'D', text: 'Opsi D' },
            ];
      handleUpdateMCField(q.id, { variant: 'standard', options: baseOpts });
      return;
    }

    if (target === 'true_false') {
      const wasTrue = q.correctAnswer === 'A';
      handleUpdateMCField(q.id, {
        variant: 'true_false',
        options: [
          { key: 'A', text: 'True (Benar)' },
          { key: 'B', text: 'False (Salah)' },
        ],
        correctAnswer: wasTrue ? 'A' : 'B',
      });
      return;
    }

    if (target === 'association') {
      handleUpdateMCField(q.id, {
        variant: 'association',
        options: [
          { key: 'A', text: '(1), (2), dan (3) benar' },
          { key: 'B', text: '(1) dan (3) benar' },
          { key: 'C', text: '(2) dan (4) benar' },
          { key: 'D', text: '(4) saja benar' },
          { key: 'E', text: 'Semua benar' },
        ],
      });
      return;
    }

    if (target === 'cause_effect') {
      handleUpdateMCField(q.id, {
        variant: 'cause_effect',
        options: [
          { key: 'A', text: 'Pernyataan benar, alasan benar, dan keduanya menunjukkan hubungan sebab-akibat' },
          { key: 'B', text: 'Pernyataan benar, alasan benar, tetapi tidak menunjukkan hubungan sebab-akibat' },
          { key: 'C', text: 'Pernyataan benar dan alasan salah' },
          { key: 'D', text: 'Pernyataan salah dan alasan benar' },
          { key: 'E', text: 'Pernyataan dan alasan salah' },
        ],
      });
      return;
    }

    const remainingMC = multipleChoice.filter((item) => item.id !== q.id);

    if (target === 'to_cmc_multi') {
      const newCmc: ComplexMultipleChoiceItem = {
        id: `cmc-conv-${Date.now()}`,
        number: 0,
        variant: 'multi_select',
        stimulus: q.stimulus,
        question: q.question,
        options:
          q.options.length >= 3
            ? q.options
            : [
                { key: 'A', text: q.options[0]?.text || 'Pilihan A' },
                { key: 'B', text: q.options[1]?.text || 'Pilihan B' },
                { key: 'C', text: 'Pilihan C' },
                { key: 'D', text: 'Pilihan D' },
              ],
        correctAnswer: [q.correctAnswer || 'A'],
        explanation: q.explanation,
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        score: q.score ?? 2,
      };
      onUpdateExam(
        renumberAll({
          ...exam,
          multipleChoice: remainingMC,
          complexMultipleChoice: [...complexMultipleChoice, newCmc],
        })
      );
      return;
    }

    if (target === 'to_cmc_bs' || target === 'to_cmc_tf') {
      const isTf = target === 'to_cmc_tf';
      const statements =
        q.options.length > 0
          ? q.options.slice(0, 4).map((o) => ({
              statement: o.text,
              isCorrect: o.key === q.correctAnswer,
            }))
          : [
              { statement: 'Pernyataan 1', isCorrect: true },
              { statement: 'Pernyataan 2', isCorrect: false },
            ];
      const newCmc: ComplexMultipleChoiceItem = {
        id: `cmc-conv-${Date.now()}`,
        number: 0,
        variant: isTf ? 'true_false' : 'benar_salah',
        statementLabels: isTf ? STATEMENT_LABEL_PRESETS.true_false : STATEMENT_LABEL_PRESETS.benar_salah,
        stimulus: q.stimulus,
        question: q.question,
        statements,
        explanation: q.explanation,
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        score: q.score ?? 3,
      };
      onUpdateExam(
        renumberAll({
          ...exam,
          multipleChoice: remainingMC,
          complexMultipleChoice: [...complexMultipleChoice, newCmc],
        })
      );
      return;
    }

    if (target === 'to_matching') {
      const pairs =
        q.options.length >= 2
          ? q.options.slice(0, 3).map((o, idx) => ({
              premise: `Premis ${idx + 1}`,
              match: o.text,
            }))
          : [
              { premise: 'Konsep 1', match: 'Pasangan 1' },
              { premise: 'Konsep 2', match: 'Pasangan 2' },
            ];
      const newMatch: MatchingQuestion = {
        id: `m-conv-${Date.now()}`,
        number: 0,
        instruction: q.question || 'Pasangkan pernyataan berikut dengan jawaban yang tepat:',
        pairs,
        distractors: q.options[3] ? [q.options[3].text] : [],
        cognitiveLevel: q.cognitiveLevel,
        indicator: q.indicator,
        score: q.score ?? 3,
      };
      onUpdateExam(
        renumberAll({
          ...exam,
          multipleChoice: remainingMC,
          matching: [...matching, newMatch],
        })
      );
    }
  };

  // Handlers for editing CMC
  const handleUpdateCMCField = (id: string, patch: Partial<ComplexMultipleChoiceItem>) => {
    const updated = complexMultipleChoice.map((q) => (q.id === id ? { ...q, ...patch } : q));
    onUpdateExam({ ...exam, complexMultipleChoice: updated });
  };

  const handleChangeCMCPreset = (
    q: ComplexMultipleChoiceItem,
    preset: 'multi_select' | 'benar_salah' | 'true_false' | 'ya_tidak' | 'setuju_tidak' | 'fakta_opini'
  ) => {
    if (preset === 'multi_select') {
      const options =
        q.options && q.options.length > 0
          ? q.options
          : (q.statements || []).slice(0, 5).map((st, idx) => ({
              key: String.fromCharCode(65 + idx),
              text: st.statement,
            }));
      const correctKeys =
        q.options && q.options.length > 0
          ? getCmcCorrectList(q.correctAnswer)
          : (q.statements || [])
              .slice(0, 5)
              .map((st, idx) => (st.isCorrect ? String.fromCharCode(65 + idx) : ''))
              .filter(Boolean);
      handleUpdateCMCField(q.id, {
        variant: 'multi_select',
        options:
          options.length > 0
            ? options
            : [
                { key: 'A', text: 'Pilihan A' },
                { key: 'B', text: 'Pilihan B' },
                { key: 'C', text: 'Pilihan C' },
                { key: 'D', text: 'Pilihan D' },
              ],
        correctAnswer: correctKeys.length > 0 ? correctKeys : ['A', 'B'],
        statements: undefined,
        statementLabels: undefined,
      });
    } else {
      const presetLabels = STATEMENT_LABEL_PRESETS[preset] || STATEMENT_LABEL_PRESETS.benar_salah;
      const existingCorrect = getCmcCorrectList(q.correctAnswer);
      const statements =
        q.statements && q.statements.length > 0
          ? q.statements
          : (q.options || []).map((opt) => ({
              statement: opt.text,
              isCorrect: existingCorrect.includes(opt.key.toUpperCase()),
            }));
      handleUpdateCMCField(q.id, {
        variant: preset === 'true_false' ? 'true_false' : preset === 'benar_salah' ? 'benar_salah' : 'binary_table',
        statementLabels: presetLabels,
        statements:
          statements.length > 0
            ? statements
            : [
                { statement: 'Pernyataan 1', isCorrect: true },
                { statement: 'Pernyataan 2', isCorrect: false },
              ],
        options: undefined,
        correctAnswer: undefined,
      });
    }
  };

  // Handlers for editing Matching, ShortAnswer, Essay
  const handleUpdateMatchingField = (id: string, patch: Partial<MatchingQuestion>) => {
    const updated = matching.map((q) => (q.id === id ? { ...q, ...patch } : q));
    onUpdateExam({ ...exam, matching: updated });
  };

  const handleUpdateSAField = (id: string, patch: Partial<ShortAnswerQuestion>) => {
    const updated = shortAnswer.map((q) => (q.id === id ? { ...q, ...patch } : q));
    onUpdateExam({ ...exam, shortAnswer: updated });
  };

  const handleUpdateEssayField = (id: string, patch: Partial<EssayQuestion>) => {
    const updated = essay.map((q) => (q.id === id ? { ...q, ...patch } : q));
    onUpdateExam({ ...exam, essay: updated });
  };

  const handleApplyAiRevision = (type: QuestionType, revisedItem: any) => {
    const now = new Date().toISOString();
    if (type === 'multipleChoice') {
      const updated = multipleChoice.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
      onUpdateExam({ ...exam, updatedAt: now, multipleChoice: updated });
      return;
    }
    if (type === 'complexMultipleChoice') {
      const updated = complexMultipleChoice.map((q) =>
        q.id === revisedItem.id ? { ...revisedItem, id: q.id, number: q.number } : q
      );
      onUpdateExam({ ...exam, updatedAt: now, complexMultipleChoice: updated });
      return;
    }
    if (type === 'matching') {
      const updated = matching.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
      onUpdateExam({ ...exam, updatedAt: now, matching: updated });
      return;
    }
    if (type === 'shortAnswer') {
      const updated = shortAnswer.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
      onUpdateExam({ ...exam, updatedAt: now, shortAnswer: updated });
      return;
    }
    if (type === 'essay') {
      const updated = essay.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
      onUpdateExam({ ...exam, updatedAt: now, essay: updated });
    }
  };

  return (
    <div className="space-y-4">
      {/* View & Print Controls Toolbar */}
      <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-slate-700">Tampilan Naskah:</span>

          {/* Layout Column Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setColumnsMode('1')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center space-x-1 transition ${
                columnsMode === '1'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Layout 1 Kolom (Standar)"
            >
              <Square className="w-3.5 h-3.5" />
              <span>1 Kolom</span>
            </button>
            <button
              onClick={() => setColumnsMode('2')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center space-x-1 transition ${
                columnsMode === '2'
                  ? 'bg-white text-blue-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Layout 2 Kolom (Hemat Kertas Fotokopi)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>2 Kolom (Hemat Kertas)</span>
            </button>
          </div>

          {/* Font Selector */}
          <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
            <TypeIcon className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value as any)}
              className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md font-medium"
            >
              <option value="times">Times New Roman</option>
              <option value="arial">Arial</option>
              <option value="calibri">Calibri</option>
            </select>
          </div>

          {/* Size Selector */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value as any)}
            className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md font-medium"
          >
            <option value="sm">Kecil (10pt)</option>
            <option value="base">Sedang (11pt - Standar)</option>
            <option value="lg">Besar (12pt)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Edit Toggle */}
          <button
            onClick={() => setIsEditable(!isEditable)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center space-x-1.5 transition ${
              isEditable
                ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditable ? 'Selesai Edit' : 'Edit Langsung'}</span>
          </button>

          {/* Add Question */}
          <button
            onClick={onOpenSingleQuestionModal}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-semibold flex items-center space-x-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tambah Butir Soal</span>
          </button>

          {/* Validasi Mutu AI */}
          {onOpenValidateModal && (
            <button
              type="button"
              onClick={onOpenValidateModal}
              title="Audit menyeluruh seluruh soal: cek kunci ganda, anti-halusinasi, anti-redundansi, anti-bias & kesesuaian standar mutu"
              className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold flex items-center space-x-1.5 transition shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Validasi Mutu AI</span>
            </button>
          )}

          {/* Shuffle / Paket B */}
          <button
            onClick={onShuffleExam}
            title="Acak urutan soal untuk membuat Paket B / mencegah sontekan siswa"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium flex items-center space-x-1.5 transition"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Acak (Paket B)</span>
          </button>

          {/* Quick Word & PDF Download */}
          <button
            type="button"
            disabled={isDownloadingWord}
            onClick={async () => {
              setIsDownloadingWord(true);
              try {
                await exportExamToWord(exam, 'naskah', { columnsMode });
              } finally {
                setIsDownloadingWord(false);
              }
            }}
            title="Unduh Naskah Ujian dalam format Microsoft Word (.docx)"
            className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-2xs disabled:opacity-50"
          >
            {isDownloadingWord ? (
              <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-blue-700" />
            )}
            <span>{isDownloadingWord ? 'Menyiapkan...' : 'Word (.docx)'}</span>
          </button>
          <button
            type="button"
            disabled={isDownloadingPdf}
            onClick={async () => {
              setIsDownloadingPdf(true);
              try {
                await exportExamToPdf(exam, 'naskah', { columnsMode });
              } finally {
                setIsDownloadingPdf(false);
              }
            }}
            title="Unduh Naskah Ujian dalam format PDF (.pdf)"
            className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-2xs disabled:opacity-50"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 text-rose-700 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-rose-700" />
            )}
            <span>{isDownloadingPdf ? 'Membuat PDF...' : 'PDF (.pdf)'}</span>
          </button>

          {/* Quick Print/PDF Action */}
          {onOpenPrintModal && (
            <button
              onClick={onOpenPrintModal}
              className="px-3.5 py-1.5 rounded-lg border border-blue-600 bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Cetak Dokumen</span>
            </button>
          )}
        </div>
      </div>

      {isEditable && (
        <div className="no-print p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
          <span>
            ✏️ <strong>Mode Edit Aktif:</strong> Anda dapat langsung mengubah teks pertanyaan, opsi jawaban,
            atau menghapus butir soal. Perubahan tersimpan secara instan.
          </span>
          <button
            onClick={() => setIsEditable(false)}
            className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 font-bold rounded-md"
          >
            Tutup Mode Edit
          </button>
        </div>
      )}

      {/* Main A4 Document Paper Container */}
      <div className="print-container bg-slate-200/70 p-2 sm:p-6 rounded-2xl flex justify-center">
        <div
          id="printable-exam-document"
          className={`bg-white text-black shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] rounded-sm border border-slate-300 print:border-none ${fontClass} ${sizeClass}`}
        >
          {/* 1. KOP SURAT RESMI SEKOLAH */}
          <DocumentKopHeader kopConfig={kopConfig} />

          {/* 2. JUDUL & TABEL IDENTITAS UJIAN */}
          <div className="text-center my-3">
            <h2 className="text-[12.5pt] font-black uppercase tracking-wide">
              {examSummary.title}
            </h2>
            <div className="text-[10.5pt] font-bold uppercase">
              TAHUN AJARAN {examSummary.academicYear}
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[10pt] mb-3">
            <tbody>
              <tr>
                <td className="w-[18%] py-1 px-2 font-bold border border-black bg-slate-50/50">
                  Mata Pelajaran
                </td>
                <td className="w-[32%] py-1 px-2 border border-black">{examSummary.subject}</td>
                <td className="w-[18%] py-1 px-2 font-bold border border-black bg-slate-50/50">
                  Hari / Tanggal
                </td>
                <td className="w-[32%] py-1 px-2 border border-black text-slate-600">
                  ........................................
                </td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-bold border border-black bg-slate-50/50">
                  Kelas / Fase
                </td>
                <td className="py-1 px-2 border border-black">{gradeLevelDisplay}</td>
                <td className="py-1 px-2 font-bold border border-black bg-slate-50/50">
                  Alokasi Waktu
                </td>
                <td className="py-1 px-2 border border-black">{examSummary.duration}</td>
              </tr>
              <tr>
                <td className="py-1 px-2 font-bold border border-black bg-slate-50/50">
                  Kurikulum
                </td>
                <td className="py-1 px-2 border border-black">{examSummary.curriculum}</td>
                <td className="py-1 px-2 font-bold border border-black bg-slate-50/50">
                  Nama Siswa / No
                </td>
                <td className="py-1 px-2 border border-black text-slate-600">
                  ........................................
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3. PETUNJUK UMUM */}
          <div className="border border-black p-2.5 mb-4 text-[9pt] leading-normal bg-slate-50/30">
            <span className="font-bold block mb-1">PETUNJUK UMUM:</span>
            <ol className="list-decimal pl-5 space-y-0.5">
              {examSummary.generalInstructions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>

          {/* 4. DAFTAR BUTIR SOAL */}
          <div className={columnsMode === '2' ? 'columns-1 md:columns-2 gap-6' : ''}>
            {/* BAGIAN I: PILIHAN GANDA */}
            {multipleChoice.length > 0 && (
              <div className="mb-5">
                <div className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-2">
                  {mcRoman}. PILIHAN GANDA
                </div>
                <div className="text-[9pt] italic mb-3">{mcInstruction}</div>

                <div className="space-y-3.5">
                  {multipleChoice.map((q) => (
                    <div
                      key={q.id}
                      className={`break-inside-avoid relative group rounded-md p-1 transition ${
                        isEditable ? 'border border-dashed border-amber-300 bg-amber-50/20 p-2' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Quick hover AI edit trigger when not in direct edit mode */}
                      {!isEditable && (
                        <button
                          type="button"
                          onClick={() => setAiEditTarget({ type: 'multipleChoice', item: q })}
                          title={`Edit soal no. ${q.number} dengan bantuan AI`}
                          className="no-print absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] flex items-center space-x-1 shadow-xs"
                        >
                          <Wand2 className="w-3 h-3 text-amber-300" />
                          <span>Edit AI</span>
                        </button>
                      )}

                      {/* Edit toolbar */}
                      {isEditable && (
                        <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200 font-sans text-[11px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                              {getMcVariantBadgeLabel(q)}
                            </span>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) handleConvertMC(q, e.target.value as any);
                              }}
                              className="text-[11px] px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-700"
                            >
                              <option value="">Ubah Bentuk...</option>
                              <option value="standard">PG Standar</option>
                              <option value="true_false">PG True / False (T/F)</option>
                              <option value="association">PG Asosiasi (1,2,3,4)</option>
                              <option value="cause_effect">PG Sebab–Akibat</option>
                              <option value="to_cmc_multi">&rarr; Konversi ke PGK Multi-Pilih</option>
                              <option value="to_cmc_bs">&rarr; Konversi ke PGK Tabel Benar/Salah</option>
                              <option value="to_cmc_tf">&rarr; Konversi ke PGK Tabel True/False</option>
                              <option value="to_matching">&rarr; Konversi ke Menjodohkan</option>
                            </select>
                            {!q.stimulus && (
                              <button
                                type="button"
                                onClick={() => handleUpdateMCField(q.id, { stimulus: 'Teks stimulus soal...' })}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 text-[10px]"
                              >
                                + Stimulus
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setAiEditTarget({ type: 'multipleChoice', item: q })}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center space-x-1"
                              title="Revisi butir soal ini dengan bantuan AI"
                            >
                              <Wand2 className="w-3 h-3 text-amber-300" />
                              <span>Edit AI</span>
                            </button>
                            <button
                              onClick={() => handleDeleteMC(q.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-sm text-[10px] flex items-center space-x-1"
                              title="Hapus butir soal"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Stimulus wacana jika ada */}
                      {(q.stimulus || (isEditable && q.stimulus !== undefined)) && (
                        isEditable ? (
                          <textarea
                            rows={2}
                            value={q.stimulus || ''}
                            onChange={(e) => handleUpdateMCField(q.id, { stimulus: e.target.value || undefined })}
                            placeholder="Stimulus / Wacana (kosongkan untuk hapus)"
                            className="no-print w-full text-xs italic p-1.5 border border-slate-300 rounded bg-white mb-1.5 font-serif"
                          />
                        ) : (
                          <div className="text-[9.5pt] italic bg-slate-100/70 p-2 border-l-2 border-slate-600 rounded-r mb-1.5 leading-relaxed whitespace-pre-line">
                            {q.stimulus}
                          </div>
                        )
                      )}

                      {/* Rumusan pertanyaan */}
                      <div className="flex items-start">
                        <span className="font-bold w-6 shrink-0">{q.number}.</span>
                        <div className="flex-1">
                          {isEditable ? (
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => handleUpdateMCField(q.id, { question: e.target.value })}
                              className="w-full text-xs p-1 border border-slate-300 rounded font-serif bg-white"
                            />
                          ) : (
                            <span className="text-justify font-medium whitespace-pre-line">{q.question}</span>
                          )}
                        </div>
                      </div>

                      {/* Pilihan Opsi A, B, C, D, E */}
                      <div className="ml-6 mt-1.5 space-y-1">
                        {q.options.map((opt) => (
                          <div key={opt.key} className="flex items-center text-[10pt] gap-1.5">
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() => handleUpdateMCField(q.id, { correctAnswer: opt.key })}
                                title={`Jadikan ${opt.key} sebagai kunci`}
                                className={`no-print text-[10px] px-1.5 py-0.5 rounded font-sans font-bold border ${
                                  q.correctAnswer === opt.key
                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                    : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {q.correctAnswer === opt.key ? '✓ Kunci' : 'Set'}
                              </button>
                            )}
                            <span className="font-bold w-5 shrink-0">{opt.key}.</span>
                            <div className="flex-1">
                              {isEditable ? (
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => handleUpdateMCOption(q.id, opt.key, e.target.value)}
                                  className="w-full text-xs px-1.5 py-0.5 border border-slate-300 rounded font-serif bg-white"
                                />
                              ) : (
                                <span>{opt.text}</span>
                              )}
                            </div>
                            {isEditable && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMCOption(q.id, opt.key)}
                                className="no-print text-[10px] text-red-500 hover:text-red-700 px-1"
                                title="Hapus opsi"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                        {isEditable && q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddMCOption(q.id)}
                            className="no-print text-[11px] font-sans text-blue-700 hover:underline mt-1"
                          >
                            + Tambah Opsi
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PILIHAN GANDA KOMPLEKS */}
            {complexMultipleChoice.length > 0 && (
              <div className="mb-5">
                <div className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-2">
                  {cmcRoman}. PILIHAN GANDA KOMPLEKS
                </div>
                <div className="text-[9pt] italic mb-3">{cmcInstruction}</div>

                <div className="space-y-4">
                  {complexMultipleChoice.map((q) => {
                    const hasStatements = q.statements && q.statements.length > 0;
                    const hasOptions = q.options && q.options.length > 0;
                    const stmtLabels = resolveStatementLabels(q);
                    const correctList = getCmcCorrectList(q.correctAnswer);

                    const currentPreset =
                      hasOptions && !hasStatements
                        ? 'multi_select'
                        : q.variant === 'true_false'
                        ? 'true_false'
                        : stmtLabels.positive === 'Ya'
                        ? 'ya_tidak'
                        : stmtLabels.positive === 'Setuju'
                        ? 'setuju_tidak'
                        : stmtLabels.positive === 'Fakta'
                        ? 'fakta_opini'
                        : 'benar_salah';

                    return (
                      <div
                        key={q.id}
                        className={`break-inside-avoid relative group rounded-md p-1 transition ${
                          isEditable ? 'border border-dashed border-amber-300 bg-amber-50/20 p-2' : 'hover:bg-slate-50'
                        }`}
                      >
                        {!isEditable && (
                          <button
                            type="button"
                            onClick={() => setAiEditTarget({ type: 'complexMultipleChoice', item: q })}
                            title={`Edit soal no. ${q.number} dengan bantuan AI`}
                            className="no-print absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] flex items-center space-x-1 shadow-xs"
                          >
                            <Wand2 className="w-3 h-3 text-amber-300" />
                            <span>Edit AI</span>
                          </button>
                        )}
                        {isEditable && (
                          <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200 font-sans text-[11px]">
                            <div className="flex items-center space-x-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                                {getCmcVariantBadgeLabel(q)}
                              </span>
                              <select
                                value={currentPreset}
                                onChange={(e) => handleChangeCMCPreset(q, e.target.value as any)}
                                className="text-[11px] px-1.5 py-0.5 border border-slate-300 rounded bg-white text-slate-700"
                              >
                                <option value="multi_select">Multi-Pilih Centang</option>
                                <option value="benar_salah">Tabel: Benar / Salah</option>
                                <option value="true_false">Tabel: True / False</option>
                                <option value="ya_tidak">Tabel: Ya / Tidak</option>
                                <option value="setuju_tidak">Tabel: Setuju / Tidak Setuju</option>
                                <option value="fakta_opini">Tabel: Fakta / Opini</option>
                              </select>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => setAiEditTarget({ type: 'complexMultipleChoice', item: q })}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center space-x-1"
                                title="Revisi butir soal ini dengan bantuan AI"
                              >
                                <Wand2 className="w-3 h-3 text-amber-300" />
                                <span>Edit AI</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCMC(q.id)}
                                className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-sm text-[10px] flex items-center space-x-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {q.stimulus && (
                          isEditable ? (
                            <textarea
                              rows={2}
                              value={q.stimulus}
                              onChange={(e) => handleUpdateCMCField(q.id, { stimulus: e.target.value || undefined })}
                              className="no-print w-full text-xs italic p-1.5 border border-slate-300 rounded bg-white mb-1.5 font-serif"
                            />
                          ) : (
                            <div className="text-[9.5pt] italic bg-slate-100/70 p-2 border-l-2 border-slate-600 rounded-r mb-1.5 whitespace-pre-line">
                              {q.stimulus}
                            </div>
                          )
                        )}

                        <div className="flex items-start mb-1.5">
                          <span className="font-bold w-6 shrink-0">{q.number}.</span>
                          <div className="flex-1 text-justify font-medium whitespace-pre-line">
                            {isEditable ? (
                              <textarea
                                rows={2}
                                value={q.question}
                                onChange={(e) => handleUpdateCMCField(q.id, { question: e.target.value })}
                                className="w-full text-xs p-1 border border-slate-300 rounded font-serif bg-white"
                              />
                            ) : (
                              q.question
                            )}
                          </div>
                        </div>

                        {hasOptions && (
                          <div className="ml-6 mt-1.5 space-y-1">
                            {q.options!.map((opt, idx) => {
                              const isChecked = correctList.includes(opt.key.trim().toUpperCase());
                              return (
                                <div key={opt.key} className="flex items-start text-[10pt] gap-1.5">
                                  {isEditable ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const upper = opt.key.trim().toUpperCase();
                                        const nextKeys = isChecked
                                          ? correctList.filter((k) => k !== upper)
                                          : [...correctList, upper];
                                        handleUpdateCMCField(q.id, { correctAnswer: nextKeys });
                                      }}
                                      className={`no-print text-[10px] px-1.5 py-0.5 rounded font-sans font-bold border ${
                                        isChecked
                                          ? 'bg-emerald-600 text-white border-emerald-700'
                                          : 'bg-white text-slate-500 border-slate-300'
                                      }`}
                                    >
                                      {isChecked ? '✓ Benar' : 'Pilih'}
                                    </button>
                                  ) : (
                                    <span className="font-mono text-[9.5pt] shrink-0 select-none text-slate-700">
                                      [&nbsp;&nbsp;]
                                    </span>
                                  )}
                                  <span className="font-bold w-5 shrink-0">{opt.key}.</span>
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) => {
                                        const nextOpts = q.options!.map((o, i) =>
                                          i === idx ? { ...o, text: e.target.value } : o
                                        );
                                        handleUpdateCMCField(q.id, { options: nextOpts });
                                      }}
                                      className="flex-1 text-xs px-1.5 py-0.5 border border-slate-300 rounded font-serif bg-white"
                                    />
                                  ) : (
                                    <span className="flex-1">{opt.text}</span>
                                  )}
                                </div>
                              );
                            })}
                            {isEditable && (q.options?.length || 0) < 6 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextKey = String.fromCharCode(65 + (q.options?.length || 0));
                                  handleUpdateCMCField(q.id, {
                                    options: [...(q.options || []), { key: nextKey, text: `Pilihan ${nextKey}` }],
                                  });
                                }}
                                className="no-print text-[11px] font-sans text-blue-700 hover:underline mt-1"
                              >
                                + Tambah Opsi Centang
                              </button>
                            )}
                          </div>
                        )}

                        {hasStatements && (
                          <div className="mt-2">
                            <table className="w-full border-collapse border border-black text-[9.5pt] ml-2">
                              <thead>
                                <tr className="bg-slate-100 font-bold">
                                  <th className="border border-black p-1.5 text-left">Pernyataan</th>
                                  <th className="border border-black p-1.5 w-20 text-center">
                                    {stmtLabels.positive}
                                  </th>
                                  <th className="border border-black p-1.5 w-24 text-center">
                                    {stmtLabels.negative}
                                  </th>
                                  {isEditable && <th className="no-print border border-black p-1.5 w-10"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {q.statements!.map((st, i) => (
                                  <tr key={i}>
                                    <td className="border border-black p-1.5">
                                      {isEditable ? (
                                        <input
                                          type="text"
                                          value={st.statement}
                                          onChange={(e) => {
                                            const nextSt = q.statements!.map((s, idx) =>
                                              idx === i ? { ...s, statement: e.target.value } : s
                                            );
                                            handleUpdateCMCField(q.id, { statements: nextSt });
                                          }}
                                          className="w-full text-xs px-1.5 py-0.5 border border-slate-300 rounded font-serif bg-white"
                                        />
                                      ) : (
                                        st.statement
                                      )}
                                    </td>
                                    <td className="border border-black p-1.5 text-center font-mono">
                                      {isEditable ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextSt = q.statements!.map((s, idx) =>
                                              idx === i ? { ...s, isCorrect: true } : s
                                            );
                                            handleUpdateCMCField(q.id, { statements: nextSt });
                                          }}
                                          className={`px-2 py-0.5 rounded text-xs font-sans font-bold ${
                                            st.isCorrect
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-100 text-slate-400'
                                          }`}
                                        >
                                          {st.isCorrect ? '✓' : '○'}
                                        </button>
                                      ) : (
                                        <span className="text-slate-300">[ &nbsp; ]</span>
                                      )}
                                    </td>
                                    <td className="border border-black p-1.5 text-center font-mono">
                                      {isEditable ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextSt = q.statements!.map((s, idx) =>
                                              idx === i ? { ...s, isCorrect: false } : s
                                            );
                                            handleUpdateCMCField(q.id, { statements: nextSt });
                                          }}
                                          className={`px-2 py-0.5 rounded text-xs font-sans font-bold ${
                                            !st.isCorrect
                                              ? 'bg-rose-600 text-white'
                                              : 'bg-slate-100 text-slate-400'
                                          }`}
                                        >
                                          {!st.isCorrect ? '✓' : '○'}
                                        </button>
                                      ) : (
                                        <span className="text-slate-300">[ &nbsp; ]</span>
                                      )}
                                    </td>
                                    {isEditable && (
                                      <td className="no-print border border-black p-1 text-center">
                                        {q.statements!.length > 1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleUpdateCMCField(q.id, {
                                                statements: q.statements!.filter((_, idx) => idx !== i),
                                              })
                                            }
                                            className="text-red-600 font-bold text-xs"
                                          >
                                            &times;
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {isEditable && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateCMCField(q.id, {
                                    statements: [
                                      ...(q.statements || []),
                                      { statement: 'Pernyataan baru...', isCorrect: true },
                                    ],
                                  })
                                }
                                className="no-print text-[11px] font-sans text-blue-700 hover:underline mt-1 ml-2"
                              >
                                + Tambah Pernyataan
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MENJODOHKAN */}
            {matching.length > 0 && (
              <div className="mb-5 break-inside-avoid">
                <div className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-2">
                  {matchingRoman}. MENJODOHKAN (MATCHING)
                </div>
                <div className="text-[9pt] italic mb-3">
                  Pasangkanlah pernyataan di kolom sebelah kiri dengan pilihan yang tepat di sebelah kanan!
                </div>

                <div className="space-y-4">
                  {matching.map((q) => {
                    const rightSide = [
                      ...q.pairs.map((p) => p.match),
                      ...(q.distractors || []),
                    ];

                    return (
                      <div
                        key={q.id}
                        className={`break-inside-avoid relative group rounded-md p-1 transition ${
                          isEditable ? 'border border-dashed border-amber-300 bg-amber-50/20 p-2' : 'hover:bg-slate-50'
                        }`}
                      >
                        {!isEditable && (
                          <button
                            type="button"
                            onClick={() => setAiEditTarget({ type: 'matching', item: q })}
                            title={`Edit soal no. ${q.number} dengan bantuan AI`}
                            className="no-print absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] flex items-center space-x-1 shadow-xs"
                          >
                            <Wand2 className="w-3 h-3 text-amber-300" />
                            <span>Edit AI</span>
                          </button>
                        )}
                        {isEditable && (
                          <div className="no-print absolute right-2 top-2 flex items-center space-x-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => setAiEditTarget({ type: 'matching', item: q })}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center space-x-1"
                              title="Revisi soal menjodohkan dengan bantuan AI"
                            >
                              <Wand2 className="w-3 h-3 text-amber-300" />
                              <span>Edit AI</span>
                            </button>
                            <button
                              onClick={() => handleDeleteMatching(q.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded-sm text-[10px]"
                            >
                              Hapus
                            </button>
                          </div>
                        )}

                        <div className="font-medium mb-2 whitespace-pre-line pr-14">
                          <span className="font-bold">{q.number}.</span>{' '}
                          {isEditable ? (
                            <input
                              type="text"
                              value={q.instruction}
                              onChange={(e) => handleUpdateMatchingField(q.id, { instruction: e.target.value })}
                              className="w-full text-xs px-2 py-1 border border-slate-300 rounded font-serif bg-white mt-1"
                            />
                          ) : (
                            q.instruction
                          )}
                        </div>

                        {isEditable ? (
                          <div className="no-print space-y-1.5 border border-black p-2.5 rounded-xs bg-white text-xs font-sans">
                            <div className="font-bold text-[11px] text-slate-600">
                              Edit Pasangan Premis &harr; Jawaban:
                            </div>
                            {q.pairs.map((p, idx) => (
                              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                <input
                                  type="text"
                                  value={p.premise}
                                  onChange={(e) => {
                                    const nextPairs = q.pairs.map((item, i) =>
                                      i === idx ? { ...item, premise: e.target.value } : item
                                    );
                                    handleUpdateMatchingField(q.id, { pairs: nextPairs });
                                  }}
                                  className="col-span-5 px-2 py-1 border border-slate-300 rounded font-serif"
                                />
                                <span className="col-span-1 text-center font-bold">&rarr;</span>
                                <input
                                  type="text"
                                  value={p.match}
                                  onChange={(e) => {
                                    const nextPairs = q.pairs.map((item, i) =>
                                      i === idx ? { ...item, match: e.target.value } : item
                                    );
                                    handleUpdateMatchingField(q.id, { pairs: nextPairs });
                                  }}
                                  className="col-span-5 px-2 py-1 border border-slate-300 rounded font-serif"
                                />
                                {q.pairs.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateMatchingField(q.id, {
                                        pairs: q.pairs.filter((_, i) => i !== idx),
                                      })
                                    }
                                    className="col-span-1 text-red-600 font-bold"
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateMatchingField(q.id, {
                                  pairs: [...q.pairs, { premise: 'Premis baru', match: 'Jawaban baru' }],
                                })
                              }
                              className="text-[11px] text-blue-700 hover:underline"
                            >
                              + Tambah Pasangan
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4 border border-black p-2.5 rounded-xs text-[9.5pt]">
                            <div>
                              <div className="font-bold border-b border-slate-300 pb-1 mb-1.5">
                                Kolom Premis (Kiri)
                              </div>
                              <ol className="list-lower-alpha pl-4 space-y-1">
                                {q.pairs.map((p, idx) => (
                                  <li key={idx} className="pl-1">
                                    {p.premise}
                                  </li>
                                ))}
                              </ol>
                            </div>
                            <div className="border-l border-dashed border-slate-400 pl-4">
                              <div className="font-bold border-b border-slate-300 pb-1 mb-1.5">
                                Pilihan Jawaban (Kanan)
                              </div>
                              <ul className="list-upper-roman pl-4 space-y-1">
                                {rightSide.map((item, idx) => (
                                  <li key={idx} className="pl-1">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ISIAN SINGKAT */}
            {shortAnswer.length > 0 && (
              <div className="mb-5 break-inside-avoid">
                <div className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-2">
                  {saRoman}. ISIAN SINGKAT
                </div>
                <div className="text-[9pt] italic mb-3">
                  Isilah titik-titik pada soal berikut dengan jawaban yang singkat, tepat, dan benar!
                </div>

                <div className="space-y-3">
                  {shortAnswer.map((q) => (
                    <div
                      key={q.id}
                      className={`break-inside-avoid relative group rounded-md p-1 transition ${
                        isEditable ? 'border border-dashed border-amber-300 bg-amber-50/20 p-2' : 'hover:bg-slate-50'
                      }`}
                    >
                      {!isEditable && (
                        <button
                          type="button"
                          onClick={() => setAiEditTarget({ type: 'shortAnswer', item: q })}
                          title={`Edit soal no. ${q.number} dengan bantuan AI`}
                          className="no-print absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] flex items-center space-x-1 shadow-xs"
                        >
                          <Wand2 className="w-3 h-3 text-amber-300" />
                          <span>Edit AI</span>
                        </button>
                      )}
                      {isEditable && (
                        <div className="no-print absolute right-2 top-2 flex items-center space-x-1 font-sans">
                          <button
                            type="button"
                            onClick={() => setAiEditTarget({ type: 'shortAnswer', item: q })}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center space-x-1"
                            title="Revisi soal isian singkat dengan bantuan AI"
                          >
                            <Wand2 className="w-3 h-3 text-amber-300" />
                            <span>Edit AI</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSA(q.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-sm"
                            title="Hapus soal"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {q.stimulus && (
                        <div className="text-[9.5pt] italic bg-slate-100/70 p-2 border-l-2 border-slate-600 rounded-r mb-1 whitespace-pre-line">
                          {q.stimulus}
                        </div>
                      )}

                      <div className="flex items-start pr-8">
                        <span className="font-bold w-6 shrink-0">{q.number}.</span>
                        <div className="flex-1 font-medium text-justify whitespace-pre-line">
                          {isEditable ? (
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => handleUpdateSAField(q.id, { question: e.target.value })}
                              className="w-full text-xs p-1 border border-slate-300 rounded font-serif bg-white"
                            />
                          ) : (
                            q.question
                          )}
                        </div>
                      </div>

                      {isEditable ? (
                        <div className="no-print ml-6 mt-1 flex items-center gap-2 text-xs font-sans">
                          <span className="font-bold text-slate-600">Kunci:</span>
                          <input
                            type="text"
                            value={q.correctAnswer}
                            onChange={(e) =>
                              handleUpdateSAField(q.id, {
                                correctAnswer: e.target.value,
                                expectedAnswer: e.target.value,
                              })
                            }
                            className="flex-1 px-2 py-0.5 border border-slate-300 rounded bg-white font-serif"
                          />
                        </div>
                      ) : (
                        <div className="mt-1 text-slate-500 text-[10pt] pl-6">
                          Jawab: .............................................................................................................................
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URAIAN / ESSAY */}
            {essay.length > 0 && (
              <div className="mb-6 break-inside-avoid">
                <div className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-2">
                  {essayRoman}. URAIAN / ESSAY
                </div>
                <div className="text-[9pt] italic mb-3">
                  Jawablah pertanyaan-pertanyaan berikut dengan uraian yang lengkap, sistematis, dan
                  jelas!
                </div>

                <div className="space-y-4">
                  {essay.map((q) => (
                    <div
                      key={q.id}
                      className={`break-inside-avoid relative group rounded-md p-1 transition ${
                        isEditable ? 'border border-dashed border-amber-300 bg-amber-50/20 p-2' : 'hover:bg-slate-50'
                      }`}
                    >
                      {!isEditable && (
                        <button
                          type="button"
                          onClick={() => setAiEditTarget({ type: 'essay', item: q })}
                          title={`Edit soal no. ${q.number} dengan bantuan AI`}
                          className="no-print absolute right-1.5 top-1.5 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] flex items-center space-x-1 shadow-xs"
                        >
                          <Wand2 className="w-3 h-3 text-amber-300" />
                          <span>Edit AI</span>
                        </button>
                      )}
                      {isEditable && (
                        <div className="no-print absolute right-2 top-2 flex items-center space-x-1 font-sans">
                          <button
                            type="button"
                            onClick={() => setAiEditTarget({ type: 'essay', item: q })}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-0.5 rounded-sm text-[10px] font-bold flex items-center space-x-1"
                            title="Revisi soal uraian dengan bantuan AI"
                          >
                            <Wand2 className="w-3 h-3 text-amber-300" />
                            <span>Edit AI</span>
                          </button>
                          <button
                            onClick={() => handleDeleteEssay(q.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-1 rounded-sm"
                            title="Hapus soal"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {q.stimulus && (
                        <div className="text-[9.5pt] italic bg-slate-100/70 p-2 border-l-2 border-slate-600 rounded-r mb-1 leading-relaxed whitespace-pre-line">
                          {q.stimulus}
                        </div>
                      )}

                      <div className="flex items-start pr-8">
                        <span className="font-bold w-6 shrink-0">{q.number}.</span>
                        <div className="flex-1 font-medium text-justify whitespace-pre-line">
                          {isEditable ? (
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => handleUpdateEssayField(q.id, { question: e.target.value })}
                              className="w-full text-xs p-1 border border-slate-300 rounded font-serif bg-white"
                            />
                          ) : (
                            q.question
                          )}
                        </div>
                      </div>

                      {isEditable ? (
                        <div className="no-print ml-6 mt-1 text-xs font-sans">
                          <span className="font-bold text-slate-600 block mb-0.5">Kunci / Pedoman Jawaban:</span>
                          <textarea
                            rows={2}
                            value={q.expectedAnswer}
                            onChange={(e) => handleUpdateEssayField(q.id, { expectedAnswer: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded bg-white font-serif"
                          />
                        </div>
                      ) : (
                        <>
                          {/* Ruang lembar jawaban uraian */}
                          <div className="mt-2 border-b border-dashed border-slate-400 h-10"></div>
                          <div className="border-b border-dashed border-slate-400 h-10"></div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. TANDA TANGAN PENGESAHAN RESMI */}
          <div className="mt-8 pt-4 border-t border-black break-inside-avoid">
            <div className="flex justify-between items-start text-center text-[10pt]">
              <div className="w-[45%]">
                <div>Mengetahui,</div>
                <div className="font-bold">Kepala Sekolah</div>
                <div className="h-16"></div>
                <div className="font-bold underline uppercase">{kopConfig.headmasterName || '........................................'}</div>
                {kopConfig.headmasterNip?.trim() && <div>NIP. {kopConfig.headmasterNip}</div>}
              </div>

              <div className="w-[45%]">
                <div>{kopConfig.cityDate?.trim() || '........................, ..............................'}</div>
                <div className="font-bold">Guru Mata Pelajaran</div>
                <div className="h-16"></div>
                <div className="font-bold underline uppercase">{kopConfig.teacherName || '........................................'}</div>
                {kopConfig.teacherNip?.trim() && <div>NIP. {kopConfig.teacherNip}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Edit Question Modal (outside printable container) */}
      <div className="no-print">
        <AiEditQuestionModal
          isOpen={Boolean(aiEditTarget)}
          onClose={() => setAiEditTarget(null)}
          target={aiEditTarget}
          exam={exam}
          onApplyRevised={handleApplyAiRevision}
        />
      </div>
    </div>
  );
};
