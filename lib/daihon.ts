// 報告台本ジェネレーターの型と pptx テキスト抽出

export interface DaihonSection {
  no: string; // "0","1",...
  title: string;
  minutes: number;
  slide_cue: string; // 例: "スコア根拠説明 ▶ スライド3"
  lines: string[]; // セリフ段落（「」付きで話し言葉）
  direction?: string; // 読み上げない指示（任意）
}

export interface DaihonQA {
  q: string;
  a: string;
}

export interface DaihonResult {
  company: string;
  title: string; // 例: "○○さま 報告MTG台本"
  duration_note: string; // 例: "説明 約15分＋質疑"
  rules: string[]; // 開始前に確認する最重要ルール
  sections: DaihonSection[];
  qa: DaihonQA[];
  memo: string[]; // 読み上げない補足
}

/** pptx(ZIP) からスライドごとのテキストを抽出する（サーバー側・jszip使用） */
export async function extractPptxSlideTexts(buf: ArrayBuffer): Promise<string[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)![0], 10);
      const nb = parseInt(b.match(/\d+/)![0], 10);
      return na - nb;
    });
  const texts: string[] = [];
  for (const name of entries) {
    const xml = await zip.files[name].async("string");
    const parts = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) =>
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    );
    texts.push(parts.join("\n"));
  }
  return texts;
}
