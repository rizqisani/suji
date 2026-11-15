import { jsPDF } from 'jspdf';
import type { ExportDocType } from '../types/documentTypes';

export const PRINTABLE_ELEMENT_ID_MAP: Record<ExportDocType, string> = {
  naskah: 'printable-exam-document',
  kunci: 'printable-answer-key',
  'kisi-kisi': 'printable-kisi-kisi',
  rubrik: 'printable-rubric',
  'kartu-soal': 'printable-question-cards',
  ljs: 'printable-ljs',
};

export interface HtmlPdfOptions {
  paperSize?: 'a4' | 'folio';
  marginMm?: number;
  fitToOnePage?: boolean;
}

const PX_PER_MM = 96 / 25.4;

const UNSUPPORTED_COLOR_FN_RE =
  /(^|[^a-zA-Z0-9_-])(oklch|oklab|lab|lch|color-mix|color|light-dark)\(/i;

const COLOR_STYLE_PROPS = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
  'fill',
  'stroke',
] as const;

type ColorStyleProp = (typeof COLOR_STYLE_PROPS)[number];

interface ElementColorSnapshot {
  colors: Partial<Record<ColorStyleProp, string>>;
  boxShadow?: string;
}

let cachedCanvasCtx: CanvasRenderingContext2D | null = null;

function getColorCanvasCtx(): CanvasRenderingContext2D | null {
  if (cachedCanvasCtx) return cachedCanvasCtx;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  cachedCanvasCtx = canvas.getContext('2d', { willReadFrequently: true });
  return cachedCanvasCtx;
}

function resolveColorToRgba(colorExpr: string): string | null {
  const trimmed = colorExpr.trim();
  if (!trimmed) return null;
  if (trimmed === 'transparent' || trimmed === 'none' || trimmed === 'inherit' || trimmed === 'currentcolor') {
    return trimmed;
  }
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed) || /^rgba?\(/i.test(trimmed)) {
    return trimmed;
  }

  const ctx = getColorCanvasCtx();
  if (!ctx) return null;

  try {
    ctx.fillStyle = '#010203';
    ctx.fillStyle = trimmed;
    const first = ctx.fillStyle;

    ctx.fillStyle = '#fefdfc';
    ctx.fillStyle = trimmed;
    const second = ctx.fillStyle;

    if (first !== second) return null;
    if (/^#[0-9a-f]{6}$/i.test(second) || /^rgba?\(/i.test(second)) return second;

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 255) return `rgb(${r}, ${g}, ${b})`;
    const alpha = Math.round((a / 255) * 1000) / 1000;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return null;
  }
}

function sanitizeCssColorFunctions(cssText: string): string {
  if (!cssText || !UNSUPPORTED_COLOR_FN_RE.test(cssText)) {
    return cssText;
  }

  let result = '';
  let cursor = 0;

  while (cursor < cssText.length) {
    const slice = cssText.slice(cursor);
    const match = UNSUPPORTED_COLOR_FN_RE.exec(slice);
    if (!match) {
      result += slice;
      break;
    }

    const prefixLen = match[1] ? match[1].length : 0;
    const fnStart = cursor + match.index + prefixLen;
    const openParenIdx = cursor + match.index + match[0].length - 1;

    result += cssText.slice(cursor, fnStart);

    let depth = 1;
    let i = openParenIdx + 1;
    let inQuote: string | null = null;

    while (i < cssText.length && depth > 0) {
      const ch = cssText[i];
      if (inQuote) {
        if (ch === '\\') {
          i += 2;
          continue;
        }
        if (ch === inQuote) inQuote = null;
      } else {
        if (ch === '"' || ch === "'") inQuote = ch;
        else if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      i++;
    }

    const fullCall = cssText.slice(fnStart, i);
    if (/var\(|--/i.test(fullCall)) {
      result += 'transparent';
    } else {
      const resolved = resolveColorToRgba(fullCall);
      result += resolved || 'transparent';
    }

    cursor = i;
  }

  return result;
}

/**
 * Collects all same-origin document CSS rules (excluding @media print).
 */
function collectRawStylesheetText(sanitizeColorsForHtml2Canvas: boolean): string {
  const chunks: string[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const mediaText = sheet.media?.mediaText || '';
      if (mediaText && /\bprint\b/i.test(mediaText) && !/\ball\b|\bscreen\b/i.test(mediaText)) {
        continue;
      }
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        let css = rule.cssText;
        if (!css) continue;
        if (css.startsWith('@media print') || css.startsWith('@charset') || css.startsWith('@import')) {
          continue;
        }
        if (sanitizeColorsForHtml2Canvas) {
          css = sanitizeCssColorFunctions(css);
        } else {
          // Ensure :root / :host CSS custom properties (Tailwind v4 @layer theme)
          // apply directly to <html> and <body> inside SVG <foreignObject>
          css = css.replace(/:root\s*,\s*:host/g, ':root, :host, html, body');
          css = css.replace(/:root(?![\w,-])/g, ':root, html, body');
        }
        chunks.push(css);
      }
    } catch {
      // Cross-origin stylesheet safely skipped
    }
  }

  chunks.push(`
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      -webkit-font-smoothing: antialiased;
    }
    .no-print { display: none !important; }
    .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; }
  `);

  return chunks.join('\n');
}

function waitForImages(rootEl: HTMLElement): Promise<void> {
  const imgs = Array.from(rootEl.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();

  return Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 1500);
      });
    })
  ).then(() => undefined);
}

/**
 * Inlines non-data-URI images into base64 data URIs so SVG <foreignObject>
 * never triggers network requests or canvas tainting.
 */
async function inlineAllImages(rootEl: HTMLElement): Promise<void> {
  const imgs = Array.from(rootEl.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;

      try {
        const res = await fetch(src);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
        if (dataUrl) {
          img.setAttribute('src', dataUrl);
        }
      } catch {
        // Fallback: try canvas conversion if already loaded with CORS
        try {
          if (img.complete && img.naturalWidth > 0) {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const cx = c.getContext('2d');
            if (cx) {
              cx.drawImage(img, 0, 0);
              img.setAttribute('src', c.toDataURL('image/png'));
            }
          }
        } catch {
          // Leave as-is; fallback path will handle if tainted
        }
      }
    })
  );
}

/**
 * Inserts smart page-break spacers before indivisible blocks (.break-inside-avoid, tr, header)
 * that would otherwise be sliced mid-height at a PDF page boundary.
 */
function applySmartPageBreaks(preparedEl: HTMLElement, hostEl: HTMLElement, pageInnerHeightPx: number): void {
  const candidates = Array.from(
    preparedEl.querySelectorAll<HTMLElement>('header, .break-inside-avoid, tr')
  );

  for (const el of candidates) {
    if (!document.body.contains(el)) continue;
    // Never add spacer inside thead or inside a grid layout
    if (el.tagName === 'TR' && el.closest('thead')) continue;
    const parentStyle = el.parentElement ? window.getComputedStyle(el.parentElement) : null;
    if (parentStyle && parentStyle.display.includes('grid')) continue;

    const hostTop = hostEl.getBoundingClientRect().top;
    const rect = el.getBoundingClientRect();
    const relTop = rect.top - hostTop;
    const relBottom = rect.bottom - hostTop;
    const elHeight = relBottom - relTop;

    if (elHeight <= 4 || elHeight > pageInnerHeightPx * 0.92) continue;

    const startPage = Math.floor(relTop / pageInnerHeightPx);
    const endPage = Math.floor((relBottom - 1) / pageInnerHeightPx);

    if (endPage > startPage) {
      const spacerPx = (startPage + 1) * pageInnerHeightPx - relTop + 2;
      if (spacerPx <= 0 || spacerPx > pageInnerHeightPx) continue;

      if (el.tagName === 'TR' && el.parentElement) {
        const spacerRow = document.createElement('tr');
        spacerRow.setAttribute('data-pdf-spacer', 'true');
        spacerRow.style.height = `${spacerPx}px`;
        spacerRow.style.border = 'none';
        spacerRow.style.background = 'transparent';
        const td = document.createElement('td');
        td.setAttribute('colspan', '100');
        td.style.height = `${spacerPx}px`;
        td.style.padding = '0';
        td.style.border = 'none';
        td.style.background = 'transparent';
        spacerRow.appendChild(td);
        el.parentElement.insertBefore(spacerRow, el);
      } else {
        const existingMarginTop = parseFloat(window.getComputedStyle(el).marginTop) || 0;
        el.style.marginTop = `${existingMarginTop + spacerPx}px`;
      }
    }
  }
}

function loadSvgDataUrlAsImage(svgMarkup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgMarkup);
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

function addPageNumbers(pdf: jsPDF, marginMm: number): void {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - marginMm,
      pageHeight - Math.max(4, marginMm / 2.4),
      { align: 'right' }
    );
  }
}

/**
 * Primary engine: Renders exact HTML/CSS via browser-native SVG <foreignObject>
 * onto high-DPI canvases slice-by-slice. Uses Blink's exact typography, borders,
 * circular bubbles, oklch colors, and flex/grid alignment with zero baseline drift.
 */
async function renderWithForeignObjectPdf(
  preparedEl: HTMLElement,
  hostEl: HTMLElement,
  paperWidthMm: number,
  paperHeightMm: number,
  marginMm: number,
  fitToOnePage: boolean
): Promise<Blob> {
  const pageWidthPx = Math.round(paperWidthMm * PX_PER_MM);
  const innerHeightMm = paperHeightMm - marginMm * 2;
  const innerHeightPx = innerHeightMm * PX_PER_MM;

  await inlineAllImages(preparedEl);
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));

  if (!fitToOnePage) {
    applySmartPageBreaks(preparedEl, hostEl, innerHeightPx);
  }
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));

  const measuredHeightPx = fitToOnePage
    ? preparedEl.getBoundingClientRect().height
    : Math.max(preparedEl.scrollHeight, preparedEl.getBoundingClientRect().height);
  const totalHeightPx = Math.max(1, Math.ceil(measuredHeightPx));
  const rawCss = collectRawStylesheetText(false);

  const svgNs = 'http://www.w3.org/2000/svg';
  const xhtmlNs = 'http://www.w3.org/1999/xhtml';

  // Serialize preparedEl once into valid XHTML inside an offscreen XHTML container
  const serializer = new XMLSerializer();
  const xhtmlClone = preparedEl.cloneNode(true) as HTMLElement;

  const pageCount = Math.max(1, Math.ceil(totalHeightPx / innerHeightPx));
  const scale = 2.5;

  const pdf = new jsPDF({
    unit: 'mm',
    format: paperWidthMm === 215 ? [215, 330] : 'a4',
    orientation: 'portrait',
  });

  let pagesAdded = 0;

  for (let p = 0; p < pageCount; p++) {
    const sliceTopPx = p * innerHeightPx;
    const remainingPx = totalHeightPx - sliceTopPx;
    // Skip negligible trailing overflow (< 3mm)
    if (p > 0 && remainingPx < 3 * PX_PER_MM) {
      continue;
    }

    const sliceHeightPx = Math.min(innerHeightPx, remainingPx);
    const roundedSliceHeightPx = Math.max(1, Math.ceil(sliceHeightPx));
    const sliceHeightMm = sliceHeightPx / PX_PER_MM;

    const svgEl = document.createElementNS(svgNs, 'svg');
    svgEl.setAttribute('xmlns', svgNs);
    svgEl.setAttribute('width', String(pageWidthPx));
    svgEl.setAttribute('height', String(roundedSliceHeightPx));
    svgEl.setAttribute('viewBox', `0 0 ${pageWidthPx} ${roundedSliceHeightPx}`);

    const foreignObject = document.createElementNS(svgNs, 'foreignObject');
    foreignObject.setAttribute('x', '0');
    foreignObject.setAttribute('y', '0');
    foreignObject.setAttribute('width', String(pageWidthPx));
    foreignObject.setAttribute('height', String(roundedSliceHeightPx));

    const htmlRoot = document.createElementNS(xhtmlNs, 'html');
    htmlRoot.setAttribute('xmlns', xhtmlNs);

    const headEl = document.createElementNS(xhtmlNs, 'head');
    const styleEl = document.createElementNS(xhtmlNs, 'style');
    styleEl.textContent = rawCss;
    headEl.appendChild(styleEl);

    const bodyEl = document.createElementNS(xhtmlNs, 'body');
    bodyEl.setAttribute(
      'style',
      `margin:0;padding:0;background:#ffffff;width:${pageWidthPx}px;height:${roundedSliceHeightPx}px;overflow:hidden;`
    );

    const offsetWrapper = document.createElementNS(xhtmlNs, 'div');
    offsetWrapper.setAttribute(
      'style',
      `position:relative;top:-${sliceTopPx}px;left:0;width:${pageWidthPx}px;background:#ffffff;`
    );
    offsetWrapper.appendChild(xhtmlClone.cloneNode(true));

    bodyEl.appendChild(offsetWrapper);
    htmlRoot.appendChild(headEl);
    htmlRoot.appendChild(bodyEl);
    foreignObject.appendChild(htmlRoot);
    svgEl.appendChild(foreignObject);

    const svgMarkup = serializer.serializeToString(svgEl);
    const img = await loadSvgDataUrlAsImage(svgMarkup);

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(4096, Math.round(pageWidthPx * scale));
    canvas.height = Math.min(4096, Math.round(roundedSliceHeightPx * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Will throw SecurityError if any external non-CORS asset tainted the canvas
    const imgData = canvas.toDataURL('image/png');

    if (pagesAdded > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'PNG', 0, marginMm, paperWidthMm, sliceHeightMm);
    pagesAdded++;
  }

  addPageNumbers(pdf, marginMm);
  return pdf.output('blob') as Blob;
}

function snapshotElementColors(rootEl: HTMLElement): ElementColorSnapshot[] {
  const allNodes = [rootEl, ...Array.from(rootEl.querySelectorAll('*'))];
  return allNodes.map((node) => {
    const computed = window.getComputedStyle(node);
    const colors: Partial<Record<ColorStyleProp, string>> = {};

    for (const prop of COLOR_STYLE_PROPS) {
      const raw = computed[prop];
      if (!raw || raw === 'none') continue;
      if (raw.startsWith('rgb') || raw.startsWith('#') || raw === 'transparent') {
        colors[prop] = raw;
      } else {
        const resolved = resolveColorToRgba(raw);
        if (resolved) colors[prop] = resolved;
      }
    }

    const boxShadow =
      computed.boxShadow && computed.boxShadow !== 'none'
        ? sanitizeCssColorFunctions(computed.boxShadow)
        : undefined;

    return { colors, boxShadow };
  });
}

function applyColorSnapshots(rootEl: HTMLElement, snapshots: ElementColorSnapshot[]): void {
  const allNodes = [rootEl, ...Array.from(rootEl.querySelectorAll('*'))];
  allNodes.forEach((node, idx) => {
    const snap = snapshots[idx];
    if (!snap) return;
    const el = node as HTMLElement | SVGElement;
    if (!el.style) return;

    for (const prop of COLOR_STYLE_PROPS) {
      const val = snap.colors[prop];
      if (val) (el.style as any)[prop] = val;
    }
    if (snap.boxShadow) {
      el.style.boxShadow = snap.boxShadow;
    }
  });
}

/**
 * Fallback engine: html2pdf.js + html2canvas with Tailwind v4 color sanitization
 * and flex-circle vertical-alignment normalization.
 */
async function renderWithHtml2PdfFallback(
  preparedEl: HTMLElement,
  paperSize: 'a4' | 'folio',
  marginMm: number,
  fitToOnePage: boolean
): Promise<Blob> {
  // Flatten CSS columns since html2canvas 1.4.x does not support multi-column flow reliably
  preparedEl.querySelectorAll<HTMLElement>('[class*="columns-"]').forEach((colEl) => {
    colEl.style.columnCount = '1';
    colEl.style.columns = 'auto';
  });

  // Fix html2canvas flex-baseline downward drift on small circular/square option badges
  preparedEl.querySelectorAll<HTMLElement>('span.rounded-full, span.rounded-xs').forEach((badge) => {
    if (badge.classList.contains('w-5') && badge.classList.contains('h-5')) {
      badge.style.display = 'inline-block';
      badge.style.textAlign = 'center';
      badge.style.lineHeight = '18px';
      badge.style.verticalAlign = 'middle';
    }
  });

  const snapshots = snapshotElementColors(preparedEl);
  const sanitizedCss = collectRawStylesheetText(true);

  const html2pdfModule = await import('html2pdf.js');
  const html2pdfFn: any = (html2pdfModule as any).default || html2pdfModule;
  const jsPdfFormat: 'a4' | [number, number] = paperSize === 'folio' ? [215, 330] : 'a4';

  const worker = html2pdfFn()
    .set({
      margin: [marginMm, 0, marginMm, 0],
      filename: 'dokumen.pdf',
      image: { type: 'png', quality: 0.98 },
      enableLinks: false,
      pagebreak: {
        mode: fitToOnePage ? [] : ['css', 'legacy'],
        avoid: fitToOnePage ? [] : ['.break-inside-avoid', 'tr', 'header'],
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 960,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => node.remove());
          const cleanStyle = clonedDoc.createElement('style');
          cleanStyle.textContent = sanitizedCss;
          clonedDoc.head.appendChild(cleanStyle);

          const clonedRoot = clonedDoc.querySelector('[data-pdf-capture-root="true"]') as HTMLElement | null;
          if (clonedRoot) {
            applyColorSnapshots(clonedRoot, snapshots);
            clonedRoot.style.boxShadow = 'none';
            clonedRoot.style.border = 'none';
          }
        },
      },
      jsPDF: {
        unit: 'mm',
        format: jsPdfFormat,
        orientation: 'portrait',
      },
    })
    .from(preparedEl)
    .toPdf();

  const pdf: jsPDF = await worker.get('pdf');
  addPageNumbers(pdf, marginMm);
  return pdf.output('blob') as Blob;
}

/**
 * Generates a high-fidelity PDF Blob directly from the rendered HTML preview element,
 * preserving the exact typography, tables, kop surat, logos, and LJS layout shown on screen.
 */
export async function generateHtmlElementPdfBlob(
  elementId: string,
  options: HtmlPdfOptions = {}
): Promise<Blob> {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    throw new Error(`Elemen pratinjau "${elementId}" belum terpasang di layar.`);
  }

  const paperSize = options.paperSize || 'a4';
  const marginMm = options.marginMm ?? 12;
  const paperWidthMm = paperSize === 'folio' ? 215 : 210;
  const paperHeightMm = paperSize === 'folio' ? 330 : 297;
  const pageWidthPx = Math.round(paperWidthMm * PX_PER_MM);
  const marginPx = Math.round(marginMm * PX_PER_MM);
  const contentWidthPx = Math.max(1, pageWidthPx - marginPx * 2);
  const innerHeightPx = (paperHeightMm - marginMm * 2) * PX_PER_MM;

  const host = document.createElement('div');
  host.setAttribute('data-pdf-capture-host', 'true');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${pageWidthPx}px`;
  host.style.backgroundColor = '#ffffff';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';

  const preparedEl = sourceEl.cloneNode(true) as HTMLElement;
  preparedEl.removeAttribute('id');
  preparedEl.setAttribute('data-pdf-capture-root', 'true');
  preparedEl.querySelectorAll('.no-print').forEach((node) => node.remove());

  preparedEl.style.width = `${pageWidthPx}px`;
  preparedEl.style.maxWidth = 'none';
  preparedEl.style.minHeight = 'auto';
  preparedEl.style.margin = '0';
  preparedEl.style.border = 'none';
  preparedEl.style.borderRadius = '0';
  preparedEl.style.boxShadow = 'none';
  preparedEl.style.backgroundColor = '#ffffff';
  preparedEl.style.boxSizing = 'border-box';

  if (options.fitToOnePage) {
    preparedEl.style.padding = '0';
    preparedEl.style.minHeight = '0';
    preparedEl.style.maxHeight = 'none';
    preparedEl.style.overflow = 'visible';
    const contentWrapper = document.createElement('div');
    contentWrapper.setAttribute('data-pdf-fit-content', 'true');
    contentWrapper.style.display = 'flow-root';
    contentWrapper.style.width = `${contentWidthPx}px`;
    contentWrapper.style.marginLeft = `${marginPx}px`;
    while (preparedEl.firstChild) {
      contentWrapper.appendChild(preparedEl.firstChild);
    }
    preparedEl.appendChild(contentWrapper);
  } else {
    preparedEl.style.paddingTop = '0px';
    preparedEl.style.paddingBottom = '2mm';
    preparedEl.style.paddingLeft = `${marginPx}px`;
    preparedEl.style.paddingRight = `${marginPx}px`;
  }

  preparedEl.querySelectorAll<SVGElement>('svg').forEach((svg) => {
    const rect = svg.getBoundingClientRect();
    if (!svg.getAttribute('width')) {
      svg.setAttribute('width', String(Math.round(rect.width) || 68));
    }
    if (!svg.getAttribute('height')) {
      svg.setAttribute('height', String(Math.round(rect.height) || 68));
    }
  });

  host.appendChild(preparedEl);
  document.body.appendChild(host);

  try {
    await waitForImages(preparedEl);
    await new Promise((r) => requestAnimationFrame(() => r(undefined)));

    if (options.fitToOnePage) {
      const contentWrapper = preparedEl.querySelector<HTMLElement>('[data-pdf-fit-content="true"]');
      if (!contentWrapper) {
        throw new Error('Konten LJS untuk ekspor PDF tidak ditemukan.');
      }

      const contentHeightPx = Math.max(1, contentWrapper.scrollHeight);
      const availableHeightPx = Math.max(1, Math.floor(innerHeightPx) - 2);
      const scale = Math.min(1, availableHeightPx / contentHeightPx);

      if (scale < 1) {
        contentWrapper.style.position = 'absolute';
        contentWrapper.style.top = '0';
        contentWrapper.style.left = `${marginPx + (contentWidthPx * (1 - scale)) / 2}px`;
        contentWrapper.style.marginLeft = '0';
        contentWrapper.style.transform = `scale(${scale})`;
        contentWrapper.style.transformOrigin = 'top left';
        preparedEl.style.position = 'relative';
        preparedEl.style.height = `${Math.ceil(contentHeightPx * scale) + 1}px`;
        preparedEl.style.overflow = 'hidden';
      }
    }

    try {
      return await renderWithForeignObjectPdf(
        preparedEl,
        host,
        paperWidthMm,
        paperHeightMm,
        marginMm,
        options.fitToOnePage === true
      );
    } catch (foreignErr) {
      console.warn('Native SVG foreignObject PDF capture failed, using html2canvas fallback:', foreignErr);
      return await renderWithHtml2PdfFallback(
        preparedEl,
        paperSize,
        marginMm,
        options.fitToOnePage === true
      );
    }
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
    document.querySelectorAll('.html2pdf__overlay').forEach((overlay) => {
      overlay.parentNode?.removeChild(overlay);
    });
  }
}
