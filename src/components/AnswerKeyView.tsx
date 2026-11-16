import React, { useState } from 'react';
import { ExamPackage } from '../types/exam';
import { DocumentKopHeader } from './DocumentKopHeader';
import { KeyRound, Upload, Download } from 'lucide-react';
import { DocumentToolbar } from './DocumentToolbar';
import { AnswerKeyImportModal } from './AnswerKeyImportModal';
import { buildAnswerKeyJsonPayload } from '../utils/answerKeyImporter';
import {
  getCmcCorrectList,
  getMcVariantBadgeLabel,
  resolveStatementLabels,
} from '../utils/questionHelpers';

interface AnswerKeyViewProps {
  exam: ExamPackage;
  onUpdateExam?: (updated: ExamPackage) => void;
  onNotify?: (msg: string) => void;
}

export const AnswerKeyView: React.FC<AnswerKeyViewProps> = ({
  exam,
  onUpdateExam,
  onNotify,
}) => {
  const [isImportKeyModalOpen, setIsImportKeyModalOpen] = useState(false);
  const { kopConfig, examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } =
    exam;

  const sectionLetters = ['A', 'B', 'C', 'D', 'E'];
  let secIdx = 0;
  const mcSec = multipleChoice.length > 0 ? sectionLetters[secIdx++] : '';
  const cmcSec = complexMultipleChoice.length > 0 ? sectionLetters[secIdx++] : '';
  const matchingSec = matching.length > 0 ? sectionLetters[secIdx++] : '';
  const saSec = shortAnswer.length > 0 ? sectionLetters[secIdx++] : '';
  const essaySec = essay.length > 0 ? sectionLetters[secIdx++] : '';

  const handleExportAnswerKeyJson = () => {
    const payload = buildAnswerKeyJsonPayload(exam);
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const safeSubj = (examSummary.subject || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `Kunci_Pembahasan_${examSummary.examType}_${safeSubj}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    onNotify?.('File JSON Kunci Jawaban & Pembahasan berhasil diunduh.');
  };

  return (
    <div className="space-y-4">
      <DocumentToolbar
        title="Kunci Jawaban & Pembahasan Lengkap"
      />

      {/* Bar Impor & Ekspor JSON Kunci Jawaban */}
      <div className="no-print bg-indigo-50/70 border border-indigo-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-indigo-950">
          <KeyRound className="w-4 h-4 text-indigo-700 shrink-0" />
          <span>
            <strong>Sinkronisasi JSON Kunci &amp; Pembahasan:</strong> Impor file JSON untuk mengisi/memperbarui kunci jawaban &amp; pembahasan pada naskah ini.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportAnswerKeyJson}
            className="px-3 py-1.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-900 font-bold flex items-center space-x-1.5 shadow-2xs transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-indigo-700" />
            <span>Ekspor JSON Kunci</span>
          </button>
          {onUpdateExam && (
            <button
              type="button"
              onClick={() => setIsImportKeyModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold flex items-center space-x-1.5 shadow-xs transition active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" />
              <span>Impor JSON Kunci &amp; Pembahasan</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable A4 Container */}
      <div className="print-container bg-slate-200/70 p-2 sm:p-6 rounded-2xl flex justify-center">
        <div
          id="printable-answer-key"
          className="bg-white text-black shadow-xl print:shadow-none w-full max-w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] rounded-sm font-serif border border-slate-300 print:border-none text-[10.5pt] leading-normal"
        >
          {/* Header Kop Surat Resmi */}
          <DocumentKopHeader kopConfig={kopConfig} className="mb-4" />

          <div className="text-center my-3">
            <h2 className="text-[13pt] font-black uppercase tracking-wide">
              KUNCI JAWABAN & PEDOMAN PEMBAHASAN
            </h2>
            <div className="text-[11pt] font-bold uppercase">
              {examSummary.title} - TAHUN AJARAN {examSummary.academicYear}
            </div>
            <div className="text-[10pt] mt-1 font-sans">
              Mata Pelajaran: <strong>{examSummary.subject}</strong> | Kelas:{' '}
              <strong>{examSummary.grade}</strong>
            </div>
          </div>

          {/* Quick Grading Grid for Multiple Choice */}
          {multipleChoice.length > 0 && (
            <div className="mb-6 p-3 border border-black bg-slate-50/50 break-inside-avoid">
              <div className="text-[10.5pt] font-bold uppercase mb-2 flex items-center justify-between border-b border-black pb-1">
                <span>Format Cepat Kunci Pilihan Ganda (Koreksi Kilat):</span>
                <span className="text-[9pt] font-normal text-slate-600">Total: {multipleChoice.length} Soal</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 text-center text-[10pt]">
                {multipleChoice.map((q) => (
                  <div
                    key={q.id}
                    className="border border-black p-1.5 rounded-sm bg-white shadow-2xs"
                  >
                    <div className="text-[9pt] text-slate-500 font-sans border-b border-slate-200">
                      No. {q.number}
                    </div>
                    <div className="text-base font-black text-black mt-0.5">{q.correctAnswer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabel Detail Pembahasan Pilihan Ganda */}
          {multipleChoice.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-[11pt] uppercase border-b border-black pb-1 mb-2">
                {mcSec}. Pembahasan Pilihan Ganda
              </h3>
              <table className="w-full border-collapse border border-black text-[9.5pt]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-black p-1.5 w-10">No</th>
                    <th className="border border-black p-1.5 w-14">Kunci</th>
                    <th className="border border-black p-1.5 w-20">Level</th>
                    <th className="border border-black p-1.5 text-left">Pembahasan & Dasar Ilmiah</th>
                  </tr>
                </thead>
                <tbody>
                  {multipleChoice.map((q) => {
                    const variantLabel = q.variant && q.variant !== 'standard' ? getMcVariantBadgeLabel(q) : null;
                    return (
                      <tr key={q.id} className="break-inside-avoid">
                        <td className="border border-black p-1.5 text-center font-bold">{q.number}</td>
                        <td className="border border-black p-1.5 text-center font-extrabold text-[11pt]">
                          {q.correctAnswer}
                          {variantLabel && (
                            <div className="text-[7.5pt] font-normal font-sans text-slate-600 mt-0.5">
                              {variantLabel}
                            </div>
                          )}
                        </td>
                        <td className="border border-black p-1.5 text-center text-[8.5pt] font-sans">
                          {q.cognitiveLevel || 'L2'}
                        </td>
                        <td className="border border-black p-1.5 leading-relaxed text-justify whitespace-pre-line">
                          {q.explanation || 'Jawaban didasarkan pada konsep keilmuan yang baku.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Kunci PG Kompleks */}
          {complexMultipleChoice.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-[11pt] uppercase border-b border-black pb-1 mb-2">
                {cmcSec}. Kunci Pilihan Ganda Kompleks
              </h3>
              <div className="space-y-3">
                {complexMultipleChoice.map((q) => {
                  const hasOptions = q.options && q.options.length > 0;
                  const hasStatements = q.statements && q.statements.length > 0;
                  const correctList = getCmcCorrectList(q.correctAnswer);

                  return (
                    <div key={q.id} className="border border-black p-2.5 rounded-sm text-[9.5pt] break-inside-avoid">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="font-bold whitespace-pre-line">
                          Nomor {q.number}: {q.question}
                        </div>
                        {hasOptions && correctList.length > 0 && (
                          <span className="shrink-0 px-2 py-0.5 border border-black bg-slate-100 font-black text-[9.5pt]">
                            Kunci: {correctList.join(', ')}
                          </span>
                        )}
                      </div>

                      {hasOptions && (
                        <div className="pl-3 space-y-0.5 mb-1.5">
                          {q.options!.map((opt) => {
                            const isChecked = correctList.includes(opt.key.trim().toUpperCase());
                            return (
                              <div key={opt.key} className={isChecked ? 'font-bold text-black' : 'text-slate-600'}>
                                [{isChecked ? '✓' : ' '}] {opt.key}. {opt.text}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {hasStatements && (
                        <ul className="list-disc pl-5 space-y-0.5">
                          {q.statements!.map((st, i) => {
                            const lbl = resolveStatementLabels(q);
                            return (
                              <li key={i}>
                                &quot;{st.statement}&quot; &rarr;{' '}
                                <span
                                  className={`font-black ${
                                    st.isCorrect ? 'text-black' : 'text-slate-800'
                                  }`}
                                >
                                  [{(st.isCorrect ? lbl.positive : lbl.negative).toUpperCase()}]
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {q.explanation && (
                        <div className="mt-1.5 text-[9pt] italic text-slate-700 whitespace-pre-line">
                          Pembahasan: {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kunci Menjodohkan */}
          {matching.length > 0 && (
            <div className="mb-6 break-inside-avoid">
              <h3 className="font-bold text-[11pt] uppercase border-b border-black pb-1 mb-2">
                {matchingSec}. Kunci Jawaban Menjodohkan
              </h3>
              <div className="space-y-3">
                {matching.map((q) => (
                  <div key={q.id} className="border border-black p-2.5 rounded-sm text-[9.5pt]">
                    <div className="font-bold mb-1 whitespace-pre-line">
                      Nomor {q.number}: {q.instruction}
                    </div>
                    <table className="w-full border-collapse border border-black mt-1">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center text-[9pt]">
                          <th className="border border-black p-1 text-left w-1/2">Premis (Kiri)</th>
                          <th className="border border-black p-1 text-left w-1/2">Pasangan Jawaban (Kanan)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.pairs.map((p, idx) => (
                          <tr key={idx}>
                            <td className="border border-black p-1 pl-2">{p.premise}</td>
                            <td className="border border-black p-1 pl-2 font-bold">{p.match}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kunci Isian Singkat */}
          {shortAnswer.length > 0 && (
            <div className="mb-6 break-inside-avoid">
              <h3 className="font-bold text-[11pt] uppercase border-b border-black pb-1 mb-2">
                {saSec}. Kunci Jawaban Isian Singkat
              </h3>
              <table className="w-full border-collapse border border-black text-[9.5pt]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-black p-1.5 w-12">No</th>
                    <th className="border border-black p-1.5 w-1/3 text-left">Kunci / Jawaban Baku</th>
                    <th className="border border-black p-1.5 text-left">Penjelasan Konsep</th>
                  </tr>
                </thead>
                <tbody>
                  {shortAnswer.map((q) => (
                    <tr key={q.id}>
                      <td className="border border-black p-1.5 text-center font-bold">{q.number}</td>
                      <td className="border border-black p-1.5">
                        <div className="font-bold">{q.expectedAnswer || q.correctAnswer}</div>
                        {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                          <div className="text-[8.5pt] italic text-slate-600 mt-0.5">
                            Variasi diterima: {q.acceptedAnswers.join(' / ')}
                          </div>
                        )}
                      </td>
                      <td className="border border-black p-1.5 whitespace-pre-line">{q.explanation || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Kunci Uraian / Essay */}
          {essay.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-[11pt] uppercase border-b border-black pb-1 mb-2">
                {essaySec}. Pembahasan & Alternatif Jawaban Uraian
              </h3>
              <div className="space-y-4">
                {essay.map((q) => (
                  <div key={q.id} className="border border-black p-3 rounded-sm text-[9.5pt] break-inside-avoid">
                    <div className="font-bold mb-1 whitespace-pre-line">
                      Soal Nomor {q.number}: {q.question}
                    </div>
                    <div className="mt-1.5 bg-slate-50 p-2 border border-slate-300">
                      <span className="font-bold block text-[9pt] uppercase text-slate-700">
                        Ekspektasi Jawaban Siswa:
                      </span>
                      <div className="whitespace-pre-line leading-relaxed text-justify mt-1">
                        {q.expectedAnswer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tanda Tangan */}
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

      {onUpdateExam && (
        <AnswerKeyImportModal
          isOpen={isImportKeyModalOpen}
          onClose={() => setIsImportKeyModalOpen(false)}
          exam={exam}
          onApplyUpdatedExam={(updated, msg) => {
            onUpdateExam(updated);
            onNotify?.(msg);
          }}
        />
      )}
    </div>
  );
};
