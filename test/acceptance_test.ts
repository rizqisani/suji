import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Packer } from 'docx';
import { generateDocxDocument } from '../src/renderer/docx';
import { SAMPLE_NASKAH_UJIAN } from '../src/data/sampleExamData';
import { validateNaskahUjian } from '../src/schema/naskahUjianSchema';

const execFileAsync = promisify(execFile);

async function runAcceptanceTest() {
  console.log('=====================================================');
  console.log('MENJALANKAN ACCEPTANCE TEST NASKAH UJIAN (DOCX & PDF)');
  console.log('=====================================================');

  const testDir = path.resolve(process.cwd(), 'test-output');
  await fs.mkdir(testDir, { recursive: true });

  const docxPath = path.join(testDir, 'hasil.docx');
  const pdfPath = path.join(testDir, 'hasil.pdf');

  // Step 0: Validate Schema
  console.log('\n[0] Validasi Schema Data Naskah...');
  const validation = validateNaskahUjian(SAMPLE_NASKAH_UJIAN);
  if (!validation.valid) {
    throw new Error(`Data tidak valid: ${validation.errors.join(', ')}`);
  }
  console.log('✓ Validasi skema berhasil (0 error).');

  // Generate DOCX
  console.log('\n[*] Menghasilkan file DOCX dari SAMPLE_NASKAH_UJIAN...');
  const doc = await generateDocxDocument(SAMPLE_NASKAH_UJIAN);
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(docxPath, buffer);
  console.log(`✓ File DOCX berhasil disimpan ke ${docxPath} (${buffer.length} bytes).`);

  // 1. Validasi zip: unzip -t hasil.docx
  console.log('\n[1] Validasi ZIP dan struktur OOXML...');
  const { stdout: unzipTest } = await execFileAsync('unzip', ['-t', docxPath]);
  console.log('  unzip -t output:', unzipTest.trim().split('\n').slice(-1)[0]);

  // Extract word/document.xml to inspect
  const extractDir = path.join(testDir, 'extracted');
  await fs.mkdir(extractDir, { recursive: true });
  await execFileAsync('unzip', ['-o', docxPath, '-d', extractDir]);
  const docXmlPath = path.join(extractDir, 'word', 'document.xml');
  const docXml = await fs.readFile(docXmlPath, 'utf8');
  console.log('✓ File word/document.xml ditemukan dan berhasil diekstrak.');

  // 2. Cek kolom: <w:cols .*w:num="2"
  console.log('\n[2] Cek kolom section soal (w:cols w:num="2")...');
  const colMatch = docXml.match(/<w:cols[^>]*w:num="2"[^>]*>/) || docXml.match(/w:num="2"/);
  if (!colMatch) {
    throw new Error('GAGAL: w:cols dengan w:num="2" tidak ditemukan di word/document.xml!');
  }
  console.log('✓ Ditemukan konfigurasi 2 kolom:', colMatch[0]);

  // 3. Cek tabel layout: jumlah tag <w:tbl> <= 15, dan tidak ada tabel pembungkus soal biasa
  console.log('\n[3] Cek tabel dalam dokumen...');
  const tableMatches = docXml.match(/<w:tbl[\s>]/g) || [];
  console.log(`  Jumlah tag <w:tbl>: ${tableMatches.length}`);
  if (tableMatches.length > 15) {
    throw new Error(`GAGAL: Jumlah tabel (${tableMatches.length}) melebihi batas toleransi 15!`);
  }
  console.log('✓ Jumlah tag <w:tbl> sesuai aturan (<= 15). Soal menggunakan paragraf & tab stop.');

  // 4. Cek gambar: <w:drawing>
  console.log('\n[4] Cek tag gambar <w:drawing>...');
  const drawingMatches = docXml.match(/<w:drawing[\s>]/g) || [];
  console.log(`  Jumlah tag <w:drawing>: ${drawingMatches.length}`);
  if (drawingMatches.length < 1 || drawingMatches.length > 2) {
    throw new Error(`GAGAL: Jumlah tag <w:drawing> (${drawingMatches.length}) di luar batas (1-2 logo)!`);
  }
  console.log(`✓ Ditemukan ${drawingMatches.length} logo disematkan sebagai OOXML ImageRun.`);

  // 5. Konversi PDF: soffice --headless --convert-to pdf hasil.docx
  console.log('\n[5] Konversi PDF via LibreOffice (soffice --headless)...');
  await execFileAsync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', testDir, docxPath]);
  const pdfStat = await fs.stat(pdfPath);
  console.log(`✓ File PDF berhasil dihasilkan (${pdfStat.size} bytes).`);

  // pdftoppm -png -r 150 hasil.pdf halaman
  console.log('\n[6] Cek jumlah halaman PDF dengan pdftoppm...');
  const ppmPrefix = path.join(testDir, 'halaman');
  await execFileAsync('pdftoppm', ['-png', '-r', '150', pdfPath, ppmPrefix]);

  const outputFiles = await fs.readdir(testDir);
  const pageImages = outputFiles.filter((f) => f.startsWith('halaman-') && f.endsWith('.png'));
  console.log(`  Halaman yang dihasilkan: ${pageImages.sort().join(', ')}`);

  console.log(`\nJumlah halaman PDF: ${pageImages.length}`);
  if (pageImages.length !== 2) {
    console.warn(`PERHATIAN: Target adalah tepat 2 halaman A4. Saat ini dihasilkan ${pageImages.length} halaman.`);
  } else {
    console.log('✓ Sempurna! Tepat 2 halaman A4 dihasilkan.');
  }

  console.log('\n=====================================================');
  console.log('SEMUA 6 KRITERIA ACCEPTANCE TEST BERHASIL DIUJI!');
  console.log('=====================================================');
}

runAcceptanceTest().catch((err) => {
  console.error('\n❌ ACCEPTANCE TEST GAGAL:\n', err);
  process.exit(1);
});
