import React from 'react';
import { ExamPackage } from '../types/exam';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentKopHeader } from './DocumentKopHeader';
import { resolveStatementLabels } from '../utils/questionHelpers';

interface StudentAnswerSheetViewProps {
  exam: ExamPackage;
  onOpenPrintModal?: () => void;
}

export const StudentAnswerSheetView: React.FC<StudentAnswerSheetViewProps> = ({ exam, onOpenPrintModal }) => {
  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } = exam;

  // Dynamic section letters across active question types
  const sectionLetters = ['A', 'B', 'C', 'D', 'E'];
  let secIdx = 0;
  const mcSec = multipleChoice.length > 0 ? sectionLetters[secIdx++] : '';
  const cmcSec = complexMultipleChoice.length > 0 ? sectionLetters[secIdx++] : '';
  const matchingSec = matching.length > 0 ? sectionLetters[secIdx++] : '';
  const saSec = shortAnswer.length > 0 ? sectionLetters[secIdx++] : '';
  const essaySec = essay.length > 0 ? sectionLetters[secIdx++] : '';

  // Fallback options keys
  const defaultOptionKeys =
    examSummary.schoolLevel === 'SMA' || examSummary.schoolLevel === 'SMK' || examSummary.schoolLevel === 'MA'
      ? ['A', 'B', 'C', 'D', 'E']
      : ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-4">
      <DocumentToolbar
        title="Lembar Jawaban Siswa (LJS) Blanko 1 Lembar"
        elementId="printable-ljs"
        docFileName={`Lembar_Jawaban_Siswa_${examSummary.examType}_${examSummary.subject}`}
        docType="ljs"
        exam={exam}
        onOpenPrintModal={onOpenPrintModal}
      />

      <div className="print-container bg-slate-200/70 p-2 sm:p-6 rounded-2xl flex justify-center">
        <div
          id="printable-ljs"
          className="bg-white text-black shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] rounded-sm font-sans border border-slate-300 print:border-none text-[9.5pt] leading-tight"
        >
          {/* Header Kop Resmi */}
          <DocumentKopHeader kopConfig={kopConfig} compact className="mb-2" />
          <div className="text-center mb-3">
            <h2 className="text-[12.5pt] font-black uppercase tracking-wide">
              LEMBAR JAWABAN SISWA (LJS)
            </h2>
            <div className="text-[9pt] font-bold uppercase">
              {examSummary.title} - TAHUN AJARAN {examSummary.academicYear}
            </div>
          </div>

          {/* Student Identitas Table & Score Box */}
          <div className="flex gap-4 mb-4 border border-black p-3 rounded-xs">
            <table className="flex-1 border-collapse text-[9pt]">
              <tbody>
                <tr>
                  <td className="w-24 font-bold py-0.5">Nama Siswa</td>
                  <td>: ............................................................................................</td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Nomor Peserta</td>
                  <td>: ............................................................................................</td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Kelas / Ruang</td>
                  <td>: ............................................................................................</td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Mata Pelajaran</td>
                  <td>: <strong>{examSummary.subject}</strong></td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Hari, Tanggal</td>
                  <td>: ............................................................................................</td>
                </tr>
              </tbody>
            </table>

            {/* Score & Sign Box */}
            <div className="w-44 border border-black text-center text-[8.5pt]">
              <div className="grid grid-cols-2 border-b border-black font-bold bg-slate-100">
                <div className="p-1 border-r border-black">NILAI</div>
                <div className="p-1">PARAF GURU</div>
              </div>
              <div className="grid grid-cols-2 h-14">
                <div className="border-r border-black flex items-center justify-center font-bold text-lg"></div>
                <div className="flex items-center justify-center"></div>
              </div>
              <div className="border-t border-black p-1 text-[7.5pt] bg-slate-50">
                Tanda Tangan Siswa:
                <div className="h-6"></div>
              </div>
            </div>
          </div>

          <div className="text-[8pt] italic text-slate-600 mb-3 bg-slate-50 p-1.5 border border-slate-300">
            *Petunjuk: Berilah tanda silang (X) atau centang (✓) pada kotak/lingkaran pilihan jawaban yang paling benar, atau tuliskan jawaban singkat/uraian pada kolom yang tersedia.
          </div>

          {/* Multiple Choice Answers Grid */}
          {multipleChoice.length > 0 && (
            <div className="mb-4">
              <div className="font-bold text-[9.5pt] uppercase border-b border-black pb-0.5 mb-2">
                {mcSec}. LEMBAR JAWABAN PILIHAN GANDA
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[9pt]">
                {multipleChoice.map((q) => {
                  const keys =
                    q.options && q.options.length > 0
                      ? q.options.map((o) => o.key)
                      : defaultOptionKeys;
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between border-b border-slate-200 py-1"
                    >
                      <span className="font-bold w-6 text-right pr-1.5">{q.number}.</span>
                      <div className="flex space-x-1 font-mono">
                        {keys.map((k) => (
                          <span
                            key={k}
                            className="w-5 h-5 border border-black rounded-full flex items-center justify-center text-[8pt] font-bold"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Complex Multiple Choice Answers Grid */}
          {complexMultipleChoice.length > 0 && (
            <div className="mb-4">
              <div className="font-bold text-[9.5pt] uppercase border-b border-black pb-0.5 mb-2">
                {cmcSec}. LEMBAR JAWABAN PILIHAN GANDA KOMPLEKS
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 text-[9pt]">
                {complexMultipleChoice.map((q) => {
                  const hasOptions = !!(q.options && q.options.length > 0);
                  const hasStatements = !!(q.statements && q.statements.length > 0);
                  const stmtLabels = resolveStatementLabels(q);
                  const keys = hasOptions ? q.options!.map((o) => o.key) : [];
                  return (
                    <React.Fragment key={q.id}>
                      {hasOptions && (
                        <div className="flex items-center justify-between border-b border-slate-200 py-1">
                          <span className="font-bold w-6 text-right pr-1.5">{q.number}.</span>
                          <div className="flex space-x-1 font-mono">
                            {keys.map((k) => (
                              <span
                                key={k}
                                className="w-5 h-5 border border-black rounded-xs flex items-center justify-center text-[8pt] font-bold"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {hasStatements && (
                        <div className="col-span-2 flex items-center justify-between border-b border-slate-200 py-1 text-[8.5pt]">
                          <span className="font-bold w-7">{q.number}.</span>
                          <div className="flex flex-wrap gap-2 font-mono">
                            {q.statements!.map((_, idx) => (
                              <span key={idx} className="border border-slate-400 px-1 rounded-xs">
                                P{idx + 1}:[{stmtLabels.positiveCode}/{stmtLabels.negativeCode}]
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matching Answer Slots */}
          {matching.length > 0 && (
            <div className="mb-4 break-inside-avoid">
              <div className="font-bold text-[9.5pt] uppercase border-b border-black pb-0.5 mb-2">
                {matchingSec}. LEMBAR JAWABAN MENJODOHKAN
              </div>
              <div className="space-y-1.5 text-[9pt]">
                {matching.map((q) => (
                  <div key={q.id} className="flex items-center flex-wrap gap-3 border-b border-slate-200 py-1">
                    <span className="font-bold w-6">{q.number}.</span>
                    {q.pairs.map((_, idx) => (
                      <span key={idx} className="font-mono">
                        {String.fromCharCode(97 + idx)} &rarr; [ &nbsp;&nbsp;&nbsp; ]
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Short Answer Slots */}
          {shortAnswer.length > 0 && (
            <div className="mb-4 break-inside-avoid">
              <div className="font-bold text-[9.5pt] uppercase border-b border-black pb-0.5 mb-2">
                {saSec}. LEMBAR JAWABAN ISIAN SINGKAT
              </div>
              <div className="space-y-2">
                {shortAnswer.map((q) => (
                  <div key={q.id} className="flex items-center text-[9pt]">
                    <span className="font-bold w-6">{q.number}.</span>
                    <div className="flex-1 border-b border-black pb-1"></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Essay Answer Lined Box */}
          {essay.length > 0 && (
            <div className="mb-4 break-inside-avoid">
              <div className="font-bold text-[9.5pt] uppercase border-b border-black pb-0.5 mb-2">
                {essaySec}. LEMBAR JAWABAN URAIAN / ESSAY
              </div>
              <div className="space-y-4">
                {essay.map((q) => (
                  <div key={q.id} className="space-y-1">
                    <span className="font-bold text-[9pt]">Nomor {q.number}:</span>
                    <div className="border border-slate-400 p-2 min-h-24 rounded-xs">
                      <div className="border-b border-dashed border-slate-300 h-6"></div>
                      <div className="border-b border-dashed border-slate-300 h-6"></div>
                      <div className="border-b border-dashed border-slate-300 h-6"></div>
                      <div className="border-b border-dashed border-slate-300 h-6"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
