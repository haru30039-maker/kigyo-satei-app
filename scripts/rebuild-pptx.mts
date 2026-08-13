// generate_result.json から pptx / Wixテキスト / スコア根拠md を再ビルド（API呼び出しなし）
import fs from "node:fs";
import path from "node:path";
import { buildPptx } from "../lib/pptxBuild";
import { CATEGORIES } from "../lib/scoring";
import type { GenerateResult, CompanyInfo } from "../lib/types";

const outDir = process.argv[2] ?? "/Users/haruna/Downloads/安西工業関連/再生成";
const ANON = process.argv[3] === "anon";
const result = JSON.parse(
  fs.readFileSync(path.join(outDir, "generate_result.json"), "utf-8")
) as GenerateResult;
const company: CompanyInfo = {
  name: "有限会社安西工業",
  industry: "造船・鋼構造物工事業",
  location: "広島県尾道市因島重井町2596",
  employees: "210名（2025年現在）",
  visitDate: "2026/06/24・2026/07/30",
  researchers: "沖田、赤松、井上",
  attribute: result.attribute || "火属性",
};
const chartPath = path.join(outDir, "有限会社安西工業_企業特性チャート.png");
const pptx = buildPptx(
  {
    companyInfo: company,
    scores: result.scores,
    report: result.report_sections,
    wix: result.wix_fields,
  },
  { chartPath: fs.existsSync(chartPath) ? chartPath : undefined }
);
await pptx.writeFile({ fileName: path.join(outDir, `${company.name}_査定レポート.pptx`) });

const w = result.wix_fields;
const scoresLine = CATEGORIES.map((c) => result.scores[c.key]?.normalized ?? 0).join(",");
const wixText = [
  `【タイトル】${company.name}`,
  `【属性】${result.attribute}`,
  `【INTERVIEW人数】11ファイル ／【VISIT DATE】${company.visitDate} ／【INDUSTRY】${company.industry}`,
  ``,
  `【査定サマリー】\n${w.summary_lead}`,
  ``,
  `【代表の言葉】\n${w.founder_quote.text}\n― ${w.founder_quote.name_title}`,
  ``,
  `【インタビューから見えたこと】`,
  ...w.insight_cards.map((c) => `■ ${c.title}\n${c.body}`),
  ``,
  `【インタビュー協力者タグ】${w.interviewee_tags.join(" / ")}`,
  ``,
  `【Real Voice紹介文】\n${w.real_voice_note}`,
  ``,
  `【数字から読み解く】`,
  ...w.numbers_cards.map((c) => `■ ${c.label}: ${c.number}\n${c.note}`),
  ``,
  `【チャートが示す企業特性】`,
  ...w.chart_tabs.map((t) => `■ ${t.tab}\n${t.body}\n合う: ${t.fit_line}\n合わない: ${t.mismatch_line}`),
  ``,
  `【働く環境から見えたこと】`,
  ...w.office_captions.map((c, i) => `写真0${i + 1}: ${c}`),
  ``,
  `【この会社が刺さる人】${w.fits_tags.join(" / ")}`,
  `【この会社が合わない人】${w.mismatch_tags.join(" / ")}`,
  ``,
  `【7スコア】${scoresLine}（ビジョン,仕組み,環境,給与・休日,人間関係,成長,独自性）`,
].join("\n");
fs.writeFileSync(path.join(outDir, "Wix掲載用テキスト.txt"), wixText);

const scoreLines: string[] = [];
for (const c of CATEGORIES) {
  const s = result.scores[c.key];
  scoreLines.push(`\n## ${c.fullLabel} — ${s.subtotal}/${s.max}点 → ${s.normalized}/100点`);
  s.items.forEach((it, i) =>
    scoreLines.push(`${i + 1}. ${it.label} = ${it.score}点\n   根拠: ${it.evidence}`)
  );
}
fs.writeFileSync(
  path.join(outDir, "スコア案と根拠.md"),
  `# ${company.name} スコア案（検証済み更新: ${new Date().toLocaleString("ja-JP")}）\n` + scoreLines.join("\n")
);
console.log("rebuilt: pptx / Wixテキスト / スコア根拠md");
