// 台本生成の動作確認（/api/daihon と同じロジックをローカル実行）
// 簡易版・詳細版の2本を続けて生成し、中身の検証結果を出す。
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import LZString from "lz-string";
import {
  countSlideItems,
  extractPptxSlideTexts,
  type DaihonResult,
  type DaihonVariant,
} from "../lib/daihon";
import {
  DAIHON_MAX_TOKENS,
  DAIHON_SHARED_RULES,
  daihonVariantInstruction,
} from "../lib/daihonPrompt";

const REPORT = "/Users/haruna/Downloads/有限会社安西工業_査定レポート（匿名版）.pptx";
const SCORE = "/Users/haruna/Downloads/有限会社安西工業_スコア根拠説明（匿名版）.pptx";

function toAB(b: Buffer): ArrayBuffer {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

const reportSlides = await extractPptxSlideTexts(toAB(fs.readFileSync(REPORT)));
const scoreSlides = await extractPptxSlideTexts(toAB(fs.readFileSync(SCORE)));
console.log(`report: ${reportSlides.length}枚 / score: ${scoreSlides.length}枚`);

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const key = env.match(/^ANTHROPIC_API_KEY=(.+)$/m)![1].trim();

const counted = [
  countSlideItems("査定レポート", reportSlides),
  countSlideItems("スコア根拠説明資料", scoreSlides),
]
  .filter(Boolean)
  .join("\n");

const userContent = [
  `# 企業名\n有限会社安西工業`,
  `# 査定レポート（スライドごとのテキスト）\n` +
    reportSlides.map((t, i) => `## スライド${i + 1}\n${t}`).join("\n\n"),
  `# スコア根拠説明資料（スライドごとのテキスト）\n` +
    scoreSlides.map((t, i) => `## スライド${i + 1}\n${t}`).join("\n\n"),
  `# 資料から機械的に数えた項目数（正確な数。これと食い違う言い方をしない）\n${counted}\n\n` +
    `「◎が5つ・✕が4つ」のように読み上げる場合は、必ずこの数と一致させること。` +
    `全部読み上げないときは「資料には◯つ挙げていますが、今日は主なものを△つご説明します」と先に断る。`,
].join("\n\n---\n\n");
console.log(`input: ${userContent.length}文字`);
console.log(`数えた項目数:\n${counted}\n`);

const client = new Anthropic({ apiKey: key });

async function run(variant: DaihonVariant): Promise<DaihonResult> {
  const t0 = Date.now();
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: DAIHON_MAX_TOKENS[variant],
    system: [
      { type: "text", text: DAIHON_SHARED_RULES, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userContent, cache_control: { type: "ephemeral" } },
          { type: "text", text: daihonVariantInstruction(variant) },
        ],
      },
    ],
  });
  const res = await stream.finalMessage();
  const u = res.usage;
  console.log(
    `[${variant}] stop=${res.stop_reason} ${((Date.now() - t0) / 1000).toFixed(0)}秒 ` +
      `in=${u.input_tokens} cacheW=${u.cache_creation_input_tokens ?? 0} cacheR=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens}`
  );
  const text = (res.content.find((b) => b.type === "text") as { text: string }).text.trim();
  const parsed = JSON.parse(
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
  ) as DaihonResult;
  parsed.variant = variant;
  if (!Array.isArray(parsed.needs_check)) parsed.needs_check = [];
  if (variant === "brief") parsed.needs_check = [];
  return parsed;
}

// 引数で版を絞れる（例: npx tsx scripts/test-daihon.mts full）
const only = process.argv[2] as DaihonVariant | undefined;
const variants = (only ? [only] : ["brief", "full"]) as DaihonVariant[];

const results: Record<string, DaihonResult> = {};
for (const v of variants) {
  results[v] = await run(v);
}

// ---------- 検証 ----------
const LEAK = ["中村", "石井", "浅野", "ゴンザレス", "常務", "専務", "工場長", "支店長",
  "弓削", "大浜", "重井", "赤崎", "沖田", "赤松", "井上", "星野", "田中"];

for (const v of variants) {
  const d = results[v];
  const json = JSON.stringify(d);
  const chars = d.sections.reduce((s, x) => s + x.lines.join("").length, 0);
  const mins = d.sections.reduce((s, x) => s + (Number(x.minutes) || 0), 0);
  const url = `https://kigyo-satei-app.vercel.app/daihon/view#d=${LZString.compressToEncodedURIComponent(json)}`;

  console.log(`\n${"=".repeat(60)}\n【${v}】${d.title}`);
  console.log(`  duration_note: ${d.duration_note}`);
  console.log(`  セクション ${d.sections.length}本 / 表記合計 ${mins}分 / 本文 ${chars}字 → 実測約${(chars / 300).toFixed(1)}分`);
  console.log(`  rules ${d.rules.length} / qa ${d.qa.length} / memo ${d.memo.length} / needs_check ${d.needs_check!.length}`);
  console.log(`  共有URL長: ${url.length.toLocaleString()}文字`);

  const leaks = LEAK.filter((t) => json.includes(t));
  console.log(`  実名・拠点名の漏れ: ${leaks.length ? "⚠ " + leaks.join(",") : "✅ なし"}`);

  console.log("  --- セクション ---");
  for (const s of d.sections) {
    console.log(`   ${s.no}. ${s.title}（${s.minutes}分 / ${s.lines.join("").length}字）`);
  }
  if (d.needs_check!.length) {
    console.log("  --- needs_check ---");
    for (const n of d.needs_check!) {
      console.log(`   ● ${n.service}`);
      console.log(`     根拠: ${n.basis}`);
      console.log(`     質問: ${n.question}`);
      console.log(`     YES : ${n.if_yes}`);
      console.log(`     NO  : ${n.if_no}`);
    }
  }
  fs.writeFileSync(`/tmp/daihon-${v}.json`, JSON.stringify(d, null, 2));
}
console.log("\n保存: /tmp/daihon-brief.json /tmp/daihon-full.json");
