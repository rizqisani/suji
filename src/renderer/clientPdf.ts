import { jsPDF } from 'jspdf';
import type { ExamPackage, SchoolKopConfig, ComplexMultipleChoiceItem } from '../types/exam';
import type { ExportDocType } from '../types/documentTypes';
import {
  computeMcInstruction,
  computeCmcInstruction,
  resolveStatementLabels,
  getCmcCorrectList,
  getMcVariantBadgeLabel,
  getCmcVariantBadgeLabel,
} from '../utils/questionHelpers';

function stripCheckboxToken(text: string): string {
  return (text || '').replace(/^\s*(?:\[\s*[xX✓✔vV]?\s*\]|[☐☑✅])\s*/, '').trim();
}

function isCmcMultiSelect(q: ComplexMultipleChoiceItem): boolean {
  return Array.isArray(q.options) && q.options.length > 0 && (!q.statements || q.statements.length === 0);
}

export interface ClientPdfOptions {
  columnsMode?: '1' | '2';
  paperSize?: 'a4' | 'folio';
  marginMm?: number;
}

const DEFAULT_LOGO_DINAS_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="46" fill="#1E3A8A" stroke="#FBBF24" stroke-width="4" />
  <circle cx="50" cy="50" r="41" fill="#1E3A8A" stroke="#FFFFFF" stroke-width="1.5" />
  <path d="M50 16 L53 30 L47 30 Z" fill="#F59E0B" />
  <path d="M45 28 C45 22 55 22 55 28 C55 33 50 35 50 35 C50 35 45 33 45 28 Z" fill="#EF4444" />
  <rect x="47.5" y="34" width="5" height="26" fill="#FBBF24" rx="1" />
  <path d="M26 62 C34 58 44 60 50 64 C56 60 66 58 74 62 L74 74 C66 70 56 72 50 76 C44 72 34 70 26 74 Z" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="2" />
  <line x1="50" y1="64" x2="50" y2="76" stroke="#1E3A8A" stroke-width="2" />
  <path d="M26 44 C34 40 45 42 45 46 C37 46 30 50 28 56 Z" fill="#FBBF24" />
  <path d="M74 44 C66 40 55 42 55 46 C63 46 70 50 72 56 Z" fill="#FBBF24" />
  <polygon points="50,18 52,24 58,24 53,27 55,33 50,29 45,33 47,27 42,24 48,24" fill="#FBBF24" />
</svg>`;

const DEFAULT_LOGO_TUTWURI_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,6 94,38 78,92 22,92 6,38" fill="#0284C7" stroke="#FBBF24" stroke-width="3.5" />
  <polygon points="50,11 89,40 75,88 25,88 11,40" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5" />
  <path d="M50 38 C32 36 22 52 25 72 C35 68 45 68 50 72 C55 68 65 68 75 72 C78 52 68 36 50 38 Z" fill="#FFFFFF" />
  <path d="M48 24 C45 28 47 34 50 37 C53 34 55 28 52 24 C50 20 50 20 48 24 Z" fill="#DC2626" />
  <rect x="47.5" y="37" width="5" height="28" fill="#FBBF24" rx="1" />
  <ellipse cx="50" cy="65" rx="14" ry="4" fill="#FBBF24" />
  <path d="M40 65 L44 76 L56 76 L60 65 Z" fill="#D97706" />
  <path d="M32 78 C38 75 45 76 50 79 C55 76 62 75 68 78 L68 84 C62 81 55 82 50 85 C45 82 38 81 32 84 Z" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.5" />
</svg>`;

/**
 * Sanitizes Unicode characters so jsPDF standard Type1 fonts render cleanly without glyphs breaking.
 */
function cleanText(input?: string | number | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/\r\n/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2713\u2714\u2611]/g, '[v]')
    .replace(/[\u2717\u2718]/g, '[x]')
    .replace(/\u2610/g, '[ ]')
    .replace(/[\u2794\u2192\u27A1]/g, '->')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2260/g, '!=')
    .replace(/\u00D7/g, 'x')
    .replace(/\u00F7/g, ':')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF\u2022]/g, ' ');
}

function getImageSource(rawLogo?: string, fallbackType: 'dinas' | 'tutwuri' = 'dinas'): string {
  const trimmed = (rawLogo || '').trim();
  if (!trimmed) {
    const svg = fallbackType === 'dinas' ? DEFAULT_LOGO_DINAS_SVG : DEFAULT_LOGO_TUTWURI_SVG;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

async function logoToPngDataUrl(
  rawLogo?: string,
  fallbackType: 'dinas' | 'tutwuri' = 'dinas'
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  const src = getImageSource(rawLogo, fallbackType);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => resolve(null), 1500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        const ratio = Math.min(size / (img.naturalWidth || size), size / (img.naturalHeight || size));
        const w = (img.naturalWidth || size) * ratio;
        const h = (img.naturalHeight || size) * ratio;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      // Try default emblem if custom logo failed
      if (rawLogo && rawLogo.trim() !== '') {
        logoToPngDataUrl('', fallbackType).then(resolve);
      } else {
        resolve(null);
      }
    };

    img.src = src;
  });
}

function normalizeDisplayExamType(examType?: string): string {
  if (!examType || examType === 'SAS') return 'PSAS';
  return examType;
}

function getSafeExamTitle(exam: ExamPackage): string {
  const t = exam.examSummary?.title || normalizeDisplayExamType(exam.examSummary?.examType) || 'PENILAIAN SUMATIF';
  return cleanText(t.replace(/\(SAS\)/gi, '(PSAS)').toUpperCase());
}

function formatScoreRange(items: { score?: number }[], defaultScore: number, fallbackLabel: string): string {
  if (!items || items.length === 0) return '-';
  const scores = items.map((q) => q.score ?? defaultScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return `${min} poin / nomor`;
  return `${min}-${max} (${fallbackLabel})`;
}

/**
 * Helper class for clean vertical pagination & text wrapping in jsPDF
 */
class PdfCursor {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  contentW: number;
  y: number;
  // Column state (only used when colCount === 2)
  colCount: 1 | 2;
  colGap: number;
  colW: number;
  colIdx: 0 | 1;
  colStartY: number;
  colTopPage: number;
  colBottomYs: [number, number];
  colPageSet: Set<number>;

  constructor(options?: ClientPdfOptions) {
    const paper = options?.paperSize === 'folio' ? [215, 330] : [210, 297];
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paper as [number, number],
      compress: true,
    });
    this.pageW = paper[0];
    this.pageH = paper[1];
    this.margin = options?.marginMm ?? 12;
    this.contentW = this.pageW - 2 * this.margin;
    this.y = this.margin;
    this.colCount = 1;
    this.colGap = 7;
    this.colW = this.contentW;
    this.colIdx = 0;
    this.colStartY = this.margin;
    this.colTopPage = 1;
    this.colBottomYs = [this.margin, this.margin];
    this.colPageSet = new Set();
  }

  get bottomLimit(): number {
    return this.pageH - this.margin - 7; // reserve 7mm for page number footer
  }

  get activeX(): number {
    if (this.colCount === 1) return this.margin;
    return this.colIdx === 0 ? this.margin : this.margin + this.colW + this.colGap;
  }

  get activeW(): number {
    return this.colCount === 1 ? this.contentW : this.colW;
  }

  enterTwoColumnMode() {
    this.colCount = 2;
    this.colW = (this.contentW - this.colGap) / 2;
    this.colIdx = 0;
    this.colStartY = this.y;
    this.colTopPage = this.doc.getCurrentPageInfo().pageNumber;
    this.colBottomYs = [this.y, this.y];
    this.colPageSet.add(this.colTopPage);
  }

  exitTwoColumnMode() {
    if (this.colCount === 1) return;
    // Draw column divider lines on all pages used by two-column mode
    const dividerX = this.margin + this.colW + this.colGap / 2;
    const currentPage = this.doc.getCurrentPageInfo().pageNumber;
    const sortedPages = Array.from(this.colPageSet).sort((a, b) => a - b);

    for (const p of sortedPages) {
      this.doc.setPage(p);
      this.doc.setDrawColor(203, 213, 225); // slate-300
      this.doc.setLineWidth(0.2);
      const startY = p === this.colTopPage ? this.colStartY : this.margin;
      const endY = p === currentPage ? Math.max(this.colBottomYs[0], this.colBottomYs[1]) : this.bottomLimit;
      if (endY > startY + 2) {
        this.doc.line(dividerX, startY, dividerX, endY);
      }
    }

    this.doc.setPage(currentPage);
    this.y = Math.max(this.colBottomYs[0], this.colBottomYs[1]) + 3;
    this.colCount = 1;
    this.colW = this.contentW;
    this.colIdx = 0;
  }

  ensureSpace(neededMm: number) {
    if (this.y + neededMm <= this.bottomLimit) return;

    if (this.colCount === 2) {
      this.colBottomYs[this.colIdx] = Math.max(this.colBottomYs[this.colIdx], this.y);
      if (this.colIdx === 0) {
        this.colIdx = 1;
        this.y = this.colStartY;
        return;
      }
      // Both columns full on this page -> add new page
      this.doc.addPage();
      const newPage = this.doc.getCurrentPageInfo().pageNumber;
      this.colPageSet.add(newPage);
      this.colIdx = 0;
      this.colStartY = this.margin;
      this.colBottomYs = [this.margin, this.margin];
      this.y = this.margin;
      return;
    }

    this.doc.addPage();
    this.y = this.margin;
  }

  trackBottom() {
    if (this.colCount === 2) {
      this.colBottomYs[this.colIdx] = Math.max(this.colBottomYs[this.colIdx], this.y);
    }
  }

  setFont(style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal', sizePt = 10, color: [number, number, number] = [15, 23, 42]) {
    this.doc.setFont('times', style);
    this.doc.setFontSize(sizePt);
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  measureTextLines(text: string, maxW: number, sizePt: number, style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal'): string[] {
    this.doc.setFont('times', style);
    this.doc.setFontSize(sizePt);
    const cleaned = cleanText(text);
    if (!cleaned) return [];
    const paragraphs = cleaned.split('\n');
    const out: string[] = [];
    for (const p of paragraphs) {
      if (!p.trim()) {
        out.push('');
        continue;
      }
      const wrapped = this.doc.splitTextToSize(p, maxW) as string[];
      out.push(...wrapped);
    }
    return out;
  }

  drawTextBlock(
    text: string,
    opts: {
      indentMm?: number;
      sizePt?: number;
      style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
      color?: [number, number, number];
      lineHeight?: number;
      align?: 'left' | 'center' | 'right';
      afterMm?: number;
      prefix?: string;
      prefixStyle?: 'normal' | 'bold';
    } = {}
  ) {
    const {
      indentMm = 0,
      sizePt = 9.5,
      style = 'normal',
      color = [15, 23, 42],
      lineHeight = sizePt * 0.42,
      align = 'left',
      afterMm = 1.2,
      prefix,
      prefixStyle = 'bold',
    } = opts;

    const x = this.activeX + indentMm;
    const maxW = Math.max(20, this.activeW - indentMm);

    let prefixW = 0;
    if (prefix) {
      this.setFont(prefixStyle, sizePt, color);
      prefixW = this.doc.getTextWidth(cleanText(prefix));
    }

    const lines = this.measureTextLines(text, prefix ? Math.max(15, maxW - prefixW) : maxW, sizePt, style);
    if (lines.length === 0 && !prefix) return;

    if (lines.length === 0 && prefix) {
      this.ensureSpace(lineHeight + 1);
      this.setFont(prefixStyle, sizePt, color);
      this.doc.text(cleanText(prefix), x, this.y + lineHeight * 0.78);
      this.y += lineHeight + afterMm;
      this.trackBottom();
      return;
    }

    lines.forEach((line, idx) => {
      this.ensureSpace(lineHeight + 0.8);
      const drawY = this.y + lineHeight * 0.78;
      if (idx === 0 && prefix) {
        this.setFont(prefixStyle, sizePt, color);
        this.doc.text(cleanText(prefix), x, drawY);
        this.setFont(style, sizePt, color);
        this.doc.text(line, x + prefixW, drawY);
      } else {
        this.setFont(style, sizePt, color);
        const textX =
          align === 'center'
            ? this.activeX + this.activeW / 2
            : align === 'right'
            ? this.activeX + this.activeW
            : x + (prefix ? prefixW : 0);
        this.doc.text(line, textX, drawY, align !== 'left' ? { align } : undefined);
      }
      this.y += lineHeight;
      this.trackBottom();
    });

    this.y += afterMm;
    this.trackBottom();
  }

  addPageNumbers() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFont('times', 'normal');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(100, 116, 139);
      this.doc.text(`Halaman ${i} dari ${total}`, this.pageW - this.margin, this.pageH - 5.5, { align: 'right' });
    }
  }
}

async function drawKopHeader(cursor: PdfCursor, kop?: SchoolKopConfig, compact = false) {
  const safeKop = kop || ({} as SchoolKopConfig);
  const logoSize = compact ? 13 : 17;
  const startY = cursor.y;

  const [leftPng, rightPng] = await Promise.all([
    logoToPngDataUrl(safeKop.logoLeftUrl, 'dinas'),
    logoToPngDataUrl(safeKop.logoRightUrl, 'tutwuri'),
  ]);

  const textZoneW = cursor.contentW - (logoSize + 4) * 2;
  const centerX = cursor.margin + cursor.contentW / 2;

  let textY = startY + 2.5;
  const pushCenteredLine = (text: string, sizePt: number, style: 'normal' | 'bold' | 'italic', stepMm: number) => {
    const cleaned = cleanText(text);
    if (!cleaned) return;
    cursor.setFont(style, sizePt, [0, 0, 0]);
    const wrapped = cursor.doc.splitTextToSize(cleaned, textZoneW) as string[];
    wrapped.forEach((line) => {
      cursor.doc.text(line, centerX, textY, { align: 'center' });
      textY += stepMm;
    });
  };

  if (safeKop.govermentHeader1?.trim()) {
    pushCenteredLine(safeKop.govermentHeader1.trim().toUpperCase(), compact ? 9.5 : 10.5, 'bold', compact ? 3.8 : 4.2);
  }
  if (safeKop.govermentHeader2?.trim()) {
    pushCenteredLine(safeKop.govermentHeader2.trim().toUpperCase(), compact ? 10 : 11.5, 'bold', compact ? 4.0 : 4.5);
  }
  if (safeKop.subHeader?.trim()) {
    pushCenteredLine(safeKop.subHeader.trim().toUpperCase(), compact ? 8.8 : 9.5, 'bold', compact ? 3.5 : 3.9);
  }
  if (safeKop.schoolName?.trim()) {
    pushCenteredLine(safeKop.schoolName.trim().toUpperCase(), compact ? 12 : 13.5, 'bold', compact ? 4.6 : 5.2);
  }
  if (safeKop.accreditation?.trim()) {
    pushCenteredLine(safeKop.accreditation.trim(), 8.2, 'italic', 3.4);
  }

  const addr = [safeKop.address?.trim(), safeKop.contact?.trim(), safeKop.website?.trim()].filter(Boolean).join(' • ');
  if (addr || (!safeKop.schoolName?.trim() && !safeKop.govermentHeader1?.trim())) {
    pushCenteredLine(addr || 'Jl. Pendidikan Nasional • Website: sekolah.sch.id', 8.3, 'italic', 3.6);
  }

  const headerBottomY = Math.max(textY, startY + logoSize + 1.5);
  const logoY = startY + Math.max(0, (headerBottomY - startY - logoSize) / 2 - 1);

  if (leftPng) {
    try {
      cursor.doc.addImage(leftPng, 'PNG', cursor.margin + 1, logoY, logoSize, logoSize);
    } catch {}
  }
  if (rightPng) {
    try {
      cursor.doc.addImage(rightPng, 'PNG', cursor.pageW - cursor.margin - logoSize - 1, logoY, logoSize, logoSize);
    } catch {}
  }

  cursor.y = headerBottomY + 1;

  // Double border line
  cursor.doc.setDrawColor(0, 0, 0);
  cursor.doc.setLineWidth(0.75);
  cursor.doc.line(cursor.margin, cursor.y, cursor.pageW - cursor.margin, cursor.y);
  cursor.y += 0.9;
  cursor.doc.setLineWidth(0.25);
  cursor.doc.line(cursor.margin, cursor.y, cursor.pageW - cursor.margin, cursor.y);
  cursor.y += 4;
}

function drawSignatureBlock(cursor: PdfCursor, kop: SchoolKopConfig) {
  cursor.exitTwoColumnMode();
  cursor.ensureSpace(34);
  cursor.y += 3;

  const leftCenter = cursor.margin + cursor.contentW * 0.25;
  const rightCenter = cursor.margin + cursor.contentW * 0.75;
  const cityRaw = cleanText((kop.cityDate || '').trim());
  const dateLine = cityRaw || '........................, ..............................';

  const startY = cursor.y;
  cursor.setFont('normal', 9.5, [15, 23, 42]);
  cursor.doc.text('Mengetahui,', leftCenter, startY, { align: 'center' });
  cursor.doc.text(dateLine, rightCenter, startY, { align: 'center' });

  cursor.setFont('bold', 9.5, [15, 23, 42]);
  cursor.doc.text('Kepala Sekolah,', leftCenter, startY + 4.3, { align: 'center' });
  cursor.doc.text('Guru Mata Pelajaran,', rightCenter, startY + 4.3, { align: 'center' });

  const nameY = startY + 21;
  const headName = cleanText(kop.headmasterName || '...........................................');
  const teacherName = cleanText(kop.teacherName || '...........................................');

  cursor.doc.text(headName, leftCenter, nameY, { align: 'center' });
  const headW = cursor.doc.getTextWidth(headName);
  cursor.doc.setLineWidth(0.25);
  cursor.doc.line(leftCenter - headW / 2, nameY + 0.7, leftCenter + headW / 2, nameY + 0.7);

  cursor.doc.text(teacherName, rightCenter, nameY, { align: 'center' });
  const teachW = cursor.doc.getTextWidth(teacherName);
  cursor.doc.line(rightCenter - teachW / 2, nameY + 0.7, rightCenter + teachW / 2, nameY + 0.7);

  cursor.setFont('normal', 8.8, [15, 23, 42]);
  if (kop.headmasterNip?.trim()) {
    cursor.doc.text(cleanText(`NIP. ${kop.headmasterNip.trim()}`), leftCenter, nameY + 4.5, { align: 'center' });
  }
  if (kop.teacherNip?.trim()) {
    cursor.doc.text(cleanText(`NIP. ${kop.teacherNip.trim()}`), rightCenter, nameY + 4.5, { align: 'center' });
  }

  cursor.y = nameY + 8;
}

function drawSectionBanner(cursor: PdfCursor, title: string, instruction?: string) {
  cursor.ensureSpace(12);
  cursor.y += 1.5;
  cursor.setFont('bold', 9.5, [15, 23, 42]);
  const x = cursor.activeX;
  const w = cursor.activeW;
  cursor.doc.setFillColor(241, 245, 249);
  cursor.doc.rect(x, cursor.y, w, 5.5, 'F');
  cursor.doc.setDrawColor(148, 163, 184);
  cursor.doc.setLineWidth(0.2);
  cursor.doc.line(x, cursor.y + 5.5, x + w, cursor.y + 5.5);
  cursor.doc.text(cleanText(title), x + 1.5, cursor.y + 3.9);
  cursor.y += 7;
  cursor.trackBottom();

  if (instruction) {
    cursor.drawTextBlock(instruction, { sizePt: 8.8, style: 'italic', color: [51, 65, 85], afterMm: 2 });
  }
}

/**
 * Helper to draw a table cleanly with automatic page-breaks and row wrapping
 */
function drawTable(
  cursor: PdfCursor,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  opts: { fontSize?: number; headerFill?: [number, number, number]; colAligns?: ('left' | 'center' | 'right')[] } = {}
) {
  const fontSize = opts.fontSize ?? 8.5;
  const lineH = fontSize * 0.42;
  const padX = 1.6;
  const padY = 1.5;
  const headerFill = opts.headerFill ?? [226, 232, 240];

  const drawRow = (cells: string[], isHeader: boolean, fill?: [number, number, number], isBoldRow = false) => {
    const wrappedCells = cells.map((cell, idx) =>
      cursor.measureTextLines(cell, Math.max(6, colWidths[idx] - padX * 2), fontSize, isHeader || isBoldRow ? 'bold' : 'normal')
    );
    const maxLines = Math.max(1, ...wrappedCells.map((w) => w.length));
    const rowH = maxLines * lineH + padY * 2;

    cursor.ensureSpace(rowH + 0.5);

    let cellX = cursor.activeX;
    const rowY = cursor.y;

    for (let i = 0; i < cells.length; i++) {
      const cw = colWidths[i];
      if (fill) {
        cursor.doc.setFillColor(fill[0], fill[1], fill[2]);
        cursor.doc.rect(cellX, rowY, cw, rowH, 'FD');
      } else {
        cursor.doc.setDrawColor(100, 116, 139);
        cursor.doc.setLineWidth(0.2);
        cursor.doc.rect(cellX, rowY, cw, rowH, 'S');
      }

      const align = isHeader ? 'center' : opts.colAligns?.[i] || 'left';
      cursor.setFont(isHeader || isBoldRow ? 'bold' : 'normal', fontSize, [15, 23, 42]);

      const lines = wrappedCells[i];
      const totalTxtH = lines.length * lineH;
      const startTxtY = rowY + (isHeader ? (rowH - totalTxtH) / 2 + lineH * 0.78 : padY + lineH * 0.78);

      lines.forEach((line, lIdx) => {
        const tx = align === 'center' ? cellX + cw / 2 : align === 'right' ? cellX + cw - padX : cellX + padX;
        cursor.doc.text(line, tx, startTxtY + lIdx * lineH, align !== 'left' ? { align } : undefined);
      });

      cellX += cw;
    }

    cursor.y += rowH;
    cursor.trackBottom();
  };

  cursor.doc.setDrawColor(100, 116, 139);
  cursor.doc.setLineWidth(0.2);
  drawRow(headers, true, headerFill, true);

  for (const r of rows) {
    // Check if page break happens inside table: repeat header on new page if needed
    const wrappedCells = r.map((cell, idx) =>
      cursor.measureTextLines(cell, Math.max(6, colWidths[idx] - padX * 2), fontSize, 'normal')
    );
    const maxLines = Math.max(1, ...wrappedCells.map((w) => w.length));
    const rowH = maxLines * lineH + padY * 2;
    if (cursor.y + rowH > cursor.bottomLimit && cursor.colCount === 1) {
      cursor.doc.addPage();
      cursor.y = cursor.margin;
      drawRow(headers, true, headerFill, true);
    }
    drawRow(r, false);
  }

  cursor.y += 2.5;
  cursor.trackBottom();
}

// ==========================================
// 1. NASKAH SOAL SISWA (PDF)
// ==========================================
async function renderNaskahPdf(cursor: PdfCursor, exam: ExamPackage, options?: ClientPdfOptions) {
  const kop = exam.kopConfig || ({} as SchoolKopConfig);
  const summary = exam.examSummary || ({} as any);
  const multipleChoice = exam.multipleChoice || [];
  const complexMultipleChoice = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const shortAnswer = exam.shortAnswer || [];
  const essay = exam.essay || [];

  await drawKopHeader(cursor, kop, false);

  // Title
  cursor.drawTextBlock(getSafeExamTitle(exam), {
    sizePt: 11.5,
    style: 'bold',
    align: 'center',
    afterMm: 0.8,
  });
  cursor.drawTextBlock(`TAHUN AJARAN ${summary.academicYear || '2024/2025'}`, {
    sizePt: 10,
    style: 'bold',
    align: 'center',
    afterMm: 3,
  });

  // Identity Table
  const idW = cursor.contentW;
  const colWidths = [idW * 0.19, idW * 0.31, idW * 0.19, idW * 0.31];
  const idRows = [
    ['Mata Pelajaran', `: ${summary.subject || '-'}`, 'Alokasi Waktu', `: ${summary.duration || '90 Menit'}`],
    ['Kelas / Fase', `: ${summary.grade || '-'}`, 'Kurikulum', `: ${summary.curriculum || 'Kurikulum Merdeka'}`],
    ['Nama Siswa', ': ..............................', 'Semester', `: ${summary.semester || 'Ganjil'}`],
    ['No. Peserta', ': ..............................', 'Hari / Tanggal', ': ..............................'],
  ];

  const rowH = 5.2;
  cursor.doc.setDrawColor(148, 163, 184);
  cursor.doc.setLineWidth(0.2);
  cursor.doc.rect(cursor.margin, cursor.y, idW, rowH * idRows.length);

  idRows.forEach((row, rIdx) => {
    let cx = cursor.margin;
    const ry = cursor.y + rIdx * rowH;
    row.forEach((cell, cIdx) => {
      cursor.setFont(cIdx % 2 === 0 ? 'bold' : 'normal', 8.8, [15, 23, 42]);
      const clipped = cursor.doc.splitTextToSize(cleanText(cell), colWidths[cIdx] - 2)[0] || '';
      cursor.doc.text(clipped, cx + 1.5, ry + 3.6);
      cx += colWidths[cIdx];
    });
  });
  cursor.y += rowH * idRows.length + 3;

  // Petunjuk Umum
  const instructions = summary.generalInstructions || [];
  if (instructions.length > 0) {
    cursor.drawTextBlock('PETUNJUK UMUM:', { sizePt: 9, style: 'bold', afterMm: 0.8 });
    instructions.forEach((inst: string, idx: number) => {
      cursor.drawTextBlock(inst, {
        sizePt: 8.6,
        indentMm: 2,
        prefix: `${idx + 1}. `,
        prefixStyle: 'normal',
        afterMm: 0.5,
      });
    });
    cursor.y += 1.5;
  }

  // Enter 2-column mode unless columnsMode === '1'
  if (options?.columnsMode !== '1') {
    cursor.enterTwoColumnMode();
  }

  const romans = ['I', 'II', 'III', 'IV', 'V'];
  let secIdx = 0;

  // A. Pilihan Ganda
  if (multipleChoice.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. PILIHAN GANDA`, computeMcInstruction(multipleChoice));
    multipleChoice.forEach((q) => {
      if (q.stimulus?.trim()) {
        cursor.drawTextBlock(q.stimulus, { indentMm: 4, sizePt: 8.8, style: 'italic', color: [51, 65, 85], afterMm: 1 });
      }
      cursor.drawTextBlock(q.question, {
        sizePt: 9.2,
        prefix: `${q.number}. `,
        prefixStyle: 'bold',
        afterMm: 0.8,
      });
      (q.options || []).forEach((opt) => {
        cursor.drawTextBlock(opt.text, {
          indentMm: 4.5,
          sizePt: 9,
          prefix: `${opt.key}. `,
          prefixStyle: 'bold',
          afterMm: 0.5,
        });
      });
      cursor.y += 1.5;
      cursor.trackBottom();
    });
  }

  // B. Pilihan Ganda Kompleks
  if (complexMultipleChoice.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. PILIHAN GANDA KOMPLEKS`, computeCmcInstruction(complexMultipleChoice));

    complexMultipleChoice.forEach((q: ComplexMultipleChoiceItem) => {
      if (q.stimulus?.trim()) {
        cursor.drawTextBlock(q.stimulus, { indentMm: 4, sizePt: 8.8, style: 'italic', color: [51, 65, 85], afterMm: 1 });
      }
      cursor.drawTextBlock(q.question, {
        sizePt: 9.2,
        prefix: `${q.number}. `,
        prefixStyle: 'bold',
        afterMm: 1.2,
      });

      if (isCmcMultiSelect(q)) {
        (q.options || []).forEach((opt) => {
          const lineH = 3.8;
          cursor.ensureSpace(lineH + 1);
          const boxX = cursor.activeX + 4.5;
          const boxY = cursor.y + 0.4;
          cursor.doc.setDrawColor(30, 41, 59);
          cursor.doc.setLineWidth(0.28);
          cursor.doc.rect(boxX, boxY, 3, 3);

          const labelText = `${opt.key}. ${stripCheckboxToken(opt.text)}`;
          const lines = cursor.measureTextLines(labelText, cursor.activeW - 9.5, 9, 'normal');
          lines.forEach((line, lIdx) => {
            if (lIdx > 0) cursor.ensureSpace(lineH);
            cursor.setFont('normal', 9, [15, 23, 42]);
            cursor.doc.text(line, boxX + 4.2, cursor.y + 3.0);
            cursor.y += lineH;
            cursor.trackBottom();
          });
          cursor.y += 0.5;
          cursor.trackBottom();
        });
      }

      if (q.statements && q.statements.length > 0) {
        const lbl = resolveStatementLabels(q);
        const fullW = cursor.activeW;
        const cw1 = fullW * 0.72;
        const cw2 = fullW * 0.14;
        const cw3 = fullW * 0.14;
        drawTable(
          cursor,
          ['Pernyataan', lbl.positive, lbl.negative],
          q.statements.map((st) => [st.statement, '', '']),
          [cw1, cw2, cw3],
          { fontSize: 8.3, colAligns: ['left', 'center', 'center'] }
        );
      }

      cursor.y += 1.2;
      cursor.trackBottom();
    });
  }

  // C. Menjodohkan
  if (matching.length > 0) {
    drawSectionBanner(
      cursor,
      `${romans[secIdx++]}. MENJODOHKAN`,
      'Jodohkan pernyataan di kolom sebelah kiri dengan jawaban yang sesuai di kolom sebelah kanan!'
    );

    matching.forEach((q) => {
      cursor.drawTextBlock(q.instruction || 'Pasangkan pernyataan berikut dengan tepat:', {
        sizePt: 9.2,
        prefix: `${q.number}. `,
        prefixStyle: 'bold',
        afterMm: 1.2,
      });

      const pairs = q.pairs || [];
      const rightItems = [...pairs.map((p) => p.match), ...(q.distractors || [])];
      const maxLen = Math.max(pairs.length, rightItems.length);
      const tblRows: string[][] = [];
      for (let i = 0; i < maxLen; i++) {
        tblRows.push([
          pairs[i] ? `${String.fromCharCode(97 + i)}. ${pairs[i].premise}` : '',
          rightItems[i] ? `(${i + 1}) ${rightItems[i]}` : '',
        ]);
      }

      const half = cursor.activeW / 2;
      drawTable(cursor, ['Kolom Premis (A)', 'Kolom Pilihan (B)'], tblRows, [half, half], { fontSize: 8.3 });
    });
  }

  // D. Isian Singkat
  if (shortAnswer.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. ISIAN SINGKAT`, 'Isilah titik-titik di bawah ini dengan jawaban yang singkat dan tepat!');
    shortAnswer.forEach((q) => {
      if (q.stimulus?.trim()) {
        cursor.drawTextBlock(q.stimulus, { indentMm: 4, sizePt: 8.8, style: 'italic', color: [51, 65, 85], afterMm: 1 });
      }
      cursor.drawTextBlock(`${q.question}\nJawaban: ..................................................`, {
        sizePt: 9.2,
        prefix: `${q.number}. `,
        prefixStyle: 'bold',
        afterMm: 2,
      });
    });
  }

  // E. Uraian / Essay
  if (essay.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. URAIAN / ESSAY`, 'Jawablah pertanyaan di bawah ini dengan jelas, lengkap, dan sistematis!');
    essay.forEach((q) => {
      if (q.stimulus?.trim()) {
        cursor.drawTextBlock(q.stimulus, { indentMm: 4, sizePt: 8.8, style: 'italic', color: [51, 65, 85], afterMm: 1 });
      }
      cursor.drawTextBlock(q.question, {
        sizePt: 9.2,
        prefix: `${q.number}. `,
        prefixStyle: 'bold',
        afterMm: 1.5,
      });
      // Answer lines
      for (let l = 0; l < 2; l++) {
        cursor.ensureSpace(4.5);
        cursor.doc.setDrawColor(148, 163, 184);
        cursor.doc.setLineWidth(0.18);
        cursor.doc.line(cursor.activeX + 4.5, cursor.y + 3, cursor.activeX + cursor.activeW - 1, cursor.y + 3);
        cursor.y += 4.2;
        cursor.trackBottom();
      }
      cursor.y += 1.5;
      cursor.trackBottom();
    });
  }

  drawSignatureBlock(cursor, kop);
}

// ==========================================
// 2. KUNCI JAWABAN & PEMBAHASAN (PDF)
// ==========================================
async function renderAnswerKeyPdf(cursor: PdfCursor, exam: ExamPackage) {
  const kop = exam.kopConfig || ({} as SchoolKopConfig);
  const summary = exam.examSummary || ({} as any);
  const mc = exam.multipleChoice || [];
  const cmc = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const sa = exam.shortAnswer || [];
  const essay = exam.essay || [];

  await drawKopHeader(cursor, kop, false);

  cursor.drawTextBlock('KUNCI JAWABAN & PEDOMAN PEMBAHASAN', { sizePt: 12, style: 'bold', align: 'center', afterMm: 0.8 });
  cursor.drawTextBlock(`${getSafeExamTitle(exam)} - TAHUN AJARAN ${summary.academicYear || '2024/2025'}`, {
    sizePt: 9.8,
    style: 'bold',
    align: 'center',
    afterMm: 1,
  });
  cursor.drawTextBlock(
    `Mata Pelajaran: ${summary.subject || '-'}  |  Kelas: ${summary.grade || '-'}  |  Waktu: ${summary.duration || '-'}`,
    { sizePt: 9, align: 'center', afterMm: 4 }
  );

  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  let secIdx = 0;

  if (mc.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. KUNCI JAWABAN CEPAT PILIHAN GANDA`);
    const cols = 10;
    const cellW = cursor.contentW / cols;
    for (let i = 0; i < mc.length; i += cols) {
      const chunk = mc.slice(i, i + cols);
      const headers = Array.from({ length: cols }, (_, c) => (chunk[c] ? `No.${chunk[c].number}` : '-'));
      const answers = [Array.from({ length: cols }, (_, c) => (chunk[c] ? chunk[c].correctAnswer : '-'))];
      drawTable(cursor, headers, answers, Array(cols).fill(cellW), {
        fontSize: 8.5,
        colAligns: Array(cols).fill('center'),
      });
    }

    drawSectionBanner(cursor, `${romans[secIdx++]}. RINCIAN PEMBAHASAN PILIHAN GANDA`);
    mc.forEach((q) => {
      cursor.drawTextBlock(`Kunci: ${q.correctAnswer} (Skor: ${q.score ?? 2})`, {
        prefix: `${q.number}. `,
        sizePt: 9.2,
        style: 'bold',
        color: [30, 58, 138],
        afterMm: 0.6,
      });
      cursor.drawTextBlock(q.question, { indentMm: 4, sizePt: 8.8, prefix: 'Soal: ', prefixStyle: 'normal', afterMm: 0.6 });
      cursor.drawTextBlock(q.explanation || 'Sesuai konsep materi yang diujikan.', {
        indentMm: 4,
        sizePt: 8.8,
        prefix: 'Pembahasan: ',
        afterMm: 2,
      });
    });
  }

  if (cmc.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. KUNCI JAWABAN PILIHAN GANDA KOMPLEKS`);
    cmc.forEach((q) => {
      const ansArr = getCmcCorrectList(q.correctAnswer);
      const lbl = resolveStatementLabels(q);
      cursor.drawTextBlock(q.question, { prefix: `${q.number}. `, sizePt: 9.2, style: 'bold', afterMm: 0.8 });
      if (q.options && q.options.length > 0) {
        cursor.drawTextBlock(`Kunci Jawaban: ${ansArr.join(', ') || '-'} (Skor: ${q.score ?? 3})`, {
          indentMm: 4,
          sizePt: 9,
          style: 'bold',
          color: [30, 58, 138],
          afterMm: 0.6,
        });
        q.options.forEach((opt) => {
          const isOk = ansArr.includes(opt.key.toUpperCase());
          cursor.drawTextBlock(`${isOk ? '[v]' : '[ ]'} ${opt.key}. ${stripCheckboxToken(opt.text)}`, {
            indentMm: 6,
            sizePt: 8.8,
            style: isOk ? 'bold' : 'normal',
            color: isOk ? [5, 150, 105] : [71, 85, 105],
            afterMm: 0.4,
          });
        });
      }
      if (q.statements && q.statements.length > 0) {
        q.statements.forEach((st) => {
          cursor.drawTextBlock(
            `[${st.isCorrect ? lbl.positive.toUpperCase() : lbl.negative.toUpperCase()}] ${st.statement}`,
            {
              indentMm: 4,
              sizePt: 8.8,
              color: st.isCorrect ? [5, 150, 105] : [185, 28, 28],
              afterMm: 0.5,
            }
          );
        });
      }
      if (q.explanation) {
        cursor.drawTextBlock(q.explanation, { indentMm: 4, sizePt: 8.6, prefix: 'Pembahasan: ', afterMm: 2 });
      }
    });
  }

  if (matching.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. KUNCI JAWABAN MENJODOHKAN`);
    matching.forEach((q) => {
      cursor.drawTextBlock(q.instruction || 'Pasangan premis dan jawaban:', {
        prefix: `${q.number}. `,
        sizePt: 9.2,
        style: 'bold',
        afterMm: 0.8,
      });
      (q.pairs || []).forEach((p) => {
        cursor.drawTextBlock(`• ${p.premise} -> ${p.match}`, { indentMm: 4, sizePt: 8.8, afterMm: 0.5 });
      });
      cursor.y += 1.2;
    });
  }

  if (sa.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. KUNCI JAWABAN ISIAN SINGKAT`);
    sa.forEach((q) => {
      cursor.drawTextBlock(q.question, { prefix: `${q.number}. `, sizePt: 9.2, afterMm: 0.6 });
      const accepted = q.acceptedAnswers?.length ? ` | Variasi: ${q.acceptedAnswers.join(', ')}` : '';
      cursor.drawTextBlock(
        `Kunci: ${q.expectedAnswer || q.correctAnswer || '-'} (Skor: ${q.score ?? 2})${accepted}`,
        { indentMm: 4, sizePt: 9, style: 'bold', color: [30, 58, 138], afterMm: 0.6 }
      );
      if (q.explanation) {
        cursor.drawTextBlock(q.explanation, { indentMm: 4, sizePt: 8.6, prefix: 'Pembahasan: ', afterMm: 1.5 });
      }
    });
  }

  if (essay.length > 0) {
    drawSectionBanner(cursor, `${romans[secIdx++]}. PEDOMAN JAWABAN & RUBRIK URAIAN`);
    essay.forEach((q) => {
      cursor.drawTextBlock(q.question, { prefix: `${q.number}. `, sizePt: 9.2, style: 'bold', afterMm: 0.8 });
      cursor.drawTextBlock(q.expectedAnswer, {
        indentMm: 4,
        sizePt: 8.8,
        prefix: 'Jawaban diharapkan: ',
        afterMm: 0.8,
      });
      (q.scoringRubric || []).forEach((r) => {
        cursor.drawTextBlock(`• ${r.criteria} (Skor: ${r.points})`, { indentMm: 6, sizePt: 8.5, afterMm: 0.4 });
      });
      cursor.y += 1.5;
    });
  }

  drawSignatureBlock(cursor, kop);
}

// ==========================================
// 3. KISI-KISI SOAL (PDF)
// ==========================================
async function renderKisiKisiPdf(cursor: PdfCursor, exam: ExamPackage) {
  const kop = exam.kopConfig || ({} as SchoolKopConfig);
  const summary = exam.examSummary || ({} as any);
  const mc = exam.multipleChoice || [];
  const cmc = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const sa = exam.shortAnswer || [];
  const essay = exam.essay || [];

  await drawKopHeader(cursor, kop, false);

  cursor.drawTextBlock('KISI-KISI PENULISAN SOAL ASESMEN / UJIAN SEKOLAH', {
    sizePt: 11.5,
    style: 'bold',
    align: 'center',
    afterMm: 0.8,
  });
  cursor.drawTextBlock(`${getSafeExamTitle(exam)} - TAHUN AJARAN ${summary.academicYear || '2024/2025'}`, {
    sizePt: 9.5,
    style: 'bold',
    align: 'center',
    afterMm: 2,
  });

  const totalItems = mc.length + cmc.length + matching.length + sa.length + essay.length;
  cursor.drawTextBlock(
    `Satuan Pendidikan: ${kop.schoolName || '-'}   |   Mapel: ${summary.subject || '-'}   |   Kelas: ${summary.grade || '-'}   |   Total: ${totalItems} Butir`,
    { sizePt: 8.8, align: 'center', afterMm: 4 }
  );

  const w = cursor.contentW;
  const colWidths = [w * 0.05, w * 0.2, w * 0.17, w * 0.28, w * 0.1, w * 0.1, w * 0.05, w * 0.05];
  const headers = ['No', 'Mapel / Lingkup', 'Materi Pokok', 'Indikator Soal', 'Level', 'Bentuk', 'No.', 'Skor'];
  const rows: string[][] = [];
  let idx = 1;

  mc.forEach((q) =>
    rows.push([
      String(idx++),
      summary.subject || '-',
      summary.subject || '-',
      q.indicator || 'Peserta didik dapat menentukan jawaban yang tepat berdasarkan stimulus.',
      q.cognitiveLevel || 'L2 (C3)',
      getMcVariantBadgeLabel(q),
      String(q.number),
      String(q.score ?? 2),
    ])
  );
  cmc.forEach((q) =>
    rows.push([
      String(idx++),
      summary.subject || '-',
      summary.subject || '-',
      q.indicator || 'Peserta didik dapat menganalisis pernyataan majemuk dengan tepat.',
      q.cognitiveLevel || 'L3 (C4)',
      getCmcVariantBadgeLabel(q),
      String(q.number),
      String(q.score ?? 3),
    ])
  );
  matching.forEach((q) =>
    rows.push([
      String(idx++),
      summary.subject || '-',
      summary.subject || '-',
      q.indicator || 'Peserta didik dapat memasangkan konsep premis dengan respon yang sesuai.',
      q.cognitiveLevel || 'L2 (C3)',
      'Menjodohkan',
      String(q.number),
      String(q.score ?? 4),
    ])
  );
  sa.forEach((q) =>
    rows.push([
      String(idx++),
      summary.subject || '-',
      summary.subject || '-',
      q.indicator || 'Peserta didik dapat mengisi konsep atau istilah penting dengan tepat.',
      q.cognitiveLevel || 'L1 (C2)',
      'Isian',
      String(q.number),
      String(q.score ?? 2),
    ])
  );
  essay.forEach((q) =>
    rows.push([
      String(idx++),
      summary.subject || '-',
      summary.subject || '-',
      q.indicator || 'Peserta didik dapat menguraikan penyelesaian masalah secara analitis.',
      q.cognitiveLevel || 'L3 (C4-C6)',
      'Uraian',
      String(q.number),
      String(q.score ?? 10),
    ])
  );

  drawTable(cursor, headers, rows, colWidths, {
    fontSize: 8,
    colAligns: ['center', 'left', 'left', 'left', 'center', 'center', 'center', 'center'],
  });

  drawSignatureBlock(cursor, kop);
}

// ==========================================
// 4. PEDOMAN PENSKORAN & RUBRIK (PDF)
// ==========================================
async function renderRubrikPdf(cursor: PdfCursor, exam: ExamPackage) {
  const kop = exam.kopConfig || ({} as SchoolKopConfig);
  const summary = exam.examSummary || ({} as any);
  const mc = exam.multipleChoice || [];
  const cmc = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const sa = exam.shortAnswer || [];
  const essay = exam.essay || [];
  const sg = exam.scoringGuidelines || {
    mcWeight: 40,
    complexMcWeight: 20,
    matchingWeight: 10,
    shortAnswerWeight: 15,
    essayWeight: 15,
    formula: 'Nilai Akhir (NA) = (Total Skor Perolehan / Total Skor Maksimal) x 100',
  };

  await drawKopHeader(cursor, kop, false);

  cursor.drawTextBlock('PEDOMAN PENSKORAN & RUBRIK PENILAIAN', { sizePt: 12, style: 'bold', align: 'center', afterMm: 0.8 });
  cursor.drawTextBlock(`${getSafeExamTitle(exam)} - ${(summary.subject || '').toUpperCase()} (${summary.grade || ''})`, {
    sizePt: 9.8,
    style: 'bold',
    align: 'center',
    afterMm: 4,
  });

  const mcTotal = mc.reduce((a, b) => a + (b.score ?? 2), 0);
  const cmcTotal = cmc.reduce((a, b) => a + (b.score ?? 3), 0);
  const mTotal = matching.reduce((a, b) => a + (b.score ?? 4), 0);
  const saTotal = sa.reduce((a, b) => a + (b.score ?? 2), 0);
  const esTotal = essay.reduce((a, b) => a + (b.score ?? 10), 0);
  const grandTotal = mcTotal + cmcTotal + mTotal + saTotal + esTotal;

  const activeSections: string[][] = [];
  let rowNo = 1;
  let totalWeight = 0;
  if (mc.length > 0) {
    const wt = sg.mcWeight ?? 0;
    totalWeight += wt;
    activeSections.push([String(rowNo++), 'Pilihan Ganda', `${mc.length} butir`, formatScoreRange(mc, 2, 'Sesuai bobot'), String(mcTotal), `${wt}%`]);
  }
  if (cmc.length > 0) {
    const wt = sg.complexMcWeight ?? 0;
    totalWeight += wt;
    activeSections.push([String(rowNo++), 'Pilihan Ganda Kompleks', `${cmc.length} butir`, formatScoreRange(cmc, 3, 'Proporsional'), String(cmcTotal), `${wt}%`]);
  }
  if (matching.length > 0) {
    const wt = sg.matchingWeight ?? 0;
    totalWeight += wt;
    activeSections.push([String(rowNo++), 'Menjodohkan', `${matching.length} butir`, formatScoreRange(matching, 4, 'Sesuai pasangan'), String(mTotal), `${wt}%`]);
  }
  if (sa.length > 0) {
    const wt = sg.shortAnswerWeight ?? 0;
    totalWeight += wt;
    activeSections.push([String(rowNo++), 'Isian Singkat', `${sa.length} butir`, formatScoreRange(sa, 2, 'Sesuai bobot'), String(saTotal), `${wt}%`]);
  }
  if (essay.length > 0) {
    const wt = sg.essayWeight ?? 0;
    totalWeight += wt;
    activeSections.push([String(rowNo++), 'Uraian / Essay', `${essay.length} butir`, formatScoreRange(essay, 10, 'Sesuai rubrik'), String(esTotal), `${wt}%`]);
  }
  activeSections.push(['', 'TOTAL SKOR MAKSIMAL', '', '', String(grandTotal), `${totalWeight || 100}%`]);

  const w = cursor.contentW;
  drawTable(
    cursor,
    ['No', 'Bentuk Soal', 'Jumlah Soal', 'Skor per Soal', 'Total Skor Maks', 'Bobot'],
    activeSections,
    [w * 0.06, w * 0.28, w * 0.15, w * 0.21, w * 0.16, w * 0.14],
    { fontSize: 8.6, colAligns: ['center', 'left', 'center', 'center', 'center', 'center'] }
  );

  drawSectionBanner(cursor, 'FORMULA PERHITUNGAN NILAI AKHIR (NA)');
  cursor.drawTextBlock(sg.formula || 'Nilai Akhir (NA) = (Total Skor Perolehan / Total Skor Maksimal) x 100', {
    indentMm: 4,
    sizePt: 10,
    style: 'bold',
    color: [30, 58, 138],
    afterMm: 3,
  });

  if (sg.complexMcPartialCredit) {
    cursor.drawTextBlock('KETENTUAN PENSKORAN PG KOMPLEKS:', { sizePt: 9.2, style: 'bold', afterMm: 1 });
    cursor.drawTextBlock(sg.complexMcPartialCredit, { indentMm: 4, sizePt: 9, afterMm: 3 });
  }

  if (essay.length > 0) {
    drawSectionBanner(cursor, 'RUBRIK PENILAIAN BUTIR SOAL URAIAN');
    essay.forEach((q) => {
      cursor.drawTextBlock(q.question, { prefix: `Nomor ${q.number}: `, sizePt: 9.2, style: 'bold', afterMm: 0.8 });
      (q.scoringRubric || []).forEach((r) => {
        cursor.drawTextBlock(`• ${r.criteria} -> Skor ${r.points}`, { indentMm: 4, sizePt: 8.8, afterMm: 0.5 });
      });
      cursor.y += 1.2;
    });
  }

  drawSignatureBlock(cursor, kop);
}

// ==========================================
// 5. KARTU SOAL DINAS (PDF)
// ==========================================
async function renderKartuSoalPdf(cursor: PdfCursor, exam: ExamPackage) {
  const kop = exam.kopConfig || ({} as SchoolKopConfig);
  const summary = exam.examSummary || ({} as any);
  const mc = exam.multipleChoice || [];
  const cmc = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const sa = exam.shortAnswer || [];
  const essay = exam.essay || [];

  await drawKopHeader(cursor, kop, false);

  cursor.drawTextBlock('KARTU SOAL UJIAN (ANALISIS BUTIR SOAL)', { sizePt: 12, style: 'bold', align: 'center', afterMm: 0.8 });
  cursor.drawTextBlock(`${getSafeExamTitle(exam)} - TAHUN AJARAN ${summary.academicYear || '2024/2025'}`, {
    sizePt: 9.5,
    style: 'bold',
    align: 'center',
    afterMm: 4,
  });

  const w = cursor.contentW;
  const drawCard = (
    bentuk: string,
    num: number,
    cog: string | undefined,
    kunci: string,
    indikator: string | undefined,
    rumusan: string,
    pembahasan?: string
  ) => {
    drawTable(
      cursor,
      ['Identitas Butir Soal', 'Keterangan'],
      [
        ['Mata Pelajaran / Kelas', `${summary.subject || '-'} / ${summary.grade || '-'} (${summary.semester || 'Ganjil'})`],
        ['Bentuk & Nomor Soal', `${bentuk} - Nomor ${num}`],
        ['Level Kognitif', cog || 'L2 (Aplikasi)'],
        ['Kunci Jawaban', kunci || '-'],
        ['Indikator Soal', indikator || 'Peserta didik dapat menyelesaikan soal sesuai capaian pembelajaran.'],
        ['Rumusan Butir Soal', rumusan],
        ...(pembahasan ? [['Pembahasan', pembahasan]] : []),
      ],
      [w * 0.27, w * 0.73],
      { fontSize: 8.3 }
    );
  };

  mc.forEach((q) => {
    const opts = (q.options || []).map((o) => `${o.key}. ${o.text}`).join('\n');
    drawCard(
      getMcVariantBadgeLabel(q),
      q.number,
      q.cognitiveLevel,
      q.correctAnswer,
      q.indicator,
      `${q.stimulus ? q.stimulus + '\n' : ''}${q.question}\n${opts}`,
      q.explanation
    );
  });

  cmc.forEach((q) => {
    const ansArr = getCmcCorrectList(q.correctAnswer);
    const lbl = resolveStatementLabels(q);
    const stmtLines = (q.statements || []).map((s, i) => `P${i + 1} [${s.isCorrect ? lbl.positive : lbl.negative}]: ${s.statement}`);
    const optLines = (q.options || []).map((o) => `${o.key}. ${stripCheckboxToken(o.text)}`);
    const kunci =
      ansArr.length > 0
        ? ansArr.join(', ')
        : (q.statements || []).map((s, i) => `P${i + 1}:${s.isCorrect ? lbl.positiveCode : lbl.negativeCode}`).join(' | ');
    drawCard(
      getCmcVariantBadgeLabel(q),
      q.number,
      q.cognitiveLevel || 'L3 (Penalaran)',
      kunci,
      q.indicator,
      `${q.stimulus ? q.stimulus + '\n' : ''}${q.question}\n${[...optLines, ...stmtLines].join('\n')}`,
      q.explanation
    );
  });

  matching.forEach((q) => {
    const pairs = (q.pairs || []).map((p) => `• ${p.premise} -> ${p.match}`).join('\n');
    drawCard('Menjodohkan', q.number, q.cognitiveLevel, 'Sesuai pasangan', q.indicator, `${q.instruction}\n${pairs}`, q.explanation);
  });

  sa.forEach((q) => {
    drawCard(
      'Isian Singkat',
      q.number,
      q.cognitiveLevel || 'L1',
      q.correctAnswer || q.expectedAnswer || '-',
      q.indicator,
      `${q.stimulus ? q.stimulus + '\n' : ''}${q.question}`,
      q.explanation
    );
  });

  essay.forEach((q) => {
    drawCard(
      'Uraian / Essay',
      q.number,
      q.cognitiveLevel || 'L3 (HOTS)',
      'Sesuai Rubrik',
      q.indicator,
      `${q.stimulus ? q.stimulus + '\n' : ''}${q.question}`,
      q.expectedAnswer
    );
  });

  drawSignatureBlock(cursor, kop);
}

// ==========================================
// 6. LEMBAR JAWABAN SISWA / LJS (PDF)
// ==========================================
async function renderLjsPdf(cursor: PdfCursor, exam: ExamPackage) {
  const kop = exam.kopConfig || ({} as SchoolKopConfig);
  const summary = exam.examSummary || ({} as any);
  const mc = exam.multipleChoice || [];
  const cmc = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const sa = exam.shortAnswer || [];
  const essay = exam.essay || [];

  await drawKopHeader(cursor, kop, true);

  cursor.drawTextBlock('LEMBAR JAWABAN SISWA (LJS)', { sizePt: 11.5, style: 'bold', align: 'center', afterMm: 0.6 });
  cursor.drawTextBlock(`${getSafeExamTitle(exam)} - TAHUN AJARAN ${summary.academicYear || '2024/2025'}`, {
    sizePt: 9.2,
    style: 'bold',
    align: 'center',
    afterMm: 3,
  });

  const w = cursor.contentW;
  drawTable(
    cursor,
    ['Identitas Peserta Ujian', 'Keterangan Ujian'],
    [
      [`Nama Lengkap  : .............................................`, `Mata Pelajaran : ${summary.subject || '-'}`],
      [`Nomor Peserta : .............................................`, `Hari / Tanggal : .............................................`],
      [`Kelas / Ruang : ${summary.grade || '-'} / ........`, `Tanda Tangan  : .............................................`],
    ],
    [w / 2, w / 2],
    { fontSize: 8.6 }
  );

  let secIdx = 0;
  const secChar = () => String.fromCharCode(65 + secIdx++);

  if (mc.length > 0) {
    drawSectionBanner(cursor, `${secChar()}. PILIHAN GANDA (Berilah tanda silang X pada kotak jawaban yang tepat):`);
    const fallbackFive = summary.schoolLevel === 'SMA' || summary.schoolLevel === 'SMK' || summary.schoolLevel === 'MA';
    const defaultLetters = Array.from({ length: fallbackFive ? 5 : 4 }, (_, i) => String.fromCharCode(65 + i));
    const half = Math.ceil(mc.length / 2);
    const rows: string[][] = [];
    for (let i = 0; i < half; i++) {
      const q1 = mc[i];
      const q2 = mc[i + half];
      const fmt = (q: any) => {
        if (!q) return '';
        const letters = q.options?.length ? q.options.map((o: any) => o.key) : defaultLetters;
        return `${String(q.number).padStart(2, ' ')}.   ${letters.map((l: string) => `[ ${l} ]`).join('   ')}`;
      };
      rows.push([fmt(q1), fmt(q2)]);
    }
    drawTable(cursor, ['Nomor Soal (Kiri)', 'Nomor Soal (Kanan)'], rows, [w / 2, w / 2], { fontSize: 8.8 });
  }

  if (cmc.length > 0) {
    drawSectionBanner(cursor, `${secChar()}. PILIHAN GANDA KOMPLEKS (Centang lebih dari satu atau pilih kolom pernyataan):`);
    const optionItems = cmc.filter((q) => Array.isArray(q.options) && q.options.length > 0 && (!q.statements || q.statements.length === 0));
    const statementItems = cmc.filter((q) => Array.isArray(q.statements) && q.statements.length > 0);

    if (optionItems.length > 0) {
      const rows = optionItems.map((q) => {
        const letters = q.options?.map((o) => o.key) || ['A', 'B', 'C', 'D'];
        return [
          `${q.number}.   ${letters.map((l) => `[ ${l} ]`).join('   ')}`,
          'Centang [v] lebih dari satu pilihan',
        ];
      });
      drawTable(cursor, ['Pilihan Kotak Jawaban', 'Keterangan'], rows, [w * 0.6, w * 0.4], { fontSize: 8.8 });
    }

    if (statementItems.length > 0) {
      statementItems.forEach((q) => {
        const lbl = resolveStatementLabels(q);
        const count = q.statements?.length || 3;
        const slots = Array.from({ length: count }, (_, idx) => `P${idx + 1}: [ ${lbl.positiveCode} / ${lbl.negativeCode} ]`).join('    ');
        cursor.drawTextBlock(slots, { prefix: `${q.number}.  `, sizePt: 9, afterMm: 1 });
      });
    }
  }

  if (matching.length > 0) {
    drawSectionBanner(cursor, `${secChar()}. MENJODOHKAN (Tuliskan nomor pasangan jawaban pada titik-titik):`);
    matching.forEach((q) => {
      const slots = (q.pairs || []).map((_, idx) => `${String.fromCharCode(97 + idx)} -> (.....)`).join('     ');
      cursor.drawTextBlock(slots, { prefix: `${q.number}.  `, sizePt: 9, afterMm: 1.2 });
    });
  }

  if (sa.length > 0) {
    drawSectionBanner(cursor, `${secChar()}. ISIAN SINGKAT`);
    sa.forEach((q) => {
      cursor.drawTextBlock('........................................................................................................................................', {
        prefix: `${q.number}. `,
        sizePt: 9,
        afterMm: 1.8,
      });
    });
  }

  if (essay.length > 0) {
    drawSectionBanner(cursor, `${secChar()}. URAIAN / ESSAY`);
    essay.forEach((q) => {
      cursor.drawTextBlock(`Jawaban Nomor ${q.number}:`, { sizePt: 9, style: 'bold', afterMm: 1 });
      for (let l = 0; l < 3; l++) {
        cursor.ensureSpace(4.5);
        cursor.doc.setDrawColor(148, 163, 184);
        cursor.doc.setLineWidth(0.2);
        cursor.doc.line(cursor.margin, cursor.y + 3, cursor.pageW - cursor.margin, cursor.y + 3);
        cursor.y += 4.5;
      }
      cursor.y += 1.5;
    });
  }
}

/**
 * Generates a real, vector-crisp PDF Blob directly in the browser for any of the 6 exam documents.
 */
export async function generateClientPdfBlob(
  exam: ExamPackage,
  docType: ExportDocType = 'naskah',
  options?: ClientPdfOptions
): Promise<Blob> {
  const cursor = new PdfCursor(options);

  if (docType === 'naskah') {
    await renderNaskahPdf(cursor, exam, options);
  } else if (docType === 'kunci') {
    await renderAnswerKeyPdf(cursor, exam);
  } else if (docType === 'kisi-kisi') {
    await renderKisiKisiPdf(cursor, exam);
  } else if (docType === 'rubrik') {
    await renderRubrikPdf(cursor, exam);
  } else if (docType === 'kartu-soal') {
    await renderKartuSoalPdf(cursor, exam);
  } else if (docType === 'ljs') {
    await renderLjsPdf(cursor, exam);
  } else {
    await renderNaskahPdf(cursor, exam, options);
  }

  cursor.addPageNumbers();
  return cursor.doc.output('blob');
}
