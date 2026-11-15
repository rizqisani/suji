import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ExamPackage, SchoolKopConfig } from '../types/exam';
import {
  FolderArchive,
  X,
  Trash2,
  Copy,
  Download,
  Upload,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCode,
  Search,
  RotateCcw,
  Clock,
  Building2,
  Filter,
} from 'lucide-react';
import { parseAndNormalizeExamJson } from '../utils/examImporter';
import { applyAnswerKeyJsonToExam } from '../utils/answerKeyImporter';

interface QuestionBankDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  exams: ExamPackage[];
  currentExamId: string;
  onSelectExam: (exam: ExamPackage) => void;
  onDuplicateExam: (exam: ExamPackage) => void;
  onDeleteExam: (id: string) => void;
  onImportExam?: (imported: ExamPackage) => void;
  onImportExams?: (importedList: ExamPackage[]) => void;
  onUpdateCurrentExam?: (updated: ExamPackage, message: string) => void;
  kopConfig?: SchoolKopConfig;
}

type SortOption = 'newest' | 'oldest' | 'subject_asc' | 'questions_desc';

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'Soal'
  );
}

function normalizeExamTypeDisplay(examType?: string): string {
  if (!examType || examType === 'SAS') return 'PSAS';
  return examType;
}

function formatHistoryDate(iso?: string): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

function getExamTotalQuestions(exam: ExamPackage): number {
  return (
    (exam.multipleChoice?.length || 0) +
    (exam.complexMultipleChoice?.length || 0) +
    (exam.matching?.length || 0) +
    (exam.shortAnswer?.length || 0) +
    (exam.essay?.length || 0)
  );
}

export const QuestionBankDrawer: React.FC<QuestionBankDrawerProps> = ({
  isOpen,
  onClose,
  exams,
  currentExamId,
  onSelectExam,
  onDuplicateExam,
  onDeleteExam,
  onImportExam,
  onImportExams,
  onUpdateCurrentExam,
  kopConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Search, Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamType, setFilterExamType] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterSemester, setFilterSemester] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const availableExamTypes = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => set.add(normalizeExamTypeDisplay(e.examSummary?.examType)));
    return Array.from(set).sort();
  }, [exams]);

  const availableLevels = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.examSummary?.schoolLevel) set.add(e.examSummary.schoolLevel);
    });
    return Array.from(set).sort();
  }, [exams]);

  useEffect(() => {
    if (filterExamType !== 'ALL' && !availableExamTypes.includes(filterExamType)) {
      setFilterExamType('ALL');
    }
  }, [availableExamTypes, filterExamType]);

  useEffect(() => {
    if (filterLevel !== 'ALL' && !availableLevels.includes(filterLevel)) {
      setFilterLevel('ALL');
    }
  }, [availableLevels, filterLevel]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterExamType !== 'ALL' ||
    filterLevel !== 'ALL' ||
    filterSemester !== 'ALL' ||
    sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterExamType('ALL');
    setFilterLevel('ALL');
    setFilterSemester('ALL');
    setSortBy('newest');
  };

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = exams.filter((exam) => {
      const normalizedType = normalizeExamTypeDisplay(exam.examSummary?.examType);
      if (filterExamType !== 'ALL' && normalizedType !== filterExamType) {
        return false;
      }
      if (filterLevel !== 'ALL' && exam.examSummary?.schoolLevel !== filterLevel) {
        return false;
      }
      if (filterSemester !== 'ALL' && exam.examSummary?.semester !== filterSemester) {
        return false;
      }

      if (!q) return true;

      const metaMatch = [
        exam.examSummary?.subject,
        exam.examSummary?.title,
        exam.examSummary?.grade,
        exam.examSummary?.schoolLevel,
        normalizedType,
        exam.examSummary?.semester,
        exam.examSummary?.academicYear,
        exam.kopConfig?.schoolName,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));

      if (metaMatch) return true;

      // Also match keywords inside questions / stimulus for Bank Soal search
      const questionTexts = [
        ...(exam.multipleChoice || []).map((item) => `${item.stimulus || ''} ${item.question || ''}`),
        ...(exam.complexMultipleChoice || []).map((item) => `${item.stimulus || ''} ${item.question || ''}`),
        ...(exam.matching || []).map(
          (item) => `${item.instruction || ''} ${(item.pairs || []).map((p) => `${p.premise} ${p.match}`).join(' ')}`
        ),
        ...(exam.shortAnswer || []).map((item) => `${item.stimulus || ''} ${item.question || ''}`),
        ...(exam.essay || []).map((item) => `${item.stimulus || ''} ${item.question || ''}`),
      ];

      return questionTexts.some((txt) => txt.toLowerCase().includes(q));
    });

    const sorted = [...matched].sort((a, b) => {
      if (sortBy === 'newest') {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tB - tA;
      }
      if (sortBy === 'oldest') {
        const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tA - tB;
      }
      if (sortBy === 'subject_asc') {
        return (a.examSummary?.subject || '').localeCompare(b.examSummary?.subject || '', 'id');
      }
      if (sortBy === 'questions_desc') {
        return getExamTotalQuestions(b) - getExamTotalQuestions(a);
      }
      return 0;
    });

    return sorted;
  }, [exams, searchQuery, filterExamType, filterLevel, filterSemester, sortBy]);

  if (!isOpen) return null;

  const handleExportAll = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exams, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `Bank_Soal_SI_UJIAN_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportExam = (exam: ExamPackage) => {
    const blob = new Blob([JSON.stringify([exam], null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = [
      'Naskah',
      sanitizeFilenamePart(exam.examSummary?.subject || 'Mapel'),
      sanitizeFilenamePart(normalizeExamTypeDisplay(exam.examSummary?.examType)),
      sanitizeFilenamePart(exam.examSummary?.grade || 'Kelas'),
    ].join('_') + '.json';
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadSample = () => {
    const sample = exams.length > 0 ? exams[0] : null;
    const sampleData = sample
      ? [sample]
      : [
          {
            examSummary: {
              title: 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)',
              examType: 'PSAS',
              schoolLevel: 'SMP',
              grade: 'Kelas VII',
              subject: 'Ilmu Pengetahuan Alam',
              curriculum: 'Kurikulum Merdeka',
              academicYear: '2024/2025',
              semester: 'Ganjil',
              duration: '90 Menit',
              generalInstructions: [
                'Periksa dan bacalah soal-soal sebelum Anda menjawabnya.',
                'Tuliskan identitas Anda pada lembar jawaban yang telah disediakan.',
              ],
            },
            multipleChoice: [
              {
                number: 1,
                stimulus: 'Tumbuhan melakukan fotosintesis di siang hari.',
                question: 'Bagian sel tumbuhan yang berfungsi menangkap cahaya matahari adalah ....',
                options: [
                  { key: 'A', text: 'Kloroplas' },
                  { key: 'B', text: 'Mitokondria' },
                  { key: 'C', text: 'Ribosom' },
                  { key: 'D', text: 'Vakuola' },
                ],
                correctAnswer: 'A',
                explanation: 'Kloroplas mengandung klorofil untuk menangkap cahaya matahari.',
              },
            ],
            essay: [
              {
                number: 2,
                question: 'Jelaskan perbedaan antara produsen dan konsumen dalam ekosistem!',
                expectedAnswer:
                  'Produsen dapat menghasilkan makanan sendiri melalui fotosintesis, sedangkan konsumen memperoleh energi dengan memakan organisme lain.',
                scoringRubric: [
                  { criteria: 'Definisi produsen tepat', points: 2 },
                  { criteria: 'Definisi konsumen tepat', points: 2 },
                ],
              },
            ],
          },
        ];

    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sampleData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'contoh_format_bank_soal.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const processFileContent = (content: string) => {
    setImportStatus(null);

    // Detect if uploaded JSON is an Answer Key & Explanation JSON payload
    try {
      const cleaned = content
        .trim()
        .replace(/^\uFEFF/, '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '');
      const rawObj = JSON.parse(cleaned);
      const isAnswerKeyPayload =
        rawObj &&
        typeof rawObj === 'object' &&
        !Array.isArray(rawObj) &&
        (rawObj.format === 'SI-UJIAN-KUNCI-PEMBAHASAN-V1' ||
          Boolean(
            rawObj.kunciPilihanGanda ||
              rawObj.kunciPilihanGandaKompleks ||
              rawObj.kunciMenjodohkan ||
              rawObj.kunciIsianSingkat ||
              rawObj.kunciUraian
          )) &&
        !rawObj.multipleChoice &&
        !rawObj.bagianSoal;

      if (isAnswerKeyPayload) {
        const activeExam = exams.find((e) => e.id === currentExamId) || exams[0];
        if (activeExam && onUpdateCurrentExam) {
          const keyResult = applyAnswerKeyJsonToExam(activeExam, content);
          if (keyResult.success && keyResult.updatedExam) {
            const msg = keyResult.message || 'Kunci jawaban & pembahasan berhasil diterapkan ke naskah aktif!';
            onUpdateCurrentExam(keyResult.updatedExam, msg);
            setImportStatus({ type: 'success', message: msg });
          } else {
            setImportStatus({
              type: 'error',
              message: keyResult.error || 'Gagal menerapkan JSON kunci jawaban ke naskah aktif.',
            });
          }
          return;
        }
      }
    } catch {
      // Fall through to standard exam JSON parser which returns syntax errors clearly
    }

    const result = parseAndNormalizeExamJson(content, kopConfig);

    if (result.success && result.exams.length > 0) {
      if (onImportExams) {
        onImportExams(result.exams);
      } else if (onImportExam) {
        result.exams.forEach((exam) => onImportExam(exam));
      }

      setImportStatus({
        type: 'success',
        message: `Berhasil mengimpor ${result.exams.length} naskah soal ke Bank Soal!`,
      });

      // Select the first imported exam right away
      if (result.exams[0]) {
        onSelectExam(result.exams[0]);
      }
    } else {
      setImportStatus({
        type: 'error',
        message:
          result.error ||
          'Format file JSON tidak dikenali. Klik tombol "Contoh Format" di bawah untuk melihat struktur yang didukung.',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        processFileContent(content);
      };
      reader.onerror = () => {
        setImportStatus({
          type: 'error',
          message: 'Gagal membaca berkas. Pastikan file tidak rusak atau terkunci.',
        });
      };
      reader.readAsText(file);
    }
    // CRITICAL: Reset input value so selecting the same file triggers onChange again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        setImportStatus({
          type: 'error',
          message: 'Hanya berkas berformat .json yang didukung untuk impor bank soal.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        processFileContent(content);
      };
      reader.onerror = () => {
        setImportStatus({
          type: 'error',
          message: 'Gagal membaca file dari drop zone.',
        });
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div
        className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <FolderArchive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Bank Soal & Riwayat Naskah</h3>
              <p className="text-[11px] text-slate-400">
                {exams.length} naskah tersimpan di perangkat ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Backup & Import */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              onClick={handleExportAll}
              title="Unduh seluruh bank soal ke file JSON cadangan"
              className="flex-1 py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg font-medium text-slate-700 flex items-center justify-center space-x-1.5 shadow-2xs transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Ekspor Semua</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Pilih file JSON dari komputer"
              className="flex-1 py-2 px-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium flex items-center justify-center space-x-1.5 shadow-2xs transition active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-blue-200" />
              <span>Pilih File JSON</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,application/json"
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
            <span className="flex items-center space-x-1">
              <FileCode className="w-3 h-3 text-slate-400" />
              <span>Bisa drag & drop berkas .json ke sini</span>
            </span>
            <button
              onClick={() => setShowFormatGuide((v) => !v)}
              className="text-blue-600 hover:underline flex items-center space-x-1 font-medium"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Contoh Format</span>
            </button>
          </div>

          {/* Format Help Drawer Banner */}
          {showFormatGuide && (
            <div className="mt-2 p-3 bg-blue-50/90 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-2">
              <div className="flex items-start justify-between">
                <span className="font-bold">Format JSON Yang Didukung:</span>
                <button
                  onClick={() => setShowFormatGuide(false)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>Berkas ekspor cadangan SI-UJIAN (.json)</li>
                <li>Format data naskah soal (dengan identitas &amp; bagian soal)</li>
                <li>PG Kompleks centang kotak <code>[ ]</code> (<code>complexMultipleChoice</code> / opsi bertanda <code>[ ]</code>, <code>[x]</code>, <code>isCorrect</code>, <code>checked</code>)</li>
                <li>JSON AI / daftar soal PG, PG Kompleks tabel B/S, menjodohkan, isian, uraian</li>
              </ul>
              <div className="pt-1">
                <button
                  onClick={handleDownloadSample}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-[10px] transition"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh File Contoh Format JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* Status Feedback Alert */}
          {importStatus && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 text-xs transition animate-in fade-in ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {importStatus.type === 'success' ? 'Impor Berhasil' : 'Impor Gagal'}
                </div>
                <div className="text-[11px] mt-0.5 opacity-90">{importStatus.message}</div>
              </div>
              <button
                onClick={() => setImportStatus(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        {exams.length > 0 && (
          <div className="p-3 bg-white border-b border-slate-200 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari mapel, judul, kelas, sekolah, atau isi soal..."
                className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  title="Hapus kata kunci"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter & Sort Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <select
                value={filterExamType}
                onChange={(e) => setFilterExamType(e.target.value)}
                aria-label="Filter jenis ujian"
                className="text-[11px] px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="ALL">Semua Jenis</option>
                {availableExamTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                aria-label="Filter jenjang sekolah"
                className="text-[11px] px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="ALL">Semua Jenjang</option>
                {availableLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                aria-label="Filter semester"
                className="text-[11px] px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="ALL">Semua Sem.</option>
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Urutkan naskah"
                className="text-[11px] px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50 font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="subject_asc">Mapel (A-Z)</option>
                <option value="questions_desc">Soal Terbanyak</option>
              </select>
            </div>

            {/* Live Match Summary & Reset */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
              <span className="flex items-center space-x-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>
                  Menampilkan <strong className="text-slate-700">{filteredExams.length}</strong> dari{' '}
                  <strong className="text-slate-700">{exams.length}</strong> naskah
                </span>
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-blue-700 hover:text-blue-900 font-semibold flex items-center space-x-1 hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Drag Over Overlay */}
        {isDragging && (
          <div className="p-4 bg-blue-50/90 border-2 border-dashed border-blue-500 rounded-xl m-4 text-center text-blue-800">
            <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-bounce" />
            <p className="font-bold text-xs">Lepaskan berkas .json di sini</p>
            <p className="text-[11px] text-blue-600">Naskah soal akan otomatis ditambahkan ke Bank Soal</p>
          </div>
        )}

        {/* List of Saved Exams */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {exams.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <FolderArchive className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Belum ada naskah tersimpan. Klik &quot;Buat Naskah Baru&quot; atau &quot;Pilih File JSON&quot; untuk memulai.
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500 text-xs space-y-3">
              <Search className="w-10 h-10 mx-auto text-slate-300" />
              <div>
                <p className="font-bold text-slate-700">Tidak ada naskah yang cocok</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Coba ubah kata kunci pencarian atau setel ulang filter jenis ujian, jenjang, dan semester.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Pencarian & Filter</span>
              </button>
            </div>
          ) : (
            filteredExams.map((exam) => {
              const isSelected = exam.id === currentExamId;
              const totalQ = getExamTotalQuestions(exam);
              const formattedDate = formatHistoryDate(exam.updatedAt || exam.createdAt);
              const examTypeLabel = normalizeExamTypeDisplay(exam.examSummary?.examType);

              return (
                <div
                  key={exam.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                          {examTypeLabel}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">
                          {exam.examSummary?.schoolLevel} · {exam.examSummary?.grade}
                        </span>
                        {exam.examSummary?.semester && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {exam.examSummary.semester}
                            {exam.examSummary.academicYear ? ` ${exam.examSummary.academicYear}` : ''}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-1.5 line-clamp-1">
                        {exam.examSummary?.subject || 'Mata Pelajaran'}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {exam.examSummary?.title}
                      </p>
                      {exam.kopConfig?.schoolName && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1 line-clamp-1">
                          <Building2 className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{exam.kopConfig.schoolName}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onDuplicateExam(exam)}
                        title="Duplikasi naskah ini"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === exam.id ? (
                        <div className="flex items-center space-x-1 bg-red-50 border border-red-200 rounded-md px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExam(exam.id);
                              setConfirmDeleteId(null);
                              setImportStatus({
                                type: 'success',
                                message: `Naskah "${exam.examSummary?.subject || 'Ujian'}" berhasil dihapus dari Bank Soal.`,
                              });
                            }}
                            className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition"
                          >
                            Ya, Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-medium transition"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(exam.id)}
                          title="Hapus naskah"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>{totalQ} Butir</span>
                      </span>
                      {formattedDate && (
                        <span className="flex items-center space-x-1 text-slate-400" title="Terakhir diperbarui">
                          <Clock className="w-3 h-3" />
                          <span>{formattedDate}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleExportExam(exam)}
                        title="Unduh seluruh naskah terpilih sebagai file JSON"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-[10px] font-bold transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Ekspor JSON</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectExam(exam);
                          onClose();
                        }}
                        className={`px-3 py-1 rounded-md text-[11px] font-bold transition ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-700'
                        }`}
                      >
                        {isSelected ? 'Sedang Dibuka' : 'Buka Naskah'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

