import React from 'react';

interface DocumentToolbarProps {
  title: string;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({ title }) => (
  <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
    <div className="flex items-center space-x-2">
      <span className="font-extrabold text-slate-800">{title}</span>
      <span className="text-[11px] text-slate-400">| Dokumen Resmi Siap Cetak (A4)</span>
    </div>
  </div>
);
