import { NaskahUjianData } from '../schema/naskahUjianSchema';

export const SAMPLE_NASKAH_UJIAN: NaskahUjianData = {
  identitas: {
    jenis: 'PSAS',
    tahunAjaran: '2024/2025',
    semester: 'Ganjil',
    mataPelajaran: 'Ilmu Pengetahuan Alam (IPA)',
    kelas: 'VII (Tujuh)',
    fase: 'Fase D',
    kurikulum: 'Kurikulum Merdeka',
    alokasiWaktu: '90 Menit',
    hariTanggal: 'Senin, 02 Desember 2024',
    namaSiswa: '',
    nomorAbsen: '',
  },
  kop: {
    baris: [
      { teks: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT', ukuranFont: 11, tebal: true },
      { teks: 'DINAS PENDIDIKAN DAN KEBUDAYAAN', ukuranFont: 12, tebal: true },
      { teks: 'SMP NEGERI 1 TELADAN NUSANTARA', ukuranFont: 14, tebal: true },
      {
        teks: 'Jl. Pendidikan No. 45 Telp. (022) 7891011 Website: smpn1teladan.sch.id',
        ukuranFont: 9,
        tebal: false,
        miring: true,
      },
    ],
    logoKiri: '', // will resolve to standard default dinas logo
    logoKanan: '', // will resolve to standard default tutwuri logo
    garisGanda: true,
  },
  tataLetak: {
    ukuranKertas: 'A4',
    margin: 850,
    jumlahKolom: 2,
    jarakKolom: 400,
    garisPemisahKolom: true,
    fontUtama: 'Times New Roman',
    ukuranFontSoal: 10,
  },
  petunjukUmum: [
    'Berdoalah sebelum mengerjakan soal sesuai keyakinan masing-masing.',
    'Tuliskan nomor peserta dan identitas lengkap pada lembar jawaban yang tersedia.',
    'Periksa dan bacalah naskah soal dengan teliti sebelum Anda menjawab.',
    'Dahulukan menjawab soal-soal yang Anda anggap paling mudah.',
    'Periksa kembali pekerjaan Anda sebelum diserahkan kepada pengawas ujian.',
  ],
  bagianSoal: [
    {
      tipe: 'pg',
      judul: 'PILIHAN GANDA',
      instruksi: 'Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, atau D pada lembar jawaban!',
      aktif: true,
      soal: [
        {
          id: 'pg-1',
          wacana: [
            'Di sebuah ekosistem sawah terdapat padi, belalang, katak, ular, dan elang. Penggunaan pestisida berlebih menyebabkan populasi katak menurun drastis.',
          ],
          teks: 'Berdasarkan rantai makanan tersebut, dampak langsung yang terjadi pada populasi ular adalah...',
          opsi: [
            { label: 'A', teks: 'Meningkat pesat karena persaingan berkurang' },
            { label: 'B', teks: 'Menurun drastis karena sumber makanan berkurang' },
            { label: 'C', teks: 'Tetap stabil karena ular memakan tanaman padi' },
            { label: 'D', teks: 'Meningkat karena predator elang punah' },
          ],
          kunci: 'B',
        },
        {
          id: 'pg-2',
          teks: 'Peristiwa perpindahan kalor yang terjadi tanpa memerlukan zat perantara (medium) disebut...',
          opsi: [
            { label: 'A', teks: 'Konduksi' },
            { label: 'B', teks: 'Konveksi' },
            { label: 'C', teks: 'Radiasi' },
            { label: 'D', teks: 'Evaporasi' },
          ],
          kunci: 'C',
        },
        {
          id: 'pg-3',
          teks: 'Organel sel yang berfungsi sebagai tempat berlangsungnya respirasi sel untuk menghasilkan energi (ATP) adalah...',
          opsi: [
            { label: 'A', teks: 'Mitokondria' },
            { label: 'B', teks: 'Ribosom' },
            { label: 'C', teks: 'Retikulum endoplasma' },
            { label: 'D', teks: 'Badan golgi' },
          ],
          kunci: 'A',
        },
        {
          id: 'pg-4',
          teks: 'Perubahan zat dari gas langsung menjadi padat tanpa melalui fase cair disebut...',
          opsi: [
            { label: 'A', teks: 'Mengkristal' },
            { label: 'B', teks: 'Menyublim' },
            { label: 'C', teks: 'Menguap' },
            { label: 'D', teks: 'Mencair' },
          ],
          kunci: 'A',
        },
      ],
    },
    {
      tipe: 'pg_kompleks',
      judul: 'PILIHAN GANDA KOMPLEKS',
      instruksi: 'Tentukan kebenaran dari setiap pernyataan berikut dengan memberi tanda centang (✓) pada kolom Benar atau Salah!',
      aktif: true,
      soal: [
        {
          id: 'pgk-1',
          wacana: [
            'Pemanasan global dipicu oleh kenaikan konsentrasi gas rumah kaca di atmosfer seperti CO2 dan metana.',
          ],
          teks: 'Tentukan benar atau salah pernyataan terkait pemanasan global berikut:',
          pernyataan: [
            { teks: 'Penanaman pohon dapat menyerap gas karbon dioksida di atmosfer.', jawaban: true },
            { teks: 'Efek rumah kaca secara alami dibutuhkan untuk menjaga suhu bumi hangat.', jawaban: true },
            { teks: 'Penggunaan energi fosil dapat menurunkan laju kenaikan suhu bumi.', jawaban: false },
          ],
        },
        {
          id: 'pgk-2',
          teks: 'Tentukan benar atau salah pernyataan mengenai sifat zat berikut:',
          pernyataan: [
            { teks: 'Zat padat memiliki bentuk dan volume yang tetap.', jawaban: true },
            { teks: 'Zat cair bentuknya tetap meskipun wadahnya berubah.', jawaban: false },
            { teks: 'Zat gas partikelnya bergerak sangat bebas dan renggang.', jawaban: true },
          ],
        },
      ],
    },
    {
      tipe: 'menjodohkan',
      judul: 'MENJODOHKAN',
      instruksi: 'Jodohkanlah besaran pokok di kolom kiri dengan satuan SI yang tepat di kolom kanan!',
      aktif: true,
      soal: [
        {
          id: 'm-1',
          teks: 'Pasangkanlah besaran fisika berikut dengan satuannya dalam SI:',
          premis: ['Panjang', 'Massa', 'Waktu'],
          pilihan: ['Meter (m)', 'Kilogram (kg)', 'Sekon (s)'],
        },
      ],
    },
    {
      tipe: 'isian',
      judul: 'ISIAN SINGKAT',
      instruksi: 'Isilah titik-titik di bawah ini dengan jawaban yang singkat dan tepat!',
      aktif: true,
      soal: [
        {
          id: 'is-1',
          teks: 'Satuan internasional (SI) untuk mengukur suhu adalah...',
          kunci: 'Kelvin',
        },
        {
          id: 'is-2',
          teks: 'Zat tunggal yang tidak dapat diuraikan lagi menjadi zat lain yang lebih sederhana melalui reaksi kimia biasa disebut...',
          kunci: 'Unsur',
        },
      ],
    },
    {
      tipe: 'uraian',
      judul: 'URAIAN',
      instruksi: 'Jawablah pertanyaan berikut dengan jelas, sistematis, dan tepat!',
      aktif: true,
      soal: [
        {
          id: 'ur-1',
          teks: 'Jelaskan perbedaan mendasar antara perubahan fisika dan perubahan kimia dalam kehidupan sehari-hari!',
          subSoal: [
            'Sebutkan 2 karakteristik perubahan fisika beserta contohnya!',
            'Sebutkan 2 karakteristik perubahan kimia beserta contohnya!',
          ],
          jumlahGarisJawaban: 2,
        },
      ],
    },
  ],
  tandaTangan: {
    tempat: 'Bandung',
    tanggal: '02 Desember 2024',
    kepalaSekolah: {
      nama: 'Dr. H. Rahmat Hidayat, M.Pd.',
      nip: '19750315 199903 1 002',
    },
    guru: {
      nama: 'Siti Nurhaliza, S.Pd., M.Si.',
      nip: '19820710 200801 2 007',
    },
  },
  opsional: {
    nomorHalaman: true,
  },
};
