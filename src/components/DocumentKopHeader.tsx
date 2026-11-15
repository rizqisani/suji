import React from 'react';
import { SchoolKopConfig } from '../types/exam';
import { LogoDinasDefault, LogoTutWuriDefault } from './OfficialLogos';

interface DocumentKopHeaderProps {
  kopConfig: SchoolKopConfig;
  compact?: boolean;
  className?: string;
}

export const DocumentKopHeader: React.FC<DocumentKopHeaderProps> = ({
  kopConfig,
  compact = false,
  className = 'mb-3',
}) => {
  const logoBoxSize = compact ? 'w-[56px] h-[56px]' : 'w-[68px] h-[68px]';
  const gridCols = compact
    ? 'grid-cols-[56px_minmax(0,1fr)_56px]'
    : 'grid-cols-[68px_minmax(0,1fr)_68px]';

  return (
    <header className={className}>
      <div className={`grid ${gridCols} items-center gap-3 text-center`}>
        <div className={`${logoBoxSize} shrink-0 flex items-center justify-center`}>
          {kopConfig.logoLeftUrl ? (
            <img
              src={kopConfig.logoLeftUrl}
              alt="Logo Kiri"
              className="w-full h-full object-contain"
            />
          ) : (
            <LogoDinasDefault className={logoBoxSize} />
          )}
        </div>

        <div className="min-w-0 leading-tight text-center font-serif break-words">
          {kopConfig.govermentHeader1 && (
            <div
              className={`${
                compact ? 'text-[9.5pt]' : 'text-[11pt]'
              } font-bold uppercase tracking-wider`}
            >
              {kopConfig.govermentHeader1}
            </div>
          )}
          {kopConfig.govermentHeader2 && (
            <div
              className={`${
                compact ? 'text-[10.5pt]' : 'text-[12pt]'
              } font-extrabold uppercase tracking-wide`}
            >
              {kopConfig.govermentHeader2}
            </div>
          )}
          {kopConfig.subHeader && (
            <div className={`${compact ? 'text-[8.5pt]' : 'text-[10pt]'} font-bold uppercase`}>
              {kopConfig.subHeader}
            </div>
          )}
          <div
            className={`${
              compact ? 'text-[12pt]' : 'text-[14pt]'
            } font-black uppercase text-black mt-0.5`}
          >
            {kopConfig.schoolName}
          </div>
          {kopConfig.accreditation && (
            <div className="text-[8.5pt] italic text-slate-700">{kopConfig.accreditation}</div>
          )}
          {kopConfig.address && (
            <div className="text-[8.5pt] text-slate-800">{kopConfig.address}</div>
          )}
          {(kopConfig.contact || kopConfig.website) && (
            <div className="text-[8pt] text-slate-700">
              {kopConfig.contact}
              {kopConfig.contact && kopConfig.website && ' | '}
              {kopConfig.website && `Laman: ${kopConfig.website}`}
            </div>
          )}
        </div>

        <div className={`${logoBoxSize} shrink-0 flex items-center justify-center`}>
          {kopConfig.logoRightUrl ? (
            <img
              src={kopConfig.logoRightUrl}
              alt="Logo Kanan"
              className="w-full h-full object-contain"
            />
          ) : (
            <LogoTutWuriDefault className={logoBoxSize} />
          )}
        </div>
      </div>

      {/* Garis Ganda Kop Surat Resmi */}
      <div className="mt-2 pt-1 border-b-[2.5px] border-black">
        <div className="border-b-[1px] border-black mt-[1.5px]"></div>
      </div>
    </header>
  );
};
