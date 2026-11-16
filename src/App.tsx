import React, { useState, useEffect } from 'react';
import {
  ExamPackage,
  SchoolKopConfig,
  QuestionType,
} from './types/exam';
import {
  loadSavedExams,
  saveExamToBank,
  saveMultipleExamsToBank,
  deleteExamFromBank,
  loadSavedKopConfig,
  saveKopConfig,
} from './utils/storage';
import { SAMPLE_EXAMS } from './data/defaultPresets';
import { getCmcCorrectList, isMcTrueFalse } from './utils/questionHelpers';
import { Navbar, ViewTab } from './components/Navbar';
import { ExamDocumentView } from './components/ExamDocumentView';
import { AnswerKeyView } from './components/AnswerKeyView';
import { KisiKisiView } from './components/KisiKisiView';
import { ScoringRubricView } from './components/ScoringRubricView';
import { QuestionCardView } from './components/QuestionCardView';
import { StudentAnswerSheetView } from './components/StudentAnswerSheetView';
import { ExamGeneratorModal } from './components/ExamGeneratorModal';
import { TextToExamModal } from './components/TextToExamModal';
import { SchoolKopModal } from './components/SchoolKopModal';
import { SingleQuestionModal } from './components/SingleQuestionModal';
import { QuestionBankDrawer } from './components/QuestionBankDrawer';
import { PrintPdfModal } from './components/PrintPdfModal';
import { Sidebar } from './components/Sidebar';
import { AiValidateExamModal } from './components/AiValidateExamModal';
import { AiEditQuestionModal, EditableQuestionItem } from './components/AiEditQuestionModal';
import { AiGatewaySettingsModal } from './components/AiGatewaySettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { AiGatewayConfig, loadAiGatewayConfig } from './utils/apiHelper';
import { APP_STATE_CHANGED_EVENT } from './utils/appStateEvents';
import { initializeAppState, syncAppState } from './utils/appStateSync';
import {
  Sparkles,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  Bookmark,
  Share2,
  BookOpen,
} from 'lucide-react';

const isDesktopApp = import.meta.env.MODE === 'desktop';

export default function App() {
  const [authStatus, setAuthStatus] = useState<'loading' | 'login' | 'ready'>('loading');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [exams, setExams] = useState<ExamPackage[]>([]);
  const [currentExam, setCurrentExam] = useState<ExamPackage>(SAMPLE_EXAMS[0]);
  const [kopConfig, setKopConfig] = useState<SchoolKopConfig>(loadSavedKopConfig());
  const [aiGatewayConfig, setAiGatewayConfig] = useState<AiGatewayConfig | null>(() =>
    loadAiGatewayConfig()
  );
  const [activeTab, setActiveTab] = useState<ViewTab>('naskah');

  // Modals
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isTextToExamOpen, setIsTextToExamOpen] = useState(false);
  const [isKopModalOpen, setIsKopModalOpen] = useState(false);
  const [isBankDrawerOpen, setIsBankDrawerOpen] = useState(false);
  const [isSingleQuestionModalOpen, setIsSingleQuestionModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAiGatewaySettingsOpen, setIsAiGatewaySettingsOpen] = useState(false);
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [auditEditTarget, setAuditEditTarget] = useState<EditableQuestionItem | null>(null);
  const [auditEditInstruction, setAuditEditInstruction] = useState('');

  // Foldable Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('siujian_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('siujian_sidebar_collapsed', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const prepareAuthenticatedApp = async () => {
    await initializeAppState();
    setAiGatewayConfig(loadAiGatewayConfig());
    setAuthError('');
    setAuthStatus('ready');
  };

  useEffect(() => {
    let active = true;
    if (isDesktopApp) {
      prepareAuthenticatedApp().catch((error) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : 'Tidak dapat memuat database lokal.');
        setAuthStatus('login');
      });
      return () => {
        active = false;
      };
    }

    fetch('/api/auth/session')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Gagal memeriksa sesi (HTTP ${response.status}).`);
        return response.json();
      })
      .then(async ({ authenticated }) => {
        if (!active) return;
        if (!authenticated) {
          setAuthStatus('login');
          return;
        }
        await prepareAuthenticatedApp();
      })
      .catch((error) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : 'Tidak dapat menghubungi server.');
        setAuthStatus('login');
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Login gagal.');
      }
      await prepareAuthenticatedApp();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login gagal menghubungi server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (isDesktopApp) return;
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error(`Gagal keluar (HTTP ${response.status}).`);
      setAuthStatus('login');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal keluar dari aplikasi.');
    }
  };

  // Load initial data after server state has been restored.
  useEffect(() => {
    if (authStatus !== 'ready') return;
    const loaded = loadSavedExams();
    setExams(loaded);
    if (loaded.length > 0) {
      setCurrentExam(loaded[0]);
    }
    const savedKop = loadSavedKopConfig();
    setKopConfig(savedKop);
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== 'ready') return;
    let timer: ReturnType<typeof setTimeout>;
    const handleStateChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        syncAppState().catch((error) => {
          showToast(
            `Data tersimpan di browser, tetapi gagal disinkronkan ke server: ${
              error instanceof Error ? error.message : 'kesalahan tidak diketahui'
            }`
          );
        });
      }, 400);
    };
    window.addEventListener(APP_STATE_CHANGED_EVENT, handleStateChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(APP_STATE_CHANGED_EVENT, handleStateChange);
    };
  }, [authStatus]);

  // Sync Kop changes to the active exam
  const handleSaveKop = (newKop: SchoolKopConfig) => {
    setKopConfig(newKop);
    saveKopConfig(newKop);
    const updated = { ...currentExam, kopConfig: newKop };
    setCurrentExam(updated);
    saveExamToBank(updated);
    setExams(loadSavedExams());
    showToast('Kop surat dan identitas sekolah berhasil diperbarui.');
  };

  // When a new exam is generated via AI or Text
  const handleExamGenerated = (newExam: ExamPackage) => {
    const withKop = { ...newExam, kopConfig };
    setCurrentExam(withKop);
    saveExamToBank(withKop);
    setExams(loadSavedExams());
    setActiveTab('naskah');
    showToast('Naskah soal lengkap berhasil dibuat dan disimpan!');
  };

  // When teacher edits questions in the document view
  const handleUpdateExam = (updated: ExamPackage) => {
    setCurrentExam(updated);
    saveExamToBank(updated);
    setExams(loadSavedExams());
  };

  const handleApplyAuditQuestionRevision = (type: QuestionType, revisedItem: any) => {
    const now = new Date().toISOString();
    let updated: ExamPackage = { ...currentExam, updatedAt: now };
    if (type === 'multipleChoice') {
      updated.multipleChoice = currentExam.multipleChoice.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
    } else if (type === 'complexMultipleChoice') {
      updated.complexMultipleChoice = currentExam.complexMultipleChoice.map((q) =>
        q.id === revisedItem.id ? { ...revisedItem, id: q.id, number: q.number } : q
      );
    } else if (type === 'matching') {
      updated.matching = currentExam.matching.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
    } else if (type === 'shortAnswer') {
      updated.shortAnswer = currentExam.shortAnswer.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
    } else if (type === 'essay') {
      updated.essay = currentExam.essay.map((q) =>
        q.id === revisedItem.id ? { ...q, ...revisedItem, id: q.id, number: q.number } : q
      );
    }
    handleUpdateExam(updated);
    showToast(`Soal No. ${revisedItem.number} berhasil diperbarui dari hasil audit AI.`);
  };

  // Add individual question from AI single question modal
  const handleAddSingleQuestion = (type: QuestionType, qObj: any) => {
    let updated = { ...currentExam };
    if (type === 'multipleChoice') {
      updated.multipleChoice = [...updated.multipleChoice, qObj];
    } else if (type === 'complexMultipleChoice') {
      updated.complexMultipleChoice = [...updated.complexMultipleChoice, qObj];
    } else if (type === 'matching') {
      updated.matching = [...updated.matching, qObj];
    } else if (type === 'shortAnswer') {
      updated.shortAnswer = [...updated.shortAnswer, qObj];
    } else if (type === 'essay') {
      updated.essay = [...updated.essay, qObj];
    }
    setCurrentExam(updated);
    saveExamToBank(updated);
    setExams(loadSavedExams());
    showToast(`Butir soal ${type} nomor ${qObj.number} berhasil ditambahkan!`);
  };

  // Shuffle exam to create "Paket B"
  const handleShuffleToPaketB = () => {
    const keyLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    let seqNumber = 1;

    const shuffledMC = [...currentExam.multipleChoice]
      .sort(() => 0.5 - Math.random())
      .map((q) => {
        const keepOptionOrder = isMcTrueFalse(q) || q.variant === 'cause_effect';
        if (keepOptionOrder || !q.options || q.options.length === 0) {
          return { ...q, number: seqNumber++ };
        }
        const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
        const oldCorrectText = q.options.find((o) => o.key === q.correctAnswer)?.text;
        const rekeyedOptions = shuffledOptions.map((opt, i) => ({
          key: keyLetters[i] || opt.key,
          text: opt.text,
        }));
        const newCorrectKey =
          rekeyedOptions.find((o) => o.text === oldCorrectText)?.key || q.correctAnswer;

        return {
          ...q,
          number: seqNumber++,
          options: rekeyedOptions,
          correctAnswer: newCorrectKey,
        };
      });

    const shuffledCMC = [...currentExam.complexMultipleChoice]
      .sort(() => 0.5 - Math.random())
      .map((q) => {
        let nextOptions = q.options;
        let nextCorrectAnswer = q.correctAnswer;
        if (q.options && q.options.length > 0) {
          const oldCorrectList = getCmcCorrectList(q.correctAnswer);
          const oldCorrectTexts = new Set(
            q.options
              .filter((o) => oldCorrectList.includes(o.key.trim().toUpperCase()))
              .map((o) => o.text)
          );
          const shuffledOpts = [...q.options].sort(() => 0.5 - Math.random());
          nextOptions = shuffledOpts.map((opt, i) => ({
            key: keyLetters[i] || opt.key,
            text: opt.text,
          }));
          nextCorrectAnswer = nextOptions
            .filter((o) => oldCorrectTexts.has(o.text))
            .map((o) => o.key);
        }

        const nextStatements =
          q.statements && q.statements.length > 0
            ? [...q.statements].sort(() => 0.5 - Math.random())
            : q.statements;

        return {
          ...q,
          number: seqNumber++,
          options: nextOptions,
          correctAnswer: nextCorrectAnswer,
          statements: nextStatements,
        };
      });

    const shuffledMatching = [...currentExam.matching]
      .sort(() => 0.5 - Math.random())
      .map((q) => ({
        ...q,
        number: seqNumber++,
        pairs: [...q.pairs].sort(() => 0.5 - Math.random()),
      }));

    const shuffledSA = [...currentExam.shortAnswer]
      .sort(() => 0.5 - Math.random())
      .map((q) => ({ ...q, number: seqNumber++ }));

    const shuffledEssay = [...currentExam.essay]
      .sort(() => 0.5 - Math.random())
      .map((q) => ({ ...q, number: seqNumber++ }));

    const paketB: ExamPackage = {
      ...currentExam,
      id: `exam-paket-b-${Date.now()}`,
      examSummary: {
        ...currentExam.examSummary,
        title: currentExam.examSummary.title.includes('PAKET B')
          ? currentExam.examSummary.title
          : `${currentExam.examSummary.title} - [PAKET B]`,
      },
      multipleChoice: shuffledMC,
      complexMultipleChoice: shuffledCMC,
      matching: shuffledMatching,
      shortAnswer: shuffledSA,
      essay: shuffledEssay,
    };

    setCurrentExam(paketB);
    saveExamToBank(paketB);
    setExams(loadSavedExams());
    showToast('Naskah Paket B berhasil dibuat (soal, opsi PGK & pasangan telah diacak).');
  };

  // Next question number
  const totalExistingQuestions =
    currentExam.multipleChoice.length +
    currentExam.complexMultipleChoice.length +
    currentExam.matching.length +
    currentExam.shortAnswer.length +
    currentExam.essay.length;

  if (authStatus === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Menghubungkan ke server…</div>;
  }
  if (authStatus !== 'ready') {
    return <LoginScreen busy={isLoggingIn} error={authError} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Navbar with Action controls */}
      <Navbar
        exam={currentExam}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenTextToExam={() => setIsTextToExamOpen(true)}
        onOpenKopModal={() => setIsKopModalOpen(true)}
        onOpenBank={() => setIsBankDrawerOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenAiSettings={() => setIsAiGatewaySettingsOpen(true)}
        aiGatewayConfigured={Boolean(aiGatewayConfig)}
        onLogout={handleLogout}
        showLogout={!isDesktopApp}
        savedCount={exams.length}
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed bottom-6 right-6 z-[60] bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container with Left Foldable Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Foldable Sidebar */}
        <Sidebar
          exam={currentExam}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenGenerator={() => setIsGeneratorOpen(true)}
          onOpenTextToExam={() => setIsTextToExamOpen(true)}
          onOpenKopModal={() => setIsKopModalOpen(true)}
          onOpenBank={() => setIsBankDrawerOpen(true)}
          onOpenPrintModal={() => setIsPrintModalOpen(true)}
          onShuffleExam={handleShuffleToPaketB}
          onOpenSingleQuestionModal={() => setIsSingleQuestionModalOpen(true)}
          onOpenValidateModal={() => setIsValidateModalOpen(true)}
          savedCount={exams.length}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Scrollable Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-4">
            {/* Quick Exam Info & Sample Presets Banner (Hidden on print) */}
            <div className="no-print bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black text-xs uppercase">
                  {currentExam.examSummary.examType}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {currentExam.examSummary.subject} - {currentExam.examSummary.grade}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {currentExam.examSummary.curriculum} · TA {currentExam.examSummary.academicYear} (
                    {currentExam.examSummary.semester}) · Durasi: {currentExam.examSummary.duration}
                  </p>
                </div>
              </div>

              {/* Quick Preset Selector for Teacher Demo */}
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-medium hidden md:inline">Contoh Template Bawaan:</span>
                {SAMPLE_EXAMS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => {
                      setCurrentExam(sample);
                      showToast(`Memuat template: ${sample.examSummary.subject}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
                      currentExam.id === sample.id
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {sample.examSummary.examType} {sample.examSummary.schoolLevel}:{' '}
                    {sample.examSummary.subject.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Document View based on Active Tab */}
            {activeTab === 'naskah' && (
              <ExamDocumentView
                exam={currentExam}
                onUpdateExam={handleUpdateExam}
                onOpenSingleQuestionModal={() => setIsSingleQuestionModalOpen(true)}
                onShuffleExam={handleShuffleToPaketB}
                onOpenPrintModal={() => setIsPrintModalOpen(true)}
                onOpenValidateModal={() => setIsValidateModalOpen(true)}
              />
            )}

            {activeTab === 'kunci' && (
              <AnswerKeyView
                exam={currentExam}
                onUpdateExam={handleUpdateExam}
                onNotify={showToast}
              />
            )}

            {activeTab === 'kisi-kisi' && (
              <KisiKisiView
                exam={currentExam}
                onUpdateExam={handleUpdateExam}
                onNotify={showToast}
              />
            )}

            {activeTab === 'rubrik' && (
              <ScoringRubricView
                exam={currentExam}
              />
            )}

            {activeTab === 'kartu-soal' && (
              <QuestionCardView
                exam={currentExam}
              />
            )}

            {activeTab === 'ljs' && (
              <StudentAnswerSheetView
                exam={currentExam}
              />
            )}
          </main>

          {/* Footer */}
          <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700">
              SI-UJIAN &copy; 2024 - Generator Naskah Ujian Sekolah Otomatis Siap Cetak
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mendukung Kurikulum Merdeka & Kurikulum 2013 · Sesuai Standar Pedoman Penulisan Soal Pusmendik Kemendikbudristek & Kemenag
            </p>
          </footer>
        </div>
      </div>


      {/* Modals */}
      <ExamGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        kopConfig={kopConfig}
        onExamGenerated={handleExamGenerated}
      />

      <TextToExamModal
        isOpen={isTextToExamOpen}
        onClose={() => setIsTextToExamOpen(false)}
        kopConfig={kopConfig}
        onExamGenerated={handleExamGenerated}
      />

      <SchoolKopModal
        isOpen={isKopModalOpen}
        onClose={() => setIsKopModalOpen(false)}
        config={kopConfig}
        onSave={handleSaveKop}
      />

      <SingleQuestionModal
        isOpen={isSingleQuestionModalOpen}
        onClose={() => setIsSingleQuestionModalOpen(false)}
        subject={currentExam.examSummary.subject}
        grade={currentExam.examSummary.grade}
        nextNumber={totalExistingQuestions + 1}
        optionsCount={
          currentExam.examSummary.schoolLevel === 'SMA' ||
          currentExam.examSummary.schoolLevel === 'SMK' ||
          currentExam.examSummary.schoolLevel === 'MA'
            ? 5
            : 4
        }
        onQuestionAdded={handleAddSingleQuestion}
      />

      <QuestionBankDrawer
        isOpen={isBankDrawerOpen}
        onClose={() => setIsBankDrawerOpen(false)}
        exams={exams}
        currentExamId={currentExam.id}
        onSelectExam={(e) => setCurrentExam(e)}
        onDuplicateExam={(e) => {
          const dup: ExamPackage = {
            ...e,
            id: `exam-dup-${Date.now()}`,
            examSummary: {
              ...e.examSummary,
              title: `${e.examSummary.title} (Salinan)`,
            },
          };
          saveExamToBank(dup);
          setExams(loadSavedExams());
          setCurrentExam(dup);
          showToast('Naskah berhasil diduplikasi.');
        }}
        onDeleteExam={(id) => {
          const rem = deleteExamFromBank(id, exams);
          setExams(rem);
          if (currentExam.id === id) {
            setCurrentExam(rem[0] || SAMPLE_EXAMS[0]);
          }
          showToast('Naskah dihapus dari Bank Soal.');
        }}
        onImportExam={(imp) => {
          saveExamToBank(imp);
          setExams(loadSavedExams());
          setCurrentExam(imp);
          showToast('Naskah berhasil diimpor.');
        }}
        onImportExams={(importedList) => {
          if (!importedList || importedList.length === 0) return;
          const updated = saveMultipleExamsToBank(importedList);
          setExams(updated);
          setCurrentExam(importedList[0]);
          showToast(`Berhasil mengimpor ${importedList.length} naskah ke Bank Soal!`);
        }}
        onUpdateCurrentExam={(updatedExam, msg) => {
          handleUpdateExam(updatedExam);
          showToast(msg);
        }}
        kopConfig={kopConfig}
      />

      <PrintPdfModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        exam={currentExam}
        activeTab={activeTab}
        onSwitchTab={setActiveTab}
      />

      <AiValidateExamModal
        isOpen={isValidateModalOpen}
        onClose={() => setIsValidateModalOpen(false)}
        exam={currentExam}
        onUpdateExam={handleUpdateExam}
        onOpenCustomEditAi={(target, presetInstruction) => {
          setAuditEditTarget(target);
          setAuditEditInstruction(presetInstruction || '');
        }}
      />

      <AiEditQuestionModal
        isOpen={Boolean(auditEditTarget)}
        onClose={() => {
          setAuditEditTarget(null);
          setAuditEditInstruction('');
        }}
        target={auditEditTarget}
        exam={currentExam}
        initialInstruction={auditEditInstruction}
        onApplyRevised={handleApplyAuditQuestionRevision}
      />

      <AiGatewaySettingsModal
        isOpen={isAiGatewaySettingsOpen}
        onClose={() => setIsAiGatewaySettingsOpen(false)}
        onSave={setAiGatewayConfig}
      />
    </div>
  );
}
