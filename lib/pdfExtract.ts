import * as pdfjsLib from 'pdfjs-dist';

// ワーカーのパスを設定（Next.js でのバンドル時に必要）
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.js/pdf.worker.min.js';
}

export async function extractTextFromPdf(file: File): Promise<string> {
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
