// MTG用「スコア根拠説明」スライド（学生が説明する用）
import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { CATEGORIES } from "../lib/scoring";
import type { GenerateResult } from "../lib/types";

const outDir = process.argv[2] ?? "/Users/haruna/Downloads/安西工業関連/再生成";
const ANON = process.argv[3] === "anon";
const result = JSON.parse(
  fs.readFileSync(path.join(outDir, "generate_result.json"), "utf-8")
) as GenerateResult;

const YELLOW = "FFC907", BLACK = "111111", WHITE = "FFFFFF",
  GRAY_BG = "F2F2F2", GRAY_TEXT = "555555";
const FONT = "Yu Gothic";
const PAGE_W = 10, PAGE_H = 5.63;

const SOURCES: Record<string, string> = {
  vision: "最終安斎社長／安西社長インタビュー／学生メモ",
  system: "安西社長インタビュー／中村常務／女性社員2名／06-24導入",
  environment: "見学メイン／学生メモ／弓削工場／女性社員2名",
  compensation: "安西社長インタビュー／採用方針インタビュー／HP求人票",
  relationships: "女性社員2名／中村常務／技能実習生／学生メモ",
  growth: "安西社長インタビュー／女性社員2名／中村常務／大浜工場3年以上",
  uniqueness: "最終安斎社長／採用方針インタビュー／HPまとめ",
};

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_16x9";
pptx.author = "#ともあゆ 学生企業査定";
pptx.title = "有限会社安西工業 スコア根拠説明";

function bodySlide(title: string) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: PAGE_H, fill: { color: YELLOW } });
  slide.addText(title, { x: 0.45, y: 0.18, w: PAGE_W - 0.9, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: BLACK });
  slide.addShape("rect", { x: 0.45, y: 0.72, w: 2.2, h: 0.06, fill: { color: YELLOW } });
  return slide;
}

// 1. 表紙
{
  const s = pptx.addSlide();
  s.background = { color: BLACK };
  s.addShape("rect", { x: 0, y: 4.9, w: PAGE_W, h: 0.18, fill: { color: YELLOW } });
  s.addText("評価スコアの根拠説明", { x: 0.6, y: 1.2, w: PAGE_W - 1.2, h: 0.6, fontFace: FONT, fontSize: 20, color: YELLOW, bold: true });
  s.addText("有限会社安西工業", { x: 0.6, y: 1.8, w: PAGE_W - 1.2, h: 1.0, fontFace: FONT, fontSize: 40, color: WHITE, bold: true });
  s.addText("2026/08/10 チームMTG用　※スコアはすり合わせ前のドラフト\n訪問日：2026/06/24・2026/07/30（インタビュー11本＋見学＋HP調査に基づく）\n#ともあゆ 学生企業査定チーム", { x: 0.6, y: 3.1, w: PAGE_W - 1.2, h: 1.3, fontFace: FONT, fontSize: 13, color: WHITE, lineSpacing: 22 });
}

// 2. 評価の考え方
{
  const s = bodySlide("評価の考え方（説明の前提）");
  s.addText([
    { text: "「良い・悪い」のランク付けではなく、「どこに力を入れているか」の特徴分析。\n", options: { bold: true, fontSize: 13 } },
    { text: "・7カテゴリ・全31項目を、インタビュー・見学・求人票の根拠に基づき1〜5点で採点\n・カテゴリ合計を100点換算（四捨五入）してチャート化\n・根拠が取れない項目は「3点仮置き」と明示し、確認質問を添える\n・全スコアは企業確認前ドラフト。今日のすり合わせで確定する", options: { fontSize: 12 } },
  ], { x: 0.45, y: 1.0, w: PAGE_W - 0.9, h: 1.7, fontFace: FONT, color: BLACK, lineSpacing: 20, valign: "top" });
  const header = [
    { text: "カテゴリ", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
    { text: "小項目", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
    { text: "満点", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
    { text: "今回", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
    { text: "100点換算", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
  ];
  const rows = CATEGORIES.map((c) => {
    const sc = result.scores[c.key];
    return [
      { text: c.fullLabel, options: { bold: true } },
      { text: `${sc.items.length}項目`, options: {} },
      { text: `${sc.max}`, options: {} },
      { text: `${sc.subtotal}`, options: {} },
      { text: `${sc.normalized}`, options: { bold: true } },
    ];
  });
  s.addTable([header, ...rows], { x: 0.45, y: 2.85, w: PAGE_W - 0.9, colW: [3.4, 1.5, 1.3, 1.3, 1.6], fontFace: FONT, fontSize: 10, color: BLACK, border: { type: "solid", color: "CCCCCC", pt: 0.75 }, autoPage: false });
}

// 3. 総合チャート
{
  const s = bodySlide("総合スコア（100点換算）");
  s.addImage({ path: path.join(outDir, "有限会社安西工業_企業特性チャート.png"), x: 0.7, y: 1.0, w: 4.3, h: 4.3 });
  let y = 1.15;
  for (const c of CATEGORIES) {
    const v = result.scores[c.key]?.normalized ?? 0;
    s.addText(c.fullLabel, { x: 5.4, y, w: 2.6, h: 0.42, fontFace: FONT, fontSize: 12, bold: true, color: BLACK, valign: "middle" });
    s.addShape("rect", { x: 8.0, y: y + 0.08, w: 1.2, h: 0.26, fill: { color: GRAY_BG } });
    s.addShape("rect", { x: 8.0, y: y + 0.08, w: Math.max(0.02, (1.2 * v) / 100), h: 0.26, fill: { color: YELLOW } });
    s.addText(`${v}`, { x: 9.25, y, w: 0.6, h: 0.42, fontFace: FONT, fontSize: 13, bold: true, color: BLACK, valign: "middle" });
    y += 0.55;
  }
}

// 4〜10. カテゴリ別根拠
for (const c of CATEGORIES) {
  const sc = result.scores[c.key];
  const s = bodySlide(`${c.fullLabel}　${sc.subtotal}/${sc.max}点 → ${sc.normalized}/100点`);
  const n = sc.items.length;
  const blockH = (PAGE_H - 1.35 - 0.42) / n;
  let y = 0.95;
  sc.items.forEach((it, i) => {
    s.addText([
      { text: `${i + 1}. ${it.label}　`, options: { bold: true, color: BLACK } },
      { text: `${it.score}点`, options: { bold: true, color: BLACK, highlight: YELLOW } },
    ], { x: 0.45, y, w: PAGE_W - 0.9, h: 0.28, fontFace: FONT, fontSize: 11.5, valign: "middle" });
    s.addText(it.evidence, { x: 0.7, y: y + 0.27, w: PAGE_W - 1.15, h: blockH - 0.3, fontFace: FONT, fontSize: 9.5, color: GRAY_TEXT, fit: "shrink", valign: "top" });
    y += blockH;
  });
  s.addShape("rect", { x: 0.45, y: PAGE_H - 0.48, w: PAGE_W - 0.9, h: 0.34, fill: { color: GRAY_BG } });
  s.addText([
    { text: "主な出典  ", options: { bold: true, color: BLACK } },
    { text: ANON ? "社長・社員インタビュー（匿名）／見学記録／HP・求人票" : (SOURCES[c.key] ?? ""), options: { color: GRAY_TEXT } },
  ], { x: 0.6, y: PAGE_H - 0.48, w: PAGE_W - 1.2, h: 0.34, fontFace: FONT, fontSize: 9.5, valign: "middle", fit: "shrink" });
}

// 11. 説明時の留意点（匿名=配布用は文面を差し替え）
if (ANON) {
  const s = bodySlide("本資料の位置づけ");
  s.addText([
    { text: "① スコアは学生団体#ともあゆによる特徴分析であり、企業のランク付けではありません\n", options: {} },
    { text: "② 低いスコアは「悪い」ではなく「現在は力を入れていない・仕組み化されていない」ことを示します\n", options: {} },
    { text: "③ 引用はインタビュー文字起こしに忠実に記載し、確認できなかった内容は掲載していません\n", options: {} },
    { text: "④ ご発言者はすべて匿名化しています。Webサイトへの掲載範囲は別途ご相談させてください\n", options: {} },
    { text: "⑤ 本資料・レポートはすべて企業確認前ドラフトです。内容に事実誤認があればご指摘ください", options: {} },
  ], { x: 0.45, y: 1.05, w: PAGE_W - 0.9, h: 3.0, fontFace: FONT, fontSize: 12.5, color: BLACK, lineSpacing: 24, valign: "top" });
  s.addShape("rect", { x: 0.45, y: 4.35, w: PAGE_W - 0.9, h: 0.85, fill: { color: GRAY_BG } });
  s.addText([
    { text: "追加で確認させていただきたい点  ", options: { bold: true, color: BLACK } },
    { text: (result.report_sections.missing_info ?? []).slice(0, 4).join("／"), options: { color: GRAY_TEXT } },
  ], { x: 0.6, y: 4.35, w: PAGE_W - 1.2, h: 0.85, fontFace: FONT, fontSize: 10, valign: "middle", fit: "shrink" });
} else {
  const s = bodySlide("説明時の留意点");
  s.addText([
    { text: "① 引用は文字起こしに忠実。検証で裏取りできなかった記述はレポートから削除済み\n", options: {} },
    { text: "　（例：休憩時刻の細部、未確認の給与数字、誇張表現など → 詳細は「出典対応表.md」）\n", options: { color: GRAY_TEXT, fontSize: 10.5 } },
    { text: "② 年間休日はHP求人票87日・井上メモ88日と1日ずれあり。レポートはHPの87日を採用\n", options: {} },
    { text: "③ スコアが低いカテゴリ（仕組み56・給与休日56）は「悪い」ではなく「力を入れていない/未整備」という特徴として説明する\n", options: {} },
    { text: "④ 個人が特定される発言（役職・年次の組み合わせ）は公開前に本人確認を取る\n", options: {} },
    { text: "⑤ 本資料・レポートはすべて企業確認前ドラフト。発表範囲は安西社長と協議のうえ確定", options: {} },
  ], { x: 0.45, y: 1.05, w: PAGE_W - 0.9, h: 3.0, fontFace: FONT, fontSize: 12, color: BLACK, lineSpacing: 22, valign: "top" });
  s.addShape("rect", { x: 0.45, y: 4.35, w: PAGE_W - 0.9, h: 0.85, fill: { color: GRAY_BG } });
  s.addText([
    { text: "追加で確認すべき点（情報不足）  ", options: { bold: true, color: BLACK } },
    { text: (result.report_sections.missing_info ?? []).slice(0, 4).join("／"), options: { color: GRAY_TEXT } },
  ], { x: 0.6, y: 4.35, w: PAGE_W - 1.2, h: 0.85, fontFace: FONT, fontSize: 10, valign: "middle", fit: "shrink" });
}

await pptx.writeFile({ fileName: path.join(outDir, "スコア根拠説明_MTG用.pptx") });
console.log("done");
