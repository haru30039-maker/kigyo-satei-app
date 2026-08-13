// 5段階分割の実測テスト（本番ルートと同じプロンプト・同じ呼び出し構造）
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { STAGED_SYSTEM_PROMPT, STAGE_MAX_TOKENS, stageInstruction, type GenerateStage } from "../lib/masterPrompt";
import { CATEGORIES } from "../lib/scoring";

const DATA_DIR = "/Users/haruna/Downloads/安西工業関連";
const tdir = "/private/tmp/claude-501/-Users-haruna-Downloads-------/ce62010f-4c19-42a8-9b2e-ff193332e58e/scratchpad/transcripts";
const DUP = Number(process.env.DUP ?? "1"); // 入力を何倍にするか（4日分の想定検証用）

let texts = fs.readdirSync(tdir).filter(f => f.endsWith(".txt")).map(f =>
  `【ファイル: ${f.replace(".txt", ".pdf")}】\n${fs.readFileSync(path.join(tdir, f), "utf-8")}`);
if (DUP > 1) {
  const base = [...texts];
  for (let i = 1; i < DUP; i++) texts = texts.concat(base.map(t => t.replace("【ファイル: ", `【ファイル: (${i + 1}日目)`)));
}
const transcript = texts.join("\n\n");
const jobPosting = fs.readFileSync(path.join(DATA_DIR, "レポート作成サイトで生成したデータ/安西工業HP・採用サイトまとめ.txt"), "utf-8");
const visitNotes = fs.readFileSync(path.join(DATA_DIR, "レポート作成サイトで生成したデータ/学生メモ.txt"), "utf-8");

const userContent = [
  `# 企業基本情報\n企業名: 有限会社安西工業\n業種: 造船・鋼構造物工事業\n所在地: 広島県尾道市因島重井町2596\n従業員数: 210名\n訪問日: 2026/06/24・2026/07/30\n調査者: 沖田、赤松、井上\n属性: 火属性`,
  `# 求人票・企業HPの記載内容\n${jobPosting.trim()}`,
  `# 見学メモ\n${visitNotes.trim()}`,
  `# インタビュー文字起こし\n${transcript.trim()}`,
].join("\n\n---\n\n");
console.log(`入力: ${userContent.length.toLocaleString()}文字 / 文字起こし${texts.length}本 (DUP=${DUP})`);

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const client = new Anthropic({ apiKey: env.match(/^ANTHROPIC_API_KEY=(.+)$/m)![1].trim() });

let scoresSummary: string | undefined;
const results: Record<string, unknown> = {};
const stages: GenerateStage[] = ["warmup", "scores", "report_main", "report_extra", "wix"];
let total = 0;
for (const stage of stages) {
  const t0 = Date.now();
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: STAGE_MAX_TOKENS[stage],
    system: [{ type: "text", text: STAGED_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{
      role: "user",
      content: [
        { type: "text", text: userContent, cache_control: { type: "ephemeral" } },
        { type: "text", text: stageInstruction(stage, scoresSummary) },
      ],
    }],
  });
  const res = await stream.finalMessage();
  const sec = Math.round((Date.now() - t0) / 1000);
  total += sec;
  const u = res.usage;
  console.log(`[${stage}] ${sec}秒 stop=${res.stop_reason} out=${u.output_tokens} cache_write=${u.cache_creation_input_tokens} cache_read=${u.cache_read_input_tokens}`);
  if (stage === "warmup") continue;
  const tb = res.content.find((b) => b.type === "text") as { text: string };
  const t = tb.text.trim();
  const obj = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)) as Record<string, unknown>;
  if (obj.report_sections) {
    results.report_sections = { ...(results.report_sections as object ?? {}), ...(obj.report_sections as object) };
  } else {
    Object.assign(results, obj);
  }
  if (stage === "scores") {
    const scores = (obj as any).scores;
    scoresSummary = CATEGORIES.map((c) => `${c.fullLabel}: ${scores[c.key]?.normalized ?? 0}/100点`).join(" / ");
    console.log(`  → ${scoresSummary}`);
  }
}
fs.writeFileSync("/tmp/staged_test.json", JSON.stringify(results, null, 2));
const rs = results.report_sections as Record<string, unknown>;
console.log(`\n合計 ${total}秒 / 最長ステージが300秒未満なら本番OK`);
console.log(`report_sections キー: ${Object.keys(rs ?? {}).join(", ")}`);
console.log(`interviews: ${(rs?.interviews as unknown[])?.length ?? 0}話者 / トップキー: ${Object.keys(results).join(", ")}`);
