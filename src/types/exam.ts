export type SchoolLevel = 'SD' | 'SMP' | 'SMA' | 'SMK' | 'MI' | 'MTs' | 'MA';

export type ExamType =
  | 'PSAS' // Penilaian Sumatif Akhir Semester
  | 'SAS' // Alias lama untuk Penilaian Sumatif Akhir Semester (PSAS)
  | 'STS' // Sumatif Tengah Semester
  | 'SAT' // Sumatif Akhir Tahun
  | 'PSAJ' // Penilaian Sumatif Akhir Jenjang
  | 'AM' // Asesmen Madrasah
  | 'US' // Ujian Sekolah
  | 'UH' // Ulangan Harian / Asesmen Formatif
  | 'CUSTOM';

export type QuestionType =
  | 'multipleChoice'
  | 'complexMultipleChoice'
  | 'matching'
  | 'shortAnswer'
  | 'essay';

export type MultipleChoiceVariant =
  | 'standard'
  | 'true_false'
  | 'association'
  | 'cause_effect';

export type ComplexMcVariant =
  | 'multi_select'
  | 'benar_salah'
  | 'true_false'
  | 'binary_table';

export interface StatementLabels {
  positive: string; // e.g., 'Benar', 'True', 'Ya', 'Setuju', 'Fakta'
  negative: string; // e.g., 'Salah', 'False', 'Tidak', 'Tidak Setuju', 'Opini'
  positiveCode?: string; // e.g., 'B', 'T', 'Y', 'S', 'F'
  negativeCode?: string; // e.g., 'S', 'F', 'T', 'TS', 'O'
}

export type CognitiveLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'L1' | 'L2' | 'L3';

export interface SchoolKopConfig {
  govermentHeader1: string; // misal: PEMERINTAH DAERAH PROVINSI JAWA BARAT
  govermentHeader2: string; // misal: DINAS PENDIDIKAN DAN KEBUDAYAAN
  subHeader: string; // misal: CABANG DINAS PENDIDIKAN WILAYAH I
  schoolName: string; // misal: SMA NEGERI 1 CIBINONG
  accreditation: string; // misal: Terakreditasi A (Unggul)
  address: string; // misal: Jl. Mayor Oking Jaya Atmaja No. 73, Cibinong, Kab. Bogor
  contact: string; // misal: Telp. (021) 8752235 | Email: sman1cibinong@sch.id
  website: string; // misal: www.sman1cibinong.sch.id
  logoLeftUrl: string; // Logo Pemda / Dinas / Yayasan
  logoRightUrl: string; // Logo Sekolah / Tut Wuri Handayani
  headmasterName: string;
  headmasterNip: string;
  teacherName: string;
  teacherNip: string;
  cityDate: string; // misal: Bogor, 5 Desember 2024
}

export interface MultipleChoiceOption {
  key: string; // A, B, C, D, E
  text: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  number: number;
  variant?: MultipleChoiceVariant;
  stimulus?: string; // Teks wacana / cerita / tabel
  question: string;
  options: MultipleChoiceOption[];
  correctAnswer: string; // 'A', 'B', dsb.
  explanation?: string;
  cognitiveLevel?: string; // C1-C6
  materialScope?: string; // Lingkup Materi / Materi Pokok
  indicator?: string; // Indikator soal
  score?: number;
}

export interface ComplexMultipleChoiceItem {
  id: string;
  number: number;
  variant?: ComplexMcVariant;
  statementLabels?: StatementLabels;
  stimulus?: string;
  question: string;
  statements?: {
    statement: string;
    isCorrect: boolean;
  }[];
  options?: MultipleChoiceOption[];
  correctAnswer?: string[] | string;
  explanation?: string;
  cognitiveLevel?: string;
  materialScope?: string;
  indicator?: string;
  score?: number;
}

export interface MatchingPair {
  premise: string; // Kolom Kiri
  match: string; // Kolom Kanan
}

export interface MatchingQuestion {
  id: string;
  number: number;
  instruction: string;
  pairs: MatchingPair[];
  distractors?: string[]; // Opsi tambahan di kolom kanan
  explanation?: string;
  cognitiveLevel?: string;
  materialScope?: string;
  indicator?: string;
  score?: number;
}

export interface ShortAnswerQuestion {
  id: string;
  number: number;
  stimulus?: string;
  question: string;
  correctAnswer: string;
  expectedAnswer?: string;
  acceptedAnswers?: string[];
  explanation?: string;
  cognitiveLevel?: string;
  materialScope?: string;
  indicator?: string;
  score?: number;
}

export interface EssayRubricItem {
  criteria: string;
  points: number;
}

export interface EssayQuestion {
  id: string;
  number: number;
  stimulus?: string;
  question: string;
  expectedAnswer: string;
  scoringRubric: EssayRubricItem[];
  cognitiveLevel?: string;
  materialScope?: string;
  indicator?: string;
  score?: number;
}

export interface ExamSummary {
  title: string;
  examType: ExamType;
  schoolLevel: SchoolLevel;
  grade: string;
  subject: string;
  curriculum: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  duration: string;
  generalInstructions: string[];
}

export interface ScoringGuidelines {
  mcWeight: number; // e.g., 40
  complexMcWeight: number; // e.g., 20
  matchingWeight: number; // e.g., 10
  shortAnswerWeight: number; // e.g., 10
  essayWeight: number; // e.g., 20
  formula: string;
  complexMcPartialCredit?: string;
}

export interface ExamPackage {
  id: string;
  createdAt: string;
  updatedAt: string;
  examSummary: ExamSummary;
  kopConfig: SchoolKopConfig;
  multipleChoice: MultipleChoiceQuestion[];
  complexMultipleChoice: ComplexMultipleChoiceItem[];
  matching: MatchingQuestion[];
  shortAnswer: ShortAnswerQuestion[];
  essay: EssayQuestion[];
  scoringGuidelines: ScoringGuidelines;
}

export interface SchoolKopProfile {
  id: string;
  name: string;
  config: SchoolKopConfig;
  updatedAt: string;
}
