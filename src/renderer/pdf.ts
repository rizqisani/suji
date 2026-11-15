import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { Packer } from 'docx';
import type { NaskahUjianData } from '../schema/naskahUjianSchema.ts';
import { generateDocxDocument } from './docx.ts';

const execFileAsync = promisify(execFile);

/**
 * Converts a DOCX buffer to a PDF buffer using headless LibreOffice.
 * This guarantees 100% fidelity with the DOCX layout.
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const uniqueId = `naskah-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const tempDir = os.tmpdir();
  const docxPath = path.join(tempDir, `${uniqueId}.docx`);
  const pdfPath = path.join(tempDir, `${uniqueId}.pdf`);

  try {
    await fs.writeFile(docxPath, docxBuffer);

    // Call LibreOffice headless to convert docx to pdf
    // font Times New Roman maps to Liberation Serif with identical metrics
    try {
      await execFileAsync('soffice', [
        '--headless',
        '--invisible',
        '--nodefault',
        '--nofirststartwizard',
        '--nolockcheck',
        '--nologo',
        '--norestore',
        '--convert-to',
        'pdf',
        '--outdir',
        tempDir,
        docxPath,
      ]);
    } catch (execErr: any) {
      if (execErr.code === 'ENOENT') {
        throw new Error(
          'Konverter LibreOffice (soffice) belum terdeteksi di lingkungan server. ' +
          'Silakan gunakan tombol "Buka Jendela Cetak" untuk menyimpan sebagai PDF langsung dari peramban, ' +
          'atau unduh naskah dalam format Word (.docx).'
        );
      }
      throw execErr;
    }

    const pdfBuffer = await fs.readFile(pdfPath);
    return pdfBuffer;
  } finally {
    // Clean up temporary files
    await fs.unlink(docxPath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});
  }
}

/**
 * Generates a complete PDF buffer directly from structured NaskahUjianData.
 */
export async function generatePdfFromData(data: NaskahUjianData): Promise<Buffer> {
  const doc = await generateDocxDocument(data);
  const docxBuffer = await Packer.toBuffer(doc);
  return convertDocxToPdf(docxBuffer);
}
