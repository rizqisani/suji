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
  SectionType,
  ImageRun,
  LevelFormat,
  TabStopType,
  Header,
  Footer,
  PageNumber,
  TableLayoutType,
} from 'docx';
import { type NaskahUjianData, JENIS_UJIAN_TITLES } from '../schema/naskahUjianSchema.ts';
import { processLogoToPng } from './imageHelper.ts';
import { resolveStatementLabels } from '../utils/questionHelpers.ts';

export async function generateDocxDocument(data: NaskahUjianData): Promise<Document> {
  const { identitas, kop, tataLetak, petunjukUmum, bagianSoal, tandaTangan, opsional } = data;

  // Process logos to true PNG buffers
  const logoKiriPng = await processLogoToPng(kop.logoKiri, 'dinas');
  const logoKananPng = await processLogoToPng(kop.logoKanan, 'tutwuri');

  const mainFont = tataLetak.fontUtama || 'Times New Roman';
  const marginDxa = tataLetak.margin || 850;
  const numCols = tataLetak.jumlahKolom || 2;
  const colSpaceDxa = tataLetak.jarakKolom || 400;

  // Page dimensions (A4 = 11906 x 16838 DXA)
  const pageWidthDxa = 11906;
  const pageHeightDxa = 16838;
  const contentWidthDxa = pageWidthDxa - 2 * marginDxa; // 10206 DXA

  // Common page properties to repeat on every section
  const commonPageSetup = {
    size: {
      width: pageWidthDxa,
      height: pageHeightDxa,
    },
    margin: {
      top: marginDxa,
      bottom: marginDxa,
      left: marginDxa,
      right: marginDxa,
    },
  };

  // Footer with Page Number
  const docFooter = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: 'Halaman ',
            font: mainFont,
            size: 18,
            color: '64748B',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: mainFont,
            size: 18,
            color: '64748B',
            bold: true,
          }),
          new TextRun({
            text: ' dari ',
            font: mainFont,
            size: 18,
            color: '64748B',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: mainFont,
            size: 18,
            color: '64748B',
            bold: true,
          }),
        ],
      }),
    ],
  });

  // ==========================================
  // SECTION 1: KOP, JUDUL, IDENTITAS, PETUNJUK (1 KOLOM)
  // ==========================================

  // Kop Table [1250, 7706, 1250] DXA
  const kopTable = new Table({
    width: { size: contentWidthDxa, type: WidthType.DXA },
    columnWidths: [1250, 7706, 1250],
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
            width: { size: 1250, type: WidthType.DXA },
            verticalAlign: AlignmentType.CENTER,
            margins: { top: 0, bottom: 0, left: 20, right: 40 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: logoKiriPng,
                    transformation: { width: 68, height: 68 },
                    type: 'png',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 7706, type: WidthType.DXA },
            verticalAlign: AlignmentType.CENTER,
            margins: { top: 0, bottom: 0, left: 40, right: 40 },
            children: kop.baris.map((b, idx) => {
              return new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: idx === 0 ? 0 : 20, after: 20, line: 240 },
                children: [
                  new TextRun({
                    text: b.teks,
                    font: mainFont,
                    size: b.ukuranFont * 2, // half-points
                    bold: b.tebal,
                    italics: b.miring,
                  }),
                ],
              });
            }),
          }),
          new TableCell({
            width: { size: 1250, type: WidthType.DXA },
            verticalAlign: AlignmentType.CENTER,
            margins: { top: 0, bottom: 0, left: 40, right: 20 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: logoKananPng,
                    transformation: { width: 68, height: 68 },
                    type: 'png',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Garis Ganda di bawah Kop
  const garisGandaParagraph = new Paragraph({
    spacing: { before: 60, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.THICK_THIN_SMALL_GAP,
        size: 16,
        color: '000000',
        space: 2,
      },
    },
    children: [],
  });

  // Judul Ujian (Prioritize explicit identitas.judul, fallback to JENIS_UJIAN_TITLES)
  const judulResmi =
    identitas.judul?.trim() ||
    JENIS_UJIAN_TITLES[identitas.jenis] ||
    identitas.jenis ||
    'PENILAIAN ASESMEN SEKOLAH';

  const judulParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: judulResmi.toUpperCase(),
          font: mainFont,
          size: 24, // 12 pt
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: `TAHUN AJARAN ${identitas.tahunAjaran}`,
          font: mainFont,
          size: 21, // 10.5 pt
          bold: true,
        }),
      ],
    }),
  ];

  // Tabel Identitas [1837, 3266, 1837, 3266] DXA
  const borderCell = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000',
  };

  const faseTrimmed = identitas.fase?.trim() || '';
  const hasFaseAlready =
    !faseTrimmed ||
    identitas.kelas.toLowerCase().includes(faseTrimmed.toLowerCase());
  const kelasFaseDisplay = hasFaseAlready
    ? `: ${identitas.kelas}`
    : `: ${identitas.kelas} (${faseTrimmed})`;

  const identitasTable = new Table({
    width: { size: contentWidthDxa, type: WidthType.DXA },
    columnWidths: [1837, 3266, 1837, 3266],
    borders: {
      top: borderCell,
      bottom: borderCell,
      left: borderCell,
      right: borderCell,
      insideHorizontal: borderCell,
      insideVertical: borderCell,
    },
    rows: [
      new TableRow({
        children: [
          createIdentityLabelCell('Mata Pelajaran', 1837, mainFont),
          createIdentityValueCell(`: ${identitas.mataPelajaran}`, 3266, mainFont),
          createIdentityLabelCell('Hari / Tanggal', 1837, mainFont),
          createIdentityValueCell(`: ${identitas.hariTanggal || '........................................'}`, 3266, mainFont),
        ],
      }),
      new TableRow({
        children: [
          createIdentityLabelCell('Kelas / Fase', 1837, mainFont),
          createIdentityValueCell(kelasFaseDisplay, 3266, mainFont),
          createIdentityLabelCell('Alokasi Waktu', 1837, mainFont),
          createIdentityValueCell(`: ${identitas.alokasiWaktu}`, 3266, mainFont),
        ],
      }),
      new TableRow({
        children: [
          createIdentityLabelCell('Kurikulum', 1837, mainFont),
          createIdentityValueCell(`: ${identitas.kurikulum}`, 3266, mainFont),
          createIdentityLabelCell('Nama / No. Absen', 1837, mainFont),
          createIdentityValueCell(`: ${identitas.namaSiswa || '...................'} / ${identitas.nomorAbsen || '......'}`, 3266, mainFont),
        ],
      }),
    ],
  });

  // Kotak Petunjuk Umum (Single Cell Table with Numbering)
  const petunjukHeader = new Paragraph({
    spacing: { before: 40, after: 60 },
    children: [
      new TextRun({
        text: 'PETUNJUK UMUM:',
        font: mainFont,
        size: 18, // 9 pt
        bold: true,
      }),
    ],
  });

  const petunjukItems = petunjukUmum.map((item) => {
    return new Paragraph({
      numbering: {
        reference: 'petunjuk-numbering',
        level: 0,
      },
      spacing: { before: 20, after: 20, line: 220 },
      children: [
        new TextRun({
          text: item,
          font: mainFont,
          size: 18, // 9 pt
        }),
      ],
    });
  });

  const petunjukTable = new Table({
    width: { size: contentWidthDxa, type: WidthType.DXA },
    columnWidths: [contentWidthDxa],
    borders: {
      top: borderCell,
      bottom: borderCell,
      left: borderCell,
      right: borderCell,
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: contentWidthDxa, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [petunjukHeader, ...petunjukItems],
          }),
        ],
      }),
    ],
  });

  const section1Children = [
    kopTable,
    ...(kop.garisGanda ? [garisGandaParagraph] : []),
    ...judulParagraphs,
    identitasTable,
    new Paragraph({ spacing: { before: 80, after: 0 }, children: [] }),
    petunjukTable,
    new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),
  ];

  // ==========================================
  // SECTION 2: SEMUA SOAL (2 KOLOM ATAU 1 KOLOM)
  // ==========================================
  const activeBagian = bagianSoal.filter((b) => b.aktif !== false);
  const section2Children: (Paragraph | Table)[] = [];

  // Determine overall max options for multiple choice instruction
  let actualMaxPgOptions = 0;
  for (const b of activeBagian) {
    if (b.tipe === 'pg') {
      for (const s of b.soal as any[]) {
        if (Array.isArray(s.opsi) && s.opsi.length > actualMaxPgOptions) {
          actualMaxPgOptions = s.opsi.length;
        }
      }
    }
  }
  const maxPgOptions = actualMaxPgOptions >= 5 ? 5 : actualMaxPgOptions === 2 ? 2 : actualMaxPgOptions === 3 ? 3 : 4;
  const pgOptionLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, maxPgOptions);
  const pgOptionRangeStr =
    pgOptionLetters.length > 1
      ? pgOptionLetters.slice(0, -1).join(', ') + ', atau ' + pgOptionLetters[pgOptionLetters.length - 1]
      : 'A';

  // Global question numbering counter that continues across sections
  let globalQuestionNumber = 1;

  for (let bIdx = 0; bIdx < activeBagian.length; bIdx++) {
    const bagian = activeBagian[bIdx];
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const sectionNum = romanNumerals[bIdx] || `${bIdx + 1}`;

    // Section Title (Heading 1 with bottom border)
    section2Children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: bIdx === 0 ? 40 : 140, after: 40 },
        keepNext: true,
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 2 },
        },
        children: [
          new TextRun({
            text: `${sectionNum}. ${bagian.judul.toUpperCase()}`,
            font: mainFont,
            size: 20, // 10 pt
            bold: true,
          }),
        ],
      })
    );

    // Section Instruction (Auto-computed for PG / PGK)
    let instruksiText = bagian.instruksi;
    if (!instruksiText || instruksiText.trim() === '') {
      if (bagian.tipe === 'pg') {
        instruksiText = `Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf ${pgOptionRangeStr}!`;
      } else if (bagian.tipe === 'pg_kompleks') {
        const usesOptions = (bagian.soal as any[]).some(
          (s) => Array.isArray(s.opsi) && s.opsi.length > 0 && (!Array.isArray(s.pernyataan) || s.pernyataan.length === 0)
        );
        const usesStatements = (bagian.soal as any[]).some(
          (s) => Array.isArray(s.pernyataan) && s.pernyataan.length > 0
        );
        if (usesOptions && usesStatements) {
          instruksiText = 'Jawablah setiap butir sesuai format (pilih lebih dari satu jawaban atau beri tanda centang ✓ pada tabel pernyataan)!';
        } else if (usesOptions) {
          instruksiText = 'Pilihlah lebih dari satu jawaban yang paling tepat!';
        } else {
          const firstStmt = (bagian.soal as any[]).find((s) => Array.isArray(s.pernyataan) && s.pernyataan.length > 0);
          const lbl = resolveStatementLabels(firstStmt);
          instruksiText = `Tentukan nilai setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom ${lbl.positive} atau ${lbl.negative}!`;
        }
      } else if (bagian.tipe === 'menjodohkan') {
        instruksiText = 'Pasangkanlah pernyataan di kolom sebelah kiri dengan jawaban yang tepat di kolom sebelah kanan!';
      } else if (bagian.tipe === 'isian') {
        instruksiText = 'Isilah titik-titik berikut dengan jawaban yang singkat, tepat, dan benar!';
      } else {
        instruksiText = 'Jawablah pertanyaan berikut dengan uraian yang jelas, runut, dan mendalam!';
      }
    }

    section2Children.push(
      new Paragraph({
        spacing: { before: 20, after: 80 },
        keepNext: true,
        children: [
          new TextRun({
            text: instruksiText,
            font: mainFont,
            size: 18, // 9 pt
            italics: true,
          }),
        ],
      })
    );

    // Render questions in this section
    for (const item of bagian.soal) {
      const explicitNum = (item as any).nomor;
      const qNum = typeof explicitNum === 'number' ? explicitNum : globalQuestionNumber++;
      if (typeof explicitNum === 'number') {
        globalQuestionNumber = Math.max(globalQuestionNumber, explicitNum + 1);
      }

      if (bagian.tipe === 'pg') {
        const pgItem = item as any;
        renderWacana(pgItem.wacana, section2Children, mainFont);

        const hasOptions = Array.isArray(pgItem.opsi) && pgItem.opsi.length > 0;
        appendMultilineQuestionParagraphs(section2Children, qNum, pgItem.teks, {
          mainFont,
          size: 20,
          hasFollowingContent: hasOptions,
          afterSpacing: hasOptions ? 30 : 60,
        });

        // Opsi: Tab stop at 800 DXA, hanging indent: left 800, hanging 360
        if (hasOptions) {
          const totalOps = pgItem.opsi.length;
          pgItem.opsi.forEach((opt: any, oIdx: number) => {
            const isLastOption = oIdx === totalOps - 1;
            section2Children.push(
              new Paragraph({
                tabStops: [{ type: TabStopType.LEFT, position: 800 }],
                indent: { left: 800, hanging: 360 },
                spacing: { before: 16, after: isLastOption ? 70 : 16, line: 225 },
                alignment: AlignmentType.JUSTIFIED,
                keepNext: !isLastOption, // keepNext on all options EXCEPT the last one!
                keepLines: true,
                children: [
                  new TextRun({
                    text: `${opt.label}.\t`,
                    font: mainFont,
                    size: 19, // 9.5 pt
                    bold: true,
                  }),
                  new TextRun({
                    text: opt.teks,
                    font: mainFont,
                    size: 19,
                  }),
                ],
              })
            );
          });
        }
      } else if (bagian.tipe === 'pg_kompleks') {
        const cmcItem = item as any;
        renderWacana(cmcItem.wacana, section2Children, mainFont);

        const hasPernyataan = Array.isArray(cmcItem.pernyataan) && cmcItem.pernyataan.length > 0;
        const hasOpsi = Array.isArray(cmcItem.opsi) && cmcItem.opsi.length > 0;

        appendMultilineQuestionParagraphs(section2Children, qNum, cmcItem.teks, {
          mainFont,
          size: 20,
          hasFollowingContent: hasPernyataan || hasOpsi,
          afterSpacing: 30,
        });

        // Mode A: Multi-select options (A, B, C, D...) dengan kotak centang [   ]
        if (hasOpsi && !hasPernyataan) {
          const totalOps = cmcItem.opsi.length;
          cmcItem.opsi.forEach((opt: any, oIdx: number) => {
            const isLastOption = oIdx === totalOps - 1;
            section2Children.push(
              new Paragraph({
                tabStops: [{ type: TabStopType.LEFT, position: 1140 }],
                indent: { left: 1140, hanging: 700 },
                spacing: { before: 16, after: isLastOption ? 70 : 16, line: 225 },
                alignment: AlignmentType.JUSTIFIED,
                keepNext: !isLastOption,
                keepLines: true,
                children: [
                  new TextRun({
                    text: '[   ]  ',
                    font: mainFont,
                    size: 19,
                  }),
                  new TextRun({
                    text: `${opt.label}.\t`,
                    font: mainFont,
                    size: 19,
                    bold: true,
                  }),
                  new TextRun({
                    text: opt.teks,
                    font: mainFont,
                    size: 19,
                  }),
                ],
              })
            );
          });
        }

        // Mode B: Tabel Biner (Benar/Salah, True/False, Ya/Tidak, Setuju/Tidak Setuju, dll)
        if (hasPernyataan) {
          const stmtLabels = resolveStatementLabels(cmcItem);
          const pernyataanRows = cmcItem.pernyataan.map((p: any) => {
            return new TableRow({
              children: [
                new TableCell({
                  width: { size: 3100, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: p.teks, font: mainFont, size: 18 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 900, type: WidthType.DXA },
                  verticalAlign: AlignmentType.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: '[   ]', font: mainFont, size: 18 })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 900, type: WidthType.DXA },
                  verticalAlign: AlignmentType.CENTER,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: '[   ]', font: mainFont, size: 18 })],
                    }),
                  ],
                }),
              ],
            });
          });

          const tableBs = new Table({
            width: { size: 4900, type: WidthType.DXA },
            columnWidths: [3100, 900, 900],
            borders: {
              top: borderCell,
              bottom: borderCell,
              left: borderCell,
              right: borderCell,
              insideHorizontal: borderCell,
              insideVertical: borderCell,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 3100, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        spacing: { before: 0, after: 0 },
                        children: [new TextRun({ text: 'Pernyataan', font: mainFont, size: 18, bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 900, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 0 },
                        children: [new TextRun({ text: stmtLabels.positive, font: mainFont, size: 18, bold: true })],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 900, type: WidthType.DXA },
                    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 0, after: 0 },
                        children: [new TextRun({ text: stmtLabels.negative, font: mainFont, size: 18, bold: true })],
                      }),
                    ],
                  }),
                ],
              }),
              ...pernyataanRows,
            ],
          });

          section2Children.push(tableBs);
          section2Children.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }));
        }
      } else if (bagian.tipe === 'menjodohkan') {
        const mItem = item as any;
        appendMultilineQuestionParagraphs(section2Children, qNum, mItem.teks, {
          mainFont,
          size: 20,
          hasFollowingContent: true,
          afterSpacing: 40,
        });

        // Tabel menjodohkan dalam kolom: lebar 4900, kolom [2450, 2450], garis tengah putus-putus
        const premisArray = mItem.premis || [];
        const pilihanArray = mItem.pilihan || [];

        const matchingTable = new Table({
          width: { size: 4900, type: WidthType.DXA },
          columnWidths: [2450, 2450],
          borders: {
            top: borderCell,
            bottom: borderCell,
            left: borderCell,
            right: borderCell,
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.DASHED, size: 6, color: '64748B' },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 2450, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: 'Kolom Premis (Kiri):', font: mainFont, size: 18, bold: true })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 2450, type: WidthType.DXA },
                  shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: [
                    new Paragraph({
                      spacing: { before: 0, after: 0 },
                      children: [new TextRun({ text: 'Pilihan Jawaban (Kanan):', font: mainFont, size: 18, bold: true })],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 2450, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: premisArray.map((p: string, pIdx: number) => {
                    const letter = String.fromCharCode(97 + pIdx); // a, b, c...
                    return new Paragraph({
                      spacing: { before: 20, after: 20 },
                      children: [
                        new TextRun({ text: `${letter}. `, font: mainFont, size: 18, bold: true }),
                        new TextRun({ text: p, font: mainFont, size: 18 }),
                      ],
                    });
                  }),
                }),
                new TableCell({
                  width: { size: 2450, type: WidthType.DXA },
                  margins: { top: 60, bottom: 60, left: 80, right: 80 },
                  children: pilihanArray.map((m: string, mIdx: number) => {
                    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][mIdx] || `${mIdx + 1}`;
                    return new Paragraph({
                      spacing: { before: 20, after: 20 },
                      children: [
                        new TextRun({ text: `${roman}. `, font: mainFont, size: 18, bold: true }),
                        new TextRun({ text: m, font: mainFont, size: 18 }),
                      ],
                    });
                  }),
                }),
              ],
            }),
          ],
        });

        section2Children.push(matchingTable);
        section2Children.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }));
      } else if (bagian.tipe === 'isian') {
        const saItem = item as any;
        renderWacana(saItem.wacana, section2Children, mainFont);

        appendMultilineQuestionParagraphs(section2Children, qNum, saItem.teks, {
          mainFont,
          size: 20,
          hasFollowingContent: true,
          afterSpacing: 30,
        });

        section2Children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { before: 16, after: 60 },
            children: [
              new TextRun({
                text: 'Jawab: .............................................................................',
                font: mainFont,
                size: 18,
                color: '64748B',
              }),
            ],
          })
        );
      } else if (bagian.tipe === 'uraian') {
        const esItem = item as any;
        renderWacana(esItem.wacana, section2Children, mainFont);

        appendMultilineQuestionParagraphs(section2Children, qNum, esItem.teks, {
          mainFont,
          size: 20,
          hasFollowingContent: true,
          afterSpacing: 30,
        });

        // Sub-soal jika ada
        if (Array.isArray(esItem.subSoal) && esItem.subSoal.length > 0) {
          esItem.subSoal.forEach((sub: string, sIdx: number) => {
            const subLetter = String.fromCharCode(97 + sIdx); // a, b, c...
            section2Children.push(
              new Paragraph({
                indent: { left: 600, hanging: 240 },
                spacing: { before: 16, after: 16 },
                keepNext: true,
                children: [
                  new TextRun({ text: `${subLetter}. `, font: mainFont, size: 19, bold: true }),
                  new TextRun({ text: sub, font: mainFont, size: 19 }),
                ],
              })
            );
          });
        }

        // Garis jawaban uraian: paragraf kosong dengan border bawah putus-putus
        // Beri size border berbeda tiap baris (mis. 4 dan 5) agar Word tidak menyatukannya
        const lineCount = esItem.jumlahGarisJawaban || 2;
        for (let l = 0; l < lineCount; l++) {
          const bSize = l % 2 === 0 ? 4 : 5;
          section2Children.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              border: {
                bottom: {
                  style: BorderStyle.DASHED,
                  size: bSize,
                  color: '94A3B8',
                  space: 4,
                },
              },
              children: [new TextRun({ text: ' ', size: 12 })],
            })
          );
        }
      }
    }
  }

  // ==========================================
  // SECTION 3: TANDA TANGAN (1 KOLOM)
  // ==========================================
  const tempatTrim = tandaTangan.tempat?.trim() || '';
  const tanggalTrim = tandaTangan.tanggal?.trim() || '';
  const dateLineText =
    tempatTrim && tanggalTrim
      ? `${tempatTrim}, ${tanggalTrim}`
      : tempatTrim || tanggalTrim || '........................, ..............................';
  const headmasterNipTrim = tandaTangan.kepalaSekolah.nip?.trim() || '';
  const teacherNipTrim = tandaTangan.guru.nip?.trim() || '';

  const ttdTable = new Table({
    width: { size: contentWidthDxa, type: WidthType.DXA },
    columnWidths: [5103, 5103],
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
            width: { size: 5103, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [new TextRun({ text: 'Mengetahui,', font: mainFont, size: 20 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 440 }, // Space for signature
                children: [new TextRun({ text: 'Kepala Sekolah', font: mainFont, size: 20, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: headmasterNipTrim ? 20 : 0 },
                children: [
                  new TextRun({
                    text: tandaTangan.kepalaSekolah.nama,
                    font: mainFont,
                    size: 20,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              ...(headmasterNipTrim
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [
                        new TextRun({
                          text: `NIP. ${headmasterNipTrim}`,
                          font: mainFont,
                          size: 19,
                        }),
                      ],
                    }),
                  ]
                : []),
            ],
          }),
          new TableCell({
            width: { size: 5103, type: WidthType.DXA },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: dateLineText,
                    font: mainFont,
                    size: 20,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 440 }, // Space for signature
                children: [new TextRun({ text: 'Guru Mata Pelajaran', font: mainFont, size: 20, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: teacherNipTrim ? 20 : 0 },
                children: [
                  new TextRun({
                    text: tandaTangan.guru.nama,
                    font: mainFont,
                    size: 20,
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              ...(teacherNipTrim
                ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 0, after: 0 },
                      children: [
                        new TextRun({
                          text: `NIP. ${teacherNipTrim}`,
                          font: mainFont,
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

  const section3Children = [
    new Paragraph({
      spacing: { before: 80, after: 20 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 2 },
      },
      children: [],
    }),
    ttdTable,
  ];

  // Construct Document with 3 clean sections
  return new Document({
    numbering: {
      config: [
        {
          reference: 'petunjuk-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 360, hanging: 240 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      // SECTION 1: 1 Column (Kop, Judul, Identitas, Petunjuk)
      {
        properties: {
          page: commonPageSetup,
        },
        footers: opsional?.nomorHalaman !== false ? { default: docFooter } : undefined,
        children: section1Children,
      },
      // SECTION 2: 2 Columns or 1 Column (Continuous)
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: commonPageSetup,
          column: {
            count: numCols,
            space: colSpaceDxa,
            equalWidth: true,
            separate: tataLetak.garisPemisahKolom,
          },
        },
        footers: opsional?.nomorHalaman !== false ? { default: docFooter } : undefined,
        children: section2Children,
      },
      // SECTION 3: 1 Column (Continuous, Tanda Tangan)
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: commonPageSetup,
        },
        footers: opsional?.nomorHalaman !== false ? { default: docFooter } : undefined,
        children: section3Children,
      },
    ],
  });
}

// Helper: Render multi-line question text cleanly (preserves \n / \n\n in OOXML)
function appendMultilineQuestionParagraphs(
  target: (Paragraph | Table)[],
  qNum: number,
  rawText: string,
  opts: {
    mainFont: string;
    size: number;
    hasFollowingContent: boolean;
    afterSpacing: number;
  }
) {
  const { mainFont, size, hasFollowingContent, afterSpacing } = opts;
  const normalized = (rawText || '').replace(/\r\n/g, '\n');
  const lines = normalized.split(/\n+/).filter((line, idx) => idx === 0 || line.trim().length > 0);
  if (lines.length === 0) lines.push('');

  lines.forEach((line, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === lines.length - 1;
    const trimmed = line.trim();
    const isSubListLine = !isFirst && /^([a-z]\.|[0-9]+\.|-|\*)\s+/i.test(trimmed);

    target.push(
      new Paragraph({
        tabStops: isFirst ? [{ type: TabStopType.LEFT, position: 400 }] : undefined,
        indent: isFirst
          ? { left: 400, hanging: 400 }
          : isSubListLine
          ? { left: 600, hanging: 200 }
          : { left: 400 },
        spacing: {
          before: isFirst ? 60 : 20,
          after: isLast ? afterSpacing : 24,
          line: 230,
        },
        alignment: AlignmentType.JUSTIFIED,
        keepNext: !isLast || hasFollowingContent,
        keepLines: true,
        children: isFirst
          ? [
              new TextRun({
                text: `${qNum}.\t`,
                font: mainFont,
                size,
                bold: true,
              }),
              new TextRun({
                text: line,
                font: mainFont,
                size,
              }),
            ]
          : [
              new TextRun({
                text: trimmed,
                font: mainFont,
                size,
              }),
            ],
      })
    );
  });
}

// Helper: Render Wacana block with shading F1F5F9 and thick left border
function renderWacana(wacana: string[] | undefined, target: (Paragraph | Table)[], font: string) {
  if (!Array.isArray(wacana) || wacana.length === 0) return;

  wacana.forEach((par) => {
    const subPars = (par || '').replace(/\r\n/g, '\n').split(/\n+/).filter((s) => s.trim().length > 0);
    subPars.forEach((subPar) => {
      target.push(
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: '475569', space: 8 },
          },
          spacing: { before: 40, after: 40, line: 230 },
          indent: { left: 160, right: 160 },
          alignment: AlignmentType.JUSTIFIED,
          keepNext: true,
          keepLines: true,
          children: [
            new TextRun({
              text: subPar,
              font,
              size: 19, // 9.5 pt
              italics: true,
            }),
          ],
        })
      );
    });
  });
}

function createIdentityLabelCell(text: string, widthDxa: number, font: string): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            font,
            size: 19, // 9.5 pt
            bold: true,
          }),
        ],
      }),
    ],
  });
}

function createIdentityValueCell(text: string, widthDxa: number, font: string): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            font,
            size: 19,
          }),
        ],
      }),
    ],
  });
}
