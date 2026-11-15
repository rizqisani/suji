import {
  ExamPackage,
  SchoolKopConfig,
  MultipleChoiceQuestion,
  MultipleChoiceVariant,
  ComplexMultipleChoiceItem,
  ComplexMcVariant,
  StatementLabels,
  MatchingQuestion,
  ShortAnswerQuestion,
  EssayQuestion,
  ExamSummary,
  ScoringGuidelines,
} from '../types/exam';
import { DEFAULT_KOP_CONFIG, DEFAULT_GENERAL_INSTRUCTIONS } from '../data/curriculumData';
import { NaskahUjianData } from '../schema/naskahUjianSchema';

export interface ImportResult {
  success: boolean;
  exams: ExamPackage[];
  error?: string;
  message?: string;
}

interface ParsedOption {
  key: string;
  text: string;
  isChecked?: boolean;
  hasCheckboxSyntax: boolean;
}

function parseBooleanFlag(val: any): boolean | undefined {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (['true', '1', 'ya', 'yes', 'benar', 'b', 'y', 'v', 'x', '✓', '✔', 'checked', 'centang'].includes(s)) {
      return true;
    }
    if (['false', '0', 'tidak', 'no', 'salah', 's', 't', 'unchecked', ''].includes(s)) {
      return false;
    }
  }
  return undefined;
}

function parseOptionStringMarkers(raw: string): {
  extractedKey?: string;
  text: string;
  isChecked?: boolean;
  hasCheckboxSyntax: boolean;
} {
  let s = raw.trim();
  let isChecked: boolean | undefined = undefined;
  let hasCheckboxSyntax = false;
  let extractedKey: string | undefined = undefined;

  // Strip optional markdown bullet prefix (- or *) before checkbox/key
  if (/^[-*•]\s+(?:\[|\(|☐|☑|✅)/.test(s)) {
    s = s.replace(/^[-*•]\s+/, '').trim();
  }

  const consumeCheckboxPrefix = () => {
    // Pattern 1: [ ], [  ], [x], [X], [✓], [✔], [v], [V]
    const bracketMatch = s.match(/^\[\s*([xX✓✔vV]?)\s*\]\s*/);
    if (bracketMatch) {
      hasCheckboxSyntax = true;
      isChecked = bracketMatch[1].length > 0;
      s = s.slice(bracketMatch[0].length).trim();
      return true;
    }
    // Pattern 2: ( ), (x), (✓), (v)
    const parenMatch = s.match(/^\(\s*([xX✓✔vV]?)\s*\)\s*/);
    if (parenMatch) {
      hasCheckboxSyntax = true;
      isChecked = parenMatch[1].length > 0;
      s = s.slice(parenMatch[0].length).trim();
      return true;
    }
    // Pattern 3: Unicode checkboxes ☐ ☑ ✅
    const unicodeMatch = s.match(/^([☐☑✅])\s*/);
    if (unicodeMatch) {
      hasCheckboxSyntax = true;
      isChecked = unicodeMatch[1] !== '☐';
      s = s.slice(unicodeMatch[0].length).trim();
      return true;
    }
    return false;
  };

  // Try checkbox before key: "[ ] A. Jawaban"
  consumeCheckboxPrefix();

  // Try key prefix: "A. ...", "B) ...", "C: ...", "D - ..."
  const keyMatch = s.match(/^([A-Ha-h])[\.\)\:\-]\s*(.*)$/);
  if (keyMatch) {
    extractedKey = keyMatch[1].toUpperCase();
    s = keyMatch[2].trim();
  }

  // Try checkbox after key: "A. [ ] Jawaban" or "B) ☑ Jawaban"
  if (!hasCheckboxSyntax) {
    consumeCheckboxPrefix();
  }

  // Try trailing checkbox indicator: "Jawaban [✓]" or "Jawaban (✓)"
  if (!hasCheckboxSyntax) {
    const trailingChecked = s.match(/\s*(?:\[\s*([xX✓✔vV]?)\s*\]|([☐☑✅]))$/);
    if (trailingChecked) {
      hasCheckboxSyntax = true;
      isChecked = trailingChecked[1]
        ? trailingChecked[1].length > 0
        : trailingChecked[2]
        ? trailingChecked[2] !== '☐'
        : false;
      s = s.slice(0, s.length - trailingChecked[0].length).trim();
    }
  }

  return {
    extractedKey,
    text: s,
    isChecked,
    hasCheckboxSyntax,
  };
}

/**
 * Normalizes an option into { key, text, isChecked?, hasCheckboxSyntax }
 * stripping any embedded [ ] / [x] / [✓] / ☐ / ☑ checkbox markers cleanly.
 */
function parseOptionWithCheckbox(opt: any, index: number): ParsedOption {
  const defaultKey = String.fromCharCode(65 + index); // A, B, C, D, E...

  if (typeof opt === 'string') {
    const parsed = parseOptionStringMarkers(opt);
    return {
      key: parsed.extractedKey || defaultKey,
      text: parsed.text,
      isChecked: parsed.isChecked,
      hasCheckboxSyntax: parsed.hasCheckboxSyntax,
    };
  }

  if (opt && typeof opt === 'object') {
    const rawKeyCandidate =
      opt.key ??
      opt.label ??
      opt.huruf ??
      opt.kode ??
      (typeof opt.id === 'string' && /^[A-Ha-h]$/.test(opt.id.trim()) ? opt.id.trim() : undefined);

    const rawText = (
      opt.text ??
      opt.teks ??
      opt.jawaban ??
      opt.content ??
      opt.statement ??
      opt.pernyataan ??
      opt.pilihan ??
      opt.labelText ??
      opt.opsi ??
      ''
    ).toString();

    const parsed = parseOptionStringMarkers(rawText);

    const explicitFlag = parseBooleanFlag(
      opt.isCorrect ??
        opt.correct ??
        opt.checked ??
        opt.isChecked ??
        opt.selected ??
        opt.benar ??
        opt.centang ??
        opt.kunci
    );

    const hasCheckboxMeta =
      'checked' in opt ||
      'isChecked' in opt ||
      'centang' in opt ||
      'checkbox' in opt ||
      parsed.hasCheckboxSyntax;

    const cleanKey = rawKeyCandidate
      ? String(rawKeyCandidate)
          .trim()
          .toUpperCase()
          .replace(/[\.\)\:\-]+$/, '')
      : parsed.extractedKey || defaultKey;

    return {
      key: cleanKey || defaultKey,
      text: parsed.text,
      isChecked: explicitFlag !== undefined ? explicitFlag : parsed.isChecked,
      hasCheckboxSyntax: hasCheckboxMeta,
    };
  }

  return {
    key: defaultKey,
    text: String(opt || ''),
    hasCheckboxSyntax: false,
  };
}

function normalizeOption(opt: any, index: number) {
  const parsed = parseOptionWithCheckbox(opt, index);
  return { key: parsed.key, text: parsed.text };
}

function extractMaterialScope(q: any): string | undefined {
  const raw =
    q?.materialScope ??
    q?.lingkupMateri ??
    q?.materiPokok ??
    q?.materi ??
    q?.elemen ??
    q?.topik ??
    q?.topic ??
    q?.bab;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return undefined;
}

function getRawOptionsList(q: any): any[] | undefined {
  const candidate =
    q.options ??
    q.opsi ??
    q.pilihan ??
    q.choices ??
    q.checkboxes ??
    q.opsiCentang ??
    q.pilihanJawaban;
  if (Array.isArray(candidate) && candidate.length > 0) return candidate;

  // Some JSON schemas place option objects/strings under `answers` (when `correctAnswer` is separate)
  if (
    Array.isArray(q.answers) &&
    q.answers.length >= 2 &&
    (typeof q.answers[0] === 'object' || String(q.answers[0]).trim().length > 2)
  ) {
    return q.answers;
  }
  return undefined;
}

function isRawCheckboxVariantHint(hint: string): boolean {
  const h = hint.toLowerCase();
  return (
    h.includes('multi') ||
    h.includes('centang') ||
    h.includes('checkbox') ||
    h.includes('check_box') ||
    h.includes('kotak') ||
    h.includes('multiple_response') ||
    h.includes('mrq')
  );
}

/**
 * Normalizes multi-answer keys (e.g. ["A", "C"], "A, C", "A dan C", "[A, C]", "AC", [1, 3], { A: true, C: true })
 * for PG Kompleks.
 */
function normalizeComplexCorrectAnswer(
  rawKey: any,
  options?: { key: string; text: string }[]
): string[] | string | undefined {
  if (rawKey === undefined || rawKey === null) return undefined;

  const resolveTokenToKey = (token: string, zeroBasedNumeric = false): string | null => {
    const cleaned = token
      .trim()
      .replace(/^[\[\("']+/, '')
      .replace(/[\]\)"'\.\:]+$/, '')
      .trim();
    if (!cleaned) return null;

    const upper = cleaned.toUpperCase();

    if (options && options.length > 0) {
      // Exact key match
      const byKey = options.find((o) => o.key.toUpperCase() === upper);
      if (byKey) return byKey.key.toUpperCase();

      // Letter prefix in string token like "A. Perangkat keras"
      const prefixMatch = cleaned.match(/^([A-Ha-h])[\.\)\:\-]\s+/);
      if (prefixMatch) {
        const pk = prefixMatch[1].toUpperCase();
        if (options.some((o) => o.key.toUpperCase() === pk)) return pk;
      }

      // Numeric index (1-based or 0-based)
      if (/^\d+$/.test(cleaned)) {
        const idx = parseInt(cleaned, 10);
        const mapped = zeroBasedNumeric ? options[idx] : options[idx - 1];
        if (mapped) return mapped.key.toUpperCase();
      }

      // Exact text match against option text
      const byText = options.find((o) => o.text.trim().toLowerCase() === cleaned.toLowerCase());
      if (byText) return byText.key.toUpperCase();
    }

    return upper;
  };

  if (Array.isArray(rawKey)) {
    const hasZero = rawKey.some((k) => k === 0 || k === '0');
    const resolved = rawKey
      .map((k) => resolveTokenToKey(String(k), hasZero))
      .filter((k): k is string => Boolean(k));
    return Array.from(new Set(resolved));
  }

  if (typeof rawKey === 'object') {
    if (Array.isArray(rawKey.keys || rawKey.jawaban || rawKey.pilihan)) {
      return normalizeComplexCorrectAnswer(rawKey.keys || rawKey.jawaban || rawKey.pilihan, options);
    }
    const keys: string[] = [];
    for (const [k, v] of Object.entries(rawKey)) {
      const boolVal = parseBooleanFlag(v);
      if (boolVal === true) {
        const resolved = resolveTokenToKey(k);
        if (resolved) keys.push(resolved);
      }
    }
    return keys.length > 0 ? Array.from(new Set(keys)) : undefined;
  }

  if (typeof rawKey === 'string' && rawKey.trim()) {
    let trimmed = rawKey.trim();
    // Match exact full text of a single option if provided
    if (options) {
      const exactOpt = options.find((o) => o.text.trim().toLowerCase() === trimmed.toLowerCase());
      if (exactOpt) return [exactOpt.key.toUpperCase()];
    }

    // Remove surrounding brackets [A, C]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      trimmed = trimmed.slice(1, -1).trim();
    }

    // Replace conjunctions ("A dan C", "A & C", "A + C") with comma
    const normalizedDelimited = trimmed
      .replace(/\b(?:dan|and)\b/gi, ',')
      .replace(/[&+]/g, ',');

    const rawParts = normalizedDelimited
      .split(/[,;/|\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    // Handle compact keys like "AC" or "ABD"
    if (rawParts.length === 1 && /^[A-Ha-h]{2,6}$/.test(rawParts[0])) {
      const letters = rawParts[0].toUpperCase().split('');
      return Array.from(new Set(letters));
    }

    const hasZero = rawParts.some((p) => p === '0');
    const parts = rawParts
      .map((p) => resolveTokenToKey(p, hasZero))
      .filter((p): p is string => Boolean(p));

    return parts.length > 0 ? Array.from(new Set(parts)) : rawKey.trim().toUpperCase();
  }

  return undefined;
}

function normalizeStatementLabelsFromRaw(q: any, inferredVariant?: ComplexMcVariant): StatementLabels | undefined {
  const raw = q.statementLabels || q.labelPernyataan;
  if (raw && typeof raw === 'object') {
    const positive = (raw.positive || raw.positif || '').toString().trim();
    const negative = (raw.negative || raw.negatif || '').toString().trim();
    if (positive && negative) {
      return {
        positive,
        negative,
        positiveCode: (raw.positiveCode || raw.kodePositif || positive[0] || 'B').toString().toUpperCase(),
        negativeCode: (raw.negativeCode || raw.kodeNegatif || negative[0] || 'S').toString().toUpperCase(),
      };
    }
  }
  const typeHint = `${q.variant || q.varian || q.format || q.type || q.tipe || q.jenis || ''}`.toLowerCase();
  if (inferredVariant === 'true_false' || typeHint.includes('true_false') || typeHint.includes('t/f') || typeHint.includes('true/false')) {
    return { positive: 'True', negative: 'False', positiveCode: 'T', negativeCode: 'F' };
  }
  if (typeHint.includes('ya_tidak') || typeHint.includes('ya/tidak')) {
    return { positive: 'Ya', negative: 'Tidak', positiveCode: 'Y', negativeCode: 'T' };
  }
  if (typeHint.includes('setuju')) {
    return { positive: 'Setuju', negative: 'Tidak Setuju', positiveCode: 'S', negativeCode: 'TS' };
  }
  if (typeHint.includes('fakta')) {
    return { positive: 'Fakta', negative: 'Opini', positiveCode: 'F', negativeCode: 'O' };
  }
  return undefined;
}

function normalizeStatementBool(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  const s = String(val ?? 'true').trim().toLowerCase();
  if (['false', 'salah', 's', 'f', 'tidak', 'no', 'n', '0', 'ts', 'opini'].includes(s)) return false;
  return true;
}

function isRawComplexCheckboxOrMulti(q: any): boolean {
  if (!q || typeof q !== 'object') return false;
  const hasStatements = Array.isArray(q.statements || q.pernyataan) && (q.statements || q.pernyataan).length > 0;
  if (hasStatements) return true;

  const rawAns = q.correctAnswer ?? q.correctAnswers ?? q.kunci ?? q.kunciJawaban ?? q.jawabanBenar;
  if (Array.isArray(rawAns)) return true;
  if (rawAns !== null && typeof rawAns === 'object') return true;
  if (
    typeof rawAns === 'string' &&
    (/[,;/+&]|\bdan\b|\band\b/i.test(rawAns) ||
      /^\[.+\]$/.test(rawAns.trim()) ||
      /^[A-Ha-h]{2,6}$/.test(rawAns.trim()))
  ) {
    return true;
  }

  const qType = `${q.variant || q.varian || q.format || q.type || q.tipe || q.jenis || ''}`.toLowerCase();
  if (
    qType.includes('kompleks') ||
    qType.includes('complex') ||
    qType.includes('pgk') ||
    isRawCheckboxVariantHint(qType)
  ) {
    return true;
  }

  const rawOpts = getRawOptionsList(q);
  if (Array.isArray(rawOpts) && rawOpts.length > 0) {
    const hasCheckboxMarkers = rawOpts.some((opt: any, i: number) => {
      const parsed = parseOptionWithCheckbox(opt, i);
      if (parsed.hasCheckboxSyntax) return true;
      if (opt && typeof opt === 'object') {
        return (
          'checked' in opt ||
          'isChecked' in opt ||
          'centang' in opt ||
          'isCorrect' in opt ||
          'correct' in opt ||
          'benar' in opt
        );
      }
      return false;
    });
    if (hasCheckboxMarkers) return true;
  }

  return false;
}

function buildNormalizedCMCItem(q: any, idx: number, explicitNum: number): ComplexMultipleChoiceItem {
  const typeHint = `${q.variant || q.varian || q.format || q.type || q.tipe || q.jenis || ''}`.toLowerCase();
  const rawOpts = getRawOptionsList(q);
  const parsedOptions = Array.isArray(rawOpts)
    ? rawOpts.map((opt: any, optIdx: number) => parseOptionWithCheckbox(opt, optIdx))
    : [];

  let options: { key: string; text: string }[] | undefined =
    parsedOptions.length > 0
      ? parsedOptions.map(({ key, text }) => ({ key, text }))
      : undefined;

  let checkedKeysFromOpts = parsedOptions
    .filter((o) => o.isChecked === true)
    .map((o) => o.key);

  const statementsRaw = q.statements || q.pernyataan || [];
  let statements: { statement: string; isCorrect: boolean }[] | undefined = undefined;

  // If JSON encodes checkbox multi-select options under `statements`/`pernyataan` with checkbox/multi variant
  if (!options && Array.isArray(statementsRaw) && statementsRaw.length > 0 && isRawCheckboxVariantHint(typeHint)) {
    const converted = statementsRaw.map((s: any, sIdx: number) => {
      const parsed = parseOptionWithCheckbox(s, sIdx);
      const isRight =
        parsed.isChecked !== undefined
          ? parsed.isChecked
          : parseBooleanFlag(s?.isCorrect ?? s?.correct ?? s?.jawaban ?? s?.benar ?? s?.checked) ?? false;
      return { key: parsed.key, text: parsed.text, isRight };
    });
    options = converted.map(({ key, text }) => ({ key, text }));
    checkedKeysFromOpts = converted.filter((c) => c.isRight).map((c) => c.key);
  } else if (Array.isArray(statementsRaw) && statementsRaw.length > 0) {
    statements = statementsRaw.map((s: any) => ({
      statement:
        typeof s === 'string'
          ? parseOptionStringMarkers(s).text
          : s.statement || s.teks || s.pernyataan || s.text || '',
      isCorrect: normalizeStatementBool(s?.isCorrect ?? s?.correct ?? s?.jawaban ?? s?.benar ?? true),
    }));
  }

  const rawVariantVal = `${q.variant || q.varian || ''}`.toLowerCase();
  let inferredVariant: ComplexMcVariant | undefined;
  if (rawVariantVal === 'true_false' || typeHint.includes('t/f') || typeHint.includes('true_false') || typeHint.includes('true/false')) {
    inferredVariant = 'true_false';
  } else if (
    rawVariantVal === 'benar_salah' ||
    rawVariantVal === 'binary_table'
  ) {
    inferredVariant = rawVariantVal as ComplexMcVariant;
  } else if (options && !statements) {
    inferredVariant = 'multi_select';
  } else if (typeHint.includes('ya_tidak') || typeHint.includes('ya/tidak') || typeHint.includes('setuju') || typeHint.includes('fakta')) {
    inferredVariant = 'binary_table';
  } else if (statements) {
    inferredVariant = 'benar_salah';
  }

  const statementLabels = statements ? normalizeStatementLabelsFromRaw(q, inferredVariant) : undefined;

  let correctAnswer = normalizeComplexCorrectAnswer(
    q.correctAnswer ?? q.correctAnswers ?? q.kunci ?? q.kunciJawaban ?? q.jawabanBenar,
    options
  );
  if ((!correctAnswer || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) && checkedKeysFromOpts.length > 0) {
    correctAnswer = checkedKeysFromOpts;
  }
  if (
    (!correctAnswer || (Array.isArray(correctAnswer) && correctAnswer.length === 0)) &&
    Array.isArray(q.answers) &&
    q.answers.length > 0 &&
    typeof q.answers[0] === 'string' &&
    q.answers[0].trim().length <= 3
  ) {
    correctAnswer = normalizeComplexCorrectAnswer(q.answers, options);
  }

  const rawStimulus = q.stimulus ?? q.wacana ?? q.bacaan;
  const stimulus = Array.isArray(rawStimulus) ? rawStimulus.join('\n\n') : rawStimulus;

  return {
    id: q.id || `cmc-${idx + 1}-${Date.now()}`,
    number: explicitNum,
    ...(inferredVariant ? { variant: inferredVariant } : {}),
    ...(statementLabels ? { statementLabels } : {}),
    stimulus,
    question: q.question || q.pertanyaan || q.teks || q.soal || q.prompt || '',
    statements: statements || (options ? undefined : []),
    options,
    correctAnswer,
    explanation: q.explanation || q.pembahasan || '',
    cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C4',
    ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
    indicator: q.indicator || q.indikator || '',
    score: q.score ?? q.skor ?? 2,
  };
}

function normalizeTrueFalseMcItem(q: any, num: number, idxFallback: number): MultipleChoiceQuestion {
  const typeHint = `${q.variant || q.varian || q.format || q.type || q.tipe || ''}`.toLowerCase();
  const isIndonesianBS = typeHint.includes('benar_salah') || typeHint.includes('benar/salah') || typeHint.includes('b/s');
  const rawOpts = getRawOptionsList(q);
  const options =
    Array.isArray(rawOpts) && rawOpts.length > 0
      ? rawOpts.map((opt: any, optIdx: number) => normalizeOption(opt, optIdx))
      : isIndonesianBS
      ? [
          { key: 'A', text: 'Benar' },
          { key: 'B', text: 'Salah' },
        ]
      : [
          { key: 'A', text: 'True' },
          { key: 'B', text: 'False' },
        ];

  const rawAns = q.correctAnswer ?? q.kunci ?? q.kunciJawaban ?? 'A';
  let correctAnswer = 'A';
  if (typeof rawAns === 'boolean') {
    const posOpt = options.find((o) => /^(true|benar)$/i.test(o.text.trim()));
    const negOpt = options.find((o) => /^(false|salah)$/i.test(o.text.trim()));
    correctAnswer = rawAns ? posOpt?.key || 'A' : negOpt?.key || 'B';
  } else {
    const ansUpper = String(rawAns).trim().toUpperCase();
    if (options.some((o) => o.key.toUpperCase() === ansUpper)) {
      correctAnswer = ansUpper;
    } else if (['T', 'TRUE', 'B', 'BENAR'].includes(ansUpper)) {
      correctAnswer = options.find((o) => /^(true|benar)$/i.test(o.text.trim()))?.key || 'A';
    } else if (['F', 'FALSE', 'S', 'SALAH'].includes(ansUpper)) {
      correctAnswer = options.find((o) => /^(false|salah)$/i.test(o.text.trim()))?.key || 'B';
    } else {
      correctAnswer = ansUpper || 'A';
    }
  }

  return {
    id: q.id || `mc-${idxFallback + 1}-${Date.now()}`,
    number: num,
    variant: 'true_false',
    stimulus: Array.isArray(q.wacana) ? q.wacana.join('\n\n') : q.stimulus || q.wacana,
    question: q.question || q.pertanyaan || q.teks || '',
    options,
    correctAnswer,
    explanation: q.explanation || q.pembahasan || '',
    cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C2',
    ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
    indicator: q.indicator || q.indikator || '',
    score: q.score ?? q.skor ?? 1,
  };
}

function detectMcVariant(q: any, options: { key: string; text: string }[]): MultipleChoiceVariant | undefined {
  const hint = `${q.variant || q.varian || q.format || q.type || q.tipe || ''}`.toLowerCase();
  if (hint.includes('true_false') || hint.includes('t/f') || hint.includes('true/false') || hint.includes('benar_salah')) {
    return 'true_false';
  }
  if (hint.includes('association') || hint.includes('asosiasi')) return 'association';
  if (hint.includes('cause_effect') || hint.includes('sebab')) return 'cause_effect';
  if (
    options.length === 2 &&
    ((options[0]?.text.toLowerCase().includes('true') && options[1]?.text.toLowerCase().includes('false')) ||
      (options[0]?.text.toLowerCase().includes('benar') && options[1]?.text.toLowerCase().includes('salah')))
  ) {
    return 'true_false';
  }
  return q.variant || q.varian;
}

const EMPTY_KOP_CONFIG: SchoolKopConfig = {
  govermentHeader1: '',
  govermentHeader2: '',
  subHeader: '',
  schoolName: '',
  accreditation: '',
  address: '',
  contact: '',
  website: '',
  logoLeftUrl: '',
  logoRightUrl: '',
  headmasterName: '',
  headmasterNip: '',
  teacherName: '',
  teacherNip: '',
  cityDate: '',
};

/**
 * Converts a NaskahUjianData (Word/PDF document schema) object into ExamPackage
 */
function convertNaskahUjianDataToExamPackage(
  data: NaskahUjianData,
  fallbackKop: SchoolKopConfig
): ExamPackage {
  const identitas = data.identitas || ({} as any);
  const kopConfig: SchoolKopConfig = {
    ...fallbackKop,
    schoolName: data.kop?.baris?.find((b) => b.ukuranFont >= 14)?.teks || fallbackKop.schoolName,
    cityDate:
      data.tandaTangan?.tempat && data.tandaTangan?.tanggal
        ? `${data.tandaTangan.tempat}, ${data.tandaTangan.tanggal}`
        : data.tandaTangan
        ? ''
        : fallbackKop.cityDate,
    headmasterName: data.tandaTangan?.kepalaSekolah?.nama ?? fallbackKop.headmasterName,
    headmasterNip: data.tandaTangan?.kepalaSekolah?.nip ?? fallbackKop.headmasterNip,
    teacherName: data.tandaTangan?.guru?.nama ?? fallbackKop.teacherName,
    teacherNip: data.tandaTangan?.guru?.nip ?? fallbackKop.teacherNip,
  };

  const examSummary: ExamSummary = {
    title:
      identitas.judul?.trim() ||
      (identitas.jenis ? `${identitas.jenis} - ${identitas.mataPelajaran || 'Ujian'}` : 'Naskah Ujian Resmi'),
    examType: (!identitas.jenis || identitas.jenis === 'SAS' ? 'PSAS' : (identitas.jenis as any)),
    schoolLevel: 'SMP',
    grade: identitas.kelas || 'Kelas VII',
    subject: identitas.mataPelajaran || 'Mata Pelajaran',
    curriculum: identitas.kurikulum || 'Kurikulum Merdeka',
    academicYear: identitas.tahunAjaran || '2024/2025',
    semester: identitas.semester === 'Genap' ? 'Genap' : 'Ganjil',
    duration: identitas.alokasiWaktu || '90 Menit',
    generalInstructions: data.petunjukUmum || DEFAULT_GENERAL_INSTRUCTIONS,
  };

  const multipleChoice: MultipleChoiceQuestion[] = [];
  const complexMultipleChoice: ComplexMultipleChoiceItem[] = [];
  const matching: MatchingQuestion[] = [];
  const shortAnswer: ShortAnswerQuestion[] = [];
  const essay: EssayQuestion[] = [];

  let qNumber = 1;
  const sections = data.bagianSoal || [];

  for (const sec of sections) {
    if (sec.aktif === false) continue;
    const secTipe = String((sec as any).tipe || '').toLowerCase();

    if (secTipe === 'pg' || secTipe === 'pilihan_ganda') {
      (sec.soal || []).forEach((q: any, idx: number) => {
        const num = q.nomor ?? q.number ?? qNumber++;
        if (q.nomor != null || q.number != null) qNumber = Math.max(qNumber, num + 1);

        if (isRawComplexCheckboxOrMulti(q)) {
          complexMultipleChoice.push(buildNormalizedCMCItem(q, idx, num));
          return;
        }

        const options = (getRawOptionsList(q) || []).map((o: any, oIdx: number) => normalizeOption(o, oIdx));
        const variant = detectMcVariant(q, options);
        multipleChoice.push({
          id: q.id || `mc-${num}-${Date.now()}`,
          number: num,
          ...(variant ? { variant } : {}),
          stimulus: Array.isArray(q.wacana) ? q.wacana.join('\n\n') : q.stimulus || q.wacana,
          question: q.teks || q.question || '',
          options,
          correctAnswer: (q.kunci || q.correctAnswer || 'A').toString().toUpperCase(),
          explanation: q.pembahasan || q.explanation || '',
          cognitiveLevel: q.cognitiveLevel || 'C3',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? 1,
        });
      });
    } else if (
      secTipe === 'pg_kompleks' ||
      secTipe === 'pgk' ||
      secTipe === 'pilihan_ganda_kompleks' ||
      secTipe === 'pg_kompleks_centang' ||
      secTipe === 'checkbox'
    ) {
      (sec.soal || []).forEach((q: any, idx: number) => {
        const num = q.nomor ?? q.number ?? qNumber++;
        if (q.nomor != null || q.number != null) qNumber = Math.max(qNumber, num + 1);
        complexMultipleChoice.push(buildNormalizedCMCItem(q, idx, num));
      });
    } else if (secTipe === 'menjodohkan' || secTipe === 'matching') {
      (sec.soal || []).forEach((q: any) => {
        const num = q.nomor ?? q.number ?? qNumber++;
        if (q.nomor != null || q.number != null) qNumber = Math.max(qNumber, num + 1);
        const premis = q.premis || [];
        const pilihan = q.pilihan || [];
        const pairs = premis.map((prem: string, idx: number) => ({
          premise: prem,
          match: pilihan[idx] || '',
        }));
        matching.push({
          id: q.id || `m-${num}-${Date.now()}`,
          number: num,
          instruction: q.teks || q.instruction || 'Pasangkan premis di kolom kiri dengan pilihan yang tepat di kolom kanan!',
          pairs,
          distractors: pilihan.slice(premis.length),
          explanation: q.pembahasan || '',
          cognitiveLevel: q.cognitiveLevel || 'C3',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? pairs.length,
        });
      });
    } else if (secTipe === 'isian' || secTipe === 'isian_singkat' || secTipe === 'short_answer') {
      (sec.soal || []).forEach((q: any) => {
        const num = q.nomor ?? q.number ?? qNumber++;
        if (q.nomor != null || q.number != null) qNumber = Math.max(qNumber, num + 1);
        shortAnswer.push({
          id: q.id || `sa-${num}-${Date.now()}`,
          number: num,
          stimulus: Array.isArray(q.wacana) ? q.wacana.join('\n\n') : q.wacana,
          question: q.teks || q.question || '',
          correctAnswer: q.kunci || q.correctAnswer || q.expectedAnswer || '',
          acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : undefined,
          explanation: q.pembahasan || '',
          cognitiveLevel: q.cognitiveLevel || 'C2',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? 2,
        });
      });
    } else if (secTipe === 'uraian' || secTipe === 'essay') {
      (sec.soal || []).forEach((q: any) => {
        const num = q.nomor ?? q.number ?? qNumber++;
        if (q.nomor != null || q.number != null) qNumber = Math.max(qNumber, num + 1);
        essay.push({
          id: q.id || `es-${num}-${Date.now()}`,
          number: num,
          stimulus: Array.isArray(q.wacana) ? q.wacana.join('\n\n') : q.wacana,
          question: q.teks || q.question || '',
          expectedAnswer: q.kunci || q.expectedAnswer || '',
          scoringRubric: Array.isArray(q.subSoal)
            ? q.subSoal.map((s: string) => ({ criteria: s, points: 2 }))
            : [{ criteria: 'Jawaban lengkap dan tepat sesuai konsep', points: 4 }],
          cognitiveLevel: q.cognitiveLevel || 'C4',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? 4,
        });
      });
    }
  }

  const scoringGuidelines: ScoringGuidelines = {
    mcWeight: 40,
    complexMcWeight: 20,
    matchingWeight: 10,
    shortAnswerWeight: 15,
    essayWeight: 15,
    formula: 'Nilai Akhir = (Skor Perolehan / Total Skor Maksimal) x 100',
  };

  return {
    id: `exam-imported-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    examSummary,
    kopConfig,
    multipleChoice,
    complexMultipleChoice,
    matching,
    shortAnswer,
    essay,
    scoringGuidelines,
  };
}

/**
 * Normalizes a raw single exam object
 */
export function normalizeSingleExam(raw: any, fallbackKop: SchoolKopConfig = DEFAULT_KOP_CONFIG): ExamPackage | null {
  if (!raw || typeof raw !== 'object') return null;

  // Check if it's NaskahUjianData
  if (raw.identitas && (raw.bagianSoal || raw.kop)) {
    return convertNaskahUjianDataToExamPackage(raw, fallbackKop);
  }

  // Look for nested object
  let root = raw;
  if (root.exam && typeof root.exam === 'object') root = root.exam;
  else if (root.examPackage && typeof root.examPackage === 'object') root = root.examPackage;
  else if (root.naskah && typeof root.naskah === 'object') root = root.naskah;
  else if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) root = root.data;

  // Extract or synthesize examSummary
  const summaryRaw = root.examSummary || root.summary || root.identitas || {};
  const examSummary: ExamSummary = {
    title: summaryRaw.title || summaryRaw.judul || root.title || 'Naskah Ujian Impor',
    examType: ((summaryRaw.examType || summaryRaw.jenis) === 'SAS' ? 'PSAS' : (summaryRaw.examType || summaryRaw.jenis || 'PSAS')) as any,
    schoolLevel: (summaryRaw.schoolLevel || summaryRaw.jenjang || 'SMP') as any,
    grade: summaryRaw.grade || summaryRaw.kelas || 'Kelas VII',
    subject: summaryRaw.subject || summaryRaw.mataPelajaran || root.subject || 'Mata Pelajaran',
    curriculum: summaryRaw.curriculum || summaryRaw.kurikulum || 'Kurikulum Merdeka',
    academicYear: summaryRaw.academicYear || summaryRaw.tahunAjaran || '2024/2025',
    semester: summaryRaw.semester === 'Genap' ? 'Genap' : 'Ganjil',
    duration: summaryRaw.duration || summaryRaw.alokasiWaktu || '90 Menit',
    generalInstructions: Array.isArray(summaryRaw.generalInstructions)
      ? summaryRaw.generalInstructions
      : Array.isArray(root.petunjukUmum)
      ? root.petunjukUmum
      : DEFAULT_GENERAL_INSTRUCTIONS,
  };

  // Avoid leaking dummy fallbackKop text (like subHeader/cityDate/NIP) when the imported JSON explicitly provides its own kopConfig
  const rawKop = root.kopConfig || root.kop;
  const hasExplicitKop =
    rawKop && typeof rawKop === 'object' && Boolean(rawKop.schoolName || rawKop.govermentHeader1 || rawKop.govermentHeader2);
  const kopConfig: SchoolKopConfig = hasExplicitKop
    ? {
        ...EMPTY_KOP_CONFIG,
        ...rawKop,
      }
    : {
        ...fallbackKop,
        ...(rawKop || {}),
      };

  // Extract Question Arrays
  const multipleChoice: MultipleChoiceQuestion[] = [];
  const complexMultipleChoice: ComplexMultipleChoiceItem[] = [];
  const matching: MatchingQuestion[] = [];
  const shortAnswer: ShortAnswerQuestion[] = [];
  const essay: EssayQuestion[] = [];

  let qCount = 1;

  const pushNormalizedCMC = (q: any, idx: number, explicitNum: number) => {
    complexMultipleChoice.push(buildNormalizedCMCItem(q, idx, explicitNum));
  };

  // Multiple Choice (also safely auto-routes PGK [ ] / Menjodohkan / True-False if mixed inside MC array)
  const rawMC = root.multipleChoice || root.pilihanGanda || root.mc || [];
  if (Array.isArray(rawMC)) {
    rawMC.forEach((q: any, idx: number) => {
      const num = q.number ?? q.nomor ?? qCount++;
      if (q.number != null || q.nomor != null) qCount = Math.max(qCount, num + 1);
      const qType = `${q.type || q.tipe || q.format || q.jenis || ''}`.toLowerCase();
      const hasPairs = Array.isArray(q.pairs || q.pasangan) && (q.pairs || q.pasangan).length > 0;

      if (hasPairs || qType.includes('jodoh') || qType.includes('match')) {
        const pairsRaw = q.pairs || q.pasangan || [];
        const pairs = pairsRaw.map((p: any) => ({
          premise: p.premise || p.premis || p.kiri || '',
          match: p.match || p.jawaban || p.kanan || '',
        }));
        matching.push({
          id: q.id || `m-${idx + 1}-${Date.now()}`,
          number: num,
          instruction: q.instruction || q.instruksi || q.question || q.teks || 'Jodohkan kolom kiri dan kanan:',
          pairs,
          distractors: q.distractors || q.pengecoh || [],
          explanation: q.explanation || q.pembahasan || '',
          cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C3',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || q.indikator || '',
          score: q.score ?? q.skor ?? (pairs.length || 2),
        });
        return;
      }

      if (isRawComplexCheckboxOrMulti(q)) {
        pushNormalizedCMC(q, idx, num);
        return;
      }

      if (
        qType.includes('true_false') ||
        qType.includes('true/false') ||
        qType.includes('t/f') ||
        qType.includes('benar_salah') ||
        qType.includes('benar/salah')
      ) {
        multipleChoice.push(normalizeTrueFalseMcItem(q, num, idx));
        return;
      }

      const optionsRaw = getRawOptionsList(q) || [];
      const options = Array.isArray(optionsRaw)
        ? optionsRaw.map((opt: any, optIdx: number) => normalizeOption(opt, optIdx))
        : [];
      const variant = detectMcVariant(q, options);
      multipleChoice.push({
        id: q.id || `mc-${idx + 1}-${Date.now()}`,
        number: num,
        ...(variant ? { variant } : {}),
        stimulus: Array.isArray(q.wacana) ? q.wacana.join('\n\n') : q.stimulus || q.wacana,
        question: q.question || q.pertanyaan || q.teks || '',
        options,
        correctAnswer: (q.correctAnswer || q.kunci || q.kunciJawaban || 'A').toString().toUpperCase(),
        explanation: q.explanation || q.pembahasan || '',
        cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C3',
        ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
        indicator: q.indicator || q.indikator || '',
        score: q.score ?? q.skor ?? 1,
      });
    });
  }

  // Complex Multiple Choice (supports both [ ] checkbox multi-select options AND binary tables)
  const rawCMC =
    root.complexMultipleChoice ||
    root.pilihanGandaKompleks ||
    root.pgk ||
    root.pgKompleks ||
    root.pilihanKompleks ||
    root.complexMc ||
    root.complex_multiple_choice ||
    root.soalKompleks ||
    root.complex ||
    [];
  if (Array.isArray(rawCMC)) {
    rawCMC.forEach((q: any, idx: number) => {
      const num = q.number ?? q.nomor ?? qCount++;
      if (q.number != null || q.nomor != null) qCount = Math.max(qCount, num + 1);
      pushNormalizedCMC(q, idx, num);
    });
  }

  // Matching
  const rawM = root.matching || root.menjodohkan || [];
  if (Array.isArray(rawM)) {
    rawM.forEach((q: any, idx: number) => {
      const pairsRaw = q.pairs || q.pasangan || [];
      const pairs = Array.isArray(pairsRaw)
        ? pairsRaw.map((p: any) => ({
            premise: p.premise || p.premis || p.kiri || '',
            match: p.match || p.jawaban || p.kanan || '',
          }))
        : [];
      const num = q.number ?? q.nomor ?? qCount++;
      if (q.number != null || q.nomor != null) qCount = Math.max(qCount, num + 1);
      matching.push({
        id: q.id || `m-${idx + 1}-${Date.now()}`,
        number: num,
        instruction: q.instruction || q.instruksi || q.teks || 'Jodohkan kolom kiri dan kanan:',
        pairs,
        distractors: q.distractors || q.pengecoh || [],
        explanation: q.explanation || q.pembahasan || '',
        cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C3',
        ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
        indicator: q.indicator || q.indikator || '',
        score: q.score ?? q.skor ?? (pairs.length || 2),
      });
    });
  }

  // Short Answer
  const rawSA = root.shortAnswer || root.isianSingkat || root.isian || [];
  if (Array.isArray(rawSA)) {
    rawSA.forEach((q: any, idx: number) => {
      const num = q.number ?? q.nomor ?? qCount++;
      if (q.number != null || q.nomor != null) qCount = Math.max(qCount, num + 1);
      const acceptedAnswers = Array.isArray(q.acceptedAnswers)
        ? q.acceptedAnswers.map((a: any) => String(a))
        : undefined;
      const resolvedAnswer =
        q.correctAnswer ||
        q.expectedAnswer ||
        q.kunci ||
        q.jawaban ||
        (acceptedAnswers && acceptedAnswers[0]) ||
        '';
      shortAnswer.push({
        id: q.id || `sa-${idx + 1}-${Date.now()}`,
        number: num,
        stimulus: q.stimulus || q.wacana,
        question: q.question || q.pertanyaan || q.teks || '',
        correctAnswer: resolvedAnswer,
        ...(q.expectedAnswer ? { expectedAnswer: q.expectedAnswer } : {}),
        acceptedAnswers,
        explanation: q.explanation || q.pembahasan || '',
        cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C2',
        ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
        indicator: q.indicator || q.indikator || '',
        score: q.score ?? q.skor ?? 2,
      });
    });
  }

  // Essay
  const rawES = root.essay || root.uraian || [];
  if (Array.isArray(rawES)) {
    rawES.forEach((q: any, idx: number) => {
      const rubricRaw = q.scoringRubric || q.rubrik || [];
      const scoringRubric = Array.isArray(rubricRaw)
        ? rubricRaw.map((r: any) => ({
            criteria: r.criteria || r.kriteria || '',
            points: Number(r.points ?? r.skor ?? r.poin ?? 2),
          }))
        : [{ criteria: 'Kesesuaian dan kelengkapan jawaban', points: 4 }];
      const num = q.number ?? q.nomor ?? qCount++;
      if (q.number != null || q.nomor != null) qCount = Math.max(qCount, num + 1);
      essay.push({
        id: q.id || `es-${idx + 1}-${Date.now()}`,
        number: num,
        stimulus: q.stimulus || q.wacana,
        question: q.question || q.pertanyaan || q.teks || '',
        expectedAnswer: q.expectedAnswer || q.kunci || q.jawaban || '',
        scoringRubric,
        cognitiveLevel: q.cognitiveLevel || q.levelKognitif || 'C4',
        ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
        indicator: q.indicator || q.indikator || '',
        score: q.score ?? q.skor ?? 4,
      });
    });
  }

  // Fallback: If only a flat "questions" / "soal" / "items" list is present
  const flatQuestions = root.questions || root.soal || root.items;
  if (
    Array.isArray(flatQuestions) &&
    multipleChoice.length === 0 &&
    complexMultipleChoice.length === 0 &&
    matching.length === 0 &&
    shortAnswer.length === 0 &&
    essay.length === 0
  ) {
    flatQuestions.forEach((q: any, idx: number) => {
      const num = q.number ?? q.nomor ?? idx + 1;
      const qType = `${q.type || q.tipe || q.format || q.jenis || ''}`.toLowerCase();
      const hasPairs = Array.isArray(q.pairs || q.pasangan) && (q.pairs || q.pasangan).length > 0;

      if (qType.includes('uraian') || qType.includes('essay')) {
        essay.push({
          id: q.id || `es-${idx + 1}-${Date.now()}`,
          number: num,
          stimulus: q.stimulus || q.wacana,
          question: q.question || q.pertanyaan || q.teks || '',
          expectedAnswer: q.expectedAnswer || q.kunci || '',
          scoringRubric: Array.isArray(q.scoringRubric)
            ? q.scoringRubric
            : [{ criteria: 'Kelengkapan jawaban', points: 4 }],
          cognitiveLevel: q.cognitiveLevel || 'C4',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? 4,
        });
      } else if (qType.includes('isian') || qType.includes('short')) {
        shortAnswer.push({
          id: q.id || `sa-${idx + 1}-${Date.now()}`,
          number: num,
          stimulus: q.stimulus || q.wacana,
          question: q.question || q.pertanyaan || q.teks || '',
          correctAnswer: q.correctAnswer || q.expectedAnswer || q.kunci || '',
          acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : undefined,
          explanation: q.explanation || q.pembahasan || '',
          cognitiveLevel: q.cognitiveLevel || 'C2',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? 2,
        });
      } else if (hasPairs || qType.includes('jodoh') || qType.includes('match')) {
        const pairsRaw = q.pairs || q.pasangan || [];
        matching.push({
          id: q.id || `m-${idx + 1}-${Date.now()}`,
          number: num,
          instruction: q.instruction || q.instruksi || q.question || q.teks || 'Jodohkan kolom kiri dan kanan:',
          pairs: pairsRaw.map((p: any) => ({
            premise: p.premise || p.premis || p.kiri || '',
            match: p.match || p.jawaban || p.kanan || '',
          })),
          distractors: q.distractors || q.pengecoh || [],
          explanation: q.explanation || q.pembahasan || '',
          cognitiveLevel: q.cognitiveLevel || 'C3',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? (pairsRaw.length || 2),
        });
      } else if (isRawComplexCheckboxOrMulti(q)) {
        pushNormalizedCMC(q, idx, num);
      } else if (
        qType.includes('true_false') ||
        qType.includes('true/false') ||
        qType.includes('t/f') ||
        qType.includes('benar_salah') ||
        qType.includes('benar/salah')
      ) {
        multipleChoice.push(normalizeTrueFalseMcItem(q, num, idx));
      } else if (getRawOptionsList(q)) {
        const optionsRaw = getRawOptionsList(q) || [];
        const options = Array.isArray(optionsRaw)
          ? optionsRaw.map((opt: any, optIdx: number) => normalizeOption(opt, optIdx))
          : [];
        const variant = detectMcVariant(q, options);
        multipleChoice.push({
          id: q.id || `mc-${idx + 1}-${Date.now()}`,
          number: num,
          ...(variant ? { variant } : {}),
          stimulus: Array.isArray(q.wacana) ? q.wacana.join('\n\n') : q.stimulus || q.wacana,
          question: q.question || q.pertanyaan || q.teks || '',
          options,
          correctAnswer: (q.correctAnswer || q.kunci || 'A').toString().toUpperCase(),
          explanation: q.explanation || q.pembahasan || '',
          cognitiveLevel: q.cognitiveLevel || 'C3',
          ...(extractMaterialScope(q) ? { materialScope: extractMaterialScope(q) } : {}),
          indicator: q.indicator || '',
          score: q.score ?? 1,
        });
      }
    });
  }

  const rawGuidelines = root.scoringGuidelines;
  const scoringGuidelines: ScoringGuidelines = rawGuidelines
    ? {
        mcWeight: rawGuidelines.mcWeight ?? 0,
        complexMcWeight: rawGuidelines.complexMcWeight ?? 0,
        matchingWeight: rawGuidelines.matchingWeight ?? 0,
        shortAnswerWeight: rawGuidelines.shortAnswerWeight ?? 0,
        essayWeight: rawGuidelines.essayWeight ?? 0,
        formula: rawGuidelines.formula || 'Nilai Akhir = (Skor Perolehan / Total Skor Maksimal) x 100',
        complexMcPartialCredit: rawGuidelines.complexMcPartialCredit,
      }
    : {
        mcWeight: 40,
        complexMcWeight: 20,
        matchingWeight: 10,
        shortAnswerWeight: 15,
        essayWeight: 15,
        formula: 'Nilai Akhir = (Skor Perolehan / Total Skor Maksimal) x 100',
      };

  const totalQuestions =
    multipleChoice.length +
    complexMultipleChoice.length +
    matching.length +
    shortAnswer.length +
    essay.length;

  if (totalQuestions === 0 && !root.examSummary) {
    return null;
  }

  // Maintain numerical order when items are cross-routed from multipleChoice into other sections
  multipleChoice.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  complexMultipleChoice.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  matching.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  shortAnswer.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  essay.sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  return {
    id: root.id || `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: root.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    examSummary,
    kopConfig,
    multipleChoice,
    complexMultipleChoice,
    matching,
    shortAnswer,
    essay,
    scoringGuidelines,
  };
}

/**
 * Parses raw JSON text and converts into an array of validated ExamPackage items
 */
export function parseAndNormalizeExamJson(
  rawContent: string,
  fallbackKop: SchoolKopConfig = DEFAULT_KOP_CONFIG
): ImportResult {
  if (!rawContent || !rawContent.trim()) {
    return { success: false, exams: [], error: 'Berkas JSON kosong.' };
  }

  let cleaned = rawContent.trim();
  // Strip BOM if present
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }
  // Strip Markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      success: false,
      exams: [],
      error: `Format JSON tidak valid: ${err.message || 'Sintaks JSON salah'}. Pastikan berkas berakhiran .json yang valid.`,
    };
  }

  const resultExams: ExamPackage[] = [];

  if (Array.isArray(parsed)) {
    // Check if it's an array of raw question objects rather than exam packages
    const looksLikeQuestionArray =
      parsed.length > 0 &&
      parsed.every(
        (item) =>
          item &&
          typeof item === 'object' &&
          !item.examSummary &&
          !item.identitas &&
          !item.multipleChoice &&
          !item.complexMultipleChoice &&
          (item.question || item.pertanyaan || item.teks || item.options || item.opsi || item.statements)
      );

    if (looksLikeQuestionArray) {
      const wrapped = normalizeSingleExam({ questions: parsed }, fallbackKop);
      if (wrapped) resultExams.push(wrapped);
    } else {
      for (const item of parsed) {
        const exam = normalizeSingleExam(item, fallbackKop);
        if (exam) {
          resultExams.push(exam);
        }
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    // Check if there is an array under parsed.exams, parsed.bankSoal, parsed.data, or parsed.items
    const listProp = parsed.exams || parsed.bankSoal || (Array.isArray(parsed.data) ? parsed.data : null);
    if (Array.isArray(listProp)) {
      for (const item of listProp) {
        const exam = normalizeSingleExam(item, fallbackKop);
        if (exam) {
          resultExams.push(exam);
        }
      }
    } else {
      const single = normalizeSingleExam(parsed, fallbackKop);
      if (single) {
        resultExams.push(single);
      }
    }
  }

  if (resultExams.length === 0) {
    return {
      success: false,
      exams: [],
      error:
        'Tidak ditemukan data naskah atau butir soal yang sesuai di dalam berkas JSON. Format yang didukung: Ekspor JSON SI-UJIAN, format Naskah Ujian, atau JSON dengan butir soal (termasuk PG Kompleks centang [ ]).',
    };
  }

  return {
    success: true,
    exams: resultExams,
    message: `Berhasil mengimpor ${resultExams.length} naskah ujian ke Bank Soal!`,
  };
}
