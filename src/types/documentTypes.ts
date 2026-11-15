import type { ExamPackage } from './exam.ts';

export type ExportDocType = 'naskah' | 'kunci' | 'kisi-kisi' | 'rubrik' | 'kartu-soal' | 'ljs';

export const DOC_TYPE_LABELS: Record<ExportDocType, string> = {
  naskah: 'Naskah Soal Ujian (Siap Cetak)',
  kunci: 'Kunci Jawaban & Pembahasan',
  'kisi-kisi': 'Kisi-Kisi Penulisan Soal (Matrix)',
  rubrik: 'Pedoman Penskoran & Rubrik Penilaian',
  'kartu-soal': 'Kartu Soal Asesmen Standar Dinas',
  ljs: 'Lembar Jawaban Siswa (LJS) 1 Lembar',
};

export const DOC_TYPE_PREFIXES: Record<ExportDocType, string> = {
  naskah: 'Naskah_Ujian',
  kunci: 'Kunci_Jawaban',
  'kisi-kisi': 'Kisi_Kisi',
  rubrik: 'Pedoman_Penskoran',
  'kartu-soal': 'Kartu_Soal',
  ljs: 'Lembar_Jawaban_Siswa',
};

/**
 * Formats standard official filename for Word and PDF downloads
 */
export function getExportFilename(
  exam: ExamPackage,
  docType: ExportDocType,
  extension: 'docx' | 'pdf'
): string {
  const prefix = DOC_TYPE_PREFIXES[docType] || 'Dokumen_Ujian';
  const cleanSubject = (exam.examSummary?.subject || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanClass = (exam.examSummary?.grade || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${prefix}_${cleanSubject}_${cleanClass}.${extension}`;
}
