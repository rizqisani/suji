import { Document } from 'docx';
import type { ExamPackage } from '../types/exam.ts';
import { examPackageToNaskahUjianData, type ExportDocumentOptions } from '../utils/exportWord.ts';
import { generateDocxDocument } from './docx.ts';
import {
  generateAnswerKeyDocx,
  generateKisiKisiDocx,
  generateRubrikDocx,
  generateKartuSoalDocx,
  generateLjsDocx,
} from './supportingDocs.ts';

export type { ExportDocType } from '../types/documentTypes.ts';
export {
  DOC_TYPE_LABELS,
  DOC_TYPE_PREFIXES,
  getExportFilename,
} from '../types/documentTypes.ts';
import type { ExportDocType } from '../types/documentTypes.ts';

/**
 * Builds the appropriate OOXML Document based on the requested docType
 */
export async function createDocumentByDocType(
  exam: ExamPackage,
  docType: ExportDocType = 'naskah',
  options?: ExportDocumentOptions
): Promise<Document> {
  switch (docType) {
    case 'kunci':
      return generateAnswerKeyDocx(exam);
    case 'kisi-kisi':
      return generateKisiKisiDocx(exam);
    case 'rubrik':
      return generateRubrikDocx(exam);
    case 'kartu-soal':
      return generateKartuSoalDocx(exam);
    case 'ljs':
      return generateLjsDocx(exam);
    case 'naskah':
    default: {
      const naskahData = examPackageToNaskahUjianData(exam, options);
      return generateDocxDocument(naskahData);
    }
  }
}

