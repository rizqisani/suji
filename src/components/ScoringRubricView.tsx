import React from 'react';
import { ExamPackage } from '../types/exam';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentKopHeader } from './DocumentKopHeader';

interface ScoringRubricViewProps {
  exam: ExamPackage;
}

export const ScoringRubricView: React.FC<ScoringRubricViewProps> = ({ exam }) => {
  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay, scoringGuidelines } =
    exam;

  const formatScoreRange = (scores: number[], fallback: number): string => {
    if (scores.length === 0) return String(fallback);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    return min === max ? String(min) : `${min} - ${max}`;
  };

  // Calculate total scores accurately using ?? so 0 is respected
  const mcScores = multipleChoice.map((q) => q.score ?? 2);
  const cmcScores = complexMultipleChoice.map((q) => q.score ?? 3);
  const matchingScores = matching.map((q) => q.score ?? 4);
  const saScores = shortAnswer.map((q) => q.score ?? 2);
  const essayScores = essay.map((q) => q.score ?? 10);

  const mcTotalScore = mcScores.reduce((acc, s) => acc + s, 0);
  const cmcTotalScore = cmcScores.reduce((acc, s) => acc + s, 0);
  const matchingTotalScore = matchingScores.reduce((acc, s) => acc + s, 0);
  const saTotalScore = saScores.reduce((acc, s) => acc + s, 0);
  const essayTotalScore = essayScores.reduce((acc, s) => acc + s, 0);

  const grandTotalScore =
    mcTotalScore + cmcTotalScore + matchingTotalScore + saTotalScore + essayTotalScore;

  const activeRows: {
    label: string;
    count: number;
    perItem: string;
    total: number;
    weight: number;
  }[] = [];

  if (multipleChoice.length > 0) {
    activeRows.push({
      label: 'Pilihan Ganda (PG)',
      count: multipleChoice.length,
      perItem: formatScoreRange(mcScores, 2),
      total: mcTotalScore,
      weight: scoringGuidelines.mcWeight ?? 0,
    });
  }
  if (complexMultipleChoice.length > 0) {
    activeRows.push({
      label: 'Pilihan Ganda Kompleks',
      count: complexMultipleChoice.length,
      perItem: formatScoreRange(cmcScores, 3),
      total: cmcTotalScore,
      weight: scoringGuidelines.complexMcWeight ?? 0,
    });
  }
  if (matching.length > 0) {
    activeRows.push({
      label: 'Menjodohkan',
      count: matching.length,
      perItem: formatScoreRange(matchingScores, 4),
      total: matchingTotalScore,
      weight: scoringGuidelines.matchingWeight ?? 0,
    });
  }
  if (shortAnswer.length > 0) {
    activeRows.push({
      label: 'Isian Singkat',
      count: shortAnswer.length,
      perItem: formatScoreRange(saScores, 2),
      total: saTotalScore,
      weight: scoringGuidelines.shortAnswerWeight ?? 0,
    });
  }
  if (essay.length > 0) {
    activeRows.push({
      label: 'Uraian / Essay',
      count: essay.length,
      perItem: formatScoreRange(essayScores, 10),
      total: essayTotalScore,
      weight: scoringGuidelines.essayWeight ?? 0,
    });
  }

  const totalWeight = activeRows.reduce((acc, r) => acc + r.weight, 0);

  return (
    <div className="space-y-4">
      <DocumentToolbar
        title="Pedoman Penskoran & Rubrik Penilaian"
      />

      <div className="print-container bg-slate-200/70 p-2 sm:p-6 rounded-2xl flex justify-center">
        <div
          id="printable-rubric"
          className="bg-white text-black shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] rounded-sm font-serif border border-slate-300 print:border-none text-[10pt] leading-normal"
        >
          {/* Header Kop Resmi */}
          <DocumentKopHeader kopConfig={kopConfig} className="mb-4" />

          <div className="text-center my-3">
            <h2 className="text-[13pt] font-black uppercase tracking-wide">
              PEDOMAN PENSKORAN & RUBRIK PENILAIAN
            </h2>
            <div className="text-[10.5pt] font-bold uppercase">
              {examSummary.title} - TAHUN AJARAN {examSummary.academicYear}
            </div>
            <div className="text-[9.5pt] font-sans mt-0.5">
              Mata Pelajaran: <strong>{examSummary.subject}</strong> | Kelas: <strong>{examSummary.grade}</strong>
            </div>
          </div>

          {/* 1. TABEL DISTRIBUSI SKOR & BOBOT */}
          <div className="mb-6 break-inside-avoid">
            <h3 className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-2">
              I. Distribusi Skor Per Bentuk Soal
            </h3>
            <table className="w-full border-collapse border border-black text-[9.5pt]">
              <thead>
                <tr className="bg-slate-100 font-bold text-center">
                  <th className="border border-black p-1.5 w-12">No</th>
                  <th className="border border-black p-1.5 text-left">Bentuk Soal</th>
                  <th className="border border-black p-1.5 w-24">Jumlah Butir</th>
                  <th className="border border-black p-1.5 w-28">Skor Per Butir</th>
                  <th className="border border-black p-1.5 w-28">Total Skor</th>
                  <th className="border border-black p-1.5 w-24">Bobot (%)</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row, idx) => (
                  <tr key={row.label}>
                    <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-1.5">{row.label}</td>
                    <td className="border border-black p-1.5 text-center">{row.count}</td>
                    <td className="border border-black p-1.5 text-center">{row.perItem}</td>
                    <td className="border border-black p-1.5 text-center font-bold">{row.total}</td>
                    <td className="border border-black p-1.5 text-center">{row.weight}%</td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="border border-black p-2 text-right">
                    TOTAL SKOR MAKSIMAL KESELURUHAN:
                  </td>
                  <td className="border border-black p-2 text-center text-base">{grandTotalScore}</td>
                  <td className="border border-black p-2 text-center">{totalWeight}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. FORMULA PERHITUNGAN NILAI AKHIR */}
          <div className="mb-6 p-3 border border-black bg-slate-50/70 break-inside-avoid">
            <h3 className="font-bold text-[10pt] uppercase mb-1">
              II. Rumus Formula Perhitungan Nilai Akhir (Skala 0 - 100):
            </h3>
            <div className="text-center py-2 px-3 text-[10.5pt] font-mono font-bold bg-white border border-slate-300 rounded-sm whitespace-pre-line">
              {scoringGuidelines.formula?.trim() ||
                `Nilai Akhir (NA) = ( Total Skor Perolehan Siswa / ${grandTotalScore} ) × 100`}
            </div>
            {scoringGuidelines.complexMcPartialCredit?.trim() && (
              <div className="mt-2 p-2 bg-white border border-slate-300 rounded-sm text-[9pt]">
                <span className="font-bold block text-slate-800 mb-0.5">
                  Ketentuan Penskoran Pilihan Ganda Kompleks:
                </span>
                <div className="whitespace-pre-line text-slate-700">
                  {scoringGuidelines.complexMcPartialCredit}
                </div>
              </div>
            )}
            <p className="text-[9pt] text-slate-600 mt-1.5 italic">
              *Catatan: Pembulatan nilai akhir dilakukan dengan aturan standar akademik (contoh: ≥ 0,5 dibulatkan ke atas).
            </p>
          </div>

          {/* 3. RUBRIK PENILAIAN URAIAN LENGKAP */}
          {essay.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-[10.5pt] uppercase border-b border-black pb-1 mb-3">
                III. Rubrik Penilaian Khusus Soal Uraian / Essay
              </h3>
              <div className="space-y-4">
                {essay.map((q) => (
                  <div key={q.id} className="border border-black p-3 rounded-sm break-inside-avoid text-[9.5pt]">
                    <div className="font-bold mb-1 whitespace-pre-line">
                      Butir Soal No. {q.number}: {q.question}
                    </div>
                    <div className="text-[9pt] text-slate-700 italic mb-2 whitespace-pre-line">
                      Kunci Target: {q.expectedAnswer}
                    </div>

                    <table className="w-full border-collapse border border-black mt-2">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center text-[9pt]">
                          <th className="border border-black p-1 text-left">Deskripsi Kriteria Pencapaian Jawaban Siswa</th>
                          <th className="border border-black p-1 w-20">Skor Poin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.scoringRubric.map((r, i) => (
                          <tr key={i}>
                            <td className="border border-black p-1 pl-2 whitespace-pre-line">{r.criteria}</td>
                            <td className="border border-black p-1 text-center font-bold">{r.points}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="border border-black p-1 pl-2 text-slate-500 italic">
                            Tidak menjawab sama sekali atau jawaban tidak berhubungan dengan materi
                          </td>
                          <td className="border border-black p-1 text-center font-bold text-slate-500">0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pengesahan */}
          <div className="mt-8 pt-4 border-t border-black break-inside-avoid">
            <div className="flex justify-between items-start text-center text-[10pt]">
              <div className="w-[45%]">
                <div>Mengetahui,</div>
                <div className="font-bold">Kepala Sekolah</div>
                <div className="h-14"></div>
                <div className="font-bold underline uppercase">{kopConfig.headmasterName || '........................................'}</div>
                {kopConfig.headmasterNip?.trim() && <div>NIP. {kopConfig.headmasterNip}</div>}
              </div>

              <div className="w-[45%]">
                <div>{kopConfig.cityDate?.trim() || '........................, ..............................'}</div>
                <div className="font-bold">Guru Pengampu Mata Pelajaran</div>
                <div className="h-14"></div>
                <div className="font-bold underline uppercase">{kopConfig.teacherName || '........................................'}</div>
                {kopConfig.teacherNip?.trim() && <div>NIP. {kopConfig.teacherNip}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
