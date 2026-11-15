import React, { useState, useEffect } from 'react';
import { SchoolKopConfig, SchoolKopProfile } from '../types/exam';
import { LogoDinasDefault, LogoTutWuriDefault } from './OfficialLogos';
import { X, Check, Upload, RotateCcw, Building2, UserCheck, Bookmark, Trash2, PlusCircle } from 'lucide-react';
import { DEFAULT_KOP_CONFIG } from '../data/curriculumData';
import { loadSavedSchoolProfiles, saveSchoolProfile, deleteSchoolProfile } from '../utils/storage';

interface SchoolKopModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SchoolKopConfig;
  onSave: (newConfig: SchoolKopConfig) => void;
}

export const SchoolKopModal: React.FC<SchoolKopModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<SchoolKopConfig>({ ...config });
  const [activeTab, setActiveTab] = useState<'kop' | 'pejabat'>('kop');
  const [profiles, setProfiles] = useState<SchoolKopProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [newProfileName, setNewProfileName] = useState('');
  const [showSaveProfileBox, setShowSaveProfileBox] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...config });
      const loaded = loadSavedSchoolProfiles();
      setProfiles(loaded);
      // Try to match current config with a saved profile
      const matched = loaded.find((p) => p.config.schoolName === config.schoolName);
      if (matched) {
        setSelectedProfileId(matched.id);
      } else {
        setSelectedProfileId('');
      }
      setShowSaveProfileBox(false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    const found = profiles.find((p) => p.id === profileId);
    if (found) {
      setFormData({ ...found.config });
    }
  };

  const handleSaveAsNewProfile = () => {
    const name = newProfileName.trim() || formData.schoolName || 'Profil Sekolah Baru';
    const updated = saveSchoolProfile({
      name,
      config: formData,
    });
    setProfiles(updated);
    const newlyAdded = updated.find((p) => p.name === name);
    if (newlyAdded) setSelectedProfileId(newlyAdded.id);
    setNewProfileName('');
    setShowSaveProfileBox(false);
  };

  const handleDeleteCurrentProfile = () => {
    if (!selectedProfileId) return;
    if (confirm('Hapus profil sekolah tersimpan ini?')) {
      const updated = deleteSchoolProfile(selectedProfileId);
      setProfiles(updated);
      setSelectedProfileId('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoLeftUrl' | 'logoRightUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;

      // Keep compact SVGs directly; normalize raster images (PNG/JPG/WebP/GIF) to 256x256 PNG
      // so localStorage never overflows and Word/PDF renderers always succeed
      if (file.type === 'image/svg+xml' && rawDataUrl.length < 60_000) {
        setFormData((prev) => ({ ...prev, [field]: rawDataUrl }));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 256;
          const ratio = Math.min(maxDim / (img.naturalWidth || maxDim), maxDim / (img.naturalHeight || maxDim), 1);
          const w = Math.max(1, Math.round((img.naturalWidth || maxDim) * ratio));
          const h = Math.max(1, Math.round((img.naturalHeight || maxDim) * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const pngUrl = canvas.toDataURL('image/png');
            setFormData((prev) => ({ ...prev, [field]: pngUrl }));
            return;
          }
        } catch {}
        setFormData((prev) => ({ ...prev, [field]: rawDataUrl }));
      };
      img.onerror = () => {
        setFormData((prev) => ({ ...prev, [field]: rawDataUrl }));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setFormData({ ...DEFAULT_KOP_CONFIG });
    setSelectedProfileId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If a profile is currently selected, auto-update it with current form data
    if (selectedProfileId) {
      const current = profiles.find((p) => p.id === selectedProfileId);
      if (current) {
        saveSchoolProfile({
          id: current.id,
          name: current.name,
          config: formData,
        });
      }
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-blue-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Building2 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Pengaturan Kop Surat & Profil Sekolah</h2>
              <p className="text-xs text-blue-200">
                Simpan beberapa profil sekolah (SMP, SMA, SMK) beserta logo agar mudah dipilih saat membuat soal baru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Profiles Quick Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            <span className="font-bold text-slate-700 flex items-center space-x-1">
              <Bookmark className="w-3.5 h-3.5 text-blue-600" />
              <span>Profil Sekolah Tersimpan:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfile(p.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold border transition ${
                    selectedProfileId === p.id
                      ? 'bg-blue-700 text-white border-blue-800 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!showSaveProfileBox ? (
              <button
                type="button"
                onClick={() => setShowSaveProfileBox(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center space-x-1 transition shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Simpan Kop Ini Sebagai Profil Baru</span>
              </button>
            ) : (
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Nama Profil (misal: SMK Bina Bangsa)"
                  className="text-xs px-2 py-1 border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={handleSaveAsNewProfile}
                  className="px-2.5 py-1 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveProfileBox(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                >
                  Batal
                </button>
              </div>
            )}

            {selectedProfileId && !showSaveProfileBox && (
              <button
                type="button"
                onClick={handleDeleteCurrentProfile}
                title="Hapus profil aktif ini"
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('kop')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'kop'
                ? 'border-blue-700 text-blue-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Kop Surat & Instansi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pejabat')}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'pejabat'
                ? 'border-blue-700 text-blue-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Kepala Sekolah & Guru (Tanda Tangan)</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'kop' ? (
            <div className="space-y-4">
              {/* Live Preview Kop Surat */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Pratinjau Kop Surat Resmi:
                </span>
                <div className="mt-2 bg-white p-4 rounded-lg border border-slate-300 shadow-xs">
                  <div className="flex items-center justify-between text-center gap-3">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      {formData.logoLeftUrl ? (
                        <img
                          src={formData.logoLeftUrl}
                          alt="Logo Kiri"
                          className="w-16 h-16 object-contain"
                        />
                      ) : (
                        <LogoDinasDefault className="w-16 h-16" />
                      )}
                    </div>
                    <div className="flex-1 font-serif leading-tight">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {formData.govermentHeader1 || 'PEMERINTAH DAERAH PROVINSI / KABUPATEN'}
                      </div>
                      <div className="text-sm font-bold uppercase tracking-wider text-slate-900">
                        {formData.govermentHeader2 || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                      </div>
                      {formData.subHeader && (
                        <div className="text-xs font-medium text-slate-700">{formData.subHeader}</div>
                      )}
                      <div className="text-base font-extrabold uppercase text-blue-950 mt-0.5">
                        {formData.schoolName || 'NAMA SATUAN PENDIDIKAN / SEKOLAH'}
                      </div>
                      {formData.accreditation && (
                        <div className="text-[10px] text-slate-600 italic">
                          {formData.accreditation}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-600 mt-0.5">{formData.address}</div>
                      <div className="text-[9px] text-slate-500">
                        {formData.contact} {formData.website && `| Web: ${formData.website}`}
                      </div>
                    </div>
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                      {formData.logoRightUrl ? (
                        <img
                          src={formData.logoRightUrl}
                          alt="Logo Kanan"
                          className="w-16 h-16 object-contain"
                        />
                      ) : (
                        <LogoTutWuriDefault className="w-16 h-16" />
                      )}
                    </div>
                  </div>
                  {/* Double border line khas kop dinas */}
                  <div className="mt-2 pt-1 border-b-2 border-black">
                    <div className="border-b border-black mt-[1.5px]"></div>
                  </div>
                </div>
              </div>

              {/* Form Input Kop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instansi Pembina Baris 1 (Pemda / Yayasan)
                  </label>
                  <input
                    type="text"
                    value={formData.govermentHeader1}
                    onChange={(e) =>
                      setFormData({ ...formData, govermentHeader1: e.target.value })
                    }
                    placeholder="Contoh: PEMERINTAH DAERAH PROVINSI JAWA BARAT"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Instansi Pembina Baris 2 (Dinas / Kementerian)
                  </label>
                  <input
                    type="text"
                    value={formData.govermentHeader2}
                    onChange={(e) =>
                      setFormData({ ...formData, govermentHeader2: e.target.value })
                    }
                    placeholder="Contoh: DINAS PENDIDIKAN DAN KEBUDAYAAN"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sub-Instansi / Cabang Dinas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.subHeader}
                    onChange={(e) => setFormData({ ...formData, subHeader: e.target.value })}
                    placeholder="Contoh: CABANG DINAS PENDIDIKAN WILAYAH I"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Satuan Pendidikan / Sekolah <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    placeholder="Contoh: SMP NEGERI 1 TELADAN BANGSA"
                    className="w-full text-xs px-3 py-2 border border-blue-400 bg-blue-50/20 rounded-lg font-semibold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Akreditasi & NPSN
                  </label>
                  <input
                    type="text"
                    value={formData.accreditation}
                    onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                    placeholder="Contoh: Terakreditasi A (Unggul) - NPSN: 20219988"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap Sekolah
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Contoh: Jl. Pendidikan No. 45, Kecamatan Sukamaju, Kab. Bogor 16911"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kontak (Telepon / Email)
                  </label>
                  <input
                    type="text"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder="Contoh: Telp: (021) 8765432 | Pos-el: info@sekolah.sch.id"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Website Resmi
                  </label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="Contoh: https://smpn1teladan.sch.id"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Logo Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Logo Kiri (Pemda / Yayasan)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tersimpan otomatis dalam profil
                    </span>
                  </div>
                  <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'logoLeftUrl')}
                    />
                  </label>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      Logo Kanan (Sekolah / Tut Wuri)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tersimpan otomatis dalam profil
                    </span>
                  </div>
                  <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'logoRightUrl')}
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                Informasi pejabat ini akan otomatis tertera di bagian lembar pengesahan naskah ujian,
                kisi-kisi, kunci jawaban, dan kartu soal sesuai profil sekolah yang aktif.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-blue-900 uppercase">
                    Kepala Sekolah
                  </h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap & Gelar
                    </label>
                    <input
                      type="text"
                      value={formData.headmasterName}
                      onChange={(e) =>
                        setFormData({ ...formData, headmasterName: e.target.value })
                      }
                      placeholder="Contoh: Dr. H. Ahmad Fauzi, M.Pd."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={formData.headmasterNip}
                      onChange={(e) =>
                        setFormData({ ...formData, headmasterNip: e.target.value })
                      }
                      placeholder="Contoh: 19750812 199903 1 004"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-extrabold text-blue-900 uppercase">
                    Guru Pengampu Mata Pelajaran
                  </h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Guru & Gelar
                    </label>
                    <input
                      type="text"
                      value={formData.teacherName}
                      onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                      placeholder="Contoh: Siti Rahmawati, S.Pd., Gr."
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      NIP Guru Pengampu
                    </label>
                    <input
                      type="text"
                      value={formData.teacherNip}
                      onChange={(e) => setFormData({ ...formData, teacherNip: e.target.value })}
                      placeholder="Contoh: 19890425 201502 2 003 / - jika non-PNS"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Titik Mangsa / Kota & Tanggal Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={formData.cityDate}
                    onChange={(e) => setFormData({ ...formData, cityDate: e.target.value })}
                    placeholder="Contoh: Jakarta, 2 Desember 2024"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kembalikan ke Default</span>
            </button>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm flex items-center space-x-1.5 transition"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Pengaturan Kop</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
