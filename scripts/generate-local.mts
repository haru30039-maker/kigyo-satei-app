// ローカル一発生成スクリプト（サイトを経由せず、アプリと同じプロンプト・同じpptxレイアウトで生成する）
// 使い方: npx tsx scripts/generate-local.mts <出力ディレクトリ>
// 入力は下の INPUTS を編集する。APIキーは .env.local の ANTHROPIC_API_KEY を使用。

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { MASTER_PROMPT } from "../lib/masterPrompt";
import { CATEGORIES } from "../lib/scoring";
import { buildPptx } from "../lib/pptxBuild";
import type { GenerateResult, CompanyInfo } from "../lib/types";

// ======== 入力（案件ごとにここを編集） ========
const DATA_DIR = "/Users/haruna/Downloads/安西工業関連";
const COMPANY: CompanyInfo = {
  name: "有限会社安西工業",
  industry: "造船・鋼構造物工事業",
  location: "広島県尾道市因島重井町2596",
  employees: "210名（2025年現在）",
  visitDate: "2026/06/24・2026/07/30",
  researchers: "沖田、赤松、井上",
  attribute: "火属性",
};
const TRANSCRIPT_DIRS = [
  path.join(DATA_DIR, "2026:06:24査定訪問インタビュー文字起こし"),
  path.join(DATA_DIR, "2026:07:30査定訪問インタビュー文字起こし"),
];
const JOB_POSTING_FILE = path.join(
  DATA_DIR,
  "レポート作成サイトで生成したデータ/安西工業HP・採用サイトまとめ.txt"
);
const VISIT_NOTES_FILE = path.join(
  DATA_DIR,
  "レポート作成サイトで生成したデータ/学生メモ.txt"
);
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 32000;
// =============================================

function loadEnvKey(): string {
  const env = fs.readFileSync(
    path.join(import.meta.dirname, "../.env.local"),
    "utf-8"
  );
  const m = env.match(/^ANTHROPIC_API_KEY=(.+)$/m);
  if (!m) throw new Error(".env.local に ANTHROPIC_API_KEY がありません");
  return m[1].trim();
}

async function extractPdfText(filePath: string): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join("")
    );
  }
  return pages.join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("no JSON object found");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

async function main() {
  const outDir = process.argv[2] ?? path.join(DATA_DIR, "再生成");
  fs.mkdirSync(outDir, { recursive: true });

  // 1. 文字起こしPDFを収集・抽出
  const pdfFiles = TRANSCRIPT_DIRS.flatMap((dir) =>
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".pdf"))
      .map((f) => path.join(dir, f))
  );
  console.log(`文字起こし ${pdfFiles.length} ファイルを抽出中…`);
  const texts: string[] = [];
  for (const f of pdfFiles) {
    const t = await extractPdfText(f);
    console.log(`  ${path.basename(f)}: ${t.length}文字`);
    texts.push(`【ファイル: ${path.basename(f)}】\n${t}`);
  }
  const transcript = texts.join("\n\n");
  const jobPosting = fs.readFileSync(JOB_POSTING_FILE, "utf-8");
  const visitNotes = fs.readFileSync(VISIT_NOTES_FILE, "utf-8");

  // 2. ユーザーコンテンツ組み立て（app/api/generate/route.ts と同一形式）
  const userContent = [
    `# 企業基本情報
企業名: ${COMPANY.name}
業種: ${COMPANY.industry}
所在地: ${COMPANY.location}
従業員数: ${COMPANY.employees}
訪問日: ${COMPANY.visitDate}
調査者: ${COMPANY.researchers}
属性: ${COMPANY.attribute}`,
    `# 求人票・企業HPの記載内容\n${jobPosting.trim()}`,
    `# 見学メモ\n${visitNotes.trim()}`,
    `# インタビュー文字起こし\n${transcript.trim()}`,
  ].join("\n\n---\n\n");
  console.log(`入力合計: ${userContent.length}文字`);

  // 3. 生成（ストリーミング）
  const client = new Anthropic({ apiKey: loadEnvKey() });
  const started = Date.now();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: MASTER_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userContent }],
  });
  stream.on("text", () => process.stdout.write("."));
  const response = await stream.finalMessage();
  console.log(
    `\n生成完了: ${Math.round((Date.now() - started) / 1000)}秒 / stop=${response.stop_reason} / in=${response.usage.input_tokens} out=${response.usage.output_tokens}`
  );
  if (response.stop_reason === "max_tokens")
    throw new Error("出力がトークン上限に達しました（max_tokens を上げて再実行）");

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text")
    throw new Error("テキスト応答が得られませんでした");
  const result = extractJson(textBlock.text) as GenerateResult;

  // 4. 保存
  fs.writeFileSync(
    path.join(outDir, "generate_result.json"),
    JSON.stringify(result, null, 2)
  );

  const company = { ...COMPANY, attribute: result.attribute || COMPANY.attribute };
  const pptx = buildPptx({
    companyInfo: company,
    scores: result.scores,
    report: result.report_sections,
    wix: result.wix_fields,
  });
  const pptxPath = path.join(outDir, `${COMPANY.name}_査定レポート.pptx`);
  await pptx.writeFile({ fileName: pptxPath });
  console.log(`pptx: ${pptxPath}`);

  // Wixテキスト
  const w = result.wix_fields;
  const scoresLine = CATEGORIES.map(
    (c) => result.scores[c.key]?.normalized ?? 0
  ).join(",");
  const wixText = [
    `【タイトル】${COMPANY.name}`,
    `【属性】${result.attribute}`,
    `【INTERVIEW人数】${pdfFiles.length}ファイル ／【VISIT DATE】${COMPANY.visitDate} ／【INDUSTRY】${COMPANY.industry}`,
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
    ...w.chart_tabs.map(
      (t) => `■ ${t.tab}\n${t.body}\n合う: ${t.fit_line}\n合わない: ${t.mismatch_line}`
    ),
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

  // スコア根拠一覧（すり合わせ用）
  const scoreLines: string[] = [];
  for (const c of CATEGORIES) {
    const s = result.scores[c.key];
    scoreLines.push(
      `\n## ${c.fullLabel} — ${s.subtotal}/${s.max}点 → ${s.normalized}/100点`
    );
    s.items.forEach((it, i) =>
      scoreLines.push(`${i + 1}. ${it.label} = ${it.score}点\n   根拠: ${it.evidence}`)
    );
  }
  fs.writeFileSync(
    path.join(outDir, "スコア案と根拠.md"),
    `# ${COMPANY.name} スコア案（生成: ${new Date().toLocaleString("ja-JP")}）\n` +
      scoreLines.join("\n")
  );
  console.log(`出力先: ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
