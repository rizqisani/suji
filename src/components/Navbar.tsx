import React, { useState } from 'react';
import { ExamPackage } from '../types/exam';
import { exportExamToWord } from '../utils/exportWord';
import {
  Sparkles,
  FileText,
  Building2,
  FolderArchive,
  Printer,
  Download,
  FileCheck2,
  KeyRound,
  Grid3X3,
  ListOrdered,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  GraduationCap,
  PanelLeft,
  Menu,
  Settings2,
  LogOut,
} from 'lucide-react';

export type ViewTab = 'naskah' | 'kunci' | 'kisi-kisi' | 'rubrik' | 'kartu-soal' | 'ljs';

interface NavbarProps {
  exam: ExamPackage;
  onOpenGenerator: () => void;
  onOpenTextToExam: () => void;
  onOpenKopModal: () => void;
  onOpenBank: () => void;
  onOpenPrintModal: () => void;
  onOpenAiSettings: () => void;
  aiGatewayConfigured: boolean;
  onLogout: () => void;
  showLogout?: boolean;
  savedCount: number;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  exam,
  onOpenGenerator,
  onOpenTextToExam,
  onOpenKopModal,
  onOpenBank,
  onOpenPrintModal,
  onOpenAiSettings,
  aiGatewayConfigured,
  onLogout,
  showLogout = true,
  savedCount,
  onToggleSidebar,
  isSidebarCollapsed,
}) => {
  const [showWordMenu, setShowWordMenu] = useState(false);

  const handleDownloadWord = (docType: ViewTab) => {
    exportExamToWord(exam, docType as any);
    setShowWordMenu(false);
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center space-x-2.5">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={isSidebarCollapsed ? 'Buka Menu Samping' : 'Lipat Menu Samping'}
              className="p-2 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-slate-100 border border-slate-200 transition active:scale-95 flex items-center justify-center shadow-2xs"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-700 via-indigo-700 to-blue-900 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black tracking-tight text-slate-900">
                SI-UJIAN <span className="text-blue-700 font-extrabold text-xs">v2.0</span>
              </h1>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Resmi PSAS · STS · PSAJ · AM
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Generator Naskah Soal Ujian Sekolah Standar Dinas Siap Cetak
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI Generator Button */}
          <button
            onClick={onOpenGenerator}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-linear-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 rounded-lg shadow-sm flex items-center space-x-1.5 transition active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Buat Naskah Baru (AI)</span>
          </button>

          {/* Text/Modul Button */}
          <button
            onClick={onOpenTextToExam}
            title="Buat soal dari artikel, bab buku, atau catatan guru"
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center space-x-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Dari Teks Modul</span>
          </button>

          {/* Kop Sekolah Button */}
          <button
            onClick={onOpenKopModal}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center space-x-1.5 transition"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Atur Kop Sekolah</span>
          </button>

          {/* Bank Soal */}
          <button
            onClick={onOpenBank}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center space-x-1.5 transition relative"
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-600" />
            <span>Bank Soal</span>
            {savedCount > 0 && (
              <span className="w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          {/* Download Word Menu */}
          <div className="relative">
            <button
              onClick={() => setShowWordMenu(!showWordMenu)}
              className="px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg flex items-center space-x-1 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Unduh Word (.docx)</span>
              <ChevronDown className="w-3 h-3 text-blue-600" />
            </button>

            {showWordMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                  Pilih Dokumen Word:
                </div>
                <button
                  onClick={() => handleDownloadWord('naskah')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-800"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. Naskah Soal Ujian</span>
                </button>
                <button
                  onClick={() => handleDownloadWord('kunci')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-800"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Kunci Jawaban & Pembahasan</span>
                </button>
                <button
                  onClick={() => handleDownloadWord('kisi-kisi')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-800"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Kisi-Kisi Penulisan Soal</span>
                </button>
                <button
                  onClick={() => handleDownloadWord('rubrik')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-800"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-purple-600" />
                  <span>4. Pedoman Penskoran & Rubrik</span>
                </button>
                <button
                  onClick={() => handleDownloadWord('kartu-soal')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-800"
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>5. Kartu Soal Standar Dinas</span>
                </button>
                <button
                  onClick={() => handleDownloadWord('ljs')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center space-x-2 text-slate-800"
                >
                  <Layers className="w-3.5 h-3.5 text-rose-600" />
                  <span>6. Lembar Jawaban Siswa (LJS)</span>
                </button>
                <div className="border-t border-slate-200 mt-1 pt-1">
                  <button
                    onClick={async () => {
                      setShowWordMenu(false);
                      const { exportAllDocuments } = await import('../utils/exportWord');
                      await exportAllDocuments(exam, 'docx');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center space-x-2 text-blue-700 font-bold"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-700" />
                    <span>Unduh Semua (6 File Word)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Print / PDF Direct Button */}
          <button
            onClick={onOpenPrintModal}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-linear-to-r from-blue-700 via-indigo-700 to-blue-900 hover:from-blue-800 hover:to-indigo-900 rounded-lg shadow-sm flex items-center space-x-1.5 transition active:scale-95 ring-1 ring-blue-400/30"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={onOpenAiSettings}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 transition ${
              aiGatewayConfigured
                ? 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-300'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>AI Gateway{aiGatewayConfigured ? ' · Aktif' : ''}</span>
          </button>
          {showLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center space-x-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>

    </header>
  );
};
