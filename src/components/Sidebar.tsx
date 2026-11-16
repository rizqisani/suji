import React from 'react';
import { ExamPackage } from '../types/exam';
import { ViewTab } from './Navbar';
import {
  FileCheck2,
  KeyRound,
  FileSpreadsheet,
  ListOrdered,
  Grid3X3,
  Layers,
  Sparkles,
  FileText,
  Building2,
  FolderArchive,
  Shuffle,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  X,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  exam: ExamPackage;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenGenerator: () => void;
  onOpenTextToExam: () => void;
  onOpenKopModal: () => void;
  onOpenBank: () => void;
  onShuffleExam: () => void;
  onOpenSingleQuestionModal: () => void;
  onOpenValidateModal?: () => void;
  savedCount: number;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  exam,
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onOpenGenerator,
  onOpenTextToExam,
  onOpenKopModal,
  onOpenBank,
  onShuffleExam,
  onOpenSingleQuestionModal,
  onOpenValidateModal,
  savedCount,
  isMobileOpen,
  onMobileClose,
}) => {
  // Question counts
  const mcCount = exam.multipleChoice?.length || 0;
  const cmcCount = exam.complexMultipleChoice?.length || 0;
  const matchCount = exam.matching?.length || 0;
  const shortCount = exam.shortAnswer?.length || 0;
  const essayCount = exam.essay?.length || 0;
  const totalQuestions = mcCount + cmcCount + matchCount + shortCount + essayCount;

  const docNavItems: { id: ViewTab; label: string; shortLabel: string; icon: React.ElementType; badge?: string | number }[] = [
    { id: 'naskah', label: 'Naskah Soal Siswa', shortLabel: 'Naskah', icon: FileCheck2, badge: totalQuestions },
    { id: 'kunci', label: 'Kunci & Pembahasan', shortLabel: 'Kunci', icon: KeyRound },
    { id: 'kisi-kisi', label: 'Kisi-Kisi Soal (Matrix)', shortLabel: 'Kisi-Kisi', icon: FileSpreadsheet },
    { id: 'rubrik', label: 'Pedoman Penskoran', shortLabel: 'Rubrik', icon: ListOrdered },
    { id: 'kartu-soal', label: 'Kartu Soal Dinas', shortLabel: 'Kartu', icon: Grid3X3 },
    { id: 'ljs', label: 'Lembar Jawaban (LJS)', shortLabel: 'LJS', icon: Layers },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
      {/* Top Header / Brand */}
      <div>
        <div className={`p-4 border-b border-slate-200 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed ? (
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-white shrink-0 shadow-xs">
                <GraduationCap className="w-4 h-4 text-amber-300" />
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm text-slate-900 tracking-tight">SI-UJIAN</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">v2.0</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{exam.examSummary.subject || 'Naskah Ujian'}</p>
              </div>
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-700 to-indigo-800 flex items-center justify-center text-white shadow-xs cursor-pointer"
              onClick={onToggleCollapse}
              title="Perluas Menu Samping"
            >
              <GraduationCap className="w-4 h-4 text-amber-300" />
            </div>
          )}

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Perluas Menu Samping (Fold/Unfold)' : 'Lipat Menu Samping (Fold/Unfold)'}
            className={`hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition ${isCollapsed ? 'mt-2' : ''}`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section: Navigasi Dokumen Ujian */}
        <div className="p-3 border-b border-slate-200">
          {!isCollapsed && (
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dokumen Ujian
            </div>
          )}
          <nav className="space-y-1">
            {docNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (isMobileOpen) onMobileClose();
                  }}
                  title={item.label}
                  className={`w-full flex items-center rounded-xl transition ${
                    isCollapsed
                      ? 'justify-center p-2.5'
                      : 'justify-between px-3 py-2 text-xs font-semibold'
                  } ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-xs shadow-blue-600/30 font-bold'
                      : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-900'
                  }`}
                >
                  <div className={`flex items-center space-x-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                        isActive
                          ? 'bg-blue-800/80 text-white'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Section: Aksi & Pembuatan Soal */}
        <div className="p-3 border-b border-slate-200 space-y-1">
          {!isCollapsed && (
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Aksi & Generator AI
            </div>
          )}

          {/* Buat Naskah Baru (AI) */}
          <button
            onClick={() => {
              onOpenGenerator();
              if (isMobileOpen) onMobileClose();
            }}
            title="Buat Naskah Baru dengan AI"
            className={`w-full flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'px-3 py-2 text-xs font-bold'
            } bg-linear-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white shadow-xs`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
            {!isCollapsed && <span className="ml-2.5 truncate">Buat Naskah Baru (AI)</span>}
          </button>

          {/* Dari Teks Modul */}
          <button
            onClick={() => {
              onOpenTextToExam();
              if (isMobileOpen) onMobileClose();
            }}
            title="Generate dari Teks / Modul Pembelajaran"
            className={`w-full flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'px-3 py-2 text-xs font-semibold'
            } bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200`}
          >
            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
            {!isCollapsed && <span className="ml-2.5 truncate">Dari Teks Modul</span>}
          </button>

          {/* Tambah Soal Satuan */}
          <button
            onClick={() => {
              onOpenSingleQuestionModal();
              if (isMobileOpen) onMobileClose();
            }}
            title="Tambah 1 Butir Soal Baru (AI)"
            className={`w-full flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'px-3 py-2 text-xs font-semibold'
            } text-slate-700 hover:bg-slate-100`}
          >
            <PlusCircle className="w-4 h-4 text-blue-600 shrink-0" />
            {!isCollapsed && <span className="ml-2.5 truncate">Tambah Butir Soal</span>}
          </button>

          {/* Validasi Mutu AI */}
          {onOpenValidateModal && (
            <button
              onClick={() => {
                onOpenValidateModal();
                if (isMobileOpen) onMobileClose();
              }}
              title="Audit & Validasi Mutu Seluruh Naskah dengan AI"
              className={`w-full flex items-center rounded-xl transition ${
                isCollapsed
                  ? 'justify-center p-2.5'
                  : 'px-3 py-2 text-xs font-semibold'
              } bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0" />
              {!isCollapsed && <span className="ml-2.5 truncate">Validasi Mutu AI</span>}
            </button>
          )}

          {/* Acak Soal Paket B */}
          <button
            onClick={() => {
              onShuffleExam();
              if (isMobileOpen) onMobileClose();
            }}
            title="Acak Soal Menjadi Paket B"
            className={`w-full flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'px-3 py-2 text-xs font-semibold'
            } text-slate-700 hover:bg-slate-100`}
          >
            <Shuffle className="w-4 h-4 text-indigo-600 shrink-0" />
            {!isCollapsed && <span className="ml-2.5 truncate">Acak Soal (Paket B)</span>}
          </button>

          {/* Atur Kop Sekolah */}
          <button
            onClick={() => {
              onOpenKopModal();
              if (isMobileOpen) onMobileClose();
            }}
            title="Pengaturan Kop Sekolah & Tanda Tangan"
            className={`w-full flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'px-3 py-2 text-xs font-semibold'
            } text-slate-700 hover:bg-slate-100`}
          >
            <Building2 className="w-4 h-4 text-slate-600 shrink-0" />
            {!isCollapsed && <span className="ml-2.5 truncate">Atur Kop & Pejabat</span>}
          </button>

          {/* Bank Soal */}
          <button
            onClick={() => {
              onOpenBank();
              if (isMobileOpen) onMobileClose();
            }}
            title="Buka Bank Soal Tersimpan"
            className={`w-full flex items-center rounded-xl transition ${
              isCollapsed
                ? 'justify-center p-2.5'
                : 'justify-between px-3 py-2 text-xs font-semibold'
            } text-slate-700 hover:bg-slate-100`}
          >
            <div className="flex items-center space-x-2.5">
              <FolderArchive className="w-4 h-4 text-amber-600 shrink-0" />
              {!isCollapsed && <span className="truncate">Bank Soal</span>}
            </div>
            {!isCollapsed && savedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                {savedCount}
              </span>
            )}
          </button>
        </div>

        {/* Section: Ringkasan Butir Soal (Expanded Only) */}
        {!isCollapsed && (
          <div className="p-3">
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Komposisi Butir Soal
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
              <div className="flex justify-between items-center">
                <span>Pilihan Ganda:</span>
                <span className="font-bold text-slate-800">{mcCount} butir</span>
              </div>
              <div className="flex justify-between items-center">
                <span>PG Kompleks:</span>
                <span className="font-bold text-slate-800">{cmcCount} butir</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Menjodohkan:</span>
                <span className="font-bold text-slate-800">{matchCount} butir</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Isian Singkat:</span>
                <span className="font-bold text-slate-800">{shortCount} butir</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Uraian / Essay:</span>
                <span className="font-bold text-slate-800">{essayCount} butir</span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-slate-200 flex justify-between items-center font-bold text-blue-900">
                <span>Total Butir:</span>
                <span>{totalQuestions} butir</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Profile / Quick Info */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
          <div className="font-bold text-slate-700 truncate">{exam.kopConfig.schoolName || 'Sekolah'}</div>
          <div className="text-[10px] text-slate-400 truncate">
            {exam.examSummary.examType} · {exam.examSummary.grade}
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-slate-200 flex justify-center">
          <button
            onClick={onToggleCollapse}
            title="Buka menu samping"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: stays fixed while the main workspace scrolls */}
      <aside
        className={`hidden md:block order-2 bg-white border-l border-slate-200 transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-full z-30 select-none shadow-xs ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
