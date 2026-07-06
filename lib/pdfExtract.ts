'use client';

// pdfjs-dist はモジュールトップレベルで DOMMatrix 等ブラウザAPIを参照するため、
// ビルド時の静的プリレンダリングで評価されないよう関数内で動的 import する。
export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => item.str ?? '')
      .join('');
    pages.push(text);
  }

  return pages.join('\n');
}
