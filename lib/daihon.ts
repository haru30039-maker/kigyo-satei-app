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

/** 台本の長さ。brief=要点のみ / full=コンサル報告会に近い密度 */
export type DaihonVariant = "brief" | "full";

/**
 * 次のサービスの「需要確認 → 提案」の分岐。
 * いきなり売り込まず、まず現状の取り組みを質問し、答えに応じて出し分ける。
 */
export interface DaihonNeedsCheck {
  service: string; // 対応するサービス名（チーム内向けラベル）
  basis: string; // なぜこの企業に必要だと考えたか（査定結果の根拠）
  question: string; // 社長に投げる質問（セリフ）
  if_yes: string; // すでに取り組んでいる場合の返し（セリフ）
  if_no: string; // 取り組んでいない場合の返し＝提案（セリフ）
}

export interface DaihonResult {
  company: string;
  title: string; // 例: "○○さま 報告MTG台本"
  duration_note: string; // 例: "説明 約15分＋質疑"
  variant?: DaihonVariant;
  rules: string[]; // 開始前に確認する最重要ルール
  sections: DaihonSection[];
  /** 需要を確認してから提案するための分岐（詳細版のみ入ることが多い） */
  needs_check?: DaihonNeedsCheck[];
  qa: DaihonQA[];
  memo: string[]; // 読み上げない補足
}

export const VARIANT_LABEL: Record<DaihonVariant, string> = {
  brief: "簡易版（約20分）",
  full: "詳細版（約60分）",
};

/**
 * 資料の箇条書きを機械的に数えて、プロンプトに渡す「答え合わせ表」を作る。
 *
 * AIはスライドの項目数をくり返し数え間違える（「合わない人が四つ」と言うのに
 * スライドには五つある等）。社長は同じスライドを見ながら聞いているため、
 * 数の食い違いは「都合の悪い項目を隠した」ように見えてしまう。
 * 数えること自体はコードのほうが確実なので、先に数えて事実として渡す。
 */
export function countSlideItems(
  label: string,
  slides: string[]
): string | null {
  const lines: string[] = [];
  slides.forEach((text, i) => {
    const counts: string[] = [];
    for (const [marker, name] of [
      ["◎", "◎"],
      ["✕", "✕"],
      ["×", "×"],
    ] as const) {
      // 行頭のマーカーだけを数える（本文中の記号を拾わない）
      const n = text
        .split("\n")
        .filter((l) => l.trimStart().startsWith(marker)).length;
      if (n > 0) counts.push(`${name} ${n}件`);
    }
    // 「情報不足・追加で確認すべき点：A／B／C」のような ／ 区切りの列挙
    const m = text.match(/情報不足・追加で確認すべき点[：:]([\s\S]+)/);
    if (m) {
      const n = m[1].split("／").filter((s) => s.trim().length > 3).length;
      if (n > 0) counts.push(`確認すべき点 ${n}件`);
    }
    if (counts.length > 0) {
      lines.push(`- ${label} スライド${i + 1}：${counts.join(" ／ ")}`);
    }
  });
  return lines.length > 0 ? lines.join("\n") : null;
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
