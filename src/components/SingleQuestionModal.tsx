import React, { useState } from 'react';
import {
  QuestionType,
  MultipleChoiceVariant,
  ComplexMcVariant,
  StatementLabels,
} from '../types/exam';
import { STATEMENT_LABEL_PRESETS } from '../utils/questionHelpers';
import { PlusCircle, Sparkles, X, AlertCircle, PenTool, Plus, Trash2 } from 'lucide-react';
import { fetchWithAiGateway, parseApiResponse } from '../utils/apiHelper';

interface SingleQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  grade: string;
  nextNumber: number;
  optionsCount: number;
  onQuestionAdded: (type: QuestionType, questionObj: any) => void;
}

type FormatOptionKey =
  | 'pg_standard'
  | 'pg_true_false'
  | 'pg_association'
  | 'pg_cause_effect'
  | 'pgk_multi_select'
  | 'pgk_benar_salah'
  | 'pgk_true_false'
  | 'pgk_ya_tidak'
  | 'pgk_setuju_tidak'
  | 'matching'
  | 'shortAnswer'
  | 'essay';

const FORMAT_OPTIONS: {
  id: FormatOptionKey;
  type: QuestionType;
  subVariant: string;
  label: string;
  hint: string;
}[] = [
  { id: 'pg_standard', type: 'multipleChoice', subVariant: 'standard', label: 'Pilihan Ganda Biasa (1 Jawaban)', hint: '4 atau 5 opsi A–D/E' },
  { id: 'pg_true_false', type: 'multipleChoice', subVariant: 'true_false', label: 'Pilihan Ganda True / False (T/F Tunggal)', hint: '2 opsi True/False atau Benar/Salah' },
  { id: 'pg_association', type: 'multipleChoice', subVariant: 'association', label: 'PG Asosiasi (Pernyataan 1, 2, 3, 4)', hint: 'Kombinasi nomor dalam opsi A–E' },
  { id: 'pg_cause_effect', type: 'multipleChoice', subVariant: 'cause_effect', label: 'PG Hubungan Sebab–Akibat (Pernyataan–Alasan)', hint: 'Analisis pernyataan dan alasan' },
  { id: 'pgk_multi_select', type: 'complexMultipleChoice', subVariant: 'multi_select', label: 'PG Kompleks: Multi-Pilih Centang (>1 Kunci)', hint: 'Pilih lebih dari satu opsi benar' },
  { id: 'pgk_benar_salah', type: 'complexMultipleChoice', subVariant: 'benar_salah', label: 'PG Kompleks: Tabel Benar / Salah (B / S)', hint: 'Tabel ceklist tiap pernyataan' },
  { id: 'pgk_true_false', type: 'complexMultipleChoice', subVariant: 'true_false', label: 'PG Kompleks: Tabel True / False (T / F)', hint: 'Tabel ceklist kolom True / False' },
  { id: 'pgk_ya_tidak', type: 'complexMultipleChoice', subVariant: 'ya_tidak', label: 'PG Kompleks: Tabel Ya / Tidak (Y / T)', hint: 'Tabel ceklist kolom Ya / Tidak' },
  { id: 'pgk_setuju_tidak', type: 'complexMultipleChoice', subVariant: 'setuju_tidak', label: 'PG Kompleks: Tabel Setuju / Tidak Setuju', hint: 'Tabel evaluasi sikap/opini' },
  { id: 'matching', type: 'matching', subVariant: 'matching', label: 'Menjodohkan (Matching)', hint: 'Pasangan kolom kiri, kanan & pengecoh' },
  { id: 'shortAnswer', type: 'shortAnswer', subVariant: 'shortAnswer', label: 'Isian Singkat', hint: 'Jawaban kata kunci / angka pasti' },
  { id: 'essay', type: 'essay', subVariant: 'essay', label: 'Uraian / Essay', hint: 'Soal uraian + rubrik penskoran' },
];

export const SingleQuestionModal: React.FC<SingleQuestionModalProps> = ({
  isOpen,
  onClose,
  subject,
  grade,
  nextNumber,
  optionsCount,
  onQuestionAdded,
}) => {
  const [creationMode, setCreationMode] = useState<'ai' | 'manual'>('ai');
  const [selectedFormat, setSelectedFormat] = useState<FormatOptionKey>('pg_standard');

  // AI Mode fields
  const [topic, setTopic] = useState('');
  const [cognitiveLevel, setCognitiveLevel] = useState('C4 (HOTS / Penalaran)');
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Manual Mode fields
  const [manualStimulus, setManualStimulus] = useState('');
  const [manualQuestion, setManualQuestion] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');
  const [manualIndicator, setManualIndicator] = useState('');
  const [manualOptions, setManualOptions] = useState<{ key: string; text: string }[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ]);
  const [manualSingleKey, setManualSingleKey] = useState('A');
  const [manualMultiKeys, setManualMultiKeys] = useState<string[]>(['A', 'B']);
  const [manualStatements, setManualStatements] = useState<{ statement: string; isCorrect: boolean }[]>([
    { statement: '', isCorrect: true },
    { statement: '', isCorrect: false },
    { statement: '', isCorrect: true },
  ]);
  const [manualPairs, setManualPairs] = useState<{ premise: string; match: string }[]>([
    { premise: '', match: '' },
    { premise: '', match: '' },
    { premise: '', match: '' },
  ]);
  const [manualDistractor, setManualDistractor] = useState('');
  const [manualShortAnswer, setManualShortAnswer] = useState('');
  const [manualEssayAnswer, setManualEssayAnswer] = useState('');

  if (!isOpen) return null;

  const activeSpec = FORMAT_OPTIONS.find((f) => f.id === selectedFormat) || FORMAT_OPTIONS[0];

  const handleFormatChange = (newFmt: FormatOptionKey) => {
    setSelectedFormat(newFmt);
    if (newFmt === 'pg_true_false') {
      setManualOptions([
        { key: 'A', text: 'True' },
        { key: 'B', text: 'False' },
      ]);
      setManualSingleKey('A');
    } else if (newFmt.startsWith('pg')) {
      const count = optionsCount >= 5 ? 5 : 4;
      setManualOptions(
        Array.from({ length: count }, (_, i) => ({
          key: String.fromCharCode(65 + i),
          text:
            newFmt === 'pg_cause_effect'
              ? [
                  'Pernyataan benar, alasan benar, keduanya menunjukkan hubungan sebab akibat',
                  'Pernyataan benar, alasan benar, tetapi tidak menunjukkan hubungan sebab akibat',
                  'Pernyataan benar, alasan salah',
                  'Pernyataan salah, alasan benar',
                  'Pernyataan salah dan alasan salah',
                ][i] || ''
              : '',
        }))
      );
      setManualSingleKey('A');
    }
  };

  const handleSubmitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const customLabels = STATEMENT_LABEL_PRESETS[activeSpec.subVariant];
      const response = await fetchWithAiGateway('/api/generate-single-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeSpec.type,
          subVariant: activeSpec.subVariant,
          customLabels,
          subject,
          grade,
          topic: topic || subject,
          cognitiveLevel,
          optionsCount: selectedFormat === 'pg_true_false' ? 2 : optionsCount,
          instruction,
        }),
      });

      const result = await parseApiResponse<{ success: boolean; data: any; error?: string }>(response);
      const q = result.data;
      q.id = `q-single-${Date.now()}`;
      q.number = nextNumber;

      onQuestionAdded(activeSpec.type, q);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghasilkan butir soal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const id = `q-manual-${Date.now()}`;

    if (activeSpec.type === 'multipleChoice') {
      if (!manualQuestion.trim()) {
        setErrorMessage('Rumusan pertanyaan tidak boleh kosong.');
        return;
      }
      const cleanedOpts = manualOptions.filter((o) => o.text.trim().length > 0);
      if (cleanedOpts.length < 2) {
        setErrorMessage('Minimal harus ada 2 pilihan jawaban yang terisi.');
        return;
      }
      const variant: MultipleChoiceVariant =
        selectedFormat === 'pg_true_false'
          ? 'true_false'
          : selectedFormat === 'pg_association'
          ? 'association'
          : selectedFormat === 'pg_cause_effect'
          ? 'cause_effect'
          : 'standard';

      onQuestionAdded('multipleChoice', {
        id,
        number: nextNumber,
        variant,
        stimulus: manualStimulus.trim() || undefined,
        question: manualQuestion.trim(),
        options: cleanedOpts,
        correctAnswer: cleanedOpts.some((o) => o.key === manualSingleKey) ? manualSingleKey : cleanedOpts[0].key,
        explanation: manualExplanation.trim(),
        cognitiveLevel,
        indicator: manualIndicator.trim(),
        score: 1,
      });
      onClose();
      return;
    }

    if (activeSpec.type === 'complexMultipleChoice') {
      if (!manualQuestion.trim()) {
        setErrorMessage('Rumusan pertanyaan/perintah tidak boleh kosong.');
        return;
      }
      if (selectedFormat === 'pgk_multi_select') {
        const cleanedOpts = manualOptions.filter((o) => o.text.trim().length > 0);
        if (cleanedOpts.length < 3 || manualMultiKeys.length < 1) {
          setErrorMessage('Minimal harus ada 3 opsi terisi dan 1 kunci jawaban tercentang.');
          return;
        }
        onQuestionAdded('complexMultipleChoice', {
          id,
          number: nextNumber,
          variant: 'multi_select' as ComplexMcVariant,
          stimulus: manualStimulus.trim() || undefined,
          question: manualQuestion.trim(),
          options: cleanedOpts,
          correctAnswer: manualMultiKeys,
          explanation: manualExplanation.trim(),
          cognitiveLevel,
          indicator: manualIndicator.trim(),
          score: 2,
        });
      } else {
        const cleanedStmts = manualStatements.filter((s) => s.statement.trim().length > 0);
        if (cleanedStmts.length < 2) {
          setErrorMessage('Minimal harus ada 2 pernyataan dalam tabel.');
          return;
        }
        const labels: StatementLabels =
          STATEMENT_LABEL_PRESETS[activeSpec.subVariant] || STATEMENT_LABEL_PRESETS.benar_salah;
        const variant: ComplexMcVariant =
          activeSpec.subVariant === 'true_false'
            ? 'true_false'
            : activeSpec.subVariant === 'benar_salah'
            ? 'benar_salah'
            : 'binary_table';
        onQuestionAdded('complexMultipleChoice', {
          id,
          number: nextNumber,
          variant,
          statementLabels: labels,
          stimulus: manualStimulus.trim() || undefined,
          question: manualQuestion.trim(),
          statements: cleanedStmts,
          explanation: manualExplanation.trim(),
          cognitiveLevel,
          indicator: manualIndicator.trim(),
          score: cleanedStmts.length,
        });
      }
      onClose();
      return;
    }

    if (activeSpec.type === 'matching') {
      const cleanedPairs = manualPairs.filter((p) => p.premise.trim() && p.match.trim());
      if (cleanedPairs.length < 2) {
        setErrorMessage('Minimal harus ada 2 pasangan premis dan jawaban.');
        return;
      }
      onQuestionAdded('matching', {
        id,
        number: nextNumber,
        instruction: manualQuestion.trim() || 'Pasangkanlah pernyataan di sebelah kiri dengan pilihan yang tepat di sebelah kanan!',
        pairs: cleanedPairs,
        distractors: manualDistractor.trim() ? [manualDistractor.trim()] : [],
        explanation: manualExplanation.trim(),
        cognitiveLevel,
        indicator: manualIndicator.trim(),
        score: cleanedPairs.length,
      });
      onClose();
      return;
    }

    if (activeSpec.type === 'shortAnswer') {
      if (!manualQuestion.trim() || !manualShortAnswer.trim()) {
        setErrorMessage('Pertanyaan dan kunci jawaban singkat wajib diisi.');
        return;
      }
      onQuestionAdded('shortAnswer', {
        id,
        number: nextNumber,
        stimulus: manualStimulus.trim() || undefined,
        question: manualQuestion.trim(),
        correctAnswer: manualShortAnswer.trim(),
        explanation: manualExplanation.trim(),
        cognitiveLevel,
        indicator: manualIndicator.trim(),
        score: 2,
      });
      onClose();
      return;
    }

    if (activeSpec.type === 'essay') {
      if (!manualQuestion.trim()) {
        setErrorMessage('Pertanyaan uraian tidak boleh kosong.');
        return;
      }
      onQuestionAdded('essay', {
        id,
        number: nextNumber,
        stimulus: manualStimulus.trim() || undefined,
        question: manualQuestion.trim(),
        expectedAnswer: manualEssayAnswer.trim() || 'Sesuai rubrik penilaian.',
        scoringRubric: [{ criteria: 'Ketepatan analisis dan kelengkapan jawaban', points: 4 }],
        cognitiveLevel,
        indicator: manualIndicator.trim(),
        score: 4,
      });
      onClose();
    }
  };

  const toggleMultiKey = (key: string) => {
    setManualMultiKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].sort()
    );
  };

  const manualLbl = STATEMENT_LABEL_PRESETS[activeSpec.subVariant] || STATEMENT_LABEL_PRESETS.benar_salah;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        <div className="bg-linear-to-r from-indigo-800 to-blue-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-amber-300" />
            <h2 className="text-base font-bold">Tambah Butir Soal Baru (Nomor {nextNumber})</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-200 bg-slate-50 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setCreationMode('ai')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              creationMode === 'ai'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Generate Otomatis (AI)</span>
          </button>
          <button
            type="button"
            onClick={() => setCreationMode('manual')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
              creationMode === 'manual'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Tulis Manual Sendiri</span>
          </button>
        </div>

        <form
          onSubmit={creationMode === 'ai' ? handleSubmitAi : handleSubmitManual}
          className="p-6 space-y-4 overflow-y-auto flex-1"
        >
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bentuk & Variasi Soal</label>
            <select
              value={selectedFormat}
              onChange={(e) => handleFormatChange(e.target.value as FormatOptionKey)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
            >
              <optgroup label="Pilihan Ganda & Variasi">
                {FORMAT_OPTIONS.filter((f) => f.type === 'multipleChoice').map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} — {f.hint}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Pilihan Ganda Kompleks (AKM)">
                {FORMAT_OPTIONS.filter((f) => f.type === 'complexMultipleChoice').map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} — {f.hint}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Bentuk Soal Lainnya">
                {FORMAT_OPTIONS.filter((f) => !['multipleChoice', 'complexMultipleChoice'].includes(f.type)).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} — {f.hint}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {creationMode === 'ai' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topik / Materi Spesifik Butir Soal:
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Perhitungan gaya gesek, keamanan digital, atau hukum Newton..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tingkat Kognitif / Taksonomi:
                </label>
                <select
                  value={cognitiveLevel}
                  onChange={(e) => setCognitiveLevel(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="C1 (Mengingat / Pengetahuan)">C1 - Mengingat / LOTS</option>
                  <option value="C2 (Pemahaman Konsep)">C2 - Pemahaman Konsep</option>
                  <option value="C3 (Aplikasi / Penerapan)">C3 - Aplikasi / MOTS</option>
                  <option value="C4 (HOTS / Analisis Kasus)">C4 - Analisis Kasus / HOTS</option>
                  <option value="C5 (HOTS / Evaluasi)">C5 - Evaluasi / HOTS</option>
                  <option value="C6 (HOTS / Kreasi & Desain)">C6 - Kreasi & Solusi / HOTS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Khusus untuk Butir Soal Ini (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Contoh: Gunakan stimulus tabel data pengamatan, atau gunakan pernyataan True/False berbahasa Inggris."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Stimulus / Wacana (Opsional)</label>
                <textarea
                  rows={2}
                  value={manualStimulus}
                  onChange={(e) => setManualStimulus(e.target.value)}
                  placeholder="Teks pengantar / kutipan bacaan / studi kasus jika ada..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {activeSpec.type === 'matching' ? 'Instruksi Menjodohkan' : 'Rumusan Pertanyaan / Soal'} *
                </label>
                <textarea
                  rows={3}
                  value={manualQuestion}
                  onChange={(e) => setManualQuestion(e.target.value)}
                  placeholder={
                    selectedFormat === 'pg_association'
                      ? 'Perhatikan pernyataan berikut:\n(1) ...\n(2) ...\n(3) ...\n(4) ...\nPernyataan yang benar adalah...'
                      : selectedFormat === 'pg_true_false'
                      ? 'Tentukan apakah pernyataan berikut True atau False (Benar atau Salah): ...'
                      : 'Tuliskan rumusan pertanyaan atau perintah soal...'
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Manual MC or PGK Multi-Select Options */}
              {(activeSpec.type === 'multipleChoice' || selectedFormat === 'pgk_multi_select') && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {selectedFormat === 'pgk_multi_select'
                        ? 'Opsi & Kunci Jawaban (Centang >= 2 jawaban benar):'
                        : 'Opsi Jawaban (Pilih 1 kunci benar):'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (manualOptions.length < 5) {
                          setManualOptions([
                            ...manualOptions,
                            { key: String.fromCharCode(65 + manualOptions.length), text: '' },
                          ]);
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Opsi</span>
                    </button>
                  </div>

                  {manualOptions.map((opt, idx) => {
                    const isChecked =
                      selectedFormat === 'pgk_multi_select'
                        ? manualMultiKeys.includes(opt.key)
                        : manualSingleKey === opt.key;
                    return (
                      <div key={opt.key} className="flex items-center space-x-2">
                        <input
                          type={selectedFormat === 'pgk_multi_select' ? 'checkbox' : 'radio'}
                          name="manualCorrectKey"
                          checked={isChecked}
                          onChange={() =>
                            selectedFormat === 'pgk_multi_select'
                              ? toggleMultiKey(opt.key)
                              : setManualSingleKey(opt.key)
                          }
                          title="Tandai sebagai kunci jawaban"
                          className="w-4 h-4 accent-emerald-600"
                        />
                        <span className="font-bold text-xs w-5">{opt.key}.</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) =>
                            setManualOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, text: e.target.value } : o))
                            )
                          }
                          placeholder={`Isi teks opsi ${opt.key}`}
                          className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                        {manualOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              setManualOptions((prev) =>
                                prev
                                  .filter((_, i) => i !== idx)
                                  .map((o, i) => ({ ...o, key: String.fromCharCode(65 + i) }))
                              )
                            }
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Manual PGK Binary Table Statements */}
              {activeSpec.type === 'complexMultipleChoice' && selectedFormat !== 'pgk_multi_select' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Daftar Pernyataan ({manualLbl.positive} / {manualLbl.negative})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setManualStatements((prev) => [...prev, { statement: '', isCorrect: true }])
                      }
                      className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Baris</span>
                    </button>
                  </div>
                  {manualStatements.map((st, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={st.statement}
                        onChange={(e) =>
                          setManualStatements((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, statement: e.target.value } : item))
                          )
                        }
                        placeholder={`Pernyataan ${idx + 1}`}
                        className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setManualStatements((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, isCorrect: !item.isCorrect } : item))
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                          st.isCorrect
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-rose-100 border-rose-300 text-rose-800'
                        }`}
                      >
                        {st.isCorrect ? manualLbl.positive : manualLbl.negative}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Matching */}
              {activeSpec.type === 'matching' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Pasangan Premis (Kiri) & Jawaban (Kanan)</span>
                    <button
                      type="button"
                      onClick={() => setManualPairs((prev) => [...prev, { premise: '', match: '' }])}
                      className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Pasangan</span>
                    </button>
                  </div>
                  {manualPairs.map((pair, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={pair.premise}
                        onChange={(e) =>
                          setManualPairs((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, premise: e.target.value } : p))
                          )
                        }
                        placeholder={`Premis ${idx + 1}`}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                      <input
                        type="text"
                        value={pair.match}
                        onChange={(e) =>
                          setManualPairs((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, match: e.target.value } : p))
                          )
                        }
                        placeholder={`Pasangan ${idx + 1}`}
                        className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  ))}
                  <input
                    type="text"
                    value={manualDistractor}
                    onChange={(e) => setManualDistractor(e.target.value)}
                    placeholder="Pengecoh tambahan di kolom kanan (opsional)"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              {/* Manual Short Answer */}
              {activeSpec.type === 'shortAnswer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kunci Jawaban Singkat *</label>
                  <input
                    type="text"
                    value={manualShortAnswer}
                    onChange={(e) => setManualShortAnswer(e.target.value)}
                    placeholder="Contoh: Fotosintesis"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              {/* Manual Essay */}
              {activeSpec.type === 'essay' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kunci / Ekspektasi Jawaban Uraian</label>
                  <textarea
                    rows={2}
                    value={manualEssayAnswer}
                    onChange={(e) => setManualEssayAnswer(e.target.value)}
                    placeholder="Uraikan poin-poin jawaban yang diharapkan..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Indikator Kisi-Kisi (Opsional)</label>
                  <input
                    type="text"
                    value={manualIndicator}
                    onChange={(e) => setManualIndicator(e.target.value)}
                    placeholder="Disajikan teks/data, peserta didik dapat..."
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pembahasan Singkat (Opsional)</label>
                  <input
                    type="text"
                    value={manualExplanation}
                    onChange={(e) => setManualExplanation(e.target.value)}
                    placeholder="Penjelasan kunci jawaban..."
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm flex items-center space-x-2 transition disabled:opacity-50"
            >
              {creationMode === 'ai' ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isLoading ? 'Sedang Merumuskan Butir Soal...' : 'Buat Butir Soal dengan AI'}</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-amber-300" />
                  <span>Tambahkan ke Naskah</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
