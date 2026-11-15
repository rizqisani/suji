import React from 'react';

export const LogoDinasDefault: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Logo Lambang Pendidikan"
  >
    <circle cx="50" cy="50" r="46" fill="#1E3A8A" stroke="#FBBF24" strokeWidth="4" />
    <circle cx="50" cy="50" r="41" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1.5" />
    {/* Obor dan Sayap Logo Khas Dinas Pendidikan */}
    <path
      d="M50 16 L53 30 L47 30 Z"
      fill="#F59E0B"
    />
    <path
      d="M45 28 C45 22 55 22 55 28 C55 33 50 35 50 35 C50 35 45 33 45 28 Z"
      fill="#EF4444"
    />
    <rect x="47.5" y="34" width="5" height="26" fill="#FBBF24" rx="1" />
    {/* Buku Terbuka */}
    <path
      d="M26 62 C34 58 44 60 50 64 C56 60 66 58 74 62 L74 74 C66 70 56 72 50 76 C44 72 34 70 26 74 Z"
      fill="#FFFFFF"
      stroke="#1E3A8A"
      strokeWidth="2"
    />
    <line x1="50" y1="64" x2="50" y2="76" stroke="#1E3A8A" strokeWidth="2" />
    {/* Sayap Kiri dan Kanan */}
    <path
      d="M26 44 C34 40 45 42 45 46 C37 46 30 50 28 56 Z"
      fill="#FBBF24"
    />
    <path
      d="M74 44 C66 40 55 42 55 46 C63 46 70 50 72 56 Z"
      fill="#FBBF24"
    />
    {/* Bintang */}
    <polygon
      points="50,18 52,24 58,24 53,27 55,33 50,29 45,33 47,27 42,24 48,24"
      fill="#FBBF24"
    />
  </svg>
);

export const LogoTutWuriDefault: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Logo Tut Wuri Handayani"
  >
    {/* Segi lima pelindung */}
    <polygon
      points="50,6 94,38 78,92 22,92 6,38"
      fill="#0284C7"
      stroke="#FBBF24"
      strokeWidth="3.5"
    />
    <polygon
      points="50,11 89,40 75,88 25,88 11,40"
      fill="#0284C7"
      stroke="#FFFFFF"
      strokeWidth="1.5"
    />
    {/* Sayap Tut Wuri */}
    <path
      d="M50 38 C32 36 22 52 25 72 C35 68 45 68 50 72 C55 68 65 68 75 72 C78 52 68 36 50 38 Z"
      fill="#FFFFFF"
    />
    {/* Obor dan Lidah Api */}
    <path
      d="M48 24 C45 28 47 34 50 37 C53 34 55 28 52 24 C50 20 50 20 48 24 Z"
      fill="#DC2626"
    />
    <rect x="47.5" y="37" width="5" height="28" fill="#FBBF24" rx="1" />
    {/* Belencong / Cawan */}
    <ellipse cx="50" cy="65" rx="14" ry="4" fill="#FBBF24" />
    <path
      d="M40 65 L44 76 L56 76 L60 65 Z"
      fill="#D97706"
    />
    {/* Buku terbuka di dasar */}
    <path
      d="M32 78 C38 75 45 76 50 79 C55 76 62 75 68 78 L68 84 C62 81 55 82 50 85 C45 82 38 81 32 84 Z"
      fill="#FFFFFF"
      stroke="#0284C7"
      strokeWidth="1.5"
    />
  </svg>
);
