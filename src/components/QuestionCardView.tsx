import React from 'react';
import { ExamPackage } from '../types/exam';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentKopHeader } from './DocumentKopHeader';
import {
  getCmcCorrectList,
  getMcVariantBadgeLabel,
  getCmcVariantBadgeLabel,
  resolveStatementLabels,
} from '../utils/questionHelpers';

interface QuestionCardViewProps {
  exam: ExamPackage;
}

export const QuestionCardView: React.FC<QuestionCardViewProps> = ({ exam }) => {
  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } = exam;

  return (
    <div className="space-y-4">
      <DocumentToolbar
        title="Kartu Soal Ujian (Analisis Butir Soal Format Dinas)"
      />

      <div className="print-container bg-slate-200/70 p-2 sm:p-6 rounded-2xl flex justify-center">
        <div
          id="printable-question-cards"
          className="bg-white text-black shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] rounded-sm font-serif border border-slate-300 print:border-none text-[9.5pt] leading-normal"
        >
          {/* Header Kop Resmi */}
          <DocumentKopHeader kopConfig={kopConfig} className="mb-3" />
          <div className="text-center mb-4">
            <h2 className="text-[12pt] font-bold uppercase tracking-wide">
              KARTU SOAL UJIAN (ANALISIS BUTIR SOAL)
            </h2>
            <div className="text-[9.5pt]">{examSummary.title} - TAHUN AJARAN {examSummary.academicYear}</div>
          </div>

          <div className="space-y-6">
            {/* Kartu Soal PG */}
            {multipleChoice.map((q) => (
              <div key={q.id} className="border-2 border-black rounded-xs break-inside-avoid mb-4">
                <table className="w-full border-collapse border-b border-black text-[9pt]">
                  <tbody>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-black w-1/4">Satuan Pendidikan</td>
                      <td className="p-1.5 border-r border-black w-1/4">{kopConfig.schoolName}</td>
                      <td className="p-1.5 border-r border-black w-1/4">Penyusun</td>
                      <td className="p-1.5 w-1/4">{kopConfig.teacherName || '-'}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-black font-bold">Mata Pelajaran</td>
                      <td className="p-1.5 border-r border-black">{examSummary.subject}</td>
                      <td className="p-1.5 border-r border-black font-bold">Tahun Ajaran</td>
                      <td className="p-1.5">{examSummary.academicYear}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-black font-bold">Kelas / Fase</td>
                      <td className="p-1.5 border-r border-black">{examSummary.grade}</td>
                      <td className="p-1.5 border-r border-black font-bold">Bentuk Soal</td>
                      <td className="p-1.5 font-bold">{getMcVariantBadgeLabel(q)} (No. {q.number})</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-2 border-b border-black grid grid-cols-3 gap-2 text-[8.5pt]">
                  <div>
                    <span className="font-bold block">Level Kognitif:</span>
                    <span>{q.cognitiveLevel || 'L2 (Aplikasi)'}</span>
                  </div>
                  <div>
                    <span className="font-bold block">Kurikulum / Acuan:</span>
                    <span>{examSummary.curriculum}</span>
                  </div>
                  <div>
                    <span className="font-bold block">Kunci Jawaban:</span>
                    <span className="text-base font-black text-black">[{q.correctAnswer}]</span>
                  </div>
                </div>

                <div className="p-2 border-b border-black text-[8.5pt]">
                  <span className="font-bold block">Indikator Soal:</span>
                  <p>{q.indicator || 'Peserta didik dapat memilih respon yang benar berdasarkan konsep.'}</p>
                </div>

                <div className="p-3 bg-slate-50/40">
                  <span className="font-bold text-[9pt] block mb-1">Rumusan Butir Soal:</span>
                  {q.stimulus && (
                    <div className="italic text-[8.5pt] bg-slate-100 p-1.5 border-l-2 border-black mb-1.5 whitespace-pre-line">
                      {q.stimulus}
                    </div>
                  )}
                  <p className="font-medium text-justify whitespace-pre-line">{q.question}</p>
                  <div className="mt-2 space-y-0.5 pl-4 text-[9pt]">
                    {q.options.map((opt) => (
                      <div key={opt.key} className={opt.key === q.correctAnswer ? 'font-bold' : ''}>
                        {opt.key}. {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Kartu Soal PG Kompleks */}
            {complexMultipleChoice.map((q) => {
              const hasOptions = q.options && q.options.length > 0;
              const hasStatements = q.statements && q.statements.length > 0;
              const correctList = getCmcCorrectList(q.correctAnswer);
              const stmtLabels = resolveStatementLabels(q);
              const parts: string[] = [];
              if (hasOptions && correctList.length > 0) parts.push(`[${correctList.join(', ')}]`);
              if (hasStatements) {
                parts.push(
                  q.statements!
                    .map((s, idx) => `P${idx + 1}:${s.isCorrect ? stmtLabels.positiveCode : stmtLabels.negativeCode}`)
                    .join(', ')
                );
              }
              const keyLabel = parts.length > 0 ? parts.join(' | ') : '-';

              return (
                <div key={q.id} className="border-2 border-black rounded-xs break-inside-avoid mb-4">
                  <table className="w-full border-collapse border-b border-black text-[9pt]">
                    <tbody>
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-1.5 border-r border-black w-1/4">Satuan Pendidikan</td>
                        <td className="p-1.5 border-r border-black w-1/4">{kopConfig.schoolName}</td>
                        <td className="p-1.5 border-r border-black w-1/4">Penyusun</td>
                        <td className="p-1.5 w-1/4">{kopConfig.teacherName || '-'}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border-r border-black font-bold">Mata Pelajaran</td>
                        <td className="p-1.5 border-r border-black">{examSummary.subject}</td>
                        <td className="p-1.5 border-r border-black font-bold">Tahun Ajaran</td>
                        <td className="p-1.5">{examSummary.academicYear}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 border-r border-black font-bold">Kelas / Fase</td>
                        <td className="p-1.5 border-r border-black">{examSummary.grade}</td>
                        <td className="p-1.5 border-r border-black font-bold">Bentuk Soal</td>
                        <td className="p-1.5 font-bold">{getCmcVariantBadgeLabel(q)} (No. {q.number})</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="p-2 border-b border-black grid grid-cols-3 gap-2 text-[8.5pt]">
                    <div>
                      <span className="font-bold block">Level Kognitif:</span>
                      <span>{q.cognitiveLevel || 'L3 (Penalaran / HOTS)'}</span>
                    </div>
                    <div>
                      <span className="font-bold block">Skor Maksimal:</span>
                      <span>{q.score ?? 3} Poin</span>
                    </div>
                    <div>
                      <span className="font-bold block">Kunci Jawaban:</span>
                      <span className="font-black text-black">{keyLabel}</span>
                    </div>
                  </div>

                  <div className="p-2 border-b border-black text-[8.5pt]">
                    <span className="font-bold block">Indikator Soal:</span>
                    <p>{q.indicator || 'Peserta didik dapat menganalisis dan menentukan pilihan jawaban yang benar.'}</p>
                  </div>

                  <div className="p-3 bg-slate-50/40">
                    <span className="font-bold text-[9pt] block mb-1">Rumusan Butir Soal:</span>
                    {q.stimulus && (
                      <div className="italic text-[8.5pt] bg-slate-100 p-1.5 border-l-2 border-black mb-1.5 whitespace-pre-line">
                        {q.stimulus}
                      </div>
                    )}
                    <p className="font-medium text-justify whitespace-pre-line">{q.question}</p>
                    {hasOptions && (
                      <div className="mt-2 space-y-0.5 pl-4 text-[9pt]">
                        {q.options!.map((opt) => {
                          const isCorrect = correctList.includes(opt.key.trim().toUpperCase());
                          return (
                            <div key={opt.key} className={isCorrect ? 'font-bold' : ''}>
                              {opt.key}. {opt.text} {isCorrect ? '✓' : ''}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {hasStatements && (
                      <div className="mt-2 space-y-0.5 pl-4 text-[8.5pt]">
                        {q.statements!.map((st, idx) => (
                          <div key={idx}>
                            • {st.statement} —{' '}
                            <strong>[{(st.isCorrect ? stmtLabels.positive : stmtLabels.negative).toUpperCase()}]</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Kartu Soal Menjodohkan */}
            {matching.map((q) => (
              <div key={q.id} className="border-2 border-black rounded-xs break-inside-avoid mb-4">
                <table className="w-full border-collapse border-b border-black text-[9pt]">
                  <tbody>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-black w-1/4">Satuan Pendidikan</td>
                      <td className="p-1.5 border-r border-black w-1/4">{kopConfig.schoolName}</td>
                      <td className="p-1.5 border-r border-black w-1/4">Bentuk Soal</td>
                      <td className="p-1.5 w-1/4 font-bold">Menjodohkan (No. {q.number})</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-black font-bold">Mata Pelajaran</td>
                      <td className="p-1.5 border-r border-black">{examSummary.subject}</td>
                      <td className="p-1.5 border-r border-black font-bold">Level Kognitif</td>
                      <td className="p-1.5">{q.cognitiveLevel || 'L2 (Aplikasi)'}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-2 border-b border-black text-[8.5pt]">
                  <span className="font-bold block">Indikator Soal:</span>
                  <p>{q.indicator || 'Peserta didik dapat memasangkan premis dan respon dengan tepat.'}</p>
                </div>
                <div className="p-3">
                  <span className="font-bold text-[9pt] block mb-1">Rumusan Butir Soal:</span>
                  <p className="font-medium text-justify whitespace-pre-line">{q.instruction}</p>
                  <div className="mt-2 bg-slate-50 p-2 border border-slate-300 text-[8.5pt] space-y-0.5">
                    <span className="font-bold block">Kunci Pasangan:</span>
                    {q.pairs.map((p, idx) => (
                      <div key={idx}>• {p.premise} &rarr; <strong>{p.match}</strong></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Kartu Soal Isian Singkat */}
            {shortAnswer.map((q) => (
              <div key={q.id} className="border-2 border-black rounded-xs break-inside-avoid mb-4">
                <table className="w-full border-collapse border-b border-black text-[9pt]">
                  <tbody>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-black w-1/4">Satuan Pendidikan</td>
                      <td className="p-1.5 border-r border-black w-1/4">{kopConfig.schoolName}</td>
                      <td className="p-1.5 border-r border-black w-1/4">Bentuk Soal</td>
                      <td className="p-1.5 w-1/4 font-bold">Isian Singkat (No. {q.number})</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-black font-bold">Mata Pelajaran</td>
                      <td className="p-1.5 border-r border-black">{examSummary.subject}</td>
                      <td className="p-1.5 border-r border-black font-bold">Level Kognitif</td>
                      <td className="p-1.5">{q.cognitiveLevel || 'L1 (Pemahaman)'}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="p-2 border-b border-black text-[8.5pt]">
                  <span className="font-bold block">Indikator Soal:</span>
                  <p>{q.indicator || 'Peserta didik dapat melengkapi jawaban singkat dengan tepat.'}</p>
                </div>
                <div className="p-3">
                  <span className="font-bold text-[9pt] block mb-1">Rumusan Butir Soal:</span>
                  {q.stimulus && (
                    <div className="italic text-[8.5pt] bg-slate-100 p-1.5 border-l-2 border-black mb-1.5 whitespace-pre-line">
                      {q.stimulus}
                    </div>
                  )}
                  <p className="font-medium text-justify whitespace-pre-line">{q.question}</p>
                  <div className="mt-2 bg-slate-50 p-2 border border-slate-300 text-[8.5pt]">
                    <span className="font-bold block">Kunci Jawaban:</span>
                    <div className="font-bold text-slate-900">{q.expectedAnswer || q.correctAnswer}</div>
                    {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                      <div className="italic text-slate-600">Variasi diterima: {q.acceptedAnswers.join(' / ')}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Kartu Soal Essay */}
            {essay.map((q) => (
              <div key={q.id} className="border-2 border-black rounded-xs break-inside-avoid mb-4">
                <table className="w-full border-collapse border-b border-black text-[9pt]">
                  <tbody>
                    <tr className="bg-slate-100 font-bold">
                      <td className="p-1.5 border-r border-black w-1/4">Satuan Pendidikan</td>
                      <td className="p-1.5 border-r border-black w-1/4">{kopConfig.schoolName}</td>
                      <td className="p-1.5 border-r border-black w-1/4">Bentuk Soal</td>
                      <td className="p-1.5 w-1/4 font-bold">Uraian / Essay (No. {q.number})</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-black font-bold">Mata Pelajaran</td>
                      <td className="p-1.5 border-r border-black">{examSummary.subject}</td>
                      <td className="p-1.5 border-r border-black font-bold">Level Kognitif</td>
                      <td className="p-1.5">{q.cognitiveLevel || 'L3 (HOTS)'}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-2 border-b border-black text-[8.5pt]">
                  <span className="font-bold block">Indikator Soal:</span>
                  <p>{q.indicator || 'Peserta didik dapat menganalisis dan merumuskan jawaban mendalam.'}</p>
                </div>

                <div className="p-3">
                  <span className="font-bold text-[9pt] block mb-1">Rumusan Butir Soal:</span>
                  {q.stimulus && (
                    <div className="italic text-[8.5pt] bg-slate-100 p-1.5 border-l-2 border-black mb-1.5 whitespace-pre-line">
                      {q.stimulus}
                    </div>
                  )}
                  <p className="font-medium text-justify whitespace-pre-line">{q.question}</p>
                  <div className="mt-2 bg-slate-50 p-2 border border-slate-300 text-[8.5pt]">
                    <span className="font-bold block">Pedoman Kunci Jawaban:</span>
                    <p className="whitespace-pre-line text-slate-800">{q.expectedAnswer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
