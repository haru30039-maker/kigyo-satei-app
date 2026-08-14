// 匿名版の出力から「拠点名で発言者を絞り込める書き方」を取り除く。
//
// 例：「大浜工場の勤続8年の社員は〜と発言」→「勤続8年の社員は〜と発言」
// 拠点そのものの説明（「弓削工場は約70名が稼働」「本社・重井工場ほか7拠点」）は
// 会社の事実なのでそのまま残す。
//
// 生成側にも同じルールを指示しているが、地の文では守られないことがあるため、
// 最終的な出力の直前にコード側でも通す。

/** 人を指す語。この語が後ろに続く「◯◯工場の」だけを取り除く */
const PERSON_WORDS =
  "社員|従業員|スタッフ|担当|ベテラン|技能実習生|実習生|作業員|職人|責任者|管理者|方々|方|人";

/** 「◯◯工場の」「◯◯支店の」などの拠点名＋所属の前置き */
const SITE_PREFIX = new RegExp(
  `[^\\s、。「」（）]{1,6}(?:工場|支店|営業所|事業所)の(?=[^。、]{0,14}(?:${PERSON_WORDS}))`,
  "g"
);

/** 話者ラベル用：括弧書きの補足と拠点名の前置きを落とす */
export function anonymizeSpeakerLabel(speaker: string): string {
  const s = String(speaker ?? "")
    .replace(/[（(][^）)]*[）)]/g, "")
    // 「工場統括を担う経営幹部」のように拠点名でない先頭の「工場」は残す
    .replace(/^[^\s]+?(?:工場|支店|営業所|事業所)(?:勤務)?の?/, "")
    .trim();
  return s || String(speaker ?? "");
}

/** 本文用：拠点名で発言者を絞り込める書き方だけを取り除く */
export function scrubSiteAttribution(text: string): string {
  return String(text ?? "").replace(SITE_PREFIX, "");
}

/** オブジェクト内の文字列をすべて変換する */
export function deepMapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => deepMapStrings(v, fn)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepMapStrings(v, fn);
    }
    return out as unknown as T;
  }
  return value;
}

/** 匿名版の出力全体に適用する */
export function anonymizeDeep<T>(value: T): T {
  return deepMapStrings(value, scrubSiteAttribution);
}
