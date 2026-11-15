import React, { useState, useEffect } from 'react';
import { ExamPackage } from '../types/exam';
import { ViewTab } from './Navbar';
import { printElementDirectly, downloadPrintableHtml } from '../utils/printPdf';
import { exportExamToWord, exportExamToPdf, exportAllDocuments } from '../utils/exportWord';
import {
  Printer,
  Download,
  FileText,
  X,
  FileCheck2,
  KeyRound,
  FileSpreadsheet,
  ListOrdered,
  Grid3X3,
  Layers,
  HelpCircle,
  Sparkles,
  FileCode,
  CheckCircle2,
} from 'lucide-react';

interface PrintPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamPackage;
  activeTab: ViewTab;
  onSwitchTab: (tab: ViewTab) => void;
}

export const PrintPdfModal: React.FC<PrintPdfModalProps> = ({
  isOpen,
  onClose,
  exam,
  activeTab,
  onSwitchTab,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<ViewTab>(activeTab);
  const [paperSize, setPaperSize] = useState<'a4' | 'folio'>('a4');
  const [marginSetting, setMarginSetting] = useState<number>(12); // mm
  const [printedSuccess, setPrintedSuccess] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDoc(activeTab);
      setDownloadStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // Map document type to element ID
  const elementIdMap: Record<ViewTab, string> = {
    naskah: 'printable-exam-document',
    kunci: 'printable-answer-key',
    'kisi-kisi': 'printable-kisi-kisi',
    rubrik: 'printable-rubric',
    'kartu-soal': 'printable-question-cards',
    ljs: 'printable-ljs',
  };

  const waitForPrintableTab = async (tab: ViewTab): Promise<void> => {
    const targetId = elementIdMap[tab];
    onSwitchTab(tab);
    const start = Date.now();
    while (!document.getElementById(targetId) && Date.now() - start < 1500) {
      await new Promise((r) => setTimeout(r, 40));
    }
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));
  };

  const docTitles: Record<ViewTab, string> = {
    naskah: `Naskah_Soal_${exam.examSummary.examType}_${exam.examSummary.subject}_${exam.examSummary.grade}`,
    kunci: `Kunci_Jawaban_${exam.examSummary.examType}_${exam.examSummary.subject}`,
    'kisi-kisi': `Kisi_Kisi_${exam.examSummary.examType}_${exam.examSummary.subject}`,
    rubrik: `Rubrik_Penskoran_${exam.examSummary.examType}_${exam.examSummary.subject}`,
    'kartu-soal': `Kartu_Soal_${exam.examSummary.examType}_${exam.examSummary.subject}`,
    ljs: `Lembar_Jawaban_Siswa_${exam.examSummary.examType}_${exam.examSummary.subject}`,
  };

  const handleDocChange = (tab: ViewTab) => {
    setSelectedDoc(tab);
    onSwitchTab(tab);
  };

  // 1. Direct Browser Print Dialog (Native Save to PDF / Physical Print)
  const handlePrint = () => {
    onSwitchTab(selectedDoc);
    setPrintedSuccess(true);
    setTimeout(() => {
      const elementId = elementIdMap[selectedDoc];
      printElementDirectly(elementId, docTitles[selectedDoc], {
        paperSize,
        marginMm: marginSetting,
      });
      setTimeout(() => setPrintedSuccess(false), 4000);
    }, 250);
  };

  // 2. Direct PDF Download (High-fidelity HTML preview -> PDF)
  const handleDirectPdfDownload = async () => {
    setIsExportingPdf(true);
    setDownloadStatus(null);
    try {
      await waitForPrintableTab(selectedDoc);
      await exportExamToPdf(exam, selectedDoc, {
        paperSize,
        marginMm: marginSetting,
      });
      setDownloadStatus({
        type: 'success',
        message: 'Berkas PDF (.pdf) berhasil dibuat sesuai tampilan pratinjau dan diunduh ke perangkat Anda.',
      });
    } catch (err: any) {
      setDownloadStatus({
        type: 'error',
        message: err?.message || 'Gagal mengunduh berkas PDF.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 3. Download Standalone Printable HTML file
  const handleDownloadHtml = () => {
    onSwitchTab(selectedDoc);
    setTimeout(() => {
      const elementId = elementIdMap[selectedDoc];
      downloadPrintableHtml(elementId, docTitles[selectedDoc]);
    }, 200);
  };

  // 4. True OOXML Word Export (.docx)
  const handleExportWord = async () => {
    setIsExportingDocx(true);
    setDownloadStatus(null);
    try {
      await exportExamToWord(exam, selectedDoc, {
        paperSize,
        marginMm: marginSetting,
      });
      setDownloadStatus({
        type: 'success',
        message: 'Berkas Word (.docx) berhasil dibuat dan diunduh ke perangkat Anda.',
      });
    } catch (err: any) {
      setDownloadStatus({
        type: 'error',
        message: err?.message || 'Gagal mengunduh berkas Word.',
      });
    } finally {
      setIsExportingDocx(false);
    }
  };

  // 5. Batch Export all 6 documents
  const handleExportAll = async (format: 'docx' | 'pdf') => {
    setIsExportingAll(true);
    setDownloadStatus(null);
    const originalDoc = selectedDoc;
    try {
      await exportAllDocuments(
        exam,
        format,
        {
          paperSize,
          marginMm: marginSetting,
        },
        format === 'pdf'
          ? async (docType) => {
              await waitForPrintableTab(docType as ViewTab);
            }
          : undefined
      );
      if (format === 'pdf') {
        onSwitchTab(originalDoc);
      }
      setDownloadStatus({
        type: 'success',
        message: `Semua 6 dokumen (${format.toUpperCase()}) berhasil diunduh.`,
      });
    } catch (err: any) {
      setDownloadStatus({
        type: 'error',
        message: err?.message || `Gagal mengunduh seluruh dokumen ${format.toUpperCase()}.`,
      });
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Printer className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pusat Cetak & Simpan PDF Dokumen Ujian</h2>
              <p className="text-xs text-blue-200">
                Cetak ke printer fisik atau simpan file PDF resmi berstandar dinas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {printedSuccess && (
            <div className="p-3 rounded-xl text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Jendela cetak peramban berhasil dibuka! Pilih <strong>&quot;Simpan sebagai PDF&quot;</strong> pada bagian Tujuan untuk menyimpan ke komputer.
              </span>
            </div>
          )}

          {downloadStatus && (
            <div
              className={`p-3 rounded-xl text-xs border flex items-center space-x-2 animate-in fade-in ${
                downloadStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  downloadStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                }`}
              />
              <span>{downloadStatus.message}</span>
            </div>
          )}

          {/* 1. Pilih Dokumen yang Ingin Dicetak */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Pilih Dokumen yang Ingin Dicetak:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'naskah', label: 'Naskah Soal Siswa', icon: FileCheck2 },
                { id: 'kunci', label: 'Kunci & Pembahasan', icon: KeyRound },
                { id: 'kisi-kisi', label: 'Kisi-Kisi Soal (Matrix)', icon: FileSpreadsheet },
                { id: 'rubrik', label: 'Rubrik Penskoran', icon: ListOrdered },
                { id: 'kartu-soal', label: 'Kartu Soal Dinas', icon: Grid3X3 },
                { id: 'ljs', label: 'Lembar Jawaban (LJS)', icon: Layers },
              ].map((doc) => {
                const Icon = doc.icon;
                const isSelected = selectedDoc === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleDocChange(doc.id as ViewTab)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center space-x-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="truncate">{doc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pengaturan Kertas & Margin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ukuran Kertas Dokumen:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaperSize('a4')}
                  className={`p-2 rounded-lg border text-center transition ${
                    paperSize === 'a4'
                      ? 'border-blue-600 bg-white font-bold text-blue-900 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="font-extrabold">A4 (Standar)</div>
                  <div className="text-[10px] text-slate-500">210 × 297 mm</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaperSize('folio')}
                  className={`p-2 rounded-lg border text-center transition ${
                    paperSize === 'folio'
                      ? 'border-blue-600 bg-white font-bold text-blue-900 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="font-extrabold">F4 / Folio</div>
                  <div className="text-[10px] text-slate-500">215 × 330 mm</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Margin Tepi Halaman:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setMarginSetting(12)}
                  className={`p-2 rounded-lg border text-center transition ${
                    marginSetting === 12
                      ? 'border-blue-600 bg-white font-bold text-blue-900 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="font-extrabold">Standar (12 mm)</div>
                  <div className="text-[10px] text-slate-500">Rapi & Proporsional</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMarginSetting(8)}
                  className={`p-2 rounded-lg border text-center transition ${
                    marginSetting === 8
                      ? 'border-blue-600 bg-white font-bold text-blue-900 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="font-extrabold">Sempit (8 mm)</div>
                  <div className="text-[10px] text-slate-500">Muat Lebih Banyak</div>
                </button>
              </div>
            </div>
          </div>

          {/* PETUNJUK RESMI CARA SIMPAN SEBAGAI PDF */}
          <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
            <div className="flex items-center space-x-2 font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Cara Menyimpan Dokumen Sebagai File PDF di Komputer Anda:</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-slate-700 text-[11px] leading-relaxed">
              <li>
                Klik tombol biru besar <strong>&quot;Cetak / Simpan ke PDF Sekarang&quot;</strong> di bawah.
              </li>
              <li>
                Pada jendela cetak yang muncul, ubah bagian <strong>Tujuan / Destination</strong> menjadi <strong>&quot;Simpan sebagai PDF&quot; (Save as PDF)</strong>.
              </li>
              <li>
                Pastikan ukuran kertas sesuai (<strong>A4</strong> atau <strong>Folio</strong>) dan centang <em>&quot;Grafik latar belakang&quot;</em> jika logo ingin berwarna penuh.
              </li>
              <li>
                Klik tombol <strong>Simpan (Save)</strong>, lalu pilih folder di komputer Anda (misal folder <em>Dokumen</em> atau <em>Unduhan</em>).
              </li>
            </ol>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="space-y-3 pt-2">
            {/* Grid 2 Tombol Utama: Cetak / Simpan PDF Browser & Unduh PDF Otentik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="py-3 px-4 rounded-xl bg-linear-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-98"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Buka Jendela Cetak</span>
              </button>

              <button
                type="button"
                onClick={handleDirectPdfDownload}
                disabled={isExportingPdf}
                className="py-3 px-4 rounded-xl bg-linear-to-r from-rose-700 via-red-600 to-rose-800 hover:from-rose-800 hover:to-red-700 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-md transition active:scale-98 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-white" />
                <span>{isExportingPdf ? 'Mengonversi PDF...' : 'Unduh File PDF (.pdf)'}</span>
              </button>
            </div>

            {/* Alternatif Tambahan: Word .docx & HTML */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={handleExportWord}
                disabled={isExportingDocx}
                className="py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-center space-x-1.5 shadow-2xs transition disabled:opacity-50"
              >
                <FileText className="w-4 h-4 text-blue-700" />
                <span>{isExportingDocx ? 'Membuat Word...' : 'Unduh Word Asli (.docx)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                title="Unduh file mandiri siap cetak yang dapat dibuka di peramban mana saja"
                className="py-2.5 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-center space-x-1.5 shadow-2xs transition"
              >
                <FileCode className="w-4 h-4 text-emerald-700" />
                <span>Unduh Halaman Cetak (.html)</span>
              </button>
            </div>

            {/* Paket Administrasi Lengkap: Unduh Semua 6 Dokumen Sekaligus */}
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Paket Lengkap Administrasi (Unduh Semua 6 Dokumen):</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Mengunduh otomatis Naskah Soal, Kunci Jawaban, Kisi-Kisi, Rubrik Penskoran, Kartu Soal, dan LJS.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleExportAll('docx')}
                  disabled={isExportingAll}
                  className="py-2 px-3 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-700" />
                  <span>{isExportingAll ? 'Mengunduh...' : 'Unduh Semua (6 File Word)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportAll('pdf')}
                  disabled={isExportingAll}
                  className="py-2 px-3 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-900 font-bold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-rose-700" />
                  <span>{isExportingAll ? 'Mengunduh...' : 'Unduh Semua (6 File PDF)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Close */}
          <div className="pt-2 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
