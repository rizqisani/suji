import { ExamPackage, SchoolKopConfig, SchoolKopProfile } from '../types/exam';
import { DEFAULT_KOP_CONFIG } from '../data/curriculumData';
import { SAMPLE_EXAMS } from '../data/defaultPresets';
import { notifyAppStateChanged } from './appStateEvents';

export const STORAGE_KEY_EXAMS = 'si_ujian_exam_bank_v1';
export const STORAGE_KEY_KOP = 'si_ujian_kop_config_v1';

export function loadSavedExams(): ExamPackage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXAMS);
    if (raw === null) {
      // First time initialization: seed with default presets
      try {
        localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(SAMPLE_EXAMS));
      } catch {}
      return SAMPLE_EXAMS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SAMPLE_EXAMS;
    return parsed.map((exam: ExamPackage) => {
      if (!exam?.examSummary) return exam;
      const isLegacySas = exam.examSummary.examType === 'SAS';
      const title = exam.examSummary.title || '';
      const hasSasTitle = /\(SAS\)|\bSAS\b/i.test(title);
      if (!isLegacySas && !hasSasTitle) return exam;
      return {
        ...exam,
        examSummary: {
          ...exam.examSummary,
          examType: isLegacySas ? 'PSAS' : exam.examSummary.examType,
          title: title
            .replace(/\(SAS\)/gi, '(PSAS)')
            .replace(/\bSAS\b/g, 'PSAS'),
        },
      };
    });
  } catch (e) {
    console.error('Failed to load exams from localStorage', e);
    return SAMPLE_EXAMS;
  }
}

export function saveExamToBank(exam: ExamPackage): void {
  try {
    const currentList = loadSavedExams();
    const safeExam = {
      ...exam,
      id: exam.id || `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      updatedAt: new Date().toISOString(),
    };
    const existingIndex = currentList.findIndex((item) => item.id === safeExam.id);

    let newList: ExamPackage[];
    if (existingIndex >= 0) {
      newList = [...currentList];
      newList[existingIndex] = safeExam;
    } else {
      newList = [safeExam, ...currentList];
    }

    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(newList));
    notifyAppStateChanged();
  } catch (e) {
    console.error('Failed to save exam to localStorage', e);
  }
}

export function saveMultipleExamsToBank(exams: ExamPackage[]): ExamPackage[] {
  try {
    const currentList = loadSavedExams();
    const listCopy = [...currentList];

    for (const exam of exams) {
      const safeExam: ExamPackage = {
        ...exam,
        id: exam.id || `exam-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        updatedAt: new Date().toISOString(),
      };
      const existingIndex = listCopy.findIndex((item) => item.id === safeExam.id);
      if (existingIndex >= 0) {
        listCopy[existingIndex] = safeExam;
      } else {
        listCopy.unshift(safeExam);
      }
    }

    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(listCopy));
    notifyAppStateChanged();
    return listCopy;
  } catch (e) {
    console.error('Failed to save multiple exams to localStorage', e);
    return loadSavedExams();
  }
}

export function deleteExamFromBank(id: string, currentExams?: ExamPackage[]): ExamPackage[] {
  const sourceList = Array.isArray(currentExams) && currentExams.length > 0 ? currentExams : loadSavedExams();
  const filtered = sourceList.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(filtered));
    notifyAppStateChanged();
  } catch (e) {
    console.error('Failed to persist deleted exam state to localStorage', e);
  }
  return filtered;
}

export function loadSavedKopConfig(): SchoolKopConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KOP);
    if (!raw) return DEFAULT_KOP_CONFIG;
    return { ...DEFAULT_KOP_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_KOP_CONFIG;
  }
}

export function saveKopConfig(config: SchoolKopConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_KOP, JSON.stringify(config));
    notifyAppStateChanged();
  } catch (e) {
    console.error('Failed to save kop config', e);
  }
}


export const STORAGE_KEY_PROFILES = 'si_ujian_school_profiles_v1';

export const DEFAULT_SCHOOL_PROFILES: SchoolKopProfile[] = [
  {
    id: 'profile-smp-1',
    name: 'SMP Negeri 1 Teladan Bangsa',
    config: {
      ...DEFAULT_KOP_CONFIG,
      schoolName: 'SMP NEGERI 1 TELADAN BANGSA',
    },
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'profile-smk-2',
    name: 'SMK Negeri 2 Teknologi Industri',
    config: {
      ...DEFAULT_KOP_CONFIG,
      govermentHeader1: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
      govermentHeader2: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
      subHeader: 'CABANG DINAS PENDIDIKAN WILAYAH I',
      schoolName: 'SMK NEGERI 2 TEKNOLOGI INDUSTRI',
      accreditation: 'Terakreditasi A (Unggul) - NPSN: 20218899',
      address: 'Jl. Industri Raya No. 12, Cikarang, Kabupaten Bekasi 17530',
      contact: 'Telp: (021) 8901234 | Pos-el: smkn2tekind@sch.id',
      website: 'https://smkn2tekind.sch.id',
      headmasterName: 'Dr. H. M. Ridwan, M.T.',
      headmasterNip: '19720315 199802 1 002',
      teacherName: 'Rizqi Sani, S.Kom., Gr.',
      teacherNip: '19900512 201903 1 001',
      cityDate: 'Bekasi, 5 Desember 2024',
    },
    updatedAt: new Date().toISOString(),
  },
];

export function loadSavedSchoolProfiles(): SchoolKopProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(DEFAULT_SCHOOL_PROFILES));
      return DEFAULT_SCHOOL_PROFILES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SCHOOL_PROFILES;
  } catch (e) {
    console.error('Failed to load school profiles', e);
    return DEFAULT_SCHOOL_PROFILES;
  }
}

export function saveSchoolProfile(profile: Omit<SchoolKopProfile, 'id' | 'updatedAt'> & { id?: string }): SchoolKopProfile[] {
  try {
    const list = loadSavedSchoolProfiles();
    const id = profile.id || `profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newProfile: SchoolKopProfile = {
      id,
      name: profile.name || profile.config.schoolName || 'Profil Sekolah Baru',
      config: profile.config,
      updatedAt: new Date().toISOString(),
    };
    const idx = list.findIndex((p) => p.id === id);
    let updated: SchoolKopProfile[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = newProfile;
    } else {
      updated = [newProfile, ...list];
    }
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updated));
    notifyAppStateChanged();
    return updated;
  } catch (e) {
    console.error('Failed to save school profile', e);
    return loadSavedSchoolProfiles();
  }
}

export function deleteSchoolProfile(id: string): SchoolKopProfile[] {
  try {
    const list = loadSavedSchoolProfiles();
    const filtered = list.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(filtered));
    notifyAppStateChanged();
    return filtered;
  } catch (e) {
    console.error('Failed to delete school profile', e);
    return loadSavedSchoolProfiles();
  }
}
