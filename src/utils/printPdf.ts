export interface PrintPdfOptions {
  paperSize?: 'a4' | 'folio';
  marginMm?: number;
}

/**
 * Triggers reliable printer dialog using an isolated print iframe to bypass iframe sandbox restrictions
 * Fully supports modern CSS, @media print, and native "Save as PDF" / "Simpan sebagai PDF"
 */
export function printElementDirectly(
  elementId: string,
  docTitle: string = 'Naskah Ujian',
  options: PrintPdfOptions = {}
): void {
  const { paperSize = 'a4', marginMm = 12 } = options;

  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    window.print();
    return;
  }

  // Paper dimension rule
  const pageSizeRule =
    paperSize === 'folio'
      ? 'size: 215mm 330mm portrait;'
      : 'size: A4 portrait;';

  // Create isolated printing iframe (must have opacity > 0 and width > 0 for Chromium to render layout)
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '1000px';
  printIframe.style.height = '1000px';
  printIframe.style.opacity = '0.01';
  printIframe.style.pointerEvents = 'none';
  printIframe.style.zIndex = '-9999';

  document.body.appendChild(printIframe);

  const frameDoc = printIframe.contentWindow?.document;
  if (!frameDoc) {
    window.print();
    return;
  }

  // Extract all stylesheets from current document
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const contentHtml = targetElement.outerHTML;

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>${docTitle}</title>
        ${stylesHtml}
        <style>
          @page {
            ${pageSizeRule}
            margin: ${marginMm}mm ${marginMm}mm ${marginMm}mm ${marginMm}mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.35;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            border-collapse: collapse !important;
          }
        </style>
      </head>
      <body>
        <div style="max-width: 100%; margin: 0 auto; padding: 0;">
          ${contentHtml}
        </div>
      </body>
    </html>
  `);
  frameDoc.close();

  // Wait for fonts and images to load in the iframe before printing
  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print failed, falling back to window.print()', err);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
        } catch (e) {}
      }, 3000);
    }
  }, 400);
}

/**
 * Downloads a self-contained standalone HTML print page that can be opened anywhere
 */
export function downloadPrintableHtml(elementId: string, docTitle: string = 'Naskah Ujian'): void {
  const targetElement = document.getElementById(elementId);
  if (!targetElement) return;

  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const contentHtml = targetElement.outerHTML;

  const standaloneDoc = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>${docTitle}</title>
        ${stylesHtml}
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.35;
            margin: 0;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            border-collapse: collapse !important;
          }
          .print-bar {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #1e293b;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 13px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            cursor: pointer;
            z-index: 99999;
          }
          @media print {
            .print-bar { display: none !important; }
            body { padding: 0 !important; }
          }
        </style>
      </head>
      <body>
        <button class="print-bar no-print" onclick="window.print()">🖨️ Cetak / Simpan PDF (Ctrl+P)</button>
        <div style="max-width: 210mm; margin: 0 auto;">
          ${contentHtml}
        </div>
        <script>
          setTimeout(function() { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;

  const blob = new Blob([standaloneDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${docTitle.replace(/\s+/g, '_')}_Siap_Cetak.html`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 10000);
}
