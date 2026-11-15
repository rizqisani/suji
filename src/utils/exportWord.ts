import type { ExamPackage } from '../types/exam.ts';
import { type NaskahUjianData, type KopBaris, type BagianSoal, JENIS_UJIAN_TITLES } from '../schema/naskahUjianSchema.ts';
import { computeMcInstruction, computeCmcInstruction, resolveStatementLabels } from './questionHelpers.ts';

export interface ExportDocumentOptions {
  columnsMode?: '1' | '2';
  paperSize?: 'a4' | 'folio';
  marginMm?: number;
}

/**
 * Converts ExamPackage to validated NaskahUjianData structured format
 */
export function examPackageToNaskahUjianData(
  exam: ExamPackage,
  options?: ExportDocumentOptions
): NaskahUjianData {
  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } = exam;

  // City & Date parsing (do NOT fabricate Bandung/today when cityDate is empty)
  let tempat = '';
  let tanggal = '';
  if (kopConfig.cityDate && kopConfig.cityDate.includes(',')) {
    const parts = kopConfig.cityDate.split(',');
    tempat = parts[0].trim();
    tanggal = parts.slice(1).join(',').trim();
  } else if (kopConfig.cityDate?.trim()) {
    tempat = kopConfig.cityDate.trim();
  }

  // Build Kop Rows
  const baris: KopBaris[] = [];
  if (kopConfig.govermentHeader1?.trim()) {
    baris.push({ teks: kopConfig.govermentHeader1.trim(), ukuranFont: 11, tebal: true });
  }
  if (kopConfig.govermentHeader2?.trim()) {
    baris.push({ teks: kopConfig.govermentHeader2.trim(), ukuranFont: 12, tebal: true });
  }
  if (kopConfig.subHeader?.trim()) {
    baris.push({ teks: kopConfig.subHeader.trim(), ukuranFont: 10, tebal: true });
  }
  if (kopConfig.schoolName?.trim()) {
    baris.push({ teks: kopConfig.schoolName.trim(), ukuranFont: 14, tebal: true });
  }
  if (kopConfig.accreditation?.trim()) {
    baris.push({ teks: kopConfig.accreditation.trim(), ukuranFont: 8.5, tebal: false, miring: true });
  }

  const addrParts: string[] = [];
  if (kopConfig.address?.trim()) addrParts.push(kopConfig.address.trim());
  if (kopConfig.contact?.trim()) addrParts.push(kopConfig.contact.trim());
  if (kopConfig.website?.trim()) addrParts.push(kopConfig.website.trim());

  if (addrParts.length > 0) {
    baris.push({ teks: addrParts.join(' • '), ukuranFont: 9, tebal: false, miring: true });
  } else if (!kopConfig.schoolName?.trim() && !kopConfig.govermentHeader1?.trim()) {
    baris.push({
      teks: 'Jl. Pendidikan Nasional No. 1 • Telp. (021) 1234567 • Website: sekolah.sch.id',
      ukuranFont: 9,
      tebal: false,
      miring: true,
    });
  }

  // Build Question Sections
  const bagianSoal: BagianSoal[] = [];

  // 1. Multiple Choice
  if (multipleChoice && multipleChoice.length > 0) {
    bagianSoal.push({
      tipe: 'pg',
      judul: 'PILIHAN GANDA',
      instruksi: computeMcInstruction(multipleChoice),
      aktif: true,
      soal: multipleChoice.map((q) => ({
        id: q.id,
        nomor: q.number,
        varian: q.variant,
        wacana: q.stimulus ? [q.stimulus] : undefined,
        teks: q.question,
        opsi: q.options.map((opt) => ({ label: opt.key, teks: opt.text })),
        kunci: q.correctAnswer,
        pembahasan: q.explanation,
      })),
    });
  }

  // 2. Complex Multiple Choice (supports both statements with custom binary labels AND options multi-select)
  if (complexMultipleChoice && complexMultipleChoice.length > 0) {
    bagianSoal.push({
      tipe: 'pg_kompleks',
      judul: 'PILIHAN GANDA KOMPLEKS',
      instruksi: computeCmcInstruction(complexMultipleChoice),
      aktif: true,
      soal: complexMultipleChoice.map((q) => {
        const hasStatements = q.statements && q.statements.length > 0;
        const resolvedLbl = hasStatements ? resolveStatementLabels(q) : undefined;
        return {
          id: q.id,
          nomor: q.number,
          varian: q.variant,
          labelPernyataan: resolvedLbl
            ? {
                positif: resolvedLbl.positive,
                negatif: resolvedLbl.negative,
                kodePositif: resolvedLbl.positiveCode,
                kodeNegatif: resolvedLbl.negativeCode,
              }
            : undefined,
          wacana: q.stimulus ? [q.stimulus] : undefined,
          teks: q.question,
          pernyataan: hasStatements
            ? q.statements!.map((s) => ({
                teks: s.statement,
                jawaban: s.isCorrect,
              }))
            : undefined,
          opsi:
            q.options && q.options.length > 0
              ? q.options.map((opt) => ({ label: opt.key, teks: opt.text }))
              : undefined,
          kunci: q.correctAnswer,
          pembahasan: q.explanation,
        };
      }),
    });
  }

  // 3. Matching
  if (matching && matching.length > 0) {
    bagianSoal.push({
      tipe: 'menjodohkan',
      judul: 'MENJODOHKAN',
      instruksi: 'Jodohkanlah pernyataan di kolom sebelah kiri dengan jawaban yang tepat di kolom sebelah kanan!',
      aktif: true,
      soal: matching.map((q) => {
        const distractors = q.distractors || [];
        const rightItems = [...q.pairs.map((p) => p.match), ...distractors];
        return {
          id: q.id,
          nomor: q.number,
          teks: q.instruction || 'Pasangkan premis di sebelah kiri dengan pilihan yang tepat di sebelah kanan:',
          premis: q.pairs.map((p) => p.premise),
          pilihan: rightItems,
          pembahasan: q.explanation,
        };
      }),
    });
  }

  // 4. Short Answer
  if (shortAnswer && shortAnswer.length > 0) {
    bagianSoal.push({
      tipe: 'isian',
      judul: 'ISIAN SINGKAT',
      instruksi: 'Isilah titik-titik di bawah ini dengan jawaban yang singkat dan tepat!',
      aktif: true,
      soal: shortAnswer.map((q) => ({
        id: q.id,
        nomor: q.number,
        wacana: q.stimulus ? [q.stimulus] : undefined,
        teks: q.question,
        kunci: q.correctAnswer || q.expectedAnswer || '',
        pembahasan: q.explanation,
      })),
    });
  }

  // 5. Essay
  if (essay && essay.length > 0) {
    bagianSoal.push({
      tipe: 'uraian',
      judul: 'URAIAN',
      instruksi: 'Jawablah pertanyaan berikut dengan jelas, sistematis, dan tepat!',
      aktif: true,
      soal: essay.map((q) => ({
        id: q.id,
        nomor: q.number,
        wacana: q.stimulus ? [q.stimulus] : undefined,
        teks: q.question,
        jumlahGarisJawaban: 2,
        kunci: q.expectedAnswer,
        pembahasan: q.scoringRubric ? q.scoringRubric.map((r) => `${r.criteria} (${r.points} poin)`).join('; ') : undefined,
      })),
    });
  }

  const gradeStr = examSummary.grade || 'VII';
  const hasFaseInGrade = gradeStr.toLowerCase().includes('fase');
  const inferredFase = hasFaseInGrade
    ? ''
    : examSummary.schoolLevel === 'SMP' || examSummary.schoolLevel === 'MTs'
    ? 'Fase D'
    : examSummary.schoolLevel === 'SMA' || examSummary.schoolLevel === 'SMK' || examSummary.schoolLevel === 'MA'
    ? 'Fase E/F'
    : '';

  return {
    identitas: {
      jenis: examSummary.examType,
      judul: examSummary.title?.trim() || undefined,
      tahunAjaran: examSummary.academicYear || '2024/2025',
      semester: examSummary.semester || 'Ganjil',
      mataPelajaran: examSummary.subject || 'Mata Pelajaran',
      kelas: gradeStr,
      fase: inferredFase,
      kurikulum: examSummary.curriculum || 'Kurikulum Merdeka',
      alokasiWaktu: examSummary.duration || '90 Menit',
      hariTanggal: '',
      namaSiswa: '',
      nomorAbsen: '',
    },
    kop: {
      baris,
      logoKiri: kopConfig.logoLeftUrl || '',
      logoKanan: kopConfig.logoRightUrl || '',
      garisGanda: true,
    },
    tataLetak: {
      ukuranKertas: 'A4',
      margin: 850,
      jumlahKolom: options?.columnsMode === '1' ? 1 : 2,
      jarakKolom: 400,
      garisPemisahKolom: true,
      fontUtama: 'Times New Roman',
      ukuranFontSoal: 10,
    },
    petunjukUmum: examSummary.generalInstructions || [
      'Berdoalah sebelum mengerjakan soal sesuai keyakinan masing-masing.',
      'Tuliskan nomor peserta dan nama pada lembar jawaban yang tersedia.',
      'Periksa dan bacalah naskah soal dengan teliti sebelum menjawab.',
      'Dahulukan menjawab soal-soal yang Anda anggap mudah.',
      'Periksa kembali pekerjaan Anda sebelum diserahkan kepada pengawas.',
    ],
    bagianSoal,
    tandaTangan: {
      tempat,
      tanggal,
      kepalaSekolah: {
        nama: kopConfig.headmasterName || 'Kepala Sekolah',
        nip: kopConfig.headmasterNip?.trim() || '',
      },
      guru: {
        nama: kopConfig.teacherName || 'Guru Mata Pelajaran',
        nip: kopConfig.teacherNip?.trim() || '',
      },
    },
    opsional: {
      nomorHalaman: true,
    },
  };
}

/**
 * Downloads a Blob as a file in the browser
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {}
  }, 5000);
}

export type { ExportDocType } from '../types/documentTypes.ts';
import { getExportFilename, type ExportDocType } from '../types/documentTypes.ts';

/**
 * Exports the selected exam document to true OOXML (.docx)
 */
export async function exportExamToWord(
  exam: ExamPackage,
  docType: ExportDocType = 'naskah',
  options?: ExportDocumentOptions
): Promise<void> {
  const filename = getExportFilename(exam, docType, 'docx');

  try {
    const res = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exam, docType, options }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${res.status}`);
    }

    const blob = await res.blob();
    triggerDownload(blob, filename);
  } catch (err: any) {
    console.error('Export DOCX via API error, trying client-side fallback:', err);
    // Client-side fallback using npm docx directly
    try {
      const { createDocumentByDocType } = await import('../renderer/documentFactory');
      const { Packer } = await import('docx');
      const doc = await createDocumentByDocType(exam, docType, options);
      const blob = await Packer.toBlob(doc);
      triggerDownload(blob, filename);
    } catch (fallbackErr: any) {
      console.error('Client-side fallback error:', fallbackErr);
      throw new Error('Gagal mengekspor file DOCX: ' + (fallbackErr.message || err.message));
    }
  }
}

let serverPdfAvailable: boolean | null = null;

/**
 * Exports the selected exam document directly to PDF (.pdf).
 * Prioritizes capturing the exact HTML preview rendered in the app (matching kop surat,
 * logos, tables, LJS bubbles, and typography 1:1), falling back to vector jsPDF
 * or backend LibreOffice only if DOM capture is unavailable.
 */
export async function exportExamToPdf(
  exam: ExamPackage,
  docType: ExportDocType = 'naskah',
  options?: ExportDocumentOptions
): Promise<void> {
  const filename = getExportFilename(exam, docType, 'pdf');

  // 1. Primary: Capture exact rendered HTML preview DOM via html2pdf.js
  if (typeof document !== 'undefined') {
    try {
      const { PRINTABLE_ELEMENT_ID_MAP, generateHtmlElementPdfBlob } = await import(
        '../renderer/htmlPdf'
      );
      const elementId = PRINTABLE_ELEMENT_ID_MAP[docType];
      if (elementId && document.getElementById(elementId)) {
        const htmlPdfBlob = await generateHtmlElementPdfBlob(elementId, {
          paperSize: options?.paperSize,
          marginMm: options?.marginMm,
          fitToOnePage: docType === 'ljs',
        });
        triggerDownload(htmlPdfBlob, filename);
        return;
      }
    } catch (htmlErr: any) {
      console.warn('HTML-to-PDF capture failed, trying fallback PDF renderer:', htmlErr);
    }
  }

  // 2. Secondary: Backend LibreOffice conversion (if installed on server)
  if (serverPdfAvailable !== false) {
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam, docType, options }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/pdf')) {
        serverPdfAvailable = true;
        const blob = await res.blob();
        triggerDownload(blob, filename);
        return;
      }
      serverPdfAvailable = false;
    } catch (err: any) {
      serverPdfAvailable = false;
      console.warn('Backend PDF conversion unavailable, using client-side PDF fallback:', err);
    }
  }

  // 3. Fallback: Off-DOM vector PDF generation via jsPDF
  const { generateClientPdfBlob } = await import('../renderer/clientPdf');
  const pdfBlob = await generateClientPdfBlob(exam, docType, options);
  triggerDownload(pdfBlob, filename);
}

/**
 * Exports all 6 supporting documents in sequential downloads.
 * Optional onBeforeExportDoc allows UI callers to mount/switch the active preview tab
 * before HTML-to-PDF capture runs.
 */
export async function exportAllDocuments(
  exam: ExamPackage,
  format: 'docx' | 'pdf' = 'docx',
  options?: ExportDocumentOptions,
  onBeforeExportDoc?: (docType: ExportDocType) => Promise<void> | void
): Promise<void> {
  const allDocTypes: ExportDocType[] = ['naskah', 'kunci', 'kisi-kisi', 'rubrik', 'kartu-soal', 'ljs'];
  for (const docType of allDocTypes) {
    if (onBeforeExportDoc) {
      await onBeforeExportDoc(docType);
    }
    if (format === 'docx') {
      await exportExamToWord(exam, docType, options);
    } else {
      await exportExamToPdf(exam, docType, options);
    }
    // Small delay between downloads so browser doesn't block multi-download
    await new Promise((r) => setTimeout(r, 450));
  }
}

