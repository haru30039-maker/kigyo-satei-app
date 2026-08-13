// 分割生成の実測テスト（本番ルートと同じプロンプト・同じ呼び出し構造）
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { STAGED_SYSTEM_PROMPT, STAGE_MAX_TOKENS, stageInstruction, type GenerateStage } from "../lib/masterPrompt";
import { extractPptxSlideTexts } from "../lib/daihon";
import { CATEGORIES } from "../lib/scoring";

// 入力は generate-local と同じ組み立て（フル11ファイル）
const { execSync } = await import("node:child_process");
const path = await import("node:path");
const DATA_DIR = "/Users/haruna/Downloads/安西工業関連";
const dirs = [
  path.join(DATA_DIR, "2026:06:24査定訪問インタビュー文字起こし"),
  path.join(DATA_DIR, "2026:07:30査定訪問インタビュー文字起こし"),
];
// 既に抽出済みのテキストを再利用（scratchpad/transcripts）
const tdir = "/private/tmp/claude-501/-Users-haruna-Downloads-------/ce62010f-4c19-42a8-9b2e-ff193332e58e/scratchpad/transcripts";
const texts = fs.readdirSync(tdir).filter(f => f.endsWith(".txt")).map(f =>
  `【ファイル: ${f.replace(".txt", ".pdf")}】\n${fs.readFileSync(path.join(tdir, f), "utf-8")}`);
const transcript = texts.join("\n\n");
const jobPosting = fs.readFileSync(path.join(DATA_DIR, "レポート作成サイトで生成したデータ/安西工業HP・採用サイトまとめ.txt"), "utf-8");
const visitNotes = fs.readFileSync(path.join(DATA_DIR, "レポート作成サイトで生成したデータ/学生メモ.txt"), "utf-8");

const userContent = [
  `# 企業基本情報\n企業名: 有限会社安西工業\n業種: 造船・鋼構造物工事業\n所在地: 広島県尾道市因島重井町2596\n従業員数: 210名\n訪問日: 2026/06/24・2026/07/30\n調査者: 沖田、赤松、井上\n属性: 火属性`,
  `# 求人票・企業HPの記載内容\n${jobPosting.trim()}`,
  `# 見学メモ\n${visitNotes.trim()}`,
  `# インタビュー文字起こし\n${transcript.trim()}`,
].join("\n\n---\n\n");
console.log(`入力: ${userContent.length}文字 / 文字起こし${texts.length}本`);

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const client = new Anthropic({ apiKey: env.match(/^ANTHROPIC_API_KEY=(.+)$/m)![1].trim() });

let scoresSummary: string | undefined;
const results: Record<string, unknown> = {};
for (const stage of ["scores", "report", "wix"] as GenerateStage[]) {
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
  const u = res.usage;
  console.log(`[${stage}] ${sec}秒 / stop=${res.stop_reason} / in=${u.input_tokens} out=${u.output_tokens} / cache_write=${u.cache_creation_input_tokens} cache_read=${u.cache_read_input_tokens}`);
  const tb = res.content.find((b) => b.type === "text") as { text: string };
  const t = tb.text.trim();
  const obj = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  Object.assign(results, obj);
  if (stage === "scores") {
    const scores = (obj as any).scores;
    scoresSummary = CATEGORIES.map((c) => `${c.fullLabel}: ${scores[c.key]?.normalized ?? 0}/100点`).join(" / ");
    console.log(`  スコア: ${scoresSummary}`);
  }
}
fs.writeFileSync("/tmp/staged_test.json", JSON.stringify(results, null, 2));
const keys = Object.keys(results);
console.log(`最終キー: ${keys.join(", ")}`);
