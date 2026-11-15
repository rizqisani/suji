// Default SVG emblem vectors for left (dinas) and right (tutwuri) logos if none provided
const DEFAULT_LOGO_DINAS_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="46" fill="#1E3A8A" stroke="#FBBF24" stroke-width="4" />
  <circle cx="50" cy="50" r="41" fill="#1E3A8A" stroke="#FFFFFF" stroke-width="1.5" />
  <path d="M50 16 L53 30 L47 30 Z" fill="#F59E0B" />
  <path d="M45 28 C45 22 55 22 55 28 C55 33 50 35 50 35 C50 35 45 33 45 28 Z" fill="#EF4444" />
  <rect x="47.5" y="34" width="5" height="26" fill="#FBBF24" rx="1" />
  <path d="M26 62 C34 58 44 60 50 64 C56 60 66 58 74 62 L74 74 C66 70 56 72 50 76 C44 72 34 70 26 74 Z" fill="#FFFFFF" stroke="#1E3A8A" stroke-width="2" />
  <line x1="50" y1="64" x2="50" y2="76" stroke="#1E3A8A" stroke-width="2" />
  <path d="M26 44 C34 40 45 42 45 46 C37 46 30 50 28 56 Z" fill="#FBBF24" />
  <path d="M74 44 C66 40 55 42 55 46 C63 46 70 50 72 56 Z" fill="#FBBF24" />
  <polygon points="50,18 52,24 58,24 53,27 55,33 50,29 45,33 47,27 42,24 48,24" fill="#FBBF24" />
</svg>`;

const DEFAULT_LOGO_TUTWURI_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <polygon points="50,6 94,38 78,92 22,92 6,38" fill="#0284C7" stroke="#FBBF24" stroke-width="3.5" />
  <polygon points="50,11 89,40 75,88 25,88 11,40" fill="#0284C7" stroke="#FFFFFF" stroke-width="1.5" />
  <path d="M50 38 C32 36 22 52 25 72 C35 68 45 68 50 72 C55 68 65 68 75 72 C78 52 68 36 50 38 Z" fill="#FFFFFF" />
  <path d="M48 24 C45 28 47 34 50 37 C53 34 55 28 52 24 C50 20 50 20 48 24 Z" fill="#DC2626" />
  <rect x="47.5" y="37" width="5" height="28" fill="#FBBF24" rx="1" />
  <ellipse cx="50" cy="65" rx="14" ry="4" fill="#FBBF24" />
  <path d="M40 65 L44 76 L56 76 L60 65 Z" fill="#D97706" />
  <path d="M32 78 C38 75 45 76 50 79 C55 76 62 75 68 78 L68 84 C62 81 55 82 50 85 C45 82 38 81 32 84 Z" fill="#FFFFFF" stroke="#0284C7" stroke-width="1.5" />
</svg>`;

// 1x1 transparent PNG fallback bytes
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

async function getSharp() {
  if (typeof window !== 'undefined') {
    return null;
  }
  try {
    const moduleName = 'sharp';
    const sharpModule = await import(/* @vite-ignore */ moduleName);
    return sharpModule.default || sharpModule;
  } catch {
    return null;
  }
}

function getDefaultLogoSvg(fallbackType: 'dinas' | 'tutwuri'): string {
  return fallbackType === 'dinas' ? DEFAULT_LOGO_DINAS_SVG : DEFAULT_LOGO_TUTWURI_SVG;
}

function dataUrlToBrowserSrc(rawLogo?: string, fallbackType: 'dinas' | 'tutwuri' = 'dinas'): string {
  const trimmed = (rawLogo || '').trim();
  if (!trimmed) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getDefaultLogoSvg(fallbackType))}`;
  }
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

async function rasterizeLogoInBrowser(
  rawLogo?: string,
  fallbackType: 'dinas' | 'tutwuri' = 'dinas'
): Promise<Uint8Array> {
  const src = dataUrlToBrowserSrc(rawLogo, fallbackType);
  const size = 140;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      resolve(Uint8Array.from(atob(TRANSPARENT_PNG_BASE64), (c) => c.charCodeAt(0)));
    }, 2000);

    img.onload = async () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2D ctx');
        const ratio = Math.min(size / (img.naturalWidth || size), size / (img.naturalHeight || size));
        const w = (img.naturalWidth || size) * ratio;
        const h = (img.naturalHeight || size) * ratio;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (blob) {
          const ab = await blob.arrayBuffer();
          resolve(new Uint8Array(ab));
          return;
        }
      } catch {}
      resolve(Uint8Array.from(atob(TRANSPARENT_PNG_BASE64), (c) => c.charCodeAt(0)));
    };

    img.onerror = () => {
      clearTimeout(timer);
      if (rawLogo && rawLogo.trim() !== '') {
        rasterizeLogoInBrowser('', fallbackType).then(resolve);
      } else {
        resolve(Uint8Array.from(atob(TRANSPARENT_PNG_BASE64), (c) => c.charCodeAt(0)));
      }
    };

    img.src = src;
  });
}

function decodeSvgDataUri(rawLogo: string): string {
  const commaIdx = rawLogo.indexOf(',');
  if (commaIdx === -1) return rawLogo;
  const header = rawLogo.slice(0, commaIdx).toLowerCase();
  const payload = rawLogo.slice(commaIdx + 1);
  if (header.includes(';base64')) {
    return Buffer.from(payload, 'base64').toString('utf-8');
  }
  return decodeURIComponent(payload);
}

export async function processLogoToPng(
  rawLogo?: string,
  fallbackType: 'dinas' | 'tutwuri' = 'dinas'
): Promise<Buffer | Uint8Array> {
  const targetWidth = 140;
  const targetHeight = 140;

  if (typeof window !== 'undefined') {
    return rasterizeLogoInBrowser(rawLogo, fallbackType);
  }

  const sharp = await getSharp();
  if (!sharp) {
    return Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
  }

  const renderDefault = async () =>
    sharp(Buffer.from(getDefaultLogoSvg(fallbackType)))
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

  try {
    const trimmed = (rawLogo || '').trim();
    if (!trimmed) {
      return await renderDefault();
    }

    if (trimmed.startsWith('data:image/svg+xml')) {
      const svgContent = decodeSvgDataUri(trimmed);
      return await sharp(Buffer.from(svgContent))
        .resize(targetWidth, targetHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toBuffer();
    }

    // Handle any raster data URI (png, jpeg, jpg, webp, gif, avif, bmp, etc.)
    const base64DataMatch = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(trimmed);
    if (base64DataMatch) {
      const buffer = Buffer.from(base64DataMatch[1], 'base64');
      return await sharp(buffer)
        .resize(targetWidth, targetHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toBuffer();
    }

    if (trimmed.startsWith('<svg')) {
      return await sharp(Buffer.from(trimmed))
        .resize(targetWidth, targetHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toBuffer();
    }

    if (/^https?:\/\//i.test(trimmed)) {
      const resp = await fetch(trimmed);
      if (resp.ok) {
        const arrBuf = await resp.arrayBuffer();
        return await sharp(Buffer.from(arrBuf))
          .resize(targetWidth, targetHeight, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .png()
          .toBuffer();
      }
    }

    return await renderDefault();
  } catch (err) {
    console.warn('Failed to process logo with sharp, using default emblem fallback:', err);
    try {
      return await renderDefault();
    } catch {
      return Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');
    }
  }
}
