import type {
  ComplexMultipleChoiceItem,
  MultipleChoiceQuestion,
  StatementLabels,
} from '../types/exam.ts';

export const STATEMENT_LABEL_PRESETS: Record<string, StatementLabels> = {
  benar_salah: {
    positive: 'Benar',
    negative: 'Salah',
    positiveCode: 'B',
    negativeCode: 'S',
  },
  true_false: {
    positive: 'True',
    negative: 'False',
    positiveCode: 'T',
    negativeCode: 'F',
  },
  ya_tidak: {
    positive: 'Ya',
    negative: 'Tidak',
    positiveCode: 'Y',
    negativeCode: 'T',
  },
  setuju_tidak: {
    positive: 'Setuju',
    negative: 'Tidak Setuju',
    positiveCode: 'S',
    negativeCode: 'TS',
  },
  fakta_opini: {
    positive: 'Fakta',
    negative: 'Opini',
    positiveCode: 'F',
    negativeCode: 'O',
  },
};

export function resolveStatementLabels(item?: {
  variant?: string;
  statementLabels?: StatementLabels;
  labelPernyataan?: { positif: string; negatif: string; kodePositif?: string; kodeNegatif?: string };
}): Required<StatementLabels> {
  if (item?.statementLabels?.positive && item?.statementLabels?.negative) {
    const pos = item.statementLabels.positive.trim();
    const neg = item.statementLabels.negative.trim();
    return {
      positive: pos,
      negative: neg,
      positiveCode: (item.statementLabels.positiveCode || pos[0] || 'B').toUpperCase(),
      negativeCode: (item.statementLabels.negativeCode || neg[0] || 'S').toUpperCase(),
    };
  }
  if (item?.labelPernyataan?.positif && item?.labelPernyataan?.negatif) {
    const pos = item.labelPernyataan.positif.trim();
    const neg = item.labelPernyataan.negatif.trim();
    return {
      positive: pos,
      negative: neg,
      positiveCode: (item.labelPernyataan.kodePositif || pos[0] || 'B').toUpperCase(),
      negativeCode: (item.labelPernyataan.kodeNegatif || neg[0] || 'S').toUpperCase(),
    };
  }
  if (item?.variant === 'true_false') {
    return {
      positive: 'True',
      negative: 'False',
      positiveCode: 'T',
      negativeCode: 'F',
    };
  }
  return {
    positive: 'Benar',
    negative: 'Salah',
    positiveCode: 'B',
    negativeCode: 'S',
  };
}

export function getCmcCorrectList(correctAnswer?: string[] | string): string[] {
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof correctAnswer === 'string' && correctAnswer.trim()) {
    return correctAnswer
      .split(/[,;/\s]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

export function isMcTrueFalse(q: Pick<MultipleChoiceQuestion, 'variant' | 'options'>): boolean {
  if (q.variant === 'true_false') return true;
  if (!q.options || q.options.length !== 2) return false;
  const joined = q.options.map((o) => o.text.trim().toLowerCase()).join('|');
  return (
    (joined.includes('true') && joined.includes('false')) ||
    (joined.includes('benar') && joined.includes('salah'))
  );
}

export function getMcVariantBadgeLabel(q: Pick<MultipleChoiceQuestion, 'variant' | 'options'>): string {
  if (q.variant === 'true_false' || isMcTrueFalse(q)) return 'PG (True/False)';
  if (q.variant === 'association') return 'PG Asosiasi';
  if (q.variant === 'cause_effect') return 'PG Sebab–Akibat';
  return 'Pilihan Ganda';
}

export function getCmcVariantBadgeLabel(q: ComplexMultipleChoiceItem): string {
  const hasStatements = Array.isArray(q.statements) && q.statements.length > 0;
  const hasOptions = Array.isArray(q.options) && q.options.length > 0;
  if (hasOptions && !hasStatements) return 'PG Kompleks (Multi-Pilih)';
  if (hasStatements) {
    const lbl = resolveStatementLabels(q);
    return `PG Kompleks (${lbl.positive}/${lbl.negative})`;
  }
  return 'PG Kompleks';
}

export function computeMcInstruction(multipleChoice: MultipleChoiceQuestion[]): string {
  if (!multipleChoice || multipleChoice.length === 0) {
    return 'Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D pada lembar jawaban!';
  }

  const allTwoOptionTF = multipleChoice.every((q) => isMcTrueFalse(q) && (q.options?.length || 0) === 2);
  if (allTwoOptionTF) {
    return 'Tentukan kebenaran pernyataan berikut dengan memilih Benar/Salah (True/False) menggunakan tanda silang (X) pada huruf A atau B pada lembar jawaban!';
  }

  const rawMax = Math.max(...multipleChoice.map((q) => (q.options ? q.options.length : 4)), 2);
  const effectiveMax = rawMax >= 5 ? 5 : rawMax === 2 ? 2 : rawMax === 3 ? 3 : 4;
  const letters = Array.from({ length: effectiveMax }, (_, i) => String.fromCharCode(65 + i));
  const lettersText =
    letters.length > 1
      ? letters.slice(0, -1).join(', ') + ', atau ' + letters[letters.length - 1]
      : letters[0];

  const hasMixedVariants = multipleChoice.some((q) => q.variant && q.variant !== 'standard');
  if (hasMixedVariants) {
    return `Pilihlah satu jawaban yang paling tepat (termasuk soal pilihan ganda biasa, benar/salah, atau variasi analisis) dengan memberi tanda silang (X) pada huruf ${lettersText} pada lembar jawaban!`;
  }

  return `Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf ${lettersText} pada lembar jawaban!`;
}

export function computeCmcInstruction(items: ComplexMultipleChoiceItem[]): string {
  if (!items || items.length === 0) {
    return 'Tentukan kebenaran dari setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom yang sesuai!';
  }

  const hasStatements = items.some((q) => Array.isArray(q.statements) && q.statements.length > 0);
  const hasOptions = items.some(
    (q) => Array.isArray(q.options) && q.options.length > 0 && (!q.statements || q.statements.length === 0)
  );

  if (hasOptions && hasStatements) {
    return 'Jawablah setiap butir Pilihan Ganda Kompleks sesuai petunjuk: beri tanda centang (✓) pada kotak [ ] pilihan jawaban yang benar, dan beri tanda centang (✓) pada kolom penilaian (Benar/Salah atau True/False) pada soal tabel pernyataan!';
  }

  if (hasOptions && !hasStatements) {
    const maxOpts = Math.max(...items.map((q) => (q.options ? q.options.length : 4)), 4);
    const letters = Array.from({ length: maxOpts }, (_, i) => String.fromCharCode(65 + i));
    const lettersText = letters.slice(0, -1).join(', ') + ', atau ' + letters[letters.length - 1];
    const answerCounts = items.map((q) => getCmcCorrectList(q.correctAnswer).length);
    const uniformCount =
      answerCounts.length > 0 && answerCounts[0] > 1 && answerCounts.every((c) => c === answerCounts[0])
        ? answerCounts[0]
        : null;

    if (uniformCount === 2) {
      return `Pilihlah dua jawaban yang paling benar dengan memberi tanda centang (✓) pada kotak [ ] pilihan ${lettersText} pada setiap soal berikut!`;
    }
    if (uniformCount && uniformCount > 2) {
      return `Pilihlah ${uniformCount} jawaban yang paling benar dengan memberi tanda centang (✓) pada kotak [ ] pilihan ${lettersText} pada setiap soal berikut!`;
    }
    return `Pilihlah jawaban yang paling benar (lebih dari satu jawaban) dengan memberi tanda centang (✓) pada kotak [ ] pilihan ${lettersText} pada setiap soal berikut!`;
  }

  // Only table statements
  const labelPairs = items.map((q) => {
    const l = resolveStatementLabels(q);
    return `${l.positive} atau ${l.negative}`;
  });
  const uniquePairs = Array.from(new Set(labelPairs));
  if (uniquePairs.length === 1) {
    return `Tentukan nilai setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom ${uniquePairs[0]}!`;
  }
  return 'Tentukan nilai setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom penilaian yang sesuai!';
}

const GENERIC_INDICATOR_SNIPPETS = [
  'menentukan jawaban yang tepat',
  'memilih respon yang benar berdasarkan konsep',
  'menganalisis dan menentukan pilihan jawaban yang benar',
  'memasangkan konsep premis dengan respon yang sesuai',
  'melengkapi istilah atau nilai dengan tepat',
  'memecahkan masalah dan merumuskan solusi komprehensif',
];

/**
 * Resolves the specific Lingkup Materi / Materi Pokok for Kisi-Kisi & Kartu Soal.
 * Never just echoes the subject name if a specific materialScope or indicator/question topic is available.
 */
export function resolveQuestionMaterialScope(
  q: {
    materialScope?: string;
    indicator?: string;
    question?: string;
    instruction?: string;
  },
  subjectFallback?: string
): string {
  const subjClean = (subjectFallback || '').trim().toLowerCase();
  const explicit = (q.materialScope || '').trim();
  if (explicit && explicit.toLowerCase() !== subjClean) {
    return explicit;
  }

  const rawInd = (q.indicator || '').trim();
  const isGenericIndicator =
    !rawInd ||
    GENERIC_INDICATOR_SNIPPETS.some((snippet) => rawInd.toLowerCase().includes(snippet));

  if (rawInd && !isGenericIndicator) {
    let cleaned = rawInd
      .replace(/^(?:disajikan|diberikan|disediakan|berdasarkan)\s+[^,.;:]+,\s*/i, '')
      .replace(
        /^(?:peserta didik|siswa|murid)\s+(?:diharapkan\s+)?(?:dapat|mampu|bisa)\s+/i,
        ''
      )
      .replace(
        /^(?:mengidentifikasi|memilih|menentukan|menjelaskan|menganalisis|mengevaluasi|membandingkan|menghitung|mengklasifikasikan|menyimpulkan|merancang|membedakan|menerapkan|menguraikan|menyebutkan|mendeskripsikan|memecahkan|menghubungkan|menafsirkan|menginterpretasikan|mengurutkan|melengkapi|merumuskan|membuktikan|menyusun|menilai|mengukur|memahami|mengetahui)\s+/i,
        ''
      )
      .replace(/\s+(?:dengan tepat|dengan benar|secara tepat|secara benar|dengan baik|yang tepat|yang benar)\.?$/i, '')
      .replace(/[.]+$/, '')
      .trim();

    if (cleaned.length >= 4) {
      // Truncate cleanly if overly long
      if (cleaned.length > 72) {
        cleaned = cleaned.slice(0, 69).replace(/\s+\S*$/, '').trim() + '...';
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
  }

  const stem = (q.question || q.instruction || '')
    .replace(/\s+/g, ' ')
    .replace(/\.{3,}|_{3,}/g, '')
    .trim();

  if (stem.length >= 8) {
    const cleanStem = stem
      .replace(/^(?:apa|siapa|kapan|di mana|mengapa|bagaimana|manakah|berikut ini|perhatikan|bacalah)\s+/i, '')
      .replace(/[?!.]+$/, '')
      .trim();
    if (cleanStem.length >= 5) {
      const shortTopic =
        cleanStem.length > 60
          ? cleanStem.slice(0, 57).replace(/\s+\S*$/, '').trim() + '...'
          : cleanStem;
      return shortTopic.charAt(0).toUpperCase() + shortTopic.slice(1);
    }
  }

  return subjectFallback?.trim() || 'Materi Pokok';
}

