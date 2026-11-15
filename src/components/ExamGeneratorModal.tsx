import React, { useState, useId } from 'react';
import {
  ExamPackage,
  ExamType,
  SchoolLevel,
  SchoolKopConfig,
} from '../types/exam';
import {
  LEVEL_GRADES,
  SUBJECTS_BY_LEVEL,
  DEFAULT_GENERAL_INSTRUCTIONS,
} from '../data/curriculumData';
import { fetchWithAiGateway, parseApiResponse } from '../utils/apiHelper';
import {
  Sparkles,
  X,
  BookOpen,
  Sliders,
  FileCheck2,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface ExamGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  kopConfig: SchoolKopConfig;
  onExamGenerated: (exam: ExamPackage) => void;
}

export const ExamGeneratorModal: React.FC<ExamGeneratorModalProps> = ({
  isOpen,
  onClose,
  kopConfig,
  onExamGenerated,
}) => {
  const [examType, setExamType] = useState<ExamType>('PSAS');
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>('SMP');
  const [grade, setGrade] = useState('Kelas 7 (Fase D)');
  const [subject, setSubject] = useState('Ilmu Pengetahuan Alam (IPA)');
  const [curriculum, setCurriculum] = useState('Kurikulum Merdeka');
  const [academicYear, setAcademicYear] = useState('2024/2025');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [duration, setDuration] = useState('90 Menit');
  const [topic, setTopic] = useState('Ekosistem, Rantai Makanan, dan Dampak Pencemaran Lingkungan');
  const [learningObjectives, setLearningObjectives] = useState(
    'Menganalisis interaksi antar makhluk hidup dan lingkungannya serta merancang solusi atas permasalahan lingkungan hidup di sekitarnya.'
  );

  // Question counts (balanced default: 16 items for fast and reliable generation)
  const [mcCount, setMcCount] = useState(10);
  const [complexMcCount, setComplexMcCount] = useState(2);
  const [matchingCount, setMatchingCount] = useState(1);
  const [shortAnswerCount, setShortAnswerCount] = useState(2);
  const [essayCount, setEssayCount] = useState(1);

  // PG & PGK format styles
  const [pgStyle, setPgStyle] = useState<'standard' | 'with_tf' | 'with_association' | 'mixed' | 'true_false_only'>('standard');
  const [pgkStyle, setPgkStyle] = useState<'mixed' | 'multi_select' | 'benar_salah' | 'true_false' | 'ya_tidak' | 'setuju_tidak'>('mixed');

  // Options count (4 for SD/SMP, 5 for SMA/SMK)
  const isHighSchool = schoolLevel === 'SMA' || schoolLevel === 'SMK' || schoolLevel === 'MA';
  const [optionsCount, setOptionsCount] = useState(isHighSchool ? 5 : 4);

  // Difficulty
  const [difficulty, setDifficulty] = useState<'balanced' | 'hots' | 'easy'>('balanced');
  const [includeStimulus, setIncludeStimulus] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [progressStep, setProgressStep] = useState(0);

  const availableGrades = LEVEL_GRADES[schoolLevel] || [];
  const availableSubjects = SUBJECTS_BY_LEVEL[schoolLevel] || [];

  // Update options count when school level changes
  const handleLevelChange = (lvl: SchoolLevel) => {
    setSchoolLevel(lvl);
    const grades = LEVEL_GRADES[lvl];
    if (grades && grades.length > 0) {
      setGrade(`${grades[0].grade} (${grades[0].phase})`);
    }
    const subjects = SUBJECTS_BY_LEVEL[lvl];
    if (subjects && subjects.length > 0) {
      setSubject(subjects[0].name);
      if (subjects[0].suggestedTopics?.[0]) {
        setTopic(subjects[0].suggestedTopics[0]);
      }
    }
    const high = lvl === 'SMA' || lvl === 'SMK' || lvl === 'MA';
    setOptionsCount(high ? 5 : 4);
  };

  const handleSubjectChange = (subName: string) => {
    setSubject(subName);
    const found = availableSubjects.find((s) => s.name === subName);
    if (found && found.suggestedTopics?.[0]) {
      setTopic(found.suggestedTopics[0]);
    }
  };

  const getExamTitle = () => {
    const titles: Record<ExamType, string> = {
      SAS: `PENILAIAN SUMATIF AKHIR SEMESTER (PSAS) ${semester.toUpperCase()}`,
      PSAS: `PENILAIAN SUMATIF AKHIR SEMESTER (PSAS) ${semester.toUpperCase()}`,
      STS: `PENILAIAN SUMATIF TENGAH SEMESTER (STS) ${semester.toUpperCase()}`,
      SAT: 'PENILAIAN SUMATIF AKHIR TAHUN (SAT)',
      PSAJ: 'PENILAIAN SUMATIF AKHIR JENJANG (PSAJ)',
      AM: 'ASESMEN MADRASAH (AM)',
      US: 'UJIAN SEKOLAH (US)',
      UH: 'ASESMEN FORMATIF / ULANGAN HARIAN',
      CUSTOM: 'NASKAH ASESMEN SEKOLAH',
    };
    return titles[examType] || 'NASKAH UJIAN SEKOLAH';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setProgressStep(1);

    const diffValues =
      difficulty === 'hots'
        ? { easy: 20, medium: 40, hard: 40 }
        : difficulty === 'easy'
        ? { easy: 50, medium: 40, hard: 10 }
        : { easy: 30, medium: 50, hard: 20 };

    try {
      setProgressStep(2); // Generating questions and rubrics
      const response = await fetchWithAiGateway('/api/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examType,
          examTitle: getExamTitle(),
          schoolLevel,
          grade,
          subject,
          curriculum,
          academicYear,
          semester,
          duration,
          topic,
          learningObjectives,
          counts: {
            multipleChoice: Number(mcCount) || 0,
            multipleChoiceOptionsCount: optionsCount,
            complexMultipleChoice: Number(complexMcCount) || 0,
            matching: Number(matchingCount) || 0,
            shortAnswer: Number(shortAnswerCount) || 0,
            essay: Number(essayCount) || 0,
          },
          pgStyle,
          pgkStyle,
          difficulty: diffValues,
          includeStimulus,
          customInstructions,
        }),
      });

      setProgressStep(3); // Parsing response
      const result = await parseApiResponse<{ success: boolean; data: any; error?: string }>(response);
      const generatedData = result.data;

      const mcList = (generatedData.multipleChoice || []).map((q: any, i: number) => ({
        ...q,
        id: `mc-${i + 1}-${Date.now()}`,
        number: i + 1,
      }));
      const cmcList = (generatedData.complexMultipleChoice || []).map((q: any, i: number) => ({
        ...q,
        id: `cmc-${i + 1}-${Date.now()}`,
        number: mcList.length + i + 1,
      }));
      const mList = (generatedData.matching || []).map((q: any, i: number) => ({
        ...q,
        id: `m-${i + 1}-${Date.now()}`,
        number: mcList.length + cmcList.length + i + 1,
      }));
      const saList = (generatedData.shortAnswer || []).map((q: any, i: number) => ({
        ...q,
        id: `sa-${i + 1}-${Date.now()}`,
        number: mcList.length + cmcList.length + mList.length + i + 1,
      }));
      const esList = (generatedData.essay || []).map((q: any, i: number) => ({
        ...q,
        id: `es-${i + 1}-${Date.now()}`,
        number: mcList.length + cmcList.length + mList.length + saList.length + i + 1,
      }));

      // Proportional fallback weights matching generated counts
      const rawPoints = {
        mc: mcList.length * 1,
        cmc: cmcList.length * 2,
        m: mList.length * 3,
        sa: saList.length * 2,
        es: esList.length * 5,
      };
      const sumRaw = rawPoints.mc + rawPoints.cmc + rawPoints.m + rawPoints.sa + rawPoints.es || 1;
      const mcW = Math.round((rawPoints.mc / sumRaw) * 100);
      const cmcW = Math.round((rawPoints.cmc / sumRaw) * 100);
      const mW = Math.round((rawPoints.m / sumRaw) * 100);
      const saW = Math.round((rawPoints.sa / sumRaw) * 100);
      const esW = Math.max(0, 100 - (mcW + cmcW + mW + saW));

      // Construct complete exam package
      const newPackage: ExamPackage = {
        id: `exam-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kopConfig,
        examSummary: {
          title: generatedData.examSummary?.title || getExamTitle(),
          examType,
          schoolLevel,
          grade,
          subject,
          curriculum,
          academicYear,
          semester,
          duration,
          generalInstructions:
            generatedData.examSummary?.generalInstructions?.length > 0
              ? generatedData.examSummary.generalInstructions
              : DEFAULT_GENERAL_INSTRUCTIONS,
        },
        multipleChoice: mcList,
        complexMultipleChoice: cmcList,
        matching: mList,
        shortAnswer: saList,
        essay: esList,
        scoringGuidelines: generatedData.scoringGuidelines || {
          mcWeight: mcW,
          complexMcWeight: cmcW,
          matchingWeight: mW,
          shortAnswerWeight: saW,
          essayWeight: esW,
          formula: 'Nilai Akhir = (Skor Perolehan / Total Skor Maksimal) x 100',
        },
      };

      onExamGenerated(newPackage);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Gagal menghubungi server generator AI. Pastikan API key aktif.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSubjectObj = availableSubjects.find((s) => s.name === subject);
  const totalQuestions =
    Number(mcCount) +
    Number(complexMcCount) +
    Number(matchingCount) +
    Number(shortAnswerCount) +
    Number(essayCount);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Generator Naskah Soal Ujian Otomatis</h2>
              </div>
              <p className="text-xs text-blue-100">
                Buat naskah PSAS, STS, PSAJ, SAT lengkap dengan variasi PG, PG Kompleks, T/F, Menjodohkan, Kisi-Kisi & Kunci Jawaban
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="bg-blue-50/95 border-b border-blue-200 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-700 rounded-full animate-spin"></div>
              <Sparkles className="w-5 h-5 text-amber-500 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-950">
                Sedang Menyusun Naskah Ujian Standar Kemdikbud...
              </h3>
              <p className="text-xs text-blue-700 max-w-md mt-1">
                AI sedang merumuskan stimulus kontekstual, butir soal, kunci jawaban yang tepat,
                pembahasan ilmiah, kisi-kisi Capaian Pembelajaran, dan rubrik penskoran.
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-medium text-slate-600">
              <span
                className={`flex items-center space-x-1 ${
                  progressStep >= 1 ? 'text-blue-700 font-bold' : ''
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>1. Menyiapkan Parameter</span>
              </span>
              <span>&rarr;</span>
              <span
                className={`flex items-center space-x-1 ${
                  progressStep >= 2 ? 'text-blue-700 font-bold' : ''
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>2. Generator Soal & HOTS</span>
              </span>
              <span>&rarr;</span>
              <span
                className={`flex items-center space-x-1 ${
                  progressStep >= 3 ? 'text-blue-700 font-bold' : ''
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3. Format Dokumen Siap Cetak</span>
              </span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Gagal Menghasilkan Naskah:</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Bagian 1: Jenis Ujian & Kurikulum */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
              <span>1. Jenis Ujian & Tingkat Satuan Pendidikan</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {[
                { type: 'PSAS', label: 'PSAS', desc: 'Penilaian Sumatif Akhir' },
                { type: 'STS', label: 'STS', desc: 'Sumatif Tengah Sem.' },
                { type: 'PSAJ', label: 'PSAJ', desc: 'Akhir Jenjang' },
                { type: 'SAT', label: 'SAT', desc: 'Akhir Tahun' },
                { type: 'AM', label: 'AM', desc: 'Asesmen Madrasah' },
                { type: 'US', label: 'US', desc: 'Ujian Sekolah' },
                { type: 'UH', label: 'UH', desc: 'Ulangan Harian' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setExamType(item.type as ExamType)}
                  title={item.type === 'PSAS' ? 'Penilaian Sumatif Akhir Semester' : item.desc}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                    examType === item.type
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/30'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-sm">{item.label}</span>
                  <span className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Jenjang, Kelas, Mapel, Kurikulum */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jenjang Sekolah</label>
              <select
                value={schoolLevel}
                onChange={(e) => handleLevelChange(e.target.value as SchoolLevel)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="SD">SD (Sekolah Dasar)</option>
                <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                <option value="MA">MA (Madrasah Aliyah)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kelas / Fase</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                {availableGrades.map((g) => (
                  <option key={g.grade} value={`${g.grade} (${g.phase})`}>
                    {g.grade} - {g.phase}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Mata Pelajaran</label>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {availableSubjects.length} Mapel
                </span>
              </div>
              <select
                value={availableSubjects.some((s) => s.name === subject) ? subject : ''}
                onChange={(e) => {
                  if (e.target.value) handleSubjectChange(e.target.value);
                }}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="">-- Pilih dari Kurikulum {schoolLevel} ({availableSubjects.length} mapel) --</option>
                <optgroup label={`Mata Pelajaran Wajib / Umum (${schoolLevel})`}>
                  {availableSubjects
                    .filter((s) => s.category === 'Wajib')
                    .map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                </optgroup>
                {availableSubjects.some((s) => s.category === 'Pilihan') && (
                  <optgroup label={schoolLevel === 'SMK' ? 'Konsentrasi Keahlian / Kejuruan (SMK)' : 'Peminatan / Pilihan'}>
                    {availableSubjects
                      .filter((s) => s.category === 'Pilihan')
                      .map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
              <input
                type="text"
                list="subject-suggestions"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 mt-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                placeholder="Atau ketik langsung nama mapel / kejuruan"
              />
              <datalist id="subject-suggestions">
                {availableSubjects.map((s) => (
                  <option key={s.name} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kurikulum</label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                <option value="Kurikulum 2013 (K-13)">Kurikulum 2013 (K-13)</option>
                <option value="KTSP 2006">KTSP 2006</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2024/2025"
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Ganjil">Semester Ganjil (1)</option>
                <option value="Genap">Semester Genap (2)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alokasi Waktu</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="45 Menit">45 Menit</option>
                <option value="60 Menit">60 Menit</option>
                <option value="90 Menit">90 Menit (Standar)</option>
                <option value="120 Menit">120 Menit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Format Opsi PG</label>
              <select
                value={optionsCount}
                onChange={(e) => setOptionsCount(Number(e.target.value))}
                className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value={4}>4 Pilihan (A - D) [SD & SMP]</option>
                <option value={5}>5 Pilihan (A - E) [SMA & SMK]</option>
              </select>
            </div>
          </div>

          {/* Bagian 2: Materi & Capaian Pembelajaran */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Ruang Lingkup Materi & Capaian Pembelajaran (CP)</span>
            </label>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Topik / Bab Pokok Ujian:
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Misal: Klasifikasi Makhluk Hidup, Ekosistem, dan Pencemaran Lingkungan"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              {/* Rekomendasi Topik Kurikulum */}
              {selectedSubjectObj && selectedSubjectObj.suggestedTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1">
                    <Lightbulb className="w-3 h-3 text-amber-500" />
                    <span>Saran Topik:</span>
                  </span>
                  {selectedSubjectObj.suggestedTopics.slice(0, 4).map((top) => (
                    <button
                      type="button"
                      key={top}
                      onClick={() => setTopic(top)}
                      className="text-[11px] bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 px-2 py-0.5 rounded-md border border-slate-200 transition"
                    >
                      {top}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Capaian Pembelajaran (CP) / Tujuan Pembelajaran (TP) / KD (Opsional):
                </label>
                <textarea
                  rows={2}
                  value={learningObjectives}
                  onChange={(e) => setLearningObjectives(e.target.value)}
                  placeholder="Contoh: Peserta didik dapat menganalisis interaksi antar makhluk hidup dan lingkungannya..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Bagian 3: Komposisi Jumlah Soal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>3. Komposisi Bentuk Soal (Total: {totalQuestions} Butir)</span>
              </label>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                {totalQuestions} Soal
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilihan Ganda
                </span>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={mcCount}
                  onChange={(e) => setMcCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-center text-sm font-extrabold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {pgStyle === 'true_false_only'
                    ? '2 Opsi (T/F)'
                    : `${optionsCount} Opsi (A-${optionsCount === 5 ? 'E' : 'D'})`}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">
                  PG Kompleks
                </span>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={complexMcCount}
                  onChange={(e) => setComplexMcCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-center text-sm font-extrabold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Multi-Pilih / T/F / B-S</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">
                  Menjodohkan
                </span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={matchingCount}
                  onChange={(e) => setMatchingCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-center text-sm font-extrabold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Premis & Respon</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">
                  Isian Singkat
                </span>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={shortAnswerCount}
                  onChange={(e) => setShortAnswerCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-center text-sm font-extrabold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Kata Kunci/Pasti</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">
                  Uraian / Essay
                </span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={essayCount}
                  onChange={(e) => setEssayCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full text-center text-sm font-extrabold px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">+ Rubrik Penilaian</span>
              </div>
            </div>

            {/* Variasi Format PG & PG Kompleks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Variasi Bentuk Pilihan Ganda (PG):
                </label>
                <select
                  value={pgStyle}
                  onChange={(e) => setPgStyle(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                >
                  <option value="standard">PG Standar (4/5 Opsi Tunggal)</option>
                  <option value="with_tf">Campuran PG Standar + True/False (T/F)</option>
                  <option value="with_association">Campuran PG + Asosiasi (1,2,3,4) & Sebab–Akibat</option>
                  <option value="mixed">Campuran Lengkap (Standar + T/F + Asosiasi + Sebab–Akibat)</option>
                  <option value="true_false_only">Khusus True / False (T/F 2 Opsi)</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Format PG Kompleks (AKM / Evaluasi Biner):
                </label>
                <select
                  value={pgkStyle}
                  onChange={(e) => setPgkStyle(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                >
                  <option value="mixed">Campuran AKM (Multi-Pilih Centang + Tabel Evaluasi)</option>
                  <option value="multi_select">Multi-Pilih Centang (Banyak Jawaban Benar)</option>
                  <option value="benar_salah">Tabel Pernyataan: Benar / Salah (B / S)</option>
                  <option value="true_false">Tabel Pernyataan: True / False (T / F)</option>
                  <option value="ya_tidak">Tabel Pernyataan: Ya / Tidak (Y / T)</option>
                  <option value="setuju_tidak">Tabel Pernyataan: Setuju / Tidak Setuju (S / TS)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bagian 4: Tingkat Kesukaran & Preferensi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Distribusi Tingkat Kesukaran & Taksonomi Bloom:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDifficulty('balanced')}
                  className={`p-2.5 rounded-lg border text-left ${
                    difficulty === 'balanced'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>Seimbang (Standard)</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    30% Mudah · 50% Sedang · 20% HOTS
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDifficulty('hots')}
                  className={`p-2.5 rounded-lg border text-left ${
                    difficulty === 'hots'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>Dominan HOTS</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    20% Mudah · 40% Sedang · 40% Penalaran
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDifficulty('easy')}
                  className={`p-2.5 rounded-lg border text-left ${
                    difficulty === 'easy'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>Dasar / Remedial</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    50% Mudah · 40% Sedang · 10% HOTS
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-start space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeStimulus}
                  onChange={(e) => setIncludeStimulus(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold text-slate-800">
                    Sertakan Stimulus Wacana Kontekstual & Literasi (Gaya Asesmen Nasional/AKM)
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Menghasilkan bacaan pengantar, kasus nyata, atau data tabel sebelum butir soal diajukan.
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Instruksi Khusus Tambahan untuk AI (Opsional):
                </label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Contoh: Fokus pada soal studi kasus lingkungan pesisir Indonesia"
                  className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Estimasi pengerjaan AI: ~10 - 20 detik</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 text-xs font-bold text-white bg-linear-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-xl shadow-md flex items-center space-x-2 transition disabled:opacity-60"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Hasilkan Naskah Soal Otomatis</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
