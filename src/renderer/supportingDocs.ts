import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  Footer,
  PageNumber,
  VerticalAlign,
  ImageRun,
  TableLayoutType,
} from 'docx';
import type { ExamPackage, SchoolKopConfig } from '../types/exam.ts';
import { processLogoToPng } from './imageHelper.ts';
import {
  resolveStatementLabels,
  getCmcCorrectList,
  getMcVariantBadgeLabel,
  getCmcVariantBadgeLabel,
  resolveQuestionMaterialScope,
} from '../utils/questionHelpers.ts';

const MAIN_FONT = 'Times New Roman';
const PAGE_WIDTH_DXA = 11906; // A4
const PAGE_HEIGHT_DXA = 16838;
const MARGIN_DXA = 850; // 15 mm
const CONTENT_WIDTH_DXA = PAGE_WIDTH_DXA - 2 * MARGIN_DXA; // 10206 DXA

const COMMON_PAGE_SETUP = {
  size: {
    width: PAGE_WIDTH_DXA,
    height: PAGE_HEIGHT_DXA,
  },
  margin: {
    top: MARGIN_DXA,
    bottom: MARGIN_DXA,
    left: MARGIN_DXA,
    right: MARGIN_DXA,
  },
};

function safeExamTitle(examSummary?: any): string {
  const title = examSummary?.title || examSummary?.examType || 'PENILAIAN SUMATIF';
  return String(title).toUpperCase();
}

function safeSubject(examSummary?: any): string {
  return String(examSummary?.subject || 'MATA PELAJARAN').toUpperCase();
}

function safeGrade(examSummary?: any): string {
  return String(examSummary?.grade || '').toUpperCase();
}

function safeAcademicYear(examSummary?: any): string {
  return String(examSummary?.academicYear || '2024/2025');
}

const DOC_FOOTER = new Footer({
  children: [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Halaman ',
          font: MAIN_FONT,
          size: 18,
          color: '64748B',
        }),
        new TextRun({
          children: [PageNumber.CURRENT],
          font: MAIN_FONT,
          size: 18,
          color: '64748B',
          bold: true,
        }),
        new TextRun({
          text: ' dari ',
          font: MAIN_FONT,
          size: 18,
          color: '64748B',
        }),
        new TextRun({
          children: [PageNumber.TOTAL_PAGES],
          font: MAIN_FONT,
          size: 18,
          color: '64748B',
          bold: true,
        }),
      ],
    }),
  ],
});

/**
 * Helper to split multiline text into OOXML paragraphs cleanly
 */
function createMultilineParagraphs(
  text: string,
  opts: { indentLeft?: number; size?: number; bold?: boolean; italics?: boolean; before?: number; after?: number; prefix?: string; prefixBold?: boolean } = {}
): Paragraph[] {
  const { indentLeft = 0, size = 19, bold = false, italics = false, before = 0, after = 30, prefix, prefixBold = true } = opts;
  const normalized = (text || '').replace(/\r\n/g, '\n');
  const lines = normalized.split(/\n+/).filter((l, idx) => idx === 0 || l.trim().length > 0);
  if (lines.length === 0) lines.push('');

  return lines.map((line, idx) => {
    const runs: TextRun[] = [];
    if (idx === 0 && prefix) {
      runs.push(new TextRun({ text: prefix, font: MAIN_FONT, size, bold: prefixBold }));
    }
    runs.push(new TextRun({ text: idx === 0 ? line : line.trim(), font: MAIN_FONT, size, bold, italics }));

    return new Paragraph({
      indent: indentLeft > 0 ? { left: indentLeft } : undefined,
      spacing: { before: idx === 0 ? before : 15, after: idx === lines.length - 1 ? after : 20, line: 230 },
      children: runs,
    });
  });
}

function formatScoreRange(items: { score?: number }[], defaultScore: number, fallbackLabel: string): string {
  if (!items || items.length === 0) return '-';
  const scores = items.map((q) => q.score ?? defaultScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return `${min} poin / nomor`;
  return `${min}–${max} (${fallbackLabel})`;
}

/**
 * Creates full 3-column official Kop Surat table (Left Logo + Center Lines + Right Logo) and double-border line
 */
async function createKopSection(
  kopConfig?: SchoolKopConfig,
  widthDxa: number = CONTENT_WIDTH_DXA,
  compact: boolean = false
): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];
  const safeKop = kopConfig || ({} as SchoolKopConfig);

  const [logoKiriPng, logoKananPng] = await Promise.all([
    processLogoToPng(safeKop.logoLeftUrl, 'dinas'),
    processLogoToPng(safeKop.logoRightUrl, 'tutwuri'),
  ]);

  const logoColW = compact ? 1050 : 1250;
  const centerColW = Math.max(2000, widthDxa - logoColW * 2);
  const logoPx = compact ? 54 : 66;

  const kopParagraphs: Paragraph[] = [];
  if (safeKop.govermentHeader1?.trim()) {
    kopParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: compact ? 15 : 25, line: 230 },
        children: [
          new TextRun({
            text: safeKop.govermentHeader1.trim().toUpperCase(),
            font: MAIN_FONT,
            size: compact ? 18 : 20,
            bold: true,
          }),
        ],
      })
    );
  }
  if (safeKop.govermentHeader2?.trim()) {
    kopParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: compact ? 15 : 30, line: 230 },
        children: [
          new TextRun({
            text: safeKop.govermentHeader2.trim().toUpperCase(),
            font: MAIN_FONT,
            size: compact ? 20 : 22,
            bold: true,
          }),
        ],
      })
    );
  }
  if (safeKop.subHeader?.trim()) {
    kopParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: compact ? 15 : 25, line: 230 },
        children: [
          new TextRun({
            text: safeKop.subHeader.trim().toUpperCase(),
            font: MAIN_FONT,
            size: compact ? 17 : 19,
            bold: true,
          }),
        ],
      })
    );
  }
  if (safeKop.schoolName?.trim()) {
    kopParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: compact ? 10 : 15, after: compact ? 20 : 30, line: 250 },
        children: [
          new TextRun({
            text: safeKop.schoolName.trim().toUpperCase(),
            font: MAIN_FONT,
            size: compact ? 24 : 26,
            bold: true,
          }),
        ],
      })
    );
  }
  if (safeKop.accreditation?.trim()) {
    kopParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: compact ? 10 : 20, line: 210 },
        children: [
          new TextRun({
            text: safeKop.accreditation.trim(),
            font: MAIN_FONT,
            size: compact ? 16 : 17,
            italics: true,
          }),
        ],
      })
    );
  }

  const addr = [safeKop.address?.trim(), safeKop.contact?.trim(), safeKop.website?.trim()]
    .filter(Boolean)
    .join(' • ');
  if (addr || (!safeKop.schoolName?.trim() && !safeKop.govermentHeader1?.trim())) {
    kopParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: compact ? 20 : 40, line: 210 },
        children: [
          new TextRun({
            text: addr || 'Jl. Pendidikan Nasional • Website: sekolah.sch.id',
            font: MAIN_FONT,
            size: compact ? 16 : 18,
            italics: true,
          }),
        ],
      })
    );
  }

  elements.push(
    new Table({
      width: { size: widthDxa, type: WidthType.DXA },
      columnWidths: [logoColW, centerColW, logoColW],
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: logoColW, type: WidthType.DXA },
              verticalAlign: AlignmentType.CENTER,
              margins: { top: 0, bottom: 0, left: 20, right: 40 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: logoKiriPng,
                      transformation: { width: logoPx, height: logoPx },
                      type: 'png',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: centerColW, type: WidthType.DXA },
              verticalAlign: AlignmentType.CENTER,
              margins: { top: 0, bottom: 0, left: 40, right: 40 },
              children: kopParagraphs,
            }),
            new TableCell({
              width: { size: logoColW, type: WidthType.DXA },
              verticalAlign: AlignmentType.CENTER,
              margins: { top: 0, bottom: 0, left: 40, right: 20 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: logoKananPng,
                      transformation: { width: logoPx, height: logoPx },
                      type: 'png',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Double border line
  elements.push(
    new Paragraph({
      spacing: { before: compact ? 20 : 40, after: compact ? 80 : 120 },
      border: {
        bottom: {
          style: BorderStyle.THICK_THIN_SMALL_GAP,
          size: 20,
          color: '000000',
        },
      },
    })
  );

  return elements;
}

/**
 * Creates official signature block table
 */
function createSignatureBlock(kopConfig: SchoolKopConfig, widthDxa: number = CONTENT_WIDTH_DXA): Table {
  const cityRaw = (kopConfig.cityDate || '').trim();
  const dateLine = cityRaw || '........................, ..............................';
  const headmasterNip = (kopConfig.headmasterNip || '').trim();
  const teacherNip = (kopConfig.teacherNip || '').trim();

  const colWidth = Math.floor(widthDxa / 2);

  const cellBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  return new Table({
    width: { size: widthDxa, type: WidthType.DXA },
    columnWidths: [colWidth, colWidth],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            borders: cellBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Mengetahui,', font: MAIN_FONT, size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Kepala Sekolah,', font: MAIN_FONT, size: 20, bold: true }),
                ],
              }),
              new Paragraph({
                spacing: { before: 700, after: 40 },
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: kopConfig.headmasterName || '...........................................',
                    font: MAIN_FONT,
                    size: 20,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              ...(headmasterNip
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: `NIP. ${headmasterNip}`,
                          font: MAIN_FONT,
                          size: 19,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          new TableCell({
            width: { size: colWidth, type: WidthType.DXA },
            borders: cellBorderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: dateLine, font: MAIN_FONT, size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Guru Mata Pelajaran,', font: MAIN_FONT, size: 20, bold: true }),
                ],
              }),
              new Paragraph({
                spacing: { before: 700, after: 40 },
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: kopConfig.teacherName || '...........................................',
                    font: MAIN_FONT,
                    size: 20,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              ...(teacherNip
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: `NIP. ${teacherNip}`,
                          font: MAIN_FONT,
                          size: 19,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * 1. KUNCI JAWABAN & PEMBAHASAN (.docx)
 */
export async function generateAnswerKeyDocx(exam: ExamPackage): Promise<Document> {
  const kopConfig = exam.kopConfig || ({} as SchoolKopConfig);
  const examSummary = exam.examSummary || ({} as any);
  const multipleChoice = exam.multipleChoice || [];
  const complexMultipleChoice = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const shortAnswer = exam.shortAnswer || [];
  const essay = exam.essay || [];

  const children: (Paragraph | Table)[] = [];

  // Kop Section
  children.push(...(await createKopSection(kopConfig)));

  // Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({
          text: 'KUNCI JAWABAN & PEDOMAN PEMBAHASAN',
          font: MAIN_FONT,
          size: 26,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [
        new TextRun({
          text: `${safeExamTitle(examSummary)} - TAHUN AJARAN ${safeAcademicYear(examSummary)}`,
          font: MAIN_FONT,
          size: 21,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: 'Mata Pelajaran: ', font: MAIN_FONT, size: 20, bold: true }),
        new TextRun({ text: examSummary.subject || 'Mata Pelajaran', font: MAIN_FONT, size: 20 }),
        new TextRun({ text: '   |   Kelas: ', font: MAIN_FONT, size: 20, bold: true }),
        new TextRun({ text: examSummary.grade || '', font: MAIN_FONT, size: 20 }),
        new TextRun({ text: '   |   Alokasi Waktu: ', font: MAIN_FONT, size: 20, bold: true }),
        new TextRun({ text: examSummary.duration || '', font: MAIN_FONT, size: 20 }),
      ],
    })
  );

  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  let secIdx = 0;

  // Quick Grading Grid for Multiple Choice
  if (multipleChoice.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: `${romans[secIdx++]}. KUNCI JAWABAN CEPAT PILIHAN GANDA (KOREKSI KILAT)`,
            font: MAIN_FONT,
            size: 21,
            bold: true,
          }),
        ],
      })
    );

    const cols = 10;
    const cellW = Math.floor(CONTENT_WIDTH_DXA / cols);
    const gridRows: TableRow[] = [];

    // Chunk multiple choice by 10
    for (let i = 0; i < multipleChoice.length; i += cols) {
      const chunk = multipleChoice.slice(i, i + cols);

      // Number row
      gridRows.push(
        new TableRow({
          children: Array.from({ length: cols }).map((_, cIdx) => {
            const item = chunk[cIdx];
            return new TableCell({
              width: { size: cellW, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: item ? `No. ${item.number}` : '',
                      font: MAIN_FONT,
                      size: 18,
                      bold: true,
                    }),
                  ],
                }),
              ],
            });
          }),
        })
      );

      // Answer row
      gridRows.push(
        new TableRow({
          children: Array.from({ length: cols }).map((_, cIdx) => {
            const item = chunk[cIdx];
            return new TableCell({
              width: { size: cellW, type: WidthType.DXA },
              verticalAlign: VerticalAlign.CENTER,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: item ? item.correctAnswer : '',
                      font: MAIN_FONT,
                      size: 22,
                      bold: true,
                      color: '1E3A8A',
                    }),
                  ],
                }),
              ],
            });
          }),
        })
      );
    }

    children.push(
      new Table({
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: Array(cols).fill(cellW),
        rows: gridRows,
      })
    );
  }

  // Detailed Multiple Choice explanations
  if (multipleChoice.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: `${romans[secIdx++]}. RINCIAN PEMBAHASAN SOAL PILIHAN GANDA`,
            font: MAIN_FONT,
            size: 21,
            bold: true,
          }),
        ],
      })
    );

    multipleChoice.forEach((q) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({ text: `${q.number}. `, font: MAIN_FONT, size: 20, bold: true }),
            new TextRun({ text: 'Kunci: ', font: MAIN_FONT, size: 20, bold: true }),
            new TextRun({ text: `${q.correctAnswer} `, font: MAIN_FONT, size: 20, bold: true, color: '1E3A8A' }),
            new TextRun({ text: `(Skor: ${q.score ?? 2})`, font: MAIN_FONT, size: 18, italics: true, color: '64748B' }),
          ],
        }),
        ...createMultilineParagraphs(q.question, { indentLeft: 400, size: 19, after: 50, prefix: 'Soal: ', prefixBold: false }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { before: 0, after: 100 },
          children: [
            new TextRun({ text: 'Pembahasan: ', font: MAIN_FONT, size: 19, bold: true }),
            new TextRun({ text: q.explanation || 'Jawaban sesuai dengan konsep materi pembelajaran yang diujikan.', font: MAIN_FONT, size: 19 }),
          ],
        })
      );
    });
  }

  // Complex Multiple Choice (supports both options+correctAnswer AND statements Benar/Salah / True/False / custom labels)
  if (complexMultipleChoice.length > 0) {
    const usesOptions = complexMultipleChoice.some(
      (q) => Array.isArray(q.options) && q.options.length > 0 && (!q.statements || q.statements.length === 0)
    );
    const usesStatements = complexMultipleChoice.some(
      (q) => Array.isArray(q.statements) && q.statements.length > 0
    );
    const pgkSubtitle =
      usesOptions && usesStatements
        ? 'MULTI-JAWABAN & PERNYATAAN'
        : usesOptions
        ? 'MULTI-JAWABAN'
        : 'EVALUASI PERNYATAAN';

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: `${romans[secIdx++]}. KUNCI JAWABAN PILIHAN GANDA KOMPLEKS (${pgkSubtitle})`,
            font: MAIN_FONT,
            size: 21,
            bold: true,
          }),
        ],
      })
    );

    complexMultipleChoice.forEach((q) => {
      const hasStatements = Array.isArray(q.statements) && q.statements.length > 0;
      const hasOptions = Array.isArray(q.options) && q.options.length > 0;
      const ansArr = getCmcCorrectList(q.correctAnswer);
      const lbl = resolveStatementLabels(q);

      children.push(
        ...createMultilineParagraphs(q.question, {
          size: 19,
          bold: true,
          before: 80,
          after: 30,
          prefix: `${q.number}. `,
          prefixBold: true,
        })
      );

      if (hasOptions) {
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 0, after: 30 },
            children: [
              new TextRun({ text: 'Kunci Jawaban: ', font: MAIN_FONT, size: 19, bold: true }),
              new TextRun({ text: ansArr.join(', ') || '-', font: MAIN_FONT, size: 19, bold: true, color: '1E3A8A' }),
              new TextRun({ text: `  (Skor: ${q.score ?? 2})`, font: MAIN_FONT, size: 18, italics: true, color: '64748B' }),
            ],
          })
        );
        q.options!.forEach((opt) => {
          const isCorrect = ansArr.includes(opt.key.toUpperCase());
          children.push(
            new Paragraph({
              indent: { left: 600 },
              spacing: { before: 0, after: 15 },
              children: [
                new TextRun({
                  text: isCorrect ? `[✓] ${opt.key}. ` : `[  ] ${opt.key}. `,
                  font: MAIN_FONT,
                  size: 18,
                  bold: isCorrect,
                  color: isCorrect ? '059669' : '64748B',
                }),
                new TextRun({
                  text: opt.text,
                  font: MAIN_FONT,
                  size: 18,
                  bold: isCorrect,
                }),
              ],
            })
          );
        });
      }

      if (hasStatements) {
        q.statements!.forEach((st) => {
          children.push(
            new Paragraph({
              indent: { left: 400 },
              spacing: { before: 0, after: 20 },
              children: [
                new TextRun({
                  text: `• [${st.isCorrect ? lbl.positive.toUpperCase() : lbl.negative.toUpperCase()}] `,
                  font: MAIN_FONT,
                  size: 19,
                  bold: true,
                  color: st.isCorrect ? '059669' : 'DC2626',
                }),
                new TextRun({ text: st.statement, font: MAIN_FONT, size: 19 }),
              ],
            })
          );
        });
      }

      if (q.explanation) {
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 20, after: 80 },
            children: [
              new TextRun({ text: 'Pembahasan: ', font: MAIN_FONT, size: 19, bold: true }),
              new TextRun({ text: q.explanation, font: MAIN_FONT, size: 19 }),
            ],
          })
        );
      }
    });
  }

  // Matching
  if (matching.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: `${romans[secIdx++]}. KUNCI JAWABAN SOAL MENJODOHKAN`,
            font: MAIN_FONT,
            size: 21,
            bold: true,
          }),
        ],
      })
    );

    matching.forEach((q) => {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 40 },
          children: [
            new TextRun({ text: `${q.number}. `, font: MAIN_FONT, size: 20, bold: true }),
            new TextRun({ text: q.instruction || 'Pasangan premis dan jawaban:', font: MAIN_FONT, size: 20, bold: true }),
          ],
        })
      );

      (q.pairs || []).forEach((p) => {
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({ text: `• ${p.premise} `, font: MAIN_FONT, size: 19 }),
              new TextRun({ text: ' ➔  ', font: MAIN_FONT, size: 19, bold: true }),
              new TextRun({ text: p.match, font: MAIN_FONT, size: 19, bold: true, color: '1E3A8A' }),
            ],
          })
        );
      });
    });
  }

  // Short Answer
  if (shortAnswer.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: `${romans[secIdx++]}. KUNCI JAWABAN ISIAN SINGKAT`,
            font: MAIN_FONT,
            size: 21,
            bold: true,
          }),
        ],
      })
    );

    shortAnswer.forEach((q) => {
      const acceptedText =
        q.acceptedAnswers && q.acceptedAnswers.length > 0
          ? ` | Variasi diterima: ${q.acceptedAnswers.join(', ')}`
          : '';
      children.push(
        ...createMultilineParagraphs(q.question, {
          size: 19,
          before: 80,
          after: 30,
          prefix: `${q.number}. `,
          prefixBold: true,
        }),
        new Paragraph({
          indent: { left: 400 },
          spacing: { before: 0, after: 30 },
          children: [
            new TextRun({ text: 'Kunci Jawaban: ', font: MAIN_FONT, size: 19, bold: true }),
            new TextRun({ text: q.expectedAnswer || q.correctAnswer || '', font: MAIN_FONT, size: 20, bold: true, color: '1E3A8A' }),
            new TextRun({ text: ` (Skor: ${q.score ?? 2})${acceptedText}`, font: MAIN_FONT, size: 18, italics: true }),
          ],
        }),
        ...(q.explanation
          ? [
              new Paragraph({
                indent: { left: 400 },
                spacing: { before: 0, after: 70 },
                children: [
                  new TextRun({ text: 'Pembahasan: ', font: MAIN_FONT, size: 18, bold: true }),
                  new TextRun({ text: q.explanation, font: MAIN_FONT, size: 18 }),
                ],
              }),
            ]
          : [])
      );
    });
  }

  // Essay Rubrics
  if (essay.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: `${romans[secIdx++]}. PEDOMAN JAWABAN & RUBRIK PENSKORAN URAIAN / ESSAY`,
            font: MAIN_FONT,
            size: 21,
            bold: true,
          }),
        ],
      })
    );

    essay.forEach((q) => {
      children.push(
        ...createMultilineParagraphs(q.question, {
          size: 19,
          bold: true,
          before: 80,
          after: 40,
          prefix: `${q.number}. `,
          prefixBold: true,
        }),
        ...createMultilineParagraphs(q.expectedAnswer, {
          indentLeft: 400,
          size: 19,
          after: 30,
          prefix: 'Jawaban yang diharapkan: ',
          prefixBold: true,
        })
      );

      // Rubric points
      if (q.scoringRubric && q.scoringRubric.length > 0) {
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({ text: 'Rincian Kriteria Penilaian / Skor:', font: MAIN_FONT, size: 19, italics: true, bold: true }),
            ],
          })
        );
        q.scoringRubric.forEach((r) => {
          children.push(
            new Paragraph({
              indent: { left: 600 },
              spacing: { before: 0, after: 20 },
              children: [
                new TextRun({ text: `• ${r.criteria} `, font: MAIN_FONT, size: 18 }),
                new TextRun({ text: `(Skor: ${r.points})`, font: MAIN_FONT, size: 18, bold: true, color: '059669' }),
              ],
            })
          );
        });
      }
    });
  }

  // Tanda Tangan
  children.push(
    new Paragraph({ spacing: { before: 300, after: 100 } }),
    createSignatureBlock(kopConfig)
  );

  return new Document({
    sections: [
      {
        properties: {
          page: COMMON_PAGE_SETUP,
        },
        footers: {
          default: DOC_FOOTER,
        },
        children,
      },
    ],
  });
}

/**
 * 2. KISI-KISI SOAL MATRIX KEMDIKBUD (.docx)
 */
export async function generateKisiKisiDocx(exam: ExamPackage): Promise<Document> {
  const kopConfig = exam.kopConfig || ({} as SchoolKopConfig);
  const examSummary = exam.examSummary || ({} as any);
  const multipleChoice = exam.multipleChoice || [];
  const complexMultipleChoice = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const shortAnswer = exam.shortAnswer || [];
  const essay = exam.essay || [];

  const children: (Paragraph | Table)[] = [];

  children.push(...(await createKopSection(kopConfig)));

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({
          text: 'KISI-KISI PENULISAN SOAL ASESMEN / UJIAN SEKOLAH',
          font: MAIN_FONT,
          size: 26,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 160 },
      children: [
        new TextRun({
          text: `${safeExamTitle(examSummary)} - TAHUN AJARAN ${safeAcademicYear(examSummary)}`,
          font: MAIN_FONT,
          size: 21,
          bold: true,
        }),
      ],
    })
  );

  // Identity Table
  const idW1 = 1800;
  const idW2 = 3303;
  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  };

  const idTable = new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [idW1, idW2, idW1, idW2],
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: idW1, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Satuan Pendidikan', font: MAIN_FONT, size: 19, bold: true })] })] }),
          new TableCell({ width: { size: idW2, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `: ${kopConfig.schoolName}`, font: MAIN_FONT, size: 19 })] })] }),
          new TableCell({ width: { size: idW1, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Alokasi Waktu', font: MAIN_FONT, size: 19, bold: true })] })] }),
          new TableCell({ width: { size: idW2, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `: ${examSummary.duration}`, font: MAIN_FONT, size: 19 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: idW1, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Mata Pelajaran', font: MAIN_FONT, size: 19, bold: true })] })] }),
          new TableCell({ width: { size: idW2, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `: ${examSummary.subject}`, font: MAIN_FONT, size: 19 })] })] }),
          new TableCell({ width: { size: idW1, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Jumlah Butir Soal', font: MAIN_FONT, size: 19, bold: true })] })] }),
          new TableCell({ width: { size: idW2, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `: ${multipleChoice.length + complexMultipleChoice.length + matching.length + shortAnswer.length + essay.length} Butir`, font: MAIN_FONT, size: 19 })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: idW1, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Kelas / Fase', font: MAIN_FONT, size: 19, bold: true })] })] }),
          new TableCell({ width: { size: idW2, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `: ${examSummary.grade}`, font: MAIN_FONT, size: 19 })] })] }),
          new TableCell({ width: { size: idW1, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: 'Kurikulum Acuan', font: MAIN_FONT, size: 19, bold: true })] })] }),
          new TableCell({ width: { size: idW2, type: WidthType.DXA }, borders: borderNone, children: [new Paragraph({ children: [new TextRun({ text: `: ${examSummary.curriculum}`, font: MAIN_FONT, size: 19 })] })] }),
        ],
      }),
    ],
  });

  children.push(idTable);
  children.push(new Paragraph({ spacing: { before: 80, after: 120 } }));

  // Matrix Table
  const colWidths = [500, 2000, 1800, 2706, 1100, 1000, 500, 600]; // total = 10206
  const headers = ['No', 'Capaian Pembelajaran / KD', 'Materi Pokok', 'Indikator Soal', 'Level Kognitif', 'Bentuk Soal', 'No Soal', 'Skor'];

  const matrixTableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) =>
        new TableCell({
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, font: MAIN_FONT, size: 18, bold: true })],
            }),
          ],
        })
      ),
    }),
  ];

  let rowIdx = 1;

  const addMatrixRow = (
    materi: string,
    indikator: string,
    level: string,
    bentuk: string,
    noSoal: number,
    skor: number
  ) => {
    matrixTableRows.push(
      new TableRow({
        children: [
          new TableCell({ width: { size: colWidths[0], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(rowIdx++), font: MAIN_FONT, size: 18 })] })] }),
          new TableCell({ width: { size: colWidths[1], type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: examSummary.subject, font: MAIN_FONT, size: 18 })] })] }),
          new TableCell({ width: { size: colWidths[2], type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: materi, font: MAIN_FONT, size: 18 })] })] }),
          new TableCell({ width: { size: colWidths[3], type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: indikator, font: MAIN_FONT, size: 18 })] })] }),
          new TableCell({ width: { size: colWidths[4], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: level, font: MAIN_FONT, size: 18 })] })] }),
          new TableCell({ width: { size: colWidths[5], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: bentuk, font: MAIN_FONT, size: 18 })] })] }),
          new TableCell({ width: { size: colWidths[6], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(noSoal), font: MAIN_FONT, size: 18, bold: true })] })] }),
          new TableCell({ width: { size: colWidths[7], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(skor), font: MAIN_FONT, size: 18 })] })] }),
        ],
      })
    );
  };

  multipleChoice.forEach((q) => {
    addMatrixRow(resolveQuestionMaterialScope(q, examSummary.subject), q.indicator || 'Peserta didik dapat menentukan jawaban yang benar berdasarkan stimulus/soal yang disajikan.', q.cognitiveLevel || 'L2 (C3)', getMcVariantBadgeLabel(q), q.number, q.score ?? 2);
  });
  complexMultipleChoice.forEach((q) => {
    addMatrixRow(resolveQuestionMaterialScope(q, examSummary.subject), q.indicator || 'Peserta didik dapat menganalisis pernyataan majemuk dengan tepat.', q.cognitiveLevel || 'L3 (C4)', getCmcVariantBadgeLabel(q), q.number, q.score ?? 3);
  });
  matching.forEach((q) => {
    addMatrixRow(resolveQuestionMaterialScope(q, examSummary.subject), q.indicator || 'Peserta didik dapat memasangkan konsep premis dengan respon yang sesuai.', q.cognitiveLevel || 'L2 (C3)', 'Menjodohkan', q.number, q.score ?? 4);
  });
  shortAnswer.forEach((q) => {
    addMatrixRow(resolveQuestionMaterialScope(q, examSummary.subject), q.indicator || 'Peserta didik dapat mengisi konsep atau istilah penting dengan tepat.', q.cognitiveLevel || 'L1 (C2)', 'Isian Singkat', q.number, q.score ?? 2);
  });
  essay.forEach((q) => {
    addMatrixRow(resolveQuestionMaterialScope(q, examSummary.subject), q.indicator || 'Peserta didik dapat menguraikan dan memecahkan permasalahan secara analitis.', q.cognitiveLevel || 'L3 (HOTS C4-C6)', 'Uraian / Essay', q.number, q.score ?? 10);
  });

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: matrixTableRows,
    })
  );

  children.push(
    new Paragraph({ spacing: { before: 300, after: 100 } }),
    createSignatureBlock(kopConfig)
  );

  return new Document({
    sections: [
      {
        properties: {
          page: COMMON_PAGE_SETUP,
        },
        footers: {
          default: DOC_FOOTER,
        },
        children,
      },
    ],
  });
}

/**
 * 3. PEDOMAN PENSKORAN & RUBRIK PENILAIAN (.docx)
 */
export async function generateRubrikDocx(exam: ExamPackage): Promise<Document> {
  const kopConfig = exam.kopConfig || ({} as SchoolKopConfig);
  const examSummary = exam.examSummary || ({} as any);
  const multipleChoice = exam.multipleChoice || [];
  const complexMultipleChoice = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const shortAnswer = exam.shortAnswer || [];
  const essay = exam.essay || [];
  const scoringGuidelines = exam.scoringGuidelines || {
    mcWeight: 40,
    complexMcWeight: 20,
    matchingWeight: 10,
    shortAnswerWeight: 15,
    essayWeight: 15,
    formula: 'Nilai = (Total Skor Perolehan / Total Skor Maksimal) x 100',
  };

  const children: (Paragraph | Table)[] = [];

  children.push(...(await createKopSection(kopConfig)));

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({
          text: 'PEDOMAN PENSKORAN & RUBRIK PENILAIAN',
          font: MAIN_FONT,
          size: 26,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: `${safeExamTitle(examSummary)} - ${safeSubject(examSummary)} (${safeGrade(examSummary)})`,
          font: MAIN_FONT,
          size: 21,
          bold: true,
        }),
      ],
    })
  );

  // Table of Composition & Weights (only active types, accurate scores & 0%-safe weights)
  const compCols = [500, 2706, 1600, 1800, 1800, 1800];
  const compHeaders = ['No', 'Bentuk Soal', 'Jumlah Soal', 'Skor per Soal', 'Total Skor Maks', 'Bobot Penilaian'];

  const mcTotal = multipleChoice.reduce((a, b) => a + (b.score ?? 2), 0);
  const cmcTotal = complexMultipleChoice.reduce((a, b) => a + (b.score ?? 3), 0);
  const mTotal = matching.reduce((a, b) => a + (b.score ?? 4), 0);
  const saTotal = shortAnswer.reduce((a, b) => a + (b.score ?? 2), 0);
  const esTotal = essay.reduce((a, b) => a + (b.score ?? 10), 0);
  const grandTotal = mcTotal + cmcTotal + mTotal + saTotal + esTotal;

  const activeSections: { label: string; count: number; perItem: string; total: number; weight: number }[] = [];
  if (multipleChoice.length > 0) {
    activeSections.push({
      label: 'Pilihan Ganda',
      count: multipleChoice.length,
      perItem: formatScoreRange(multipleChoice, 2, 'Sesuai bobot'),
      total: mcTotal,
      weight: scoringGuidelines.mcWeight ?? 0,
    });
  }
  if (complexMultipleChoice.length > 0) {
    activeSections.push({
      label: 'Pilihan Ganda Kompleks',
      count: complexMultipleChoice.length,
      perItem: formatScoreRange(complexMultipleChoice, 3, 'Proporsional per butir'),
      total: cmcTotal,
      weight: scoringGuidelines.complexMcWeight ?? 0,
    });
  }
  if (matching.length > 0) {
    activeSections.push({
      label: 'Menjodohkan',
      count: matching.length,
      perItem: formatScoreRange(matching, 4, 'Sesuai pasangan'),
      total: mTotal,
      weight: scoringGuidelines.matchingWeight ?? 0,
    });
  }
  if (shortAnswer.length > 0) {
    activeSections.push({
      label: 'Isian Singkat',
      count: shortAnswer.length,
      perItem: formatScoreRange(shortAnswer, 2, 'Sesuai bobot'),
      total: saTotal,
      weight: scoringGuidelines.shortAnswerWeight ?? 0,
    });
  }
  if (essay.length > 0) {
    activeSections.push({
      label: 'Uraian / Essay',
      count: essay.length,
      perItem: formatScoreRange(essay, 10, 'Sesuai rubrik'),
      total: esTotal,
      weight: scoringGuidelines.essayWeight ?? 0,
    });
  }

  const totalWeight = activeSections.reduce((a, s) => a + s.weight, 0);

  const compRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: compHeaders.map((h, i) =>
        new TableCell({
          width: { size: compCols[i], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: MAIN_FONT, size: 18, bold: true })] })],
        })
      ),
    }),
    ...activeSections.map(
      (sec, idx) =>
        new TableRow({
          children: [
            new TableCell({ width: { size: compCols[0], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), font: MAIN_FONT, size: 18 })] })] }),
            new TableCell({ width: { size: compCols[1], type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: sec.label, font: MAIN_FONT, size: 18 })] })] }),
            new TableCell({ width: { size: compCols[2], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${sec.count} butir`, font: MAIN_FONT, size: 18 })] })] }),
            new TableCell({ width: { size: compCols[3], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sec.perItem, font: MAIN_FONT, size: 18 })] })] }),
            new TableCell({ width: { size: compCols[4], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(sec.total), font: MAIN_FONT, size: 18, bold: true })] })] }),
            new TableCell({ width: { size: compCols[5], type: WidthType.DXA }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${sec.weight}%`, font: MAIN_FONT, size: 18 })] })] }),
          ],
        })
    ),
    new TableRow({
      children: [
        new TableCell({ columnSpan: 4, width: { size: compCols[0] + compCols[1] + compCols[2] + compCols[3], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL SKOR MAKSIMAL:  ', font: MAIN_FONT, size: 19, bold: true })] })] }),
        new TableCell({ width: { size: compCols[4], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(grandTotal), font: MAIN_FONT, size: 20, bold: true, color: '1E3A8A' })] })] }),
        new TableCell({ width: { size: compCols[5], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${totalWeight || 100}%`, font: MAIN_FONT, size: 20, bold: true })] })] }),
      ],
    }),
  ];

  children.push(
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: compCols,
      rows: compRows,
    })
  );

  // Formula Section & Optional Complex MC Partial Credit
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 80 },
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ text: 'FORMULA PERHITUNGAN NILAI AKHIR (NA):', font: MAIN_FONT, size: 20, bold: true }),
      ],
    }),
    new Paragraph({
      indent: { left: 400 },
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: scoringGuidelines.formula || 'Nilai Akhir (NA) = (Total Skor Perolehan / Total Skor Maksimal) x 100',
          font: MAIN_FONT,
          size: 21,
          bold: true,
          color: '1E3A8A',
        }),
      ],
    })
  );

  if (scoringGuidelines.complexMcPartialCredit) {
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 40 },
        children: [
          new TextRun({ text: 'KETENTUAN PENSKORAN PILIHAN GANDA KOMPLEKS:', font: MAIN_FONT, size: 19, bold: true }),
        ],
      }),
      new Paragraph({
        indent: { left: 400 },
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({ text: scoringGuidelines.complexMcPartialCredit, font: MAIN_FONT, size: 19 }),
        ],
      })
    );
  }

  // Detailed Rubrics for Essay
  if (essay.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 100 },
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: 'RUBRIK PENILAIAN BUTIR SOAL URAIAN DETAIL:', font: MAIN_FONT, size: 20, bold: true }),
        ],
      })
    );

    essay.forEach((q) => {
      children.push(
        ...createMultilineParagraphs(q.question, {
          size: 19,
          before: 80,
          after: 30,
          prefix: `Nomor ${q.number}: `,
          prefixBold: true,
        })
      );

      (q.scoringRubric || []).forEach((r) => {
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({ text: `• ${r.criteria}  ➔  `, font: MAIN_FONT, size: 18 }),
              new TextRun({ text: `Skor ${r.points}`, font: MAIN_FONT, size: 18, bold: true, color: '059669' }),
            ],
          })
        );
      });
    });
  }

  children.push(
    new Paragraph({ spacing: { before: 300, after: 100 } }),
    createSignatureBlock(kopConfig)
  );

  return new Document({
    sections: [
      {
        properties: {
          page: COMMON_PAGE_SETUP,
        },
        footers: {
          default: DOC_FOOTER,
        },
        children,
      },
    ],
  });
}

/**
 * 4. KARTU SOAL ASESMEN STANDAR DINAS (.docx)
 */
export async function generateKartuSoalDocx(exam: ExamPackage): Promise<Document> {
  const kopConfig = exam.kopConfig || ({} as SchoolKopConfig);
  const examSummary = exam.examSummary || ({} as any);
  const multipleChoice = exam.multipleChoice || [];
  const complexMultipleChoice = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const shortAnswer = exam.shortAnswer || [];
  const essay = exam.essay || [];

  const children: (Paragraph | Table)[] = [];

  children.push(...(await createKopSection(kopConfig)));

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({
          text: 'KARTU SOAL UJIAN (ANALISIS BUTIR SOAL)',
          font: MAIN_FONT,
          size: 26,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: `${safeExamTitle(examSummary)} - TAHUN AJARAN ${safeAcademicYear(examSummary)}`,
          font: MAIN_FONT,
          size: 21,
          bold: true,
        }),
      ],
    })
  );

  const cardCol1 = 2600;
  const cardCol2 = 7606;

  const pushCard = (
    bentuk: string,
    number: number,
    cognitiveLevel: string | undefined,
    kunciLabel: string,
    indicator: string | undefined,
    bodyParagraphs: Paragraph[],
    explanation?: string
  ) => {
    const cardTable = new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      columnWidths: [cardCol1, cardCol2],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: cardCol1, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
              children: [
                new Paragraph({ children: [new TextRun({ text: 'Mata Pelajaran', font: MAIN_FONT, size: 18, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: 'Kelas / Semester', font: MAIN_FONT, size: 18, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: 'Bentuk Soal', font: MAIN_FONT, size: 18, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: 'Nomor Soal', font: MAIN_FONT, size: 18, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: 'Level Kognitif', font: MAIN_FONT, size: 18, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: 'Kunci Jawaban', font: MAIN_FONT, size: 18, bold: true })] }),
              ],
            }),
            new TableCell({
              width: { size: cardCol2, type: WidthType.DXA },
              children: [
                new Paragraph({ children: [new TextRun({ text: `: ${examSummary.subject}`, font: MAIN_FONT, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `: ${examSummary.grade} / ${examSummary.semester}`, font: MAIN_FONT, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `: ${bentuk}`, font: MAIN_FONT, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `: ${number}`, font: MAIN_FONT, size: 18, bold: true })] }),
                new Paragraph({ children: [new TextRun({ text: `: ${cognitiveLevel || 'L2 (Aplikasi)'}`, font: MAIN_FONT, size: 18 })] }),
                new Paragraph({ children: [new TextRun({ text: `: ${kunciLabel}`, font: MAIN_FONT, size: 18, bold: true, color: '1E3A8A' })] }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: 'Capaian Pembelajaran / Indikator Soal:', font: MAIN_FONT, size: 18, bold: true })],
                }),
                new Paragraph({
                  indent: { left: 200 },
                  spacing: { before: 0, after: 60 },
                  children: [new TextRun({ text: indicator || 'Peserta didik dapat menganalisis dan menyelesaikan soal sesuai indikator.', font: MAIN_FONT, size: 18, italics: true })],
                }),
                new Paragraph({
                  spacing: { before: 40, after: 40 },
                  children: [new TextRun({ text: 'Rumusan Butir Soal:', font: MAIN_FONT, size: 18, bold: true })],
                }),
                ...bodyParagraphs,
                ...(explanation
                  ? [
                      new Paragraph({
                        spacing: { before: 60, after: 20 },
                        children: [new TextRun({ text: 'Pembahasan / Keterangan Kunci:', font: MAIN_FONT, size: 18, bold: true })],
                      }),
                      new Paragraph({
                        indent: { left: 200 },
                        spacing: { before: 0, after: 40 },
                        children: [new TextRun({ text: explanation, font: MAIN_FONT, size: 18 })],
                      }),
                    ]
                  : []),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(cardTable);
    children.push(new Paragraph({ spacing: { before: 100, after: 100 } }));
  };

  // Cards for Multiple Choice
  multipleChoice.forEach((q) => {
    const body: Paragraph[] = [
      ...(q.stimulus ? createMultilineParagraphs(q.stimulus, { indentLeft: 200, size: 18, italics: true, after: 40 }) : []),
      ...createMultilineParagraphs(q.question, { indentLeft: 200, size: 18, after: 40 }),
      ...(q.options || []).map(
        (opt) =>
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({ text: `${opt.key}. `, font: MAIN_FONT, size: 18, bold: opt.key === q.correctAnswer }),
              new TextRun({ text: opt.text, font: MAIN_FONT, size: 18, bold: opt.key === q.correctAnswer }),
            ],
          })
      ),
    ];
    pushCard(getMcVariantBadgeLabel(q), q.number, q.cognitiveLevel, q.correctAnswer, q.indicator, body, q.explanation || 'Jawaban relevan dengan capaian pembelajaran.');
  });

  // Cards for Complex Multiple Choice
  complexMultipleChoice.forEach((q) => {
    const ansArr = getCmcCorrectList(q.correctAnswer);
    const lbl = resolveStatementLabels(q);
    const stmtKeyStr = (q.statements || [])
      .map((s, i) => `P${i + 1}:${s.isCorrect ? lbl.positiveCode : lbl.negativeCode}`)
      .join(' | ');
    const kunciStr =
      ansArr.length > 0 && stmtKeyStr
        ? `${ansArr.join(', ')} | ${stmtKeyStr}`
        : ansArr.length > 0
        ? ansArr.join(', ')
        : stmtKeyStr || '-';
    const body: Paragraph[] = [
      ...(q.stimulus ? createMultilineParagraphs(q.stimulus, { indentLeft: 200, size: 18, italics: true, after: 40 }) : []),
      ...createMultilineParagraphs(q.question, { indentLeft: 200, size: 18, after: 40 }),
      ...(q.options || []).map((opt) => {
        const isCorrect = ansArr.includes(opt.key.toUpperCase());
        return new Paragraph({
          indent: { left: 400 },
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({ text: `${opt.key}. `, font: MAIN_FONT, size: 18, bold: isCorrect }),
            new TextRun({ text: opt.text, font: MAIN_FONT, size: 18, bold: isCorrect }),
          ],
        });
      }),
      ...(q.statements || []).map(
        (st) =>
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({ text: `[${st.isCorrect ? lbl.positive.toUpperCase() : lbl.negative.toUpperCase()}] `, font: MAIN_FONT, size: 18, bold: true }),
              new TextRun({ text: st.statement, font: MAIN_FONT, size: 18 }),
            ],
          })
      ),
    ];
    pushCard(getCmcVariantBadgeLabel(q), q.number, q.cognitiveLevel || 'L3 (Penalaran)', kunciStr, q.indicator, body, q.explanation);
  });

  // Cards for Matching
  matching.forEach((q) => {
    const body: Paragraph[] = [
      ...createMultilineParagraphs(q.instruction, { indentLeft: 200, size: 18, after: 40 }),
      ...(q.pairs || []).map(
        (p) =>
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 0, after: 20 },
            children: [
              new TextRun({ text: `• ${p.premise} ➔ `, font: MAIN_FONT, size: 18 }),
              new TextRun({ text: p.match, font: MAIN_FONT, size: 18, bold: true }),
            ],
          })
      ),
    ];
    pushCard('Menjodohkan', q.number, q.cognitiveLevel, 'Sesuai pasangan', q.indicator, body, q.explanation);
  });

  // Cards for Short Answer
  shortAnswer.forEach((q) => {
    const body: Paragraph[] = [
      ...(q.stimulus ? createMultilineParagraphs(q.stimulus, { indentLeft: 200, size: 18, italics: true, after: 40 }) : []),
      ...createMultilineParagraphs(q.question, { indentLeft: 200, size: 18, after: 40 }),
      ...(q.acceptedAnswers && q.acceptedAnswers.length > 0
        ? [
            new Paragraph({
              indent: { left: 200 },
              spacing: { before: 0, after: 30 },
              children: [
                new TextRun({ text: `Variasi jawaban diterima: ${q.acceptedAnswers.join(', ')}`, font: MAIN_FONT, size: 18, italics: true }),
              ],
            }),
          ]
        : []),
    ];
    pushCard('Isian Singkat', q.number, q.cognitiveLevel || 'L1 (Mengingat)', q.correctAnswer, q.indicator, body, q.explanation);
  });

  // Cards for Essay
  essay.forEach((q) => {
    const body: Paragraph[] = [
      ...(q.stimulus ? createMultilineParagraphs(q.stimulus, { indentLeft: 200, size: 18, italics: true, after: 40 }) : []),
      ...createMultilineParagraphs(q.question, { indentLeft: 200, size: 18, after: 40 }),
      new Paragraph({
        spacing: { before: 40, after: 20 },
        children: [new TextRun({ text: 'Pedoman Penskoran / Jawaban Diharapkan:', font: MAIN_FONT, size: 18, bold: true })],
      }),
      ...createMultilineParagraphs(q.expectedAnswer, { indentLeft: 200, size: 18, after: 40 }),
    ];
    pushCard('Uraian / Essay', q.number, q.cognitiveLevel || 'L3 (HOTS)', 'Sesuai Rubrik', q.indicator, body);
  });

  children.push(
    new Paragraph({ spacing: { before: 300, after: 100 } }),
    createSignatureBlock(kopConfig)
  );

  return new Document({
    sections: [
      {
        properties: {
          page: COMMON_PAGE_SETUP,
        },
        footers: {
          default: DOC_FOOTER,
        },
        children,
      },
    ],
  });
}

/**
 * 5. LEMBAR JAWABAN SISWA / LJS 1 LEMBAR A4 (.docx)
 */
export async function generateLjsDocx(exam: ExamPackage): Promise<Document> {
  const kopConfig = exam.kopConfig || ({} as SchoolKopConfig);
  const examSummary = exam.examSummary || ({} as any);
  const multipleChoice = exam.multipleChoice || [];
  const complexMultipleChoice = exam.complexMultipleChoice || [];
  const matching = exam.matching || [];
  const shortAnswer = exam.shortAnswer || [];
  const essay = exam.essay || [];

  const children: (Paragraph | Table)[] = [];

  children.push(...(await createKopSection(kopConfig, CONTENT_WIDTH_DXA, true)));

  // Judul LJS
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 40 },
      children: [
        new TextRun({ text: 'LEMBAR JAWABAN SISWA (LJS)', font: MAIN_FONT, size: 24, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({ text: `${safeExamTitle(examSummary)} - TAHUN AJARAN ${safeAcademicYear(examSummary)}`, font: MAIN_FONT, size: 20, bold: true }),
      ],
    })
  );

  // Student Identity Box
  const idBoxW = Math.floor(CONTENT_WIDTH_DXA / 2);
  const idBoxTable = new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [idBoxW, idBoxW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: idBoxW, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Nama Lengkap  : .....................................................', font: MAIN_FONT, size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: 'Nomor Peserta : .....................................................', font: MAIN_FONT, size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: `Kelas / Ruang : ${examSummary.grade} / .......`, font: MAIN_FONT, size: 19 })] }),
            ],
          }),
          new TableCell({
            width: { size: idBoxW, type: WidthType.DXA },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Mata Pelajaran : ${examSummary.subject}`, font: MAIN_FONT, size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: 'Hari / Tanggal : .....................................................', font: MAIN_FONT, size: 19 })] }),
              new Paragraph({ children: [new TextRun({ text: 'Tanda Tangan  : .....................................................', font: MAIN_FONT, size: 19 })] }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(idBoxTable);
  children.push(new Paragraph({ spacing: { before: 80, after: 80 } }));

  let ljsSecIdx = 0;
  const secLetter = () => String.fromCharCode(65 + ljsSecIdx++);

  // 1. Multiple Choice Answer Bubbles Grid
  if (multipleChoice.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 80, after: 60 },
        children: [
          new TextRun({ text: `${secLetter()}. PILIHAN GANDA (Beri tanda silang X atau hitamkan kotak jawaban):`, font: MAIN_FONT, size: 20, bold: true }),
        ],
      })
    );

    const fallbackFive = examSummary.schoolLevel === 'SMA' || examSummary.schoolLevel === 'SMK' || examSummary.schoolLevel === 'MA';
    const defaultOptLetters = Array.from({ length: fallbackFive ? 5 : 4 }, (_, i) => String.fromCharCode(65 + i));

    const colHalfW = Math.floor(CONTENT_WIDTH_DXA / 2);
    const halfLen = Math.ceil(multipleChoice.length / 2);
    const col1 = multipleChoice.slice(0, halfLen);
    const col2 = multipleChoice.slice(halfLen);

    const answerGridRows: TableRow[] = [];
    for (let i = 0; i < halfLen; i++) {
      const q1 = col1[i];
      const q2 = col2[i];

      const renderBubbleCell = (q: any) => {
        if (!q) return new Paragraph({ children: [] });
        const itemLetters =
          q.options && q.options.length > 0
            ? q.options.map((o: any) => o.key)
            : defaultOptLetters;
        return new Paragraph({
          children: [
            new TextRun({ text: `${q.number < 10 ? '  ' : ''}${q.number}.   `, font: MAIN_FONT, size: 19, bold: true }),
            ...itemLetters.map((letter: string) => new TextRun({ text: ` [ ${letter} ]  `, font: MAIN_FONT, size: 18 })),
          ],
        });
      };

      answerGridRows.push(
        new TableRow({
          children: [
            new TableCell({ width: { size: colHalfW, type: WidthType.DXA }, children: [renderBubbleCell(q1)] }),
            new TableCell({ width: { size: colHalfW, type: WidthType.DXA }, children: [renderBubbleCell(q2)] }),
          ],
        })
      );
    }

    children.push(
      new Table({
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [colHalfW, colHalfW],
        rows: answerGridRows,
      })
    );
  }

  // 2. Complex Multiple Choice Answer Grid (supports option-based, statement-table, or mixed!)
  if (complexMultipleChoice.length > 0) {
    const optionItems = complexMultipleChoice.filter(
      (q) => Array.isArray(q.options) && q.options.length > 0 && (!q.statements || q.statements.length === 0)
    );
    const statementItems = complexMultipleChoice.filter(
      (q) => Array.isArray(q.statements) && q.statements.length > 0
    );

    const subtitle =
      optionItems.length > 0 && statementItems.length > 0
        ? 'Pilih lebih dari satu jawaban atau beri tanda centang pada kolom pernyataan'
        : optionItems.length > 0
        ? 'Pilih lebih dari satu / dua jawaban yang benar'
        : 'Beri tanda centang pada kolom pilihan pernyataan sesuai soal';

    children.push(
      new Paragraph({
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({
            text: `${secLetter()}. PILIHAN GANDA KOMPLEKS (${subtitle}):`,
            font: MAIN_FONT,
            size: 20,
            bold: true,
          }),
        ],
      })
    );

    if (optionItems.length > 0) {
      const maxCmcOpts = Math.max(...optionItems.map((q) => (q.options ? q.options.length : 4)), 4);
      const optLetters = Array.from({ length: maxCmcOpts }, (_, i) => String.fromCharCode(65 + i));
      const colHalfW = Math.floor(CONTENT_WIDTH_DXA / 2);
      const halfLen = Math.ceil(optionItems.length / 2);
      const col1 = optionItems.slice(0, halfLen);
      const col2 = optionItems.slice(halfLen);

      const cmcRows: TableRow[] = [];
      for (let i = 0; i < halfLen; i++) {
        const q1 = col1[i];
        const q2 = col2[i];
        const renderCell = (q: any) => {
          if (!q) return new Paragraph({ children: [] });
          const letters = q.options && q.options.length > 0 ? q.options.map((o: any) => o.key) : optLetters;
          return new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({ text: `${q.number < 10 ? '  ' : ''}${q.number}.   `, font: MAIN_FONT, size: 19, bold: true }),
              ...letters.map((l: string) => new TextRun({ text: ` [ ${l} ]  `, font: MAIN_FONT, size: 18 })),
            ],
          });
        };
        cmcRows.push(
          new TableRow({
            children: [
              new TableCell({ width: { size: colHalfW, type: WidthType.DXA }, children: [renderCell(q1)] }),
              new TableCell({ width: { size: colHalfW, type: WidthType.DXA }, children: [renderCell(q2)] }),
            ],
          })
        );
      }
      children.push(
        new Table({
          width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
          columnWidths: [colHalfW, colHalfW],
          rows: cmcRows,
        })
      );
    }

    if (statementItems.length > 0) {
      statementItems.forEach((q) => {
        const lbl = resolveStatementLabels(q);
        const stmtCount = q.statements?.length || 3;
        const slots = Array.from(
          { length: stmtCount },
          (_, idx) => `P${idx + 1}: [ ${lbl.positiveCode} / ${lbl.negativeCode} ]`
        ).join('   ');
        children.push(
          new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [
              new TextRun({ text: `${q.number}.  `, font: MAIN_FONT, size: 19, bold: true }),
              new TextRun({ text: slots, font: MAIN_FONT, size: 18 }),
            ],
          })
        );
      });
    }
  }

  // 3. Matching Sheet
  if (matching.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 140, after: 60 },
        children: [
          new TextRun({ text: `${secLetter()}. MENJODOHKAN (Tuliskan huruf premis & pasangan angka romawi):`, font: MAIN_FONT, size: 20, bold: true }),
        ],
      })
    );
    matching.forEach((q) => {
      const pairsText = (q.pairs || [])
        .map((_, idx) => `${String.fromCharCode(97 + idx)} ➔ ......`)
        .join('     ');
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 30 },
          children: [
            new TextRun({ text: `${q.number}. `, font: MAIN_FONT, size: 19, bold: true }),
            new TextRun({ text: pairsText, font: MAIN_FONT, size: 18 }),
          ],
        })
      );
    });
  }

  // 4. Short Answer Sheet
  if (shortAnswer.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: `${secLetter()}. ISIAN SINGKAT:`, font: MAIN_FONT, size: 20, bold: true }),
        ],
      })
    );

    shortAnswer.forEach((q) => {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 40 },
          children: [
            new TextRun({ text: `${q.number}. `, font: MAIN_FONT, size: 19, bold: true }),
            new TextRun({ text: '....................................................................................................................................................', font: MAIN_FONT, size: 18 }),
          ],
        })
      );
    });
  }

  // 5. Essay Sheet
  if (essay.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({ text: `${secLetter()}. URAIAN / ESSAY:`, font: MAIN_FONT, size: 20, bold: true }),
        ],
      })
    );

    essay.forEach((q) => {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 20 },
          children: [
            new TextRun({ text: `Jawaban No. ${q.number}:`, font: MAIN_FONT, size: 19, bold: true }),
          ],
        }),
        new Paragraph({
          spacing: { before: 20, after: 30 },
          border: { bottom: { style: BorderStyle.DASHED, size: 4, color: '94A3B8' } },
        }),
        new Paragraph({
          spacing: { before: 20, after: 30 },
          border: { bottom: { style: BorderStyle.DASHED, size: 5, color: '94A3B8' } },
        }),
        new Paragraph({
          spacing: { before: 20, after: 40 },
          border: { bottom: { style: BorderStyle.DASHED, size: 4, color: '94A3B8' } },
        })
      );
    });
  }

  return new Document({
    sections: [
      {
        properties: {
          page: COMMON_PAGE_SETUP,
        },
        children,
      },
    ],
  });
}
