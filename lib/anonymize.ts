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
  "社員|従業員|スタッフ|担当|ベテラン|技能実習生|実習生|作業員|職人|責任者|管理者|" +
  "工場長|支店長|店長|所長|園長|センター長|事業所長|部長|課長|主任|方々|方|人";

/** 「◯◯工場の」「◯◯支店の」などの拠点名＋所属の前置き */
const SITE_WORDS =
  "工場|支店|営業所|事業所|センター|センタ|店舗|倉庫|物流拠点|オフィス|研究所|ラボ|園|寮|病院|クリニック|校|店";

const SITE_PREFIX = new RegExp(
  `[^\\s、。「」（）]{1,6}(?:${SITE_WORDS})の(?=[^。、]{0,14}(?:${PERSON_WORDS}))`,
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

/**
 * 実名版の話者表記（speaker_internal）から「実名 → 匿名表記」の対応表を作る。
 * 本文中に残った実名（例：「中村常務インタビューより」）を匿名表記に置き換えるため。
 * 報告先である経営者本人（代表取締役・社長）は実名のままでよいので対象外。
 */
export function buildNameMap(
  interviews: { speaker: string; speaker_internal?: string }[]
): [string, string][] {
  const map: [string, string][] = [];
  for (const iv of interviews ?? []) {
    if (!iv.speaker_internal) continue;
    if (/代表取締役|社長/.test(iv.speaker)) continue; // 経営者本人は実名可
    const anon = anonymizeSpeakerLabel(iv.speaker);
    // 「中村常務（工場統括）｜ファイル名.pdf」→「中村常務」
    const head = iv.speaker_internal.split(/[｜|（(]/)[0];
    const re =
      /[一-龥]{1,4}(?:さん|氏|常務|専務|部長|課長|係長|主任|工場長|支店長|店長|所長|園長)|[ァ-ヶー]{3,8}さん?/g;
    for (const m of head.matchAll(re)) {
      if (m[0].length >= 2) map.push([m[0], anon]);
    }
  }
  // 長い表記から先に置換する（「中村常務」を「中村」より先に）
  return map.sort((a, b) => b[0].length - a[0].length);
}

/** 少人数の会社では役職だけで個人が特定できるものを一般語にする */
const UNIQUE_TITLES: [RegExp, string][] = [
  [/常務取締役|常務/g, "経営幹部"],
  [/専務取締役|専務/g, "経営幹部"],
  // 拠点ごとに1人しかいない役職は、それだけで個人が特定できる。
  // 「第二工場長」のように拠点名と一体化している場合は拠点名ごと置き換える
  // （助詞は巻き込まないよう除外する）
  [
    /[^\s、。「」（）はがをにでともへやか]{0,5}(?:工場長|支店長|店長|所長|園長|センター長|事業所長)/g,
    "現場責任者",
  ],
];

/**
 * 匿名版の出力全体に適用する。
 * interviews を渡すと、本文に残った実名も匿名表記に置き換える。
 */
export function anonymizeDeep<T>(
  value: T,
  interviews?: { speaker: string; speaker_internal?: string }[]
): T {
  const nameMap = interviews ? buildNameMap(interviews) : [];
  return deepMapStrings(value, (text) => {
    let t = scrubSiteAttribution(text);
    for (const [name, anon] of nameMap) t = t.split(name).join(anon);
    for (const [re, rep] of UNIQUE_TITLES) t = t.replace(re, rep);
    return t;
  });
}
