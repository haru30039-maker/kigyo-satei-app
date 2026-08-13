// 台本生成の動作確認（/api/daihon と同じロジックをローカル実行）
import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { extractPptxSlideTexts, type DaihonResult } from "../lib/daihon";
import LZString from "lz-string";

const reportBuf = fs.readFileSync("/Users/haruna/Downloads/安西工業関連/社長提出用/有限会社安西工業_査定レポート.pptx");
const scoreBuf = fs.readFileSync("/Users/haruna/Downloads/安西工業関連/社長提出用/スコア根拠説明_MTG用.pptx");
const reportSlides = await extractPptxSlideTexts(reportBuf.buffer.slice(reportBuf.byteOffset, reportBuf.byteOffset + reportBuf.byteLength) as ArrayBuffer);
const scoreSlides = await extractPptxSlideTexts(scoreBuf.buffer.slice(scoreBuf.byteOffset, scoreBuf.byteOffset + scoreBuf.byteLength) as ArrayBuffer);
console.log(`report: ${reportSlides.length}枚 / score: ${scoreSlides.length}枚`);

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const key = env.match(/^ANTHROPIC_API_KEY=(.+)$/m)![1].trim();

// route.ts と同じプロンプトを読み込む（ファイルから抜き出し）
const routeSrc = fs.readFileSync(new URL("../app/api/daihon/route.ts", import.meta.url), "utf-8");
const promptMatch = routeSrc.match(/const DAIHON_PROMPT = `([\s\S]*?)`;/);
const DAIHON_PROMPT = promptMatch![1];

const userContent = [
  `# 企業名\n有限会社安西工業`,
  `# 査定レポート（スライドごとのテキスト）\n` + reportSlides.map((t, i) => `## スライド${i + 1}\n${t}`).join("\n\n"),
  `# スコア根拠説明資料（スライドごとのテキスト）\n` + scoreSlides.map((t, i) => `## スライド${i + 1}\n${t}`).join("\n\n"),
].join("\n\n---\n\n");
console.log(`input: ${userContent.length}文字`);

const client = new Anthropic({ apiKey: key });
const stream = client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 8000,
  system: [{ type: "text", text: DAIHON_PROMPT }],
  messages: [{ role: "user", content: userContent }],
});
const response = await stream.finalMessage();
console.log(`stop=${response.stop_reason} in=${response.usage.input_tokens} out=${response.usage.output_tokens}`);
const text = response.content.find((b) => b.type === "text")!;
const trimmed = (text as { text: string }).text.trim();
const start = trimmed.indexOf("{");
const result = JSON.parse(trimmed.slice(start, trimmed.lastIndexOf("}") + 1)) as DaihonResult;
fs.writeFileSync("/tmp/daihon_test.json", JSON.stringify(result, null, 2));

// URL往復テスト
const packed = LZString.compressToEncodedURIComponent(JSON.stringify(result));
console.log(`URL長: ${packed.length + 30}文字`);
const back = JSON.parse(LZString.decompressFromEncodedURIComponent(packed)!) as DaihonResult;
console.log(`往復OK: sections=${back.sections.length} qa=${back.qa.length} rules=${back.rules.length}`);
fs.writeFileSync("/tmp/daihon_fragment.txt", packed);
