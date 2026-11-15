import React, { useState } from 'react';
import { Printer, Download, FileText, ChevronDown, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { printElementDirectly } from '../utils/printPdf';
import { exportExamToWord, exportExamToPdf, ExportDocType } from '../utils/exportWord';
import { ExamPackage } from '../types/exam';

interface DocumentToolbarProps {
  title: string;
  elementId: string;
  docFileName: string;
  docType: ExportDocType;
  exam: ExamPackage;
  onOpenPrintModal?: () => void;
  onDownloadWord?: () => void;
  onDownloadPdf?: () => void;
  onPrint?: () => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  title,
  elementId,
  docFileName,
  docType,
  exam,
  onOpenPrintModal,
  onDownloadWord,
  onDownloadPdf,
  onPrint,
}) => {
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadWordAction = async () => {
    if (onDownloadWord) {
      onDownloadWord();
      return;
    }
    setIsDownloadingWord(true);
    try {
      await exportExamToWord(exam, docType);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const handleDownloadPdfAction = async () => {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    setIsDownloadingPdf(true);
    try {
      await exportExamToPdf(exam, docType);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrintAction = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    printElementDirectly(elementId, docFileName);
  };

  return (
    <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2">
        <span className="font-extrabold text-slate-800">{title}</span>
        <span className="text-[11px] text-slate-400">| Dokumen Resmi Siap Cetak (A4)</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Unduh Word .docx */}
        <button
          onClick={handleDownloadWordAction}
          disabled={isDownloadingWord}
          title="Unduh dokumen ini dalam format Microsoft Word (.docx)"
          className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 shadow-2xs"
        >
          {isDownloadingWord ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-700 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-blue-700" />
          )}
          <span>{isDownloadingWord ? 'Menyiapkan...' : 'Unduh Word (.docx)'}</span>
        </button>

        {/* Unduh PDF .pdf */}
        <button
          onClick={handleDownloadPdfAction}
          disabled={isDownloadingPdf}
          title="Unduh dokumen ini dalam format PDF siap cetak"
          className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 shadow-2xs"
        >
          {isDownloadingPdf ? (
            <Loader2 className="w-3.5 h-3.5 text-rose-700 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5 text-rose-700" />
          )}
          <span>{isDownloadingPdf ? 'Mengonversi...' : 'Unduh PDF (.pdf)'}</span>
        </button>

        {/* Cetak Langsung / Buka Dialog Cetak */}
        <button
          onClick={handlePrintAction}
          title="Cetak langsung ke printer fisik atau Simpan sebagai PDF dari browser"
          className="px-3.5 py-1.5 rounded-lg border border-blue-700 bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
        >
          <Printer className="w-3.5 h-3.5 text-amber-300" />
          <span>Cetak Dokumen</span>
        </button>

        {/* Pusat Cetak Lengkap Modal trigger */}
        {onOpenPrintModal && (
          <button
            onClick={onOpenPrintModal}
            title="Buka Pusat Cetak & Pengaturan Kertas Dokumen"
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          </button>
        )}
      </div>
    </div>
  );
};
