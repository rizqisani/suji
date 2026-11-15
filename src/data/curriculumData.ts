import { SchoolLevel, SchoolKopConfig } from '../types/exam';

export interface SubjectOption {
  name: string;
  category: 'Wajib' | 'Pilihan' | 'Muatan Lokal';
  suggestedTopics: string[];
}

export const LEVEL_GRADES: Record<SchoolLevel, { grade: string; phase: string }[]> = {
  SD: [
    { grade: 'Kelas 1', phase: 'Fase A' },
    { grade: 'Kelas 2', phase: 'Fase A' },
    { grade: 'Kelas 3', phase: 'Fase B' },
    { grade: 'Kelas 4', phase: 'Fase B' },
    { grade: 'Kelas 5', phase: 'Fase C' },
    { grade: 'Kelas 6', phase: 'Fase C' },
  ],
  MI: [
    { grade: 'Kelas 1', phase: 'Fase A' },
    { grade: 'Kelas 2', phase: 'Fase A' },
    { grade: 'Kelas 3', phase: 'Fase B' },
    { grade: 'Kelas 4', phase: 'Fase B' },
    { grade: 'Kelas 5', phase: 'Fase C' },
    { grade: 'Kelas 6', phase: 'Fase C' },
  ],
  SMP: [
    { grade: 'Kelas 7', phase: 'Fase D' },
    { grade: 'Kelas 8', phase: 'Fase D' },
    { grade: 'Kelas 9', phase: 'Fase D' },
  ],
  MTs: [
    { grade: 'Kelas 7', phase: 'Fase D' },
    { grade: 'Kelas 8', phase: 'Fase D' },
    { grade: 'Kelas 9', phase: 'Fase D' },
  ],
  SMA: [
    { grade: 'Kelas 10', phase: 'Fase E' },
    { grade: 'Kelas 11', phase: 'Fase F' },
    { grade: 'Kelas 12', phase: 'Fase F' },
  ],
  MA: [
    { grade: 'Kelas 10', phase: 'Fase E' },
    { grade: 'Kelas 11', phase: 'Fase F' },
    { grade: 'Kelas 12', phase: 'Fase F' },
  ],
  SMK: [
    { grade: 'Kelas 10', phase: 'Fase E' },
    { grade: 'Kelas 11', phase: 'Fase F' },
    { grade: 'Kelas 12', phase: 'Fase F' },
  ],
};

export const SUBJECTS_BY_LEVEL: Record<SchoolLevel, SubjectOption[]> = {
  SMP: [
    {
      name: 'Ilmu Pengetahuan Alam (IPA)',
      category: 'Wajib',
      suggestedTopics: [
        'Hakikat Ilmu Sains dan Metode Ilmiah',
        'Zat dan Perubahannya (Wujud Zat, Massa Jenis, Perubahan Fisika & Kimia)',
        'Suhu, Kalor, dan Pemuaian',
        'Gerak dan Gaya (Hukum Newton)',
        'Klasifikasi Makhluk Hidup',
        'Ekosistem dan Interaksi Antar Makhluk Hidup',
        'Struktur Bumi dan Tata Surya',
        'Sistem Organisasi Kehidupan',
      ],
    },
    {
      name: 'Matematika',
      category: 'Wajib',
      suggestedTopics: [
        'Bilangan Bulat dan Bilangan Pecahan',
        'Aljabar (Bentuk Aljabar, Operasi, dan Penyederhanaan)',
        'Persamaan dan Pertidaksamaan Linear Satu Variabel (PLSV)',
        'Perbandingan Senilai dan Berbalik Nilai',
        'Aritmetika Sosial (Untung, Rugi, Diskon, Pajak, Bunga)',
        'Garis dan Sudut',
        'Bangun Datar (Segitiga, Segiempat, Luas & Keliling)',
        'Penyajian Data (Diagram Batang, Garis, Lingkaran)',
      ],
    },
    {
      name: 'Bahasa Indonesia',
      category: 'Wajib',
      suggestedTopics: [
        'Teks Deskripsi (Menjelaskan Objek Keindahan Alam & Budaya)',
        'Teks Puisi Rakyat (Pantun, Syair, Gurindam)',
        'Teks Prosedur (Cara Membuat dan Melakukan Sesuatu)',
        'Teks Berita (Unsur 5W+1H / ADIKSIMBA)',
        'Teks Laporan Hasil Observasi (LHO)',
        'Menulis Surat Pribadi dan Surat Resmi',
      ],
    },
    {
      name: 'Bahasa Inggris',
      category: 'Wajib',
      suggestedTopics: [
        'Greetings and Self Introduction',
        'Describing People, Animals, and Everyday Objects',
        'Telling Time, Dates, and Days',
        'Asking for and Giving Information',
        'Descriptive Text',
        'Procedure Text (Recipes and Manuals)',
      ],
    },
    {
      name: 'Ilmu Pengetahuan Sosial (IPS)',
      category: 'Wajib',
      suggestedTopics: [
        'Kondisi Geografis dan Keberagaman Alam Indonesia',
        'Interaksi Sosial dan Dinamika Kependudukan',
        'Kebutuhan Manusia, Kelangkaan, dan Kegiatan Ekonomi',
        'Masa Praaksara, Kerajaan Hindu-Buddha, dan Islam di Nusantara',
        'Lembaga Sosial dan Perannya dalam Masyarakat',
      ],
    },
    {
      name: 'Pendidikan Pancasila',
      category: 'Wajib',
      suggestedTopics: [
        'Sejarah Kelahiran dan Penetapan Pancasila',
        'Norma dan UUD NRI Tahun 1945',
        'Kesatuan Indonesia dan Karakteristik Daerah',
        'Keberagaman Suku, Agama, Ras, dan Antargolongan (SARA)',
        'Hak dan Kewajiban Warga Negara',
      ],
    },
    {
      name: 'Informatika',
      category: 'Wajib',
      suggestedTopics: [
        'Berpikir Komputasional (Dekomposisi, Pola, Abstraksi, Algoritma)',
        'Teknologi Informasi dan Komunikasi (Aplikasi Perkantoran)',
        'Sistem Komputer (Perangkat Keras, Lunak, Sistem Operasi)',
        'Jaringan Komputer dan Internet',
        'Analisis Data dan Lembar Kerja',
        'Algoritma dan Pemrograman Blok (Scratch)',
      ],
    },
    {
      name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
      category: 'Wajib',
      suggestedTopics: [
        'Keterampilan Gerak Fundamental Permainan Bola Besar (Sepak Bola, Bola Voli, Bola Basket)',
        'Keterampilan Gerak Permainan Bola Kecil (Bulu Tangkis, Tenis Meja, Kasti)',
        'Keterampilan Gerak Atletik (Lari Jarak Pendek, Lompat Jauh, Tolak Peluru)',
        'Aktivitas Kebugaran Jasmani (Daya Tahan Jantung, Kekuatan, Kelenturan)',
        'Senam Lantai (Guling Depan, Guling Belakang, Keseimbangan)',
        'Pola Hidup Sehat, Pola Makan Bergizi Seimbang, dan Bahaya Merokok/Narkoba',
      ],
    },
    {
      name: 'Seni Rupa',
      category: 'Wajib',
      suggestedTopics: [
        'Menggambar Objek Alam Benda dan Flora-Fauna',
        'Prinsip Menggambar Ragam Hias Tradisional Nusantara',
        'Teknik Menggambar Perspektif Satu dan Dua Titik Hilang',
        'Mendesain Tipografi, Poster, dan Logo Edukatif',
        'Apresiasi Karya Seni Rupa Daerah dan Pameran Sekolah',
      ],
    },
    {
      name: 'Seni Musik',
      category: 'Wajib',
      suggestedTopics: [
        'Bernyanyi Solo dan Bernyanyi Unisono Lagu Daerah/Nasional',
        'Membaca Notasi Angka, Notasi Balok, dan Ritme Ketukan',
        'Bermain Alat Musik Melodis dan Ritmis (Pianika, Rekorder, Perkusi)',
        'Ansambel Musik Tradisional dan Modern Campuran',
        'Apresiasi Lagu Tradisional Nusantara dan Tokoh Musik Indonesia',
      ],
    },
    {
      name: 'Seni Tari',
      category: 'Wajib',
      suggestedTopics: [
        'Elemen Dasar Gerak Tari (Ruang, Waktu, dan Tenaga)',
        'Gerak Tari Tradisional Berdasarkan Nilai dan Jenisnya',
        'Tata Rias, Busana, dan Properti Tari Tradisional',
        'Menyusun Koreografi Tari Kreasi Kelompok',
      ],
    },
    {
      name: 'Seni Teater',
      category: 'Wajib',
      suggestedTopics: [
        'Olah Vokal, Olah Tubuh, dan Olah Rasa Pemeranan',
        'Teknik Menulis Naskah Drama dan Lakon Pendek',
        'Tata Panggung, Pencahayaan, dan Kostum Pementasan',
        'Pementasan Teater / Drama Komedi Bertema Sosial Remaja',
      ],
    },
    {
      name: 'Prakarya - Kerajinan',
      category: 'Wajib',
      suggestedTopics: [
        'Kerajinan dari Bahan Serat Alami dan Tekstil',
        'Kerajinan dari Bahan Kertas dan Plastik Daur Ulang',
        'Kerajinan dari Bahan Lunak (Tanah Liat, Sabun, Lilin, Plastisin)',
        'Teknik Kemasan dan Pemasaran Produk Kerajinan Sekolah',
      ],
    },
    {
      name: 'Prakarya - Rekayasa',
      category: 'Wajib',
      suggestedTopics: [
        'Teknologi Konstruksi Miniatur Rumah dan Jembatan',
        'Rangkaian Listrik Sederhana dan Sensor Cahaya/Gerak',
        'Penjernih Air Alami dan Sederhana',
        'Peralatan Teknologi Tepat Guna untuk Kehidupan Sehari-hari',
      ],
    },
    {
      name: 'Prakarya - Budi Daya',
      category: 'Wajib',
      suggestedTopics: [
        'Budi Daya Tanaman Sayuran dengan Metode Hidroponik dan Polybag',
        'Budi Daya Tanaman Obat Keluarga (TOGA)',
        'Budi Daya Ikan Konsumsi (Lele, Nila) dalam Kolam Terpal/Ember',
        'Pemeliharaan Ternak Kesayangan (Kelinci, Burung, Hamster)',
      ],
    },
    {
      name: 'Prakarya - Pengolahan',
      category: 'Wajib',
      suggestedTopics: [
        'Pengolahan Buah dan Sayur Menjadi Makanan dan Minuman Sehat',
        'Pengolahan Serealia, Kacang-kacangan, dan Umbi Menjadi Produk Pangan',
        'Pengolahan Hasil Peternakan dan Perikanan Nusantara',
        'Teknik Pengemasan dan Keamanan Pangan Higienis',
      ],
    },
    {
      name: 'Pendidikan Agama Islam dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Al-Qur\'an dan Hadis (Tajwid Hukum Nun Mati, Mim Mati, Mad)',
        'Aqidah: Meneladani Asmaul Husna dan Beriman kepada Hari Akhir',
        'Fiqih: Thaharah, Shalat Berjamaah, Shalat Sunnah, dan Zakat',
        'Akhlak Terpuji: Amanah, Jujur, Berbakti kepada Orang Tua dan Guru',
        'Sejarah Peradaban Islam: Khulafaur Rasyidin dan Daulah Umayyah',
      ],
    },
    {
      name: 'Pendidikan Agama Kristen dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Allah Berkarya Menyelamatkan Manusia Melalui Yesus Kristus',
        'Hidup Bersyukur dalam Segala Situasi dan Kerendahan Hati',
        'Menjadi Garam dan Terang Dunia dalam Pergaulan Remaja',
        'Tanggung Jawab Memelihara Ciptaan Allah dan Perdamaian',
      ],
    },
    {
      name: 'Pendidikan Agama Katolik dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Aku Citra Allah yang Unik dan Berharga',
        'Peran Keluarga, Sahabat, dan Gereja dalam Pertumbuhan Iman',
        'Yesus Mewartakan Kerajaan Allah Melalui Sabda dan Mukjizat',
        'Membangun Solidaritas dan Kepedulian Sosial Kristiani',
      ],
    },
    {
      name: 'Pendidikan Agama Hindu dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Panca Sradha sebagai Sendi Keimanan Hindu',
        'Tri Kaya Parisudha dalam Pengendalian Diri',
        'Catur Asrama dan Kewajiban dalam Fase Kehidupan',
        'Kitab Suci Veda dan Nilai-Nilai Kebaikan Yadnya',
      ],
    },
    {
      name: 'Pendidikan Agama Buddha dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Empat Kebenaran Mulia (Cattari Ariya Saccani)',
        'Hukum Kamma dan Kelahiran Kembali (Punasbhava)',
        'Jalan Mulia Berunsur Delapan (Ariya Atthangika Magga)',
        'Praktik Meditasi dan Pengembangan Cinta Kasih (Metta)',
      ],
    },
    {
      name: 'Bahasa Sunda (Muatan Lokal)',
      category: 'Wajib',
      suggestedTopics: [
        'Paguneman (Percakapan Sehari-hari Menggunakan Undak-Usuk Basa)',
        'Kaulinan Barudak Lembur dan Kakawihan Tradisional',
        'Warta dan Wawancara Basa Sunda',
        'Carita Pondok (Carpon) dan Sajak Sunda',
        'Aksara Sunda Tradisional Kaganga',
      ],
    },
    {
      name: 'Bahasa Jawa (Muatan Lokal)',
      category: 'Wajib',
      suggestedTopics: [
        'Unggah-Ungguh Basa Jawa (Ngoko Lugu, Ngoko Alus, Krama Lugu, Krama Alus)',
        'Tembang Macapat (Pocung, Gambuh, Sinom) dan Maknanya',
        'Crita Cekak (Crikak) dan Cerita Wayang Ramayana/Mahabharata',
        'Aksara Jawa (Sandhangan, Pasangan, dan Aksara Murda)',
        'Pranata Adicara (Pambiwara / Pembawa Acara Adat Jawa)',
      ],
    },
    {
      name: 'Bimbingan dan Konseling (BK)',
      category: 'Wajib',
      suggestedTopics: [
        'Pemahaman Potensi Diri, Bakat, dan Minat Remaja',
        'Manajemen Waktu Belajar dan Pencegahan Prokrastinasi',
        'Keterampilan Komunikasi Asertif dan Anti-Bullying (Perundungan)',
        'Eksplorasi Perencanaan Karier dan Pilihan Sekolah Lanjutan (SMA/SMK)',
      ],
    },
  ],
  MTs: [
    {
      name: 'Al-Qur\'an Hadis',
      category: 'Wajib',
      suggestedTopics: ['Hukum Bacaan Mad', 'Kandungan Surah Pendek Pilihan', 'Hadis tentang Kebersihan dan Menuntut Ilmu'],
    },
    {
      name: 'Akidah Akhlak',
      category: 'Wajib',
      suggestedTopics: ['Aqidah Islam dan Dalilnya', 'Sifat Wajib, Mustahil, Jaiz bagi Allah', 'Akhlak Terpuji (Ikhlas, Taat, Sabar)'],
    },
    {
      name: 'Fiqih',
      category: 'Wajib',
      suggestedTopics: ['Bersuci dari Hadats dan Najis', 'Shalat Fardhu dan Sunnah', 'Zakat dan Ketentuannya'],
    },
    {
      name: 'Sejarah Kebudayaan Islam (SKI)',
      category: 'Wajib',
      suggestedTopics: ['Masyarakat Arab Pra-Islam', 'Misi Dakwah Nabi Muhammad SAW', 'Khulafaur Rasyidin'],
    },
    {
      name: 'Bahasa Arab',
      category: 'Wajib',
      suggestedTopics: ['At-Ta\'aruf (Perkenalan)', 'Al-Adawatul Madrasiyyah (Peralatan Sekolah)', 'Al-Unwan (Alamat)'],
    },
  ],
  SMA: [
    {
      name: 'Matematika Umum',
      category: 'Wajib',
      suggestedTopics: [
        'Sistem Persamaan dan Pertidaksamaan Linear Tiga Variabel (SPLTV)',
        'Fungsi Kuadrat dan Rasional',
        'Komposisi Fungsi dan Invers Fungsi',
        'Trigonometri (Perbandingan Trigonometri Segitiga Siku-siku)',
        'Barisan dan Deret Aritmetika serta Geometri',
        'Statistika Deskriptif dan Peluang',
      ],
    },
    {
      name: 'Bahasa Indonesia',
      category: 'Wajib',
      suggestedTopics: [
        'Menganalisis Teks Laporan Hasil Observasi',
        'Menyusun Teks Eksposisi berbasis Fakta dan Opini',
        'Teks Anekdot Mengkritik Fenomena Sosial',
        'Teks Negosiasi untuk Mencapai Kesepakatan',
        'Teks Biografi Tokoh Inspiratif',
      ],
    },
    {
      name: 'Fisika',
      category: 'Pilihan',
      suggestedTopics: [
        'Pengukuran dan Angka Penting',
        'Kinematika Gerak Lurus (GLB dan GLBB)',
        'Dinamika Gerak (Hukum Gerak Newton)',
        'Usaha dan Energi kinetik-potensial',
        'Momentum, Impuls, dan Tumbukan',
        'Fluida Statis dan Dinamis',
      ],
    },
    {
      name: 'Biologi',
      category: 'Pilihan',
      suggestedTopics: [
        'Keanekaragaman Hayati Indonesia dan Upaya Pelestariannya',
        'Virus dan Peranannya dalam Kehidupan',
        'Bakteri dan Jamur (Fungi)',
        'Struktur dan Fungsi Jaringan Tumbuhan dan Hewan',
        'Sistem Organ Tubuh Manusia (Pencernaan, Peredaran Darah, Respirasi)',
      ],
    },
    {
      name: 'Kimia',
      category: 'Pilihan',
      suggestedTopics: [
        'Struktur Atom dan Tabel Periodik Unsur',
        'Ikatan Kimia (Kovalen, Ionik, Logam)',
        'Hukum-Hukum Dasar Kimia dan Stoikiometri',
        'Larutan Elektrolit dan Non-Elektrolit',
        'Konsep Redoks dan Tata Nama Senyawa',
      ],
    },
    {
      name: 'Ekonomi',
      category: 'Pilihan',
      suggestedTopics: [
        'Konsep Ilmu Ekonomi, Kelangkaan, dan Biaya Peluang',
        'Masalah Pokok Ekonomi dan Sistem Ekonomi',
        'Perilaku Konsumen dan Produsen',
        'Keseimbangan Pasar dan Elastisitas',
        'Lembaga Jasa Keuangan (Bank dan Non-Bank)',
      ],
    },
    {
      name: 'Sosiologi',
      category: 'Pilihan',
      suggestedTopics: [
        'Sosiologi sebagai Ilmu Mengkaji Masyarakat',
        'Individu, Kelompok, dan Hubungan Sosial',
        'Ragam Gejala Sosial dan Nilai-Norma',
        'Konflik, Kekerasan, dan Perdamaian',
      ],
    },
  ],
  MA: [
    {
      name: 'Al-Qur\'an Hadis',
      category: 'Wajib',
      suggestedTopics: ['Ilmu Hadis dan Klasifikasinya', 'Ayat-Ayat tentang Menuntut Ilmu dan Tanggung Jawab Manusia'],
    },
    {
      name: 'Fiqih',
      category: 'Wajib',
      suggestedTopics: ['Hukum Islam tentang Muamalah', 'Pernikahan dalam Islam', 'Mawaris / Hukum Waris'],
    },
  ],
  SMK: [
    // --- KELOMPOK MATA PELAJARAN UMUM ---
    {
      name: 'Pendidikan Pancasila',
      category: 'Wajib',
      suggestedTopics: [
        'Keterkaitan Sila-Sila Pancasila dalam Kehidupan Berbangsa dan Dunia Kerja',
        'UUD NRI Tahun 1945 sebagai Sumber Hukum Tertinggi',
        'Harmoni Keberagaman Sosial Budaya dan Budaya Industri 5S/5R',
        'Kewarganegaraan Digital dan Bela Negara bagi Tenaga Kerja Terampil',
      ],
    },
    {
      name: 'Bahasa Indonesia',
      category: 'Wajib',
      suggestedTopics: [
        'Menyusun Surat Lamaran Pekerjaan dan Daftar Riwayat Hidup (CV) Profesional',
        'Menganalisis Teks Laporan Hasil Observasi Industri dan Riset Pasar',
        'Teks Negosiasi Bisnis, Penawaran Kerja Sama, dan Notula Rapat',
        'Penyusunan Proposal Usaha dan Laporan Progres Proyek Pekerjaan',
        'Karya Ilmiah Populer dan Resensi Buku Kejuruan',
      ],
    },
    {
      name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
      category: 'Wajib',
      suggestedTopics: [
        'Aktivitas Kebugaran Jasmani untuk Mendukung Ergonomi dan Produktivitas Kerja',
        'Keterampilan Cabang Olahraga Beregu (Futsal, Bola Voli, Bola Basket)',
        'Keterampilan Cabang Olahraga Bela Diri dan Ketahanan Fisik',
        'Ergonomi Kerja, Pencegahan Cedera di Tempat Kerja, dan P3K',
        'Pola Hidup Bersih dan Sehat (PHBS) serta Bahaya Zat Adiktif',
      ],
    },
    {
      name: 'Sejarah',
      category: 'Wajib',
      suggestedTopics: [
        'Sejarah Perjuangan Bangsa Menuju Kemerdekaan Indonesia',
        'Perkembangan Jalur Perdagangan dan Rempah Nusantara',
        'Dinamika Perkembangan Industri dan Teknologi di Indonesia Pascakemerdekaan',
        'Peran Tokoh Bangsa dalam Membangun Kemandirian Ekonomi Indonesia',
      ],
    },
    {
      name: 'Seni Budaya',
      category: 'Wajib',
      suggestedTopics: [
        'Eksplorasi Konsep Seni Terapan dan Desain Industri Kreatif',
        'Karya Seni Rupa Tradisional dan Modern Nusantara',
        'Apresiasi Musik dan Pertunjukan Seni Budaya Nusantara',
        'Penyelenggaraan Pameran Karya Kreatif Kejuruan',
      ],
    },
    {
      name: 'Pendidikan Agama Islam dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Kajian Al-Qur\'an dan Hadis tentang Etos Kerja Keras dan Tanggung Jawab',
        'Aqidah: Meneladani Asmaul Husna dalam Kejujuran dan Integritas Profesi',
        'Fiqih Muamalah: Jual Beli Halal, Transaksi Digital, dan Menghindari Riba',
        'Etika dan Akhlak Kerja Profesional serta Kepedulian Sosial',
      ],
    },
    {
      name: 'Pendidikan Agama Kristen dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Panggilan Hidup Kristiani dalam Dunia Kerja dan Karya Pelayanan',
        'Integritas, Kejujuran, dan Kesetiaan dalam Menjalankan Profesi',
        'Tanggung Jawab Moral dalam Mengelola Iptek dan Kelestarian Alam',
      ],
    },
    {
      name: 'Pendidikan Agama Katolik dan Budi Pekerti',
      category: 'Wajib',
      suggestedTopics: [
        'Ajaran Sosial Gereja tentang Harkat Martabat Tenaga Kerja',
        'Mengembangkan Talenta untuk Kesejahteraan Bersama (Bonum Commune)',
        'Suara Hati dan Tanggung Jawab Etis dalam Dunia Usaha',
      ],
    },
    {
      name: 'Bahasa Sunda / Bahasa Jawa (Muatan Lokal)',
      category: 'Wajib',
      suggestedTopics: [
        'Komunikasi Santun Berbahasa Daerah dalam Pelayanan Masyarakat',
        'Tata Krama, Unggah-Ungguh Basa, dan Nilai Kearifan Lokal Daerah',
        'Pelestarian Seni Pertunjukan dan Sastra Daerah',
      ],
    },

    // --- KELOMPOK MATA PELAJARAN KEJURUAN UMUM ---
    {
      name: 'Matematika Terapan (Kejuruan)',
      category: 'Wajib',
      suggestedTopics: [
        'Eksponen, Logaritma, dan Barisan Deret Terapan Finansial/Produksi',
        'Sistem Persamaan Linear Dua & Tiga Variabel dalam Efisiensi Biaya',
        'Matriks dan Vektor untuk Transformasi dan Pemrograman',
        'Trigonometri Terapan (Pengukuran Sudut, Ketinggian, Jarak, Gaya)',
        'Program Linear dalam Optimasi Alokasi Sumber Daya Industri',
        'Statistika Terapan, Pengendalian Mutu (Quality Control), dan Peluang',
      ],
    },
    {
      name: 'Bahasa Inggris Kejuruan / Komunikasi Bisnis',
      category: 'Wajib',
      suggestedTopics: [
        'Professional Job Interviews and Self Presentation',
        'Business Correspondence: Inquiries, Complaints, and Quotations',
        'Handling Phone Calls and Customer Services',
        'Understanding Technical Manuals and Standard Operating Procedures (SOP)',
        'Presentation of Products, Services, and Project Reports',
      ],
    },
    {
      name: 'Informatika SMK',
      category: 'Wajib',
      suggestedTopics: [
        'Berpikir Komputasional dan Pemecahan Masalah Kompleks Industri',
        'Teknologi Informasi dan Komunikasi: Kolaborasi Dokumen Cloud & Lembar Sebar Lanjut',
        'Sistem Komputer: Arsitektur Perangkat Keras, Lunak, dan Jaringan Dasar',
        'Keamanan Siber (Cyber Security) dan Etika Jejak Digital',
        'Analisis Data Terapan dan Algoritma Pemrograman Terstruktur',
      ],
    },
    {
      name: 'Projek Ilmu Pengetahuan Alam dan Sosial (Projek IPAS)',
      category: 'Wajib',
      suggestedTopics: [
        'Makhluk Hidup dan Lingkungannya serta Dampak Polusi Industri',
        'Zat dan Perubahannya dalam Industri Manufaktur dan Pangan',
        'Energi dan Perubahannya: Energi Terbarukan dan Efisiensi Energi',
        'Konektivitas Antarruang dan Dampak Perkembangan Teknologi Ekonomi',
        'Perilaku Ekonomi dan Kesejahteraan Sosial Masyarakat Industri',
      ],
    },
    {
      name: 'Projek Kreatif dan Kewirausahaan (PKK)',
      category: 'Wajib',
      suggestedTopics: [
        'Sikap dan Perilaku Wirausahawan Berkarakter Inovatif',
        'Analisis Peluang Usaha Produk/Jasa Berbasis Analisis SWOT',
        'Hak Atas Kekayaan Intelektual (HAKI) dan Standardisasi Produk (SNI)',
        'Pembuatan Prototype / Desain Produk Barang dan Jasa',
        'Perhitungan Biaya Produksi, Harga Pokok Penjualan (HPP), dan Titik Impas (BEP)',
        'Strategi Pemasaran Digital (Digital Marketing) dan Laporan Keuangan Sederhana',
      ],
    },

    // --- KONSENTRASI KEAHLIAN TIK & MULTIMEDIA ---
    {
      name: 'Dasar-Dasar Teknik Jaringan Komputer dan Telekomunikasi (TJKT)',
      category: 'Pilihan',
      suggestedTopics: [
        'Proses Bisnis di Bidang Teknik Jaringan Komputer dan Telekomunikasi',
        'Perkembangan Teknologi di Bidang Jaringan: 5G, IoT, Cloud Computing',
        'Keselamatan dan Kesehatan Kerja Lingkungan Hidup (K3LH) Bidang TIK',
        'Dasar-Dasar Teknik Jaringan Komputer: Topologi, Kabel UTP, dan Crimping',
        'Alat Ukur Jaringan dan Protokol Jaringan (TCP/IP, Subnetting IPv4/IPv6)',
      ],
    },
    {
      name: 'Teknik Komputer dan Jaringan (TKJ)',
      category: 'Pilihan',
      suggestedTopics: [
        'Perencanaan dan Pengalamatan Jaringan (CIDR, VLSM)',
        'Konfigurasi Perangkat Jaringan: Routing Statis dan Dinamis (MikroTik/Cisco)',
        'Instalasi dan Konfigurasi Jaringan Nirkabel (Wireless Access Point, VLAN)',
        'Administrasi Sistem Server: DNS, DHCP, Web Server, FTP, dan Database Server',
        'Keamanan Jaringan (Firewall, NAT, IDS/IPS, VPN)',
        'Teknologi Jaringan Fiber Optic (Splicing, OTDR, OPM, dan FTTH)',
      ],
    },
    {
      name: 'Dasar-Dasar Pengembangan Perangkat Lunak dan Gim (PPLG)',
      category: 'Pilihan',
      suggestedTopics: [
        'Wawasan Industri Pengembangan Perangkat Lunak dan Gim',
        'Pemrograman Terstruktur (Variabel, Tipe Data, Kondisional, Perulangan)',
        'Pemrograman Berorientasi Objek (OOP: Class, Object, Encapsulation, Inheritance)',
        'Dasar-Dasar Basis Data Relasional (SQL: DDL, DML, DQL)',
        'User Interface (UI) dan User Experience (UX) Desain',
      ],
    },
    {
      name: 'Rekayasa Perangkat Lunak (RPL) / Pemrograman Web & Mobile',
      category: 'Pilihan',
      suggestedTopics: [
        'Pemrograman Web Frontend (HTML5, CSS3, JavaScript, Tailwind/Bootstrap)',
        'Pemrograman Web Backend (PHP/Node.js/Python, RESTful API, MVC Framework)',
        'Pengelolaan Basis Data Lanjut (MySQL/PostgreSQL, Trigger, Stored Procedure)',
        'Pemrograman Aplikasi Perangkat Bergerak (Mobile: Flutter/React Native/Android)',
        'Pengujian Perangkat Lunak (Software Testing) dan Version Control (Git/GitHub)',
      ],
    },
    {
      name: 'Dasar-Dasar Desain Komunikasi Visual (DKV)',
      category: 'Pilihan',
      suggestedTopics: [
        'Unsur-Unsur Rupa dan Prinsip Tata Rupa (Komposisi, Harmoni, Keseimbangan)',
        'Tipografi dan Psikologi Warna dalam Komunikasi Visual',
        'Fotografi Dasar: Segitiga Exposure, Framing, dan Komposisi Foto',
        'Pengoperasian Perangkat Lunak Desain Grafis Vektor dan Bitmap',
      ],
    },
    {
      name: 'Desain Grafis Percetakan dan Multimedia',
      category: 'Pilihan',
      suggestedTopics: [
        'Desain Publikasi Cetak: Brosur, Flyer, Poster, dan Kemasan (Packaging)',
        'Teknik Pre-Press, Separasi Warna (CMYK), dan Manajemen File Siap Cetak',
        'Editing Audio dan Video Digital (Premiere Pro, DaVinci Resolve)',
        'Produksi Konten Media Sosial Interaktif dan Branding Visual Perusahaan',
      ],
    },
    {
      name: 'Animasi (2D dan 3D)',
      category: 'Pilihan',
      suggestedTopics: [
        '12 Prinsip Dasar Animasi (Squash & Stretch, Timing, Anticipation)',
        'Pembuatan Storyboard, Karakter Desain, dan Lembar Model (Model Sheet)',
        'Animasi 2D Tradisional dan Digital (Rigging, Frame-by-Frame, Tweening)',
        'Modeling Objek 3D, Texturing, Lighting, dan Rendering Animasi',
      ],
    },
    {
      name: 'Sistem Informasi, Jaringan, dan Aplikasi (SIJA)',
      category: 'Pilihan',
      suggestedTopics: [
        'Infrastruktur Komputasi Awan (Cloud Infrastructure as a Service)',
        'Sistem Internet of Things (IoT: Sensor, Mikrokontroler, MQTT)',
        'Integrasi Sistem Informasi Perusahaan dan Big Data Analytics',
      ],
    },

    // --- KONSENTRASI KEAHLIAN TEKNOLOGI MANUFAKTUR & OTOMOTIF ---
    {
      name: 'Dasar-Dasar Teknik Otomotif (DTO)',
      category: 'Pilihan',
      suggestedTopics: [
        'Keselamatan dan Kesehatan Kerja Lingkungan Hidup (K3LH) Bengkel Otomotif',
        'Penggunaan Hand Tools, Power Tools, dan Special Service Tools (SST)',
        'Alat Ukur Mekanik, Pneumatik, dan Elektrik (Jangka Sorong, Micrometer, Multimeter)',
        'Prinsip Kerja Motor Bakar 4 Langkah (4 Tak) dan 2 Langkah (2 Tak)',
      ],
    },
    {
      name: 'Teknik Kendaraan Ringan (TKR)',
      category: 'Pilihan',
      suggestedTopics: [
        'Pemeliharaan Mesin Kendaraan Ringan (Tune-up, Valve Clearance, EFI System)',
        'Sistem Bahan Bakar Bensin Common Rail dan Injeksi Elektronik',
        'Pemeliharaan Sasis: Sistem Rem (ABS), Kemudi (Power Steering), dan Suspensi',
        'Pemeliharaan Sistem Pemindah Tenaga: Kopling, Transmisi Manual/Otomatis, Diferensial',
        'Kelistrikan Bodi, Sistem Penerangan, AC Mobil, dan Engine Scanner (OBD-II)',
      ],
    },
    {
      name: 'Teknik dan Bisnis Sepeda Motor (TBSM)',
      category: 'Pilihan',
      suggestedTopics: [
        'Perawatan Berkala Mesin Sepeda Motor Karburator dan PGM-FI (Injeksi)',
        'Sistem Transmisi Otomatis (CVT) dan Manual Sepeda Motor',
        'Sistem Kelistrikan Sepeda Motor: Starter, Pengisian, Pengapian, dan Injeksi',
        'Servis Sasis Sepeda Motor: Suspensi, Rangka, dan Sistem Pengereman Hidrolik',
        'Pengelolaan Usaha Bengkel dan Layanan Servis Sepeda Motor',
      ],
    },
    {
      name: 'Dasar-Dasar Teknik Mesin',
      category: 'Pilihan',
      suggestedTopics: [
        'Gambar Teknik Manufaktur (Proyeksi Piktorial, Ortogonal, dan Toleransi Ukuran)',
        'Pengerjaan Logam Dasar: Mengikir, Memahat, Menggergaji, dan Mengetap',
        'Pekerjaan Mesin Bubut Konvensional (Membubut Muka, Rata, Tirus, Ulir)',
        'Pekerjaan Mesin Frais Konvensional (Milling Horizontal dan Vertikal)',
        'Pengenalan Mesin Perkakas Modern Computer Numerical Control (CNC)',
      ],
    },
    {
      name: 'Teknik Pengelasan (Welding)',
      category: 'Pilihan',
      suggestedTopics: [
        'Pengelasan Shielded Metal Arc Welding (SMAW) Posisi 1F, 2F, 1G, 2G',
        'Pengelasan Gas Metal Arc Welding (GMAW / MIG/MAG)',
        'Pengelasan Gas Tungsten Arc Welding (GTAW / TIG)',
        'Pemeriksaan Hasil Las Visual dan Non-Destructive Testing (NDT)',
      ],
    },
    {
      name: 'Teknik Ketenagalistrikan / TITL',
      category: 'Pilihan',
      suggestedTopics: [
        'Instalasi Penerangan Listrik Bangunan Gedung sesuai PUIL 2020',
        'Instalasi Tenaga Listrik 3 Fasa dan Panel Hubung Bagi (PHB)',
        'Instalasi Motor Listrik berbasis Kontaktor Magnetik dan Programmable Logic Controller (PLC)',
        'Perbaikan dan Pemeliharaan Peralatan Rumah Tangga Listrik',
      ],
    },
    {
      name: 'Desain Pemodelan dan Informasi Bangunan (DPIB)',
      category: 'Pilihan',
      suggestedTopics: [
        'Menggambar Rencana Denah, Tampak, dan Potongan Bangunan Gedung (2D CAD)',
        'Pemodelan Struktur Beton Bertulang, Baja, dan Konstruksi Kayu',
        'Building Information Modeling (BIM 3D: Revit / ArchiCAD)',
        'Penyusunan Rencana Anggaran Biaya (RAB) dan Rencana Kerja Syarat (RKS)',
      ],
    },
    {
      name: 'Teknik Elektronika Industri (TEI)',
      category: 'Pilihan',
      suggestedTopics: [
        'Komponen Pasif dan Aktif Elektronika serta Pembuatan PCB',
        'Rangkaian Elektronika Daya: Dioda, Transistor, MOSFET, dan SCR',
        'Pemrograman Sistem Minimum Mikrokontroler (Arduino/ESP32)',
        'Sensor Industri, Tranduser, dan Aktuator Pneumatik/Hidrolik',
      ],
    },

    // --- KONSENTRASI KEAHLIAN BISNIS & MANAJEMEN ---
    {
      name: 'Dasar-Dasar Akuntansi dan Keuangan Lembaga (AKL)',
      category: 'Pilihan',
      suggestedTopics: [
        'Persamaan Dasar Akuntansi dan Analisis Transaksi Keuangan',
        'Siklus Akuntansi Perusahaan Jasa (Jurnal Umum hingga Laporan Keuangan)',
        'Siklus Akuntansi Perusahaan Dagang (Metode Fisik dan Perpetual)',
        'Etika Profesi Teknisi Akuntansi dan Prinsip K3 di Lingkungan Kantor',
      ],
    },
    {
      name: 'Praktikum Akuntansi Perusahaan Manufaktur & Instansi',
      category: 'Pilihan',
      suggestedTopics: [
        'Akuntansi Biaya: Biaya Bahan Baku, Tenaga Kerja Langsung, dan Biaya Overhead Pabrik (BOP)',
        'Penentuan Harga Pokok Produksi (Job Order Costing dan Process Costing)',
        'Akuntansi Keuangan: Piutang, Persediaan, Aset Tetap, dan Utang Jangka Panjang',
        'Akuntansi Keuangan Pemerintah Daerah dan Lembaga Non-Profit',
      ],
    },
    {
      name: 'Komputer Akuntansi (MYOB / Accurate / Spreadsheet)',
      category: 'Pilihan',
      suggestedTopics: [
        'Mengoperasikan Spreadsheet Keuangan (VLOOKUP, HLOOKUP, IF Bersarang, Pivot Table)',
        'Setup Data Awal Perusahaan, Bagan Akun (Chart of Accounts), dan Neraca Saldo',
        'Input Transaksi Pembelian, Penjualan, Penerimaan Kas, dan Rekonsiliasi Bank',
        'Menghasilkan Laporan Keuangan Otomatis (Laba Rugi, Neraca, Arus Kas)',
      ],
    },
    {
      name: 'Dasar-Dasar Manajemen Perkantoran dan Layanan Bisnis (MPLB)',
      category: 'Pilihan',
      suggestedTopics: [
        'Konsep Dasar Manajemen Perkantoran Modern dan Revolusi Industri 4.0',
        'Teknik Komunikasi Efektif dan Pelayanan Prima (Service Excellence)',
        'Pengelolaan Kearsipan Sistem Abjad, Kronologis, Subjek, dan Wilayah',
        'Teknik Mengetik Cepat 10 Jari Buta (Touch Typing)',
      ],
    },
    {
      name: 'Otomatisasi Tata Kelola Perkantoran (OTKP)',
      category: 'Pilihan',
      suggestedTopics: [
        'Otomatisasi Tata Kelola Kepegawaian (Rekrutmen, Cuti, Disiplin Pegawai)',
        'Otomatisasi Tata Kelola Keuangan (Dana Kas Kecil Imprest & Fluktuasi)',
        'Otomatisasi Tata Kelola Sarana dan Prasarana Pengadaan Barang',
        'Otomatisasi Tata Kelola Hubungan Masyarakat (Humas) dan Keprotokolan Acara',
      ],
    },
    {
      name: 'Dasar-Dasar Pemasaran / Bisnis Digital',
      category: 'Pilihan',
      suggestedTopics: [
        'Riset Pasar, Perilaku Konsumen, dan Segmentasi Pasar',
        'Komunikasi Bisnis dan Teknik Negosiasi Penjualan',
        'Pemasaran Digital: Search Engine Optimization (SEO), SEM, dan Social Media Ads',
        'Pengelolaan Konten E-Commerce dan Marketplace Marketplace Store Management',
      ],
    },
    {
      name: 'Pengelolaan Bisnis Ritel',
      category: 'Pilihan',
      suggestedTopics: [
        'Sistem Operasional Toko Ritel Modern dan Minimarket',
        'Manajemen Visual Merchandising (Display Produk, Fixture, POP)',
        'Manajemen Persediaan Barang Dagang (Stock Opname, FIFO, LIFO)',
        'Pengoperasian Mesin Kasir / Point of Sale (POS) dan Customer Service',
      ],
    },
    {
      name: 'Perbankan dan Keuangan Mikro',
      category: 'Pilihan',
      suggestedTopics: [
        'Sistem Perbankan Indonesia dan Regulasi Otoritas Jasa Keuangan (OJK)',
        'Pengelolaan Layanan Tabungan, Deposito, dan Giro Nasabah',
        'Pemberian Fasilitas Kredit Mikro dan Analisis Kelayakan 5C',
        'Pelayanan Kasir Teller dan Customer Service Perbankan',
      ],
    },

    // --- KONSENTRASI KEAHLIAN PARIWISATA, PERHOTELAN, & KULINER ---
    {
      name: 'Dasar-Dasar Perhotelan',
      category: 'Pilihan',
      suggestedTopics: [
        'Industri Perhotelan dan Struktur Organisasi Hotel Berbintang',
        'Etika Profesi Perhotelan, Grooming, dan Sanitasi Higiene',
        'Operasional Front Office: Reservasi, Check-in, Check-out, dan Bell Desk',
        'Operasional Housekeeping: Pembersihan Kamar (Make Up Room) dan Area Publik',
        'Layanan Laundry and Dry Cleaning Hotel',
      ],
    },
    {
      name: 'Dasar-Dasar Kuliner / Tata Boga',
      category: 'Pilihan',
      suggestedTopics: [
        'Sanitasi, Higiene, dan Keselamatan Kerja di Dapur Profesional (HACCP)',
        'Mengenal Peralatan Dapur Komersial dan Teknik Potongan Sayur (Cutting Techniques)',
        'Pengolahan Kaldu (Stock), Saus Dasar (Mother Sauces), dan Sup',
        'Pengolahan Makanan Tradisional Indonesia (Nasi, Lauk Pauk, Sambal)',
        'Pengolahan Makanan Kontinental (Appetizer, Main Course, Dessert)',
      ],
    },
    {
      name: 'Produk Pastry dan Bakery',
      category: 'Pilihan',
      suggestedTopics: [
        'Pengolahan Aneka Roti (Bread, Sweet Bread, Sourdough, Doughnut)',
        'Pengolahan Aneka Kue Tradisional Nusantara (Jajanan Pasar)',
        'Pengolahan Pastry: Puff Pastry, Danish, Choux Paste (Kue Sus)',
        'Dekorasi Kue Tart, Wedding Cake, dan Produk Cokelat (Praline)',
      ],
    },
    {
      name: 'Dasar-Dasar Desain dan Produksi Busana (Tata Busana)',
      category: 'Pilihan',
      suggestedTopics: [
        'Menggambar Anatomi Tubuh dan Desain Ilustrasi Mode (Fashion Sketching)',
        'Pengetahuan Tekstil: Serat Alami, Sintetis, dan Uji Pembakaran Kain',
        'Pembuatan Pola Dasar Busana Wanita, Pria, dan Anak (Pola Konstruksi & Draping)',
        'Teknik Menjahit Busana: Kampuh, Kelim, Saku, dan Pemasangan Ritsleting',
        'Penyelesaian Busana (Finishing, Fitting, Quality Control, dan Pengepakan)',
      ],
    },
    {
      name: 'Usaha Layanan Wisata (ULW)',
      category: 'Pilihan',
      suggestedTopics: [
        'Perencanaan dan Penghitungan Harga Paket Wisata (Tour Packaging)',
        'Pemanduan Wisata (Tour Guiding) di Objek Daya Tarik Wisata',
        'Pemesanan dan Penerbitan Tiket Transportasi Udara dan Kereta Api',
        'Layanan Dokumen Perjalanan Wisata (Paspor, Visa, Asuransi Perjalanan)',
      ],
    },
    {
      name: 'Tata Kecantikan Kulit dan Rambut',
      category: 'Pilihan',
      suggestedTopics: [
        'Perawatan Kulit Wajah Manual dan dengan Peralatan Teknologi Modern (Facial)',
        'Tata Rias Wajah Sehari-Hari, Rias Panggung, dan Rias Pengantin',
        'Perawatan Rambut: Pencucian, Creambath, Pemangkasan, dan Penataan Rambut',
        'Pewarnaan Rambut dan Pengeritingan / Pelurusan Rambut',
      ],
    },

    // --- KONSENTRASI KEAHLIAN KESEHATAN & PEKERJAAN SOSIAL ---
    {
      name: 'Dasar-Dasar Layanan Kesehatan / Keperawatan',
      category: 'Pilihan',
      suggestedTopics: [
        'Anatomi dan Fisiologi Tubuh Manusia (Sistem Sirkulasi, Respirasi, Saraf)',
        'Konsep Dasar Kebutuhan Manusia (Kebutuhan Oksigenasi, Nutrisi, Eliminasi)',
        'Pengukuran Tanda-Tanda Vital (Tekanan Darah, Nadi, Pernapasan, Suhu Tubuh)',
        'Prinsip Pencegahan dan Pengendalian Infeksi (PPI) di Fasilitas Pelayanan Kesehatan',
        'Keterampilan Memandikan Pasien, Mengganti Alat Tenun, dan Mobilisasi Pasien',
      ],
    },
    {
      name: 'Dasar-Dasar Farmasi Klinis dan Komunitas',
      category: 'Pilihan',
      suggestedTopics: [
        'Membaca dan Mengidentifikasi Kelengkapan Resep Dokter (Prescription Analysis)',
        'Kalkulasi Dosis Obat (Dosis Maksimum, Dosis Anak Berdasarkan Usia/Berat Badan)',
        'Teknik Pembuatan Sediaan Serbuk (Pulveres/Pulvis), Kapsul, Salep, dan Larutan',
        'Penggolongan Obat: Obat Bebas, Bebas Terbatas, Obat Keras, Psikotropika, Narkotika',
        'Farmakognosi: Mengenal Simplisia Nabati dari Rimpang, Daun, dan Bunga Herbal',
      ],
    },
    {
      name: 'Teknologi Laboratorium Medik (TLM)',
      category: 'Pilihan',
      suggestedTopics: [
        'Pengambilan Sampel Darah (Flebotomi Kapiler dan Vena)',
        'Pemeriksaan Hematologi Dasar: Hemoglobin, Leukosit, Trombosit, dan Laju Endap Darah',
        'Pemeriksaan Urinalisis dan Feses Rutin',
        'Sterilisasi dan Keselamatan Kerja di Laboratorium Medis (Biosafety)',
      ],
    },

    // --- KONSENTRASI KEAHLIAN AGRIBISNIS & KEMARITIMAN ---
    {
      name: 'Dasar-Dasar Agribisnis Tanaman (ATPH)',
      category: 'Pilihan',
      suggestedTopics: [
        'Penyiapan Lahan, Media Tanam, dan Pengolahan Tanah Pertanian',
        'Teknik Perbanyakan Tanaman Generatif (Biji) dan Vegetatif (Cangkok, Okulasi, Stek)',
        'Teknologi Hidroponik, Vertikultur, dan Greenhouse Pintar',
        'Pengendalian Hama dan Penyakit Tanaman Terpadu (PHT)',
      ],
    },
    {
      name: 'Dasar-Dasar Agribisnis Pengolahan Hasil Pertanian (APHP)',
      category: 'Pilihan',
      suggestedTopics: [
        'Prinsip Pengawetan Pangan dengan Suhu Tinggi, Suhu Rendah, dan Fermentasi',
        'Pengolahan Hasil Nabati (Olahan Kedelai, Buah, Sayur, Minyak Nabati)',
        'Pengolahan Hasil Hewani (Daging, Susu, Telur, dan Ikan)',
        'Uji Sensori dan Organoleptik Mutu Produk Pangan Olahan',
      ],
    },
    {
      name: 'Dasar-Dasar Nautika Kapal Penangkap Ikan (NKPI)',
      category: 'Pilihan',
      suggestedTopics: [
        'Navigasi Pantai dan Penggunaan Kompas serta Peta Laut',
        'Peraturan Internasional Pencegahan Tubrukan di Laut (P2TL)',
        'Teknik Pengoperasian Alat Tangkap Ikan (Gillnet, Longline, Purse Seine)',
        'Prosedur Darurat dan Keselamatan Jiwa di Laut (SOLAS)',
      ],
    },
  ],
  SD: [
    {
      name: 'Pendidikan Pancasila',
      category: 'Wajib',
      suggestedTopics: [
        'Simbol-Simbol Garuda Pancasila dan Maknanya',
        'Aturan di Rumah dan di Sekolah',
        'Aku Cinta Lingkungan Sekitar dan Gotong Royong',
        'Menghargai Keberagaman Teman Sebaya',
      ],
    },
    {
      name: 'Bahasa Indonesia',
      category: 'Wajib',
      suggestedTopics: [
        'Membaca Nyaring dan Memahami Isi Cerita Pendek',
        'Mengenal Kata Ajaib (Tolong, Maaf, Terima Kasih)',
        'Menceritakan Pengalaman Pribadi',
        'Menulis Kalimat Efektif dengan Tanda Baca yang Benar',
      ],
    },
    {
      name: 'Matematika',
      category: 'Wajib',
      suggestedTopics: [
        'Mengenal Bilangan Cacah sampai 100/1000',
        'Penjumlahan dan Pengurangan Bersusun',
        'Perkalian dan Pembagian Sederhana',
        'Mengenal Bangun Ruang dan Bangun Datar',
        'Pengukuran Panjang, Berat, dan Waktu',
      ],
    },
    {
      name: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
      category: 'Wajib',
      suggestedTopics: [
        'Bagian Tubuh Tumbuhan dan Fungsinya',
        'Siklus Hidup Hewan (Metamorfosis)',
        'Wujud Zat dan Perubahannya',
        'Gaya di Sekitar Kita (Gaya Gesek, Gravitasi, Magnet)',
        'Peta dan Daerah Tempat Tinggalku',
      ],
    },
  ],
  MI: [
    {
      name: 'Al-Qur\'an Hadis',
      category: 'Wajib',
      suggestedTopics: ['Huruf Hijaiyah dan Harakat', 'Surah Al-Fatihah dan Surah Pendek', 'Hadis tentang Silaturahmi'],
    },
    {
      name: 'Akidah Akhlak',
      category: 'Wajib',
      suggestedTopics: ['Kalimat Thayyibah', 'Asmaul Husna (Ar-Rahman, Ar-Rahim)', 'Adab terhadap Orang Tua dan Guru'],
    },
    {
      name: 'Fiqih',
      category: 'Wajib',
      suggestedTopics: ['Tata Cara Wudhu dan Tayammum', 'Shalat Fardhu Lima Waktu', 'Makanan Halal dan Haram'],
    },
    {
      name: 'Sejarah Kebudayaan Islam (SKI)',
      category: 'Wajib',
      suggestedTopics: ['Kisah Nabi Muhammad SAW Sejak Kecil', 'Peristiwa Isra Miraj', 'Hijrah ke Madinah'],
    },
    {
      name: 'Bahasa Arab',
      category: 'Wajib',
      suggestedTopics: ['Angka 1-10', 'Warna-Warna (Al-Alwan)', 'Anggota Tubuh (A\'dha-ul Jismi)'],
    },
  ],
};

export const DEFAULT_KOP_CONFIG: SchoolKopConfig = {
  govermentHeader1: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
  govermentHeader2: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  subHeader: 'CABANG DINAS PENDIDIKAN WILAYAH I',
  schoolName: 'SMP NEGERI 1 TELADAN BANGSA',
  accreditation: 'Terakreditasi A (Unggul) - NPSN: 20219988',
  address: 'Jl. Pendidikan No. 45, Kecamatan Sukamaju, Kabupaten Pendidikan 16911',
  contact: 'Telp: (021) 8765432 | Pos-el: smpn1teladan@sekolah.sch.id',
  website: 'https://smpn1teladan.sch.id',
  logoLeftUrl: '', // Default svg will render if empty
  logoRightUrl: '', // Default svg will render if empty
  headmasterName: 'Dr. H. Ahmad Fauzi, M.Pd.',
  headmasterNip: '19750812 199903 1 004',
  teacherName: 'Siti Rahmawati, S.Pd., Gr.',
  teacherNip: '19890425 201502 2 003',
  cityDate: 'Bogor, 2 Desember 2024',
};

export const DEFAULT_GENERAL_INSTRUCTIONS: string[] = [
  'Berdoalah kepada Tuhan Yang Maha Esa sebelum memulai mengerjakan soal.',
  'Tuliskan identitas Anda (Nama, Nomor Peserta, dan Kelas) secara lengkap pada lembar jawaban yang telah disediakan.',
  'Periksalah dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya.',
  'Laporkan kepada pengawas ujian apabila terdapat lembar soal yang kurang jelas, rusak, atau jumlah halamannya tidak lengkap.',
  'Dahulukan menjawab soal-soal yang Anda anggap mudah.',
  'Tidak diperkenankan menggunakan kalkulator, gawai, kamus, atau alat bantu lainnya tanpa izin pengawas.',
  'Periksa kembali seluruh jawaban Anda sebelum diserahkan kepada pengawas ujian.',
];
