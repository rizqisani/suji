import {
  ExamPackage,
  MultipleChoiceQuestion,
  ComplexMultipleChoiceItem,
  MatchingQuestion,
  ShortAnswerQuestion,
  EssayQuestion,
} from '../types/exam';
import { getCmcCorrectList, resolveStatementLabels } from './questionHelpers';

export interface AnswerKeyJsonPayload {
  format: string;
  exportedAt: string;
  identitas: {
    judul: string;
    jenisUjian: string;
    mataPelajaran: string;
    kelas: string;
    tahunAjaran: string;
  };
  kunciPilihanGanda?: {
    nomor: number;
    id?: string;
    kunci: string;
    levelKognitif?: string;
    pembahasan?: string;
  }[];
  kunciPilihanGandaKompleks?: {
    nomor: number;
    id?: string;
    tipe: string;
    kunci?: string[];
    pernyataan?: {
      indeks: number;
      teks: string;
      jawaban: boolean;
      label?: string;
    }[];
    pembahasan?: string;
  }[];
  kunciMenjodohkan?: {
    nomor: number;
    id?: string;
    pasangan: {
      premis: string;
      pasangan: string;
    }[];
    pembahasan?: string;
  }[];
  kunciIsianSingkat?: {
    nomor: number;
    id?: string;
    kunci: string;
    variasiDiterima?: string[];
    pembahasan?: string;
  }[];
  kunciUraian?: {
    nomor: number;
    id?: string;
    ekspektasiJawaban: string;
    rubrik?: {
      kriteria: string;
      poin: number;
    }[];
  }[];
}

export interface AnswerKeyImportStats {
  mcUpdated: number;
  cmcUpdated: number;
  matchingUpdated: number;
  saUpdated: number;
  essayUpdated: number;
  totalUpdated: number;
  unmatchedNumbers: number[];
}

export interface AnswerKeyImportResult {
  success: boolean;
  updatedExam?: ExamPackage;
  stats?: AnswerKeyImportStats;
  message?: string;
  error?: string;
}

/**
 * Generates an Answer Key & Explanation JSON payload matching the exact layout
 * of AnswerKeyView ("Kunci Jawaban & Pedoman Pembahasan").
 */
export function buildAnswerKeyJsonPayload(exam: ExamPackage): AnswerKeyJsonPayload {
  const { examSummary, multipleChoice, complexMultipleChoice, matching, shortAnswer, essay } = exam;

  const payload: AnswerKeyJsonPayload = {
    format: 'SI-UJIAN-KUNCI-PEMBAHASAN-V1',
    exportedAt: new Date().toISOString(),
    identitas: {
      judul: examSummary.title,
      jenisUjian: examSummary.examType === 'SAS' ? 'PSAS' : examSummary.examType,
      mataPelajaran: examSummary.subject,
      kelas: examSummary.grade,
      tahunAjaran: examSummary.academicYear,
    },
  };

  if (multipleChoice.length > 0) {
    payload.kunciPilihanGanda = multipleChoice.map((q) => ({
      nomor: q.number,
      id: q.id,
      kunci: q.correctAnswer,
      levelKognitif: q.cognitiveLevel || 'L2',
      pembahasan: q.explanation || '',
    }));
  }

  if (complexMultipleChoice.length > 0) {
    payload.kunciPilihanGandaKompleks = complexMultipleChoice.map((q) => {
      const hasOptions = Boolean(q.options && q.options.length > 0);
      const hasStatements = Boolean(q.statements && q.statements.length > 0);
      const lbl = resolveStatementLabels(q);

      return {
        nomor: q.number,
        id: q.id,
        tipe: q.variant || (hasOptions ? 'multi_select' : 'benar_salah'),
        ...(hasOptions ? { kunci: getCmcCorrectList(q.correctAnswer) } : {}),
        ...(hasStatements
          ? {
              pernyataan: q.statements!.map((s, idx) => ({
                indeks: idx + 1,
                teks: s.statement,
                jawaban: s.isCorrect,
                label: (s.isCorrect ? lbl.positive : lbl.negative).toUpperCase(),
              })),
            }
          : {}),
        pembahasan: q.explanation || '',
      };
    });
  }

  if (matching.length > 0) {
    payload.kunciMenjodohkan = matching.map((q) => ({
      nomor: q.number,
      id: q.id,
      pasangan: q.pairs.map((p) => ({
        premis: p.premise,
        pasangan: p.match,
      })),
      ...(q.explanation ? { pembahasan: q.explanation } : {}),
    }));
  }

  if (shortAnswer.length > 0) {
    payload.kunciIsianSingkat = shortAnswer.map((q) => ({
      nomor: q.number,
      id: q.id,
      kunci: q.expectedAnswer || q.correctAnswer,
      ...(q.acceptedAnswers && q.acceptedAnswers.length > 0
        ? { variasiDiterima: q.acceptedAnswers }
        : {}),
      pembahasan: q.explanation || '',
    }));
  }

  if (essay.length > 0) {
    payload.kunciUraian = essay.map((q) => ({
      nomor: q.number,
      id: q.id,
      ekspektasiJawaban: q.expectedAnswer,
      rubrik: (q.scoringRubric || []).map((r) => ({
        kriteria: r.criteria,
        poin: r.points,
      })),
    }));
  }

  return payload;
}

function parseBoolFlexible(val: any): boolean | undefined {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (['true', '1', 'ya', 'yes', 'y', 'benar', 'b', 't', 'setuju', 's', 'fakta', 'f', '✓', '✔', 'v'].includes(s)) {
      return true;
    }
    if (['false', '0', 'tidak', 'no', 'n', 'salah', 'ts', 'tidak setuju', 'opini', 'o'].includes(s)) {
      return false;
    }
  }
  return undefined;
}

function parseNumberFlexible(val: any): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const match = val.trim().match(/^(?:no\.?\s*|nomor\s*)?(\d+)\.?$/i);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function normalizeMcKeyForQuestion(rawKey: any, q: MultipleChoiceQuestion): string | null {
  if (rawKey === undefined || rawKey === null) return null;
  if (typeof rawKey === 'boolean') {
    const pos = q.options.find((o) => /^(true|benar)$/i.test(o.text.trim()));
    const neg = q.options.find((o) => /^(false|salah)$/i.test(o.text.trim()));
    return rawKey ? pos?.key || 'A' : neg?.key || 'B';
  }
  const str = String(rawKey).trim();
  if (!str) return null;

  const upper = str.toUpperCase();
  if (q.options.some((o) => o.key.toUpperCase() === upper)) {
    return upper;
  }

  // Handle "A. Kloroplas"
  const prefixMatch = str.match(/^([A-Ha-h])[\.\)\:\-]\s*/);
  if (prefixMatch) {
    const pk = prefixMatch[1].toUpperCase();
    if (q.options.some((o) => o.key.toUpperCase() === pk)) return pk;
  }

  // Handle boolean words like "Benar"/"True"/"Salah"/"False"
  if (/^(true|benar|t|b)$/i.test(str)) {
    const opt = q.options.find((o) => /^(true|benar)/i.test(o.text.trim()));
    if (opt) return opt.key.toUpperCase();
  }
  if (/^(false|salah|f|s)$/i.test(str)) {
    const opt = q.options.find((o) => /^(false|salah)/i.test(o.text.trim()));
    if (opt) return opt.key.toUpperCase();
  }

  // Match exact option text
  const byText = q.options.find((o) => o.text.trim().toLowerCase() === str.toLowerCase());
  if (byText) return byText.key.toUpperCase();

  // Fallback uppercase single letter A-H
  if (/^[A-H]$/.test(upper)) return upper;

  return upper;
}

function normalizeCmcKeys(rawKey: any, q: ComplexMultipleChoiceItem): string[] | undefined {
  if (rawKey === undefined || rawKey === null) return undefined;
  const options = q.options || [];

  const resolveToken = (token: string): string | null => {
    const cleaned = token
      .trim()
      .replace(/^[\[\("']+/, '')
      .replace(/[\]\)"'\.\:]+$/, '')
      .trim();
    if (!cleaned) return null;
    const upper = cleaned.toUpperCase();

    if (options.length > 0) {
      const byKey = options.find((o) => o.key.toUpperCase() === upper);
      if (byKey) return byKey.key.toUpperCase();
      const prefix = cleaned.match(/^([A-Ha-h])[\.\)\:\-]\s+/);
      if (prefix && options.some((o) => o.key.toUpperCase() === prefix[1].toUpperCase())) {
        return prefix[1].toUpperCase();
      }
      const byText = options.find((o) => o.text.trim().toLowerCase() === cleaned.toLowerCase());
      if (byText) return byText.key.toUpperCase();
    }
    return /^[A-H]$/.test(upper) ? upper : upper;
  };

  if (Array.isArray(rawKey)) {
    const res = rawKey.map((item) => resolveToken(String(item))).filter((x): x is string => Boolean(x));
    return Array.from(new Set(res));
  }

  if (typeof rawKey === 'object') {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(rawKey)) {
      if (parseBoolFlexible(v) === true) {
        const resolved = resolveToken(k);
        if (resolved) keys.push(resolved);
      }
    }
    return keys.length > 0 ? Array.from(new Set(keys)) : undefined;
  }

  if (typeof rawKey === 'string') {
    let s = rawKey.trim();
    if (!s) return undefined;
    if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1).trim();
    const parts = s
      .replace(/\b(?:dan|and)\b/gi, ',')
      .replace(/[&+]/g, ',')
      .split(/[,;/|\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 1 && /^[A-Ha-h]{2,6}$/.test(parts[0])) {
      return Array.from(new Set(parts[0].toUpperCase().split('')));
    }
    const res = parts.map(resolveToken).filter((x): x is string => Boolean(x));
    return res.length > 0 ? Array.from(new Set(res)) : undefined;
  }

  return undefined;
}

function stripJsonWrapper(rawContent: string): string {
  let cleaned = rawContent.trim();
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

function patchMcQuestion(q: MultipleChoiceQuestion, entry: any): { updated: MultipleChoiceQuestion; changed: boolean } {
  if (entry === undefined || entry === null) return { updated: q, changed: false };
  const obj = typeof entry === 'object' && !Array.isArray(entry) ? entry : { kunci: entry };

  const rawKey = obj.kunci ?? obj.correctAnswer ?? obj.kunciJawaban ?? obj.jawaban ?? obj.answer;
  const nextKey = normalizeMcKeyForQuestion(rawKey, q);
  const rawLevel = obj.levelKognitif ?? obj.cognitiveLevel ?? obj.level;
  const rawExpl = obj.pembahasan ?? obj.explanation ?? obj.penjelasan ?? obj.dasarIlmiah;

  let changed = false;
  const next: MultipleChoiceQuestion = { ...q };

  if (nextKey !== null) {
    next.correctAnswer = nextKey;
    changed = true;
  }
  if (typeof rawLevel === 'string' && rawLevel.trim()) {
    next.cognitiveLevel = rawLevel.trim();
    changed = true;
  }
  if (typeof rawExpl === 'string' && rawExpl.trim()) {
    next.explanation = rawExpl.trim();
    changed = true;
  }

  return { updated: next, changed };
}

function patchCmcQuestion(q: ComplexMultipleChoiceItem, entry: any): { updated: ComplexMultipleChoiceItem; changed: boolean } {
  if (entry === undefined || entry === null) return { updated: q, changed: false };
  const obj = typeof entry === 'object' && !Array.isArray(entry) ? entry : { kunci: entry };

  let changed = false;
  const next: ComplexMultipleChoiceItem = { ...q };

  const rawKey = obj.kunci ?? obj.correctAnswer ?? obj.correctAnswers ?? obj.kunciJawaban ?? obj.jawabanBenar;
  const rawStatements = obj.pernyataan ?? obj.statements;
  const rawExpl = obj.pembahasan ?? obj.explanation ?? obj.penjelasan;
  const rawLevel = obj.levelKognitif ?? obj.cognitiveLevel ?? obj.level;

  if (Array.isArray(rawStatements) && q.statements && q.statements.length > 0) {
    const nextStatements = q.statements.map((st, idx) => {
      const matched =
        rawStatements.find((rs: any) => rs && typeof rs === 'object' && rs.indeks === idx + 1) ??
        rawStatements.find(
          (rs: any) =>
            rs &&
            typeof rs === 'object' &&
            (rs.teks || rs.statement || rs.pernyataan || '').toString().trim().toLowerCase() ===
              st.statement.trim().toLowerCase()
        ) ??
        rawStatements[idx];

      if (matched === undefined || matched === null) return st;

      const rawBool =
        typeof matched === 'object'
          ? matched.jawaban ?? matched.isCorrect ?? matched.correct ?? matched.benar ?? matched.label
          : matched;
      const parsed = parseBoolFlexible(rawBool);
      if (parsed !== undefined) {
        changed = true;
        return { ...st, isCorrect: parsed };
      }
      return st;
    });
    next.statements = nextStatements;
  } else if (rawKey !== undefined) {
    // Support boolean array applied to statement-based PGK if statements exist without options
    if (Array.isArray(rawKey) && q.statements && q.statements.length > 0 && (!q.options || q.options.length === 0)) {
      const nextStatements = q.statements.map((st, idx) => {
        const parsed = parseBoolFlexible(rawKey[idx]);
        if (parsed !== undefined) {
          changed = true;
          return { ...st, isCorrect: parsed };
        }
        return st;
      });
      next.statements = nextStatements;
    } else {
      const normalizedKeys = normalizeCmcKeys(rawKey, q);
      if (normalizedKeys && normalizedKeys.length > 0) {
        next.correctAnswer = normalizedKeys;
        changed = true;
      }
    }
  }

  if (typeof rawExpl === 'string' && rawExpl.trim()) {
    next.explanation = rawExpl.trim();
    changed = true;
  }
  if (typeof rawLevel === 'string' && rawLevel.trim()) {
    next.cognitiveLevel = rawLevel.trim();
    changed = true;
  }

  return { updated: next, changed };
}

function patchMatchingQuestion(q: MatchingQuestion, entry: any): { updated: MatchingQuestion; changed: boolean } {
  if (entry === undefined || entry === null || typeof entry !== 'object') return { updated: q, changed: false };

  let changed = false;
  const next: MatchingQuestion = { ...q };

  const rawPairs = entry.pasangan ?? entry.pairs;
  if (Array.isArray(rawPairs) && rawPairs.length > 0) {
    next.pairs = q.pairs.map((pair, idx) => {
      const matched =
        rawPairs.find(
          (rp: any) =>
            rp &&
            typeof rp === 'object' &&
            (rp.premis || rp.premise || rp.kiri || '').toString().trim().toLowerCase() ===
              pair.premise.trim().toLowerCase()
        ) ?? rawPairs[idx];

      if (!matched) return pair;
      if (typeof matched === 'string') {
        changed = true;
        return { ...pair, match: matched };
      }
      if (typeof matched === 'object') {
        const nextMatch = matched.pasangan ?? matched.match ?? matched.jawaban ?? matched.kanan;
        const nextPremise = matched.premis ?? matched.premise ?? matched.kiri;
        if (nextMatch !== undefined || nextPremise !== undefined) {
          changed = true;
          return {
            premise: nextPremise !== undefined ? String(nextPremise) : pair.premise,
            match: nextMatch !== undefined ? String(nextMatch) : pair.match,
          };
        }
      }
      return pair;
    });
  }

  const rawExpl = entry.pembahasan ?? entry.explanation ?? entry.penjelasan;
  if (typeof rawExpl === 'string' && rawExpl.trim()) {
    next.explanation = rawExpl.trim();
    changed = true;
  }

  return { updated: next, changed };
}

function patchShortAnswerQuestion(q: ShortAnswerQuestion, entry: any): { updated: ShortAnswerQuestion; changed: boolean } {
  if (entry === undefined || entry === null) return { updated: q, changed: false };
  const obj = typeof entry === 'object' && !Array.isArray(entry) ? entry : { kunci: entry };

  let changed = false;
  const next: ShortAnswerQuestion = { ...q };

  const rawKey = obj.kunci ?? obj.correctAnswer ?? obj.expectedAnswer ?? obj.jawaban;
  if (rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '') {
    const val = String(rawKey).trim();
    next.correctAnswer = val;
    next.expectedAnswer = val;
    changed = true;
  }

  const rawAccepted = obj.variasiDiterima ?? obj.acceptedAnswers ?? obj.variasi;
  if (Array.isArray(rawAccepted)) {
    next.acceptedAnswers = rawAccepted.map((a) => String(a).trim()).filter(Boolean);
    changed = true;
  } else if (typeof rawAccepted === 'string' && rawAccepted.trim()) {
    next.acceptedAnswers = rawAccepted
      .split(/[\/,;]+/)
      .map((a) => a.trim())
      .filter(Boolean);
    changed = true;
  }

  const rawExpl = obj.pembahasan ?? obj.explanation ?? obj.penjelasan ?? obj.penjelasanKonsep;
  if (typeof rawExpl === 'string' && rawExpl.trim()) {
    next.explanation = rawExpl.trim();
    changed = true;
  }

  return { updated: next, changed };
}

function patchEssayQuestion(q: EssayQuestion, entry: any): { updated: EssayQuestion; changed: boolean } {
  if (entry === undefined || entry === null) return { updated: q, changed: false };
  const obj = typeof entry === 'object' && !Array.isArray(entry) ? entry : { ekspektasiJawaban: entry };

  let changed = false;
  const next: EssayQuestion = { ...q };

  const rawExpected =
    obj.ekspektasiJawaban ?? obj.expectedAnswer ?? obj.kunci ?? obj.jawaban ?? obj.pembahasan ?? obj.explanation;
  if (typeof rawExpected === 'string' && rawExpected.trim()) {
    next.expectedAnswer = rawExpected.trim();
    changed = true;
  }

  const rawRubric = obj.rubrik ?? obj.scoringRubric;
  if (Array.isArray(rawRubric) && rawRubric.length > 0) {
    next.scoringRubric = rawRubric
      .map((r: any) => ({
        criteria: String(r.kriteria ?? r.criteria ?? '').trim(),
        points: Number(r.poin ?? r.points ?? r.skor ?? 2),
      }))
      .filter((r) => r.criteria.length > 0);
    changed = true;
  }

  return { updated: next, changed };
}

/**
 * Parses an Answer Key & Explanation JSON file and merges matching keys/explanations
 * into the active ExamPackage.
 */
export function applyAnswerKeyJsonToExam(exam: ExamPackage, rawContent: string): AnswerKeyImportResult {
  if (!rawContent || !rawContent.trim()) {
    return { success: false, error: 'Berkas atau teks JSON kunci jawaban kosong.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(stripJsonWrapper(rawContent));
  } catch (err: any) {
    return {
      success: false,
      error: `Sintaks JSON tidak valid: ${err?.message || 'Periksa koma atau tanda kutip pada JSON.'}`,
    };
  }

  // Unwrap array wrapper [ { ... } ] if it holds an object (unless it is a flat array of question entries)
  let root: any = parsed;
  if (Array.isArray(parsed)) {
    if (
      parsed.length === 1 &&
      parsed[0] &&
      typeof parsed[0] === 'object' &&
      (parsed[0].kunciPilihanGanda ||
        parsed[0].multipleChoice ||
        parsed[0].kunciUraian ||
        parsed[0].essay ||
        parsed[0].kunciJawaban)
    ) {
      root = parsed[0];
    } else {
      root = { flatItems: parsed };
    }
  } else if (root && typeof root === 'object') {
    if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) root = root.data;
    else if (root.kunciJawaban && typeof root.kunciJawaban === 'object' && !Array.isArray(root.kunciJawaban)) {
      root = root.kunciJawaban;
    } else if (root.answerKey && typeof root.answerKey === 'object' && !Array.isArray(root.answerKey)) {
      root = root.answerKey;
    }
  } else {
    return { success: false, error: 'Struktur JSON tidak dikenali.' };
  }

  const mcList = [...exam.multipleChoice];
  const cmcList = [...exam.complexMultipleChoice];
  const matchingList = [...exam.matching];
  const saList = [...exam.shortAnswer];
  const essayList = [...exam.essay];

  const stats: AnswerKeyImportStats = {
    mcUpdated: 0,
    cmcUpdated: 0,
    matchingUpdated: 0,
    saUpdated: 0,
    essayUpdated: 0,
    totalUpdated: 0,
    unmatchedNumbers: [],
  };

  // Track numbers from exam so we know unmatched ones
  const findSectionByNumber = (num: number) => {
    const mcIdx = mcList.findIndex((q) => q.number === num);
    if (mcIdx !== -1) return { section: 'mc' as const, index: mcIdx };
    const cmcIdx = cmcList.findIndex((q) => q.number === num);
    if (cmcIdx !== -1) return { section: 'cmc' as const, index: cmcIdx };
    const mIdx = matchingList.findIndex((q) => q.number === num);
    if (mIdx !== -1) return { section: 'matching' as const, index: mIdx };
    const saIdx = saList.findIndex((q) => q.number === num);
    if (saIdx !== -1) return { section: 'sa' as const, index: saIdx };
    const esIdx = essayList.findIndex((q) => q.number === num);
    if (esIdx !== -1) return { section: 'essay' as const, index: esIdx };
    return null;
  };

  const applySectionArray = <T extends { id: string; number: number }>(
    rawArr: any,
    targetList: T[],
    patchFn: (q: T, entry: any) => { updated: T; changed: boolean },
    onChanged: () => void
  ) => {
    if (!Array.isArray(rawArr)) return;
    rawArr.forEach((entry: any, idx: number) => {
      if (!entry || typeof entry !== 'object') return;
      const entryNum = parseNumberFlexible(entry.nomor ?? entry.number ?? entry.no);
      const entryId = typeof entry.id === 'string' ? entry.id : null;

      let targetIdx = -1;
      if (entryId) targetIdx = targetList.findIndex((q) => q.id === entryId);
      if (targetIdx === -1 && entryNum !== null) targetIdx = targetList.findIndex((q) => q.number === entryNum);
      if (targetIdx === -1 && entryNum === null && !entryId && idx < targetList.length) {
        targetIdx = idx;
      }

      if (targetIdx === -1) {
        if (entryNum !== null) stats.unmatchedNumbers.push(entryNum);
        return;
      }

      const { updated, changed } = patchFn(targetList[targetIdx], entry);
      if (changed) {
        targetList[targetIdx] = updated;
        onChanged();
      }
    });
  };

  // Case 1: Sectioned JSON (SI-UJIAN-KUNCI-PEMBAHASAN-V1 or ExamPackage sections)
  const rawMc = root.kunciPilihanGanda ?? root.multipleChoice ?? root.pilihanGanda ?? root.mc;
  const rawCmc =
    root.kunciPilihanGandaKompleks ??
    root.complexMultipleChoice ??
    root.pilihanGandaKompleks ??
    root.pgk;
  const rawMatch = root.kunciMenjodohkan ?? root.matching ?? root.menjodohkan;
  const rawSa = root.kunciIsianSingkat ?? root.shortAnswer ?? root.isianSingkat ?? root.isian;
  const rawEssay = root.kunciUraian ?? root.essay ?? root.uraian;

  const hasSectionedData = Boolean(rawMc || rawCmc || rawMatch || rawSa || rawEssay);

  if (hasSectionedData) {
    applySectionArray(rawMc, mcList, patchMcQuestion, () => {
      stats.mcUpdated++;
    });
    applySectionArray(rawCmc, cmcList, patchCmcQuestion, () => {
      stats.cmcUpdated++;
    });
    applySectionArray(rawMatch, matchingList, patchMatchingQuestion, () => {
      stats.matchingUpdated++;
    });
    applySectionArray(rawSa, saList, patchShortAnswerQuestion, () => {
      stats.saUpdated++;
    });
    applySectionArray(rawEssay, essayList, patchEssayQuestion, () => {
      stats.essayUpdated++;
    });
  } else {
    // Case 2: Flat array under root.flatItems / root.kunciJawaban / root.answers / root.items / root.pembahasan
    const flatArr =
      root.flatItems ??
      (Array.isArray(root.kunciJawaban) ? root.kunciJawaban : null) ??
      (Array.isArray(root.answers) ? root.answers : null) ??
      (Array.isArray(root.items) ? root.items : null) ??
      (Array.isArray(root.kunci) ? root.kunci : null);

    if (Array.isArray(flatArr)) {
      flatArr.forEach((entry: any, idx: number) => {
        if (entry === null || entry === undefined) return;
        const num =
          typeof entry === 'object'
            ? parseNumberFlexible(entry.nomor ?? entry.number ?? entry.no) ?? idx + 1
            : idx + 1;

        const target = findSectionByNumber(num);
        if (!target) {
          stats.unmatchedNumbers.push(num);
          return;
        }

        if (target.section === 'mc') {
          const { updated, changed } = patchMcQuestion(mcList[target.index], entry);
          if (changed) {
            mcList[target.index] = updated;
            stats.mcUpdated++;
          }
        } else if (target.section === 'cmc') {
          const { updated, changed } = patchCmcQuestion(cmcList[target.index], entry);
          if (changed) {
            cmcList[target.index] = updated;
            stats.cmcUpdated++;
          }
        } else if (target.section === 'matching') {
          const { updated, changed } = patchMatchingQuestion(matchingList[target.index], entry);
          if (changed) {
            matchingList[target.index] = updated;
            stats.matchingUpdated++;
          }
        } else if (target.section === 'sa') {
          const { updated, changed } = patchShortAnswerQuestion(saList[target.index], entry);
          if (changed) {
            saList[target.index] = updated;
            stats.saUpdated++;
          }
        } else if (target.section === 'essay') {
          const { updated, changed } = patchEssayQuestion(essayList[target.index], entry);
          if (changed) {
            essayList[target.index] = updated;
            stats.essayUpdated++;
          }
        }
      });
    } else if (root && typeof root === 'object') {
      // Case 3: Number-keyed map: { "1": "A", "2": { kunci: "B", pembahasan: "..." } }
      for (const [key, val] of Object.entries(root)) {
        const num = parseNumberFlexible(key);
        if (num === null) continue;
        const target = findSectionByNumber(num);
        if (!target) {
          stats.unmatchedNumbers.push(num);
          continue;
        }

        if (target.section === 'mc') {
          const { updated, changed } = patchMcQuestion(mcList[target.index], val);
          if (changed) {
            mcList[target.index] = updated;
            stats.mcUpdated++;
          }
        } else if (target.section === 'cmc') {
          const { updated, changed } = patchCmcQuestion(cmcList[target.index], val);
          if (changed) {
            cmcList[target.index] = updated;
            stats.cmcUpdated++;
          }
        } else if (target.section === 'matching') {
          const { updated, changed } = patchMatchingQuestion(matchingList[target.index], val);
          if (changed) {
            matchingList[target.index] = updated;
            stats.matchingUpdated++;
          }
        } else if (target.section === 'sa') {
          const { updated, changed } = patchShortAnswerQuestion(saList[target.index], val);
          if (changed) {
            saList[target.index] = updated;
            stats.saUpdated++;
          }
        } else if (target.section === 'essay') {
          const { updated, changed } = patchEssayQuestion(essayList[target.index], val);
          if (changed) {
            essayList[target.index] = updated;
            stats.essayUpdated++;
          }
        }
      }
    }
  }

  stats.totalUpdated =
    stats.mcUpdated + stats.cmcUpdated + stats.matchingUpdated + stats.saUpdated + stats.essayUpdated;

  if (stats.totalUpdated === 0) {
    return {
      success: false,
      stats,
      error:
        'Tidak ada kunci jawaban atau pembahasan yang cocok dengan nomor soal pada naskah aktif. Gunakan tombol "Unduh Template JSON" untuk melihat format dan nomor soal yang sesuai.',
    };
  }

  const parts: string[] = [];
  if (stats.mcUpdated > 0) parts.push(`${stats.mcUpdated} PG`);
  if (stats.cmcUpdated > 0) parts.push(`${stats.cmcUpdated} PG Kompleks`);
  if (stats.matchingUpdated > 0) parts.push(`${stats.matchingUpdated} Menjodohkan`);
  if (stats.saUpdated > 0) parts.push(`${stats.saUpdated} Isian Singkat`);
  if (stats.essayUpdated > 0) parts.push(`${stats.essayUpdated} Uraian`);

  const unmatchedNote =
    stats.unmatchedNumbers.length > 0
      ? ` (${stats.unmatchedNumbers.length} nomor tidak ditemukan di naskah aktif: ${stats.unmatchedNumbers.slice(0, 5).join(', ')}${stats.unmatchedNumbers.length > 5 ? '...' : ''})`
      : '';

  return {
    success: true,
    updatedExam: {
      ...exam,
      updatedAt: new Date().toISOString(),
      multipleChoice: mcList,
      complexMultipleChoice: cmcList,
      matching: matchingList,
      shortAnswer: saList,
      essay: essayList,
    },
    stats,
    message: `Berhasil mengimpor kunci jawaban & pembahasan untuk ${stats.totalUpdated} butir soal (${parts.join(', ')})${unmatchedNote}.`,
  };
}
