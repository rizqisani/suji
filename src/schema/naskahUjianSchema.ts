/**
 * Skema Data Terstruktur Naskah Ujian Sekolah (PSAS, PTS, UH, UAS, PAT, PSAJ, AM)
 */

export type JenisUjian = 'SAS' | 'PSAS' | 'PTS' | 'STS' | 'SAT' | 'UH' | 'UAS' | 'PAT' | 'PSAJ' | 'AM' | 'US' | 'LAINNYA';

export const JENIS_UJIAN_TITLES: Record<string, string> = {
  SAS: 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)',
  PSAS: 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)',
  PTS: 'PENILAIAN TENGAH SEMESTER (PTS)',
  STS: 'SUMATIF TENGAH SEMESTER (STS)',
  SAT: 'SUMATIF AKHIR TAHUN (SAT)',
  UH: 'PENILAIAN HARIAN (FORMATIF)',
  UAS: 'UJIAN AKHIR SEMESTER (UAS)',
  PAT: 'PENILAIAN AKHIR TAHUN (PAT)',
  PSAJ: 'PENILAIAN SUMATIF AKHIR JENJANG (PSAJ)',
  AM: 'ASESMEN MADRASAH (AM)',
  US: 'UJIAN SEKOLAH (US)',
  LAINNYA: 'PENILAIAN ASESMEN SEKOLAH',
};

export interface KopBaris {
  teks: string;
  ukuranFont: number; // pt (mis. 12, 14, 16)
  tebal: boolean;
  miring?: boolean;
}

export interface KopConfig {
  baris: KopBaris[];
  logoKiri?: string; // base64 PNG/JPG atau SVG
  logoKanan?: string; // base64 PNG/JPG atau SVG
  garisGanda: boolean;
}

export interface IdentitasUjian {
  jenis: JenisUjian | string;
  judul?: string; // Judul lengkap custom (misal "PENILAIAN SUMATIF AKHIR SEMESTER (PSAS) GANJIL")
  tahunAjaran: string; // misal "2024/2025"
  semester: string; // misal "Ganjil" atau "Genap"
  mataPelajaran: string;
  kelas: string;
  fase: string;
  kurikulum: string;
  alokasiWaktu: string;
  hariTanggal: string;
  namaSiswa?: string;
  nomorAbsen?: string;
}

export interface TataLetakConfig {
  ukuranKertas: 'A4' | 'FOLIO';
  margin: number; // default 850 DXA (15 mm)
  jumlahKolom: 1 | 2; // default 2
  jarakKolom: number; // default 400 DXA
  garisPemisahKolom: boolean;
  fontUtama: string; // default "Times New Roman"
  ukuranFontSoal: number; // default 10 pt (20 half-points)
}

export interface SoalPG {
  id?: string;
  nomor?: number;
  varian?: 'standard' | 'true_false' | 'association' | 'cause_effect';
  wacana?: string[];
  teks: string;
  opsi: Array<{ label: string; teks: string }>; // e.g. A, B, C, D, E (2-5 opsi)
  kunci?: string;
  pembahasan?: string;
}

export interface SoalPGKompleks {
  id?: string;
  nomor?: number;
  varian?: 'multi_select' | 'benar_salah' | 'true_false' | 'binary_table';
  labelPernyataan?: {
    positif: string;
    negatif: string;
    kodePositif?: string;
    kodeNegatif?: string;
  };
  wacana?: string[];
  teks: string;
  pernyataan?: Array<{ teks: string; jawaban?: boolean }>;
  opsi?: Array<{ label: string; teks: string }>;
  kunci?: string[] | string;
  pembahasan?: string;
}

export interface SoalMenjodohkan {
  id?: string;
  nomor?: number;
  teks: string;
  premis: string[];
  pilihan: string[];
  kunci?: Record<string, string>;
  pembahasan?: string;
}

export interface SoalIsian {
  id?: string;
  nomor?: number;
  wacana?: string[];
  teks: string;
  kunci?: string;
  pembahasan?: string;
}

export interface SoalUraian {
  id?: string;
  nomor?: number;
  wacana?: string[];
  teks: string;
  subSoal?: string[];
  jumlahGarisJawaban?: number; // default 2
  kunci?: string;
  pembahasan?: string;
}

export interface BagianSoal {
  tipe: 'pg' | 'pg_kompleks' | 'menjodohkan' | 'isian' | 'uraian';
  judul: string;
  instruksi?: string; // Dibuat otomatis jika kosong berdasarkan jumlah opsi nyata
  aktif?: boolean;
  soal: (SoalPG | SoalPGKompleks | SoalMenjodohkan | SoalIsian | SoalUraian)[];
}

export interface PejabatTtd {
  nama: string;
  nip: string;
}

export interface TandaTanganConfig {
  kepalaSekolah: PejabatTtd;
  guru: PejabatTtd;
  tempat: string; // Kota
  tanggal: string; // Tanggal
}

export interface NaskahUjianData {
  identitas: IdentitasUjian;
  kop: KopConfig;
  tataLetak: TataLetakConfig;
  petunjukUmum: string[];
  bagianSoal: BagianSoal[];
  tandaTangan: TandaTanganConfig;
  opsional?: {
    nomorHalaman?: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateNaskahUjian(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data) {
    return { valid: false, errors: ['Data naskah ujian tidak boleh kosong.'] };
  }

  // A. Identitas
  if (!data.identitas) {
    errors.push('Parameter identitas ujian wajib diisi.');
  } else {
    if (!data.identitas.mataPelajaran?.trim()) errors.push('Mata pelajaran wajib diisi.');
    if (!data.identitas.kelas?.trim()) errors.push('Kelas wajib diisi.');
    if (!data.identitas.tahunAjaran?.trim()) errors.push('Tahun ajaran wajib diisi.');
    if (!data.identitas.jenis?.trim() && !data.identitas.judul?.trim()) errors.push('Jenis ujian wajib diisi.');
  }

  // B. Kop
  if (!data.kop || !Array.isArray(data.kop.baris) || data.kop.baris.length === 0) {
    errors.push('Kop surat sekolah wajib memiliki minimal satu baris teks instansi/sekolah.');
  }

  // C. Bagian Soal
  if (!Array.isArray(data.bagianSoal) || data.bagianSoal.length === 0) {
    errors.push('Naskah ujian harus memiliki minimal satu bagian soal.');
  } else {
    const aktif = data.bagianSoal.filter((b: any) => b.aktif !== false);
    if (aktif.length === 0) {
      errors.push('Minimal harus ada satu bagian soal yang aktif.');
    }
  }

  // D. Tanda Tangan
  if (!data.tandaTangan) {
    errors.push('Konfigurasi tanda tangan pengesahan wajib diisi.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
