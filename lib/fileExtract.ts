"use client";

// アップロードされたファイルからテキスト／画像を取り出す共通処理（ブラウザ側で実行）。
// 学生メモや求人票は .txt / .md / .pdf / .docx / 画像 で提出されるため、
// テキスト化できるものはテキストに、画像はClaudeに渡せる形式に変換する。

export const TEXT_EXT = [".txt", ".md", ".csv"];
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Claudeに渡す画像1枚 */
export interface ImagePart {
  name: string;
  media_type: string;
  data: string; // base64（データURLのヘッダーなし）
}

export function isImageFile(f: File): boolean {
  return IMAGE_TYPES.includes(f.type) || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join("")
        .trim()
    );
  }
  return pages.join("\n");
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value;
}

/**
 * ファイルからテキストを取り出す。画像は対象外（extractImage を使う）。
 * 取り出せない形式は例外を投げる。
 */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (name.endsWith(".docx")) {
    return extractDocx(file);
  }
  if (name.endsWith(".doc")) {
    throw new Error(
      "古い .doc 形式は読み取れません。Wordで「.docx」として保存し直すか、PDFに書き出してください"
    );
  }
  if (TEXT_EXT.some((e) => name.endsWith(e)) || file.type.startsWith("text/")) {
    return file.text();
  }
  // 拡張子が不明でもテキストとして読めれば採用する
  return file.text();
}

/**
 * 画像をClaudeに渡せる形に変換する。
 * 長辺1568pxを超える場合は縮小する（これ以上大きくても精度は上がらず、
 * 送信サイズとコストだけが増えるため）。
 */
export async function extractImage(file: File): Promise<ImagePart> {
  const MAX_EDGE = 1568;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`画像を読み取れませんでした（${file.name}）`);
  // 透過画像をJPEGにすると黒くなるため白で塗ってから描画する
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return {
    name: file.name,
    media_type: "image/jpeg",
    data: dataUrl.slice(dataUrl.indexOf(",") + 1),
  };
}

/**
 * ファイル群を「テキスト」と「画像」に振り分けて取り出す。
 * テキストはファイル名付きで結合する（誰のメモか分かるようにするため）。
 */
export async function extractFiles(
  files: File[],
  label: string
): Promise<{ text: string; images: ImagePart[] }> {
  const texts: string[] = [];
  const images: ImagePart[] = [];
  for (const f of files) {
    try {
      if (isImageFile(f)) {
        images.push(await extractImage(f));
      } else {
        const t = (await extractText(f)).trim();
        if (t) texts.push(`【${label}: ${f.name}】\n${t}`);
      }
    } catch (e) {
      throw new Error(
        `${f.name} を読み取れませんでした（${
          e instanceof Error ? e.message : "不明なエラー"
        }）`
      );
    }
  }
  return { text: texts.join("\n\n"), images };
}
