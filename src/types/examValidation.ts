import { QuestionType } from './exam';

export type ValidationIssueCategory =
  | 'double_key'
  | 'key_error'
  | 'hallucination'
  | 'redundancy'
  | 'clue_leakage'
  | 'bias'
  | 'out_of_context'
  | 'cognitive_mismatch'
  | 'construction'
  | 'language';

export type ValidationSeverity = 'critical' | 'warning' | 'suggestion';

export interface ValidationIssueItem {
  category: ValidationIssueCategory;
  severity: ValidationSeverity;
  title: string;
  detail: string;
  fixSuggestion: string;
}

export interface QuestionValidationChecks {
  noDoubleKey: boolean;
  noHallucination: boolean;
  noBias: boolean;
  noRedundancy: boolean;
  contextAligned: boolean;
  constructionValid: boolean;
}

export interface QuestionValidationReport {
  questionType: QuestionType;
  questionId: string;
  questionNumber: number;
  status: 'valid' | 'needs_revision' | 'critical_error';
  checks: QuestionValidationChecks;
  issues: ValidationIssueItem[];
}

export interface CrossQuestionFinding {
  type: 'redundancy' | 'clue_leakage' | 'cognitive_balance' | 'topic_coverage';
  severity: 'critical' | 'warning' | 'info';
  affectedNumbers: number[];
  title: string;
  description: string;
  recommendation: string;
}

export interface ExamValidationReport {
  overallScore: number;
  qualityGrade: string;
  summary: string;
  auditedAt: string;
  totalQuestionsAudited: number;
  criticalCount: number;
  warningCount: number;
  validCount: number;
  dimensionScores: {
    contentValidity: number;
    constructValidity: number;
    languageAndBias: number;
    keyAndDistractorIntegrity: number;
    antiRedundancy: number;
  };
  crossQuestionFindings: CrossQuestionFinding[];
  itemReports: QuestionValidationReport[];
}
