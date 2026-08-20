import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  countSlideItems,
  extractPptxSlideTexts,
  type DaihonResult,
  type DaihonVariant,
} from "@/lib/daihon";
import {
  DAIHON_MAX_TOKENS,
  DAIHON_SHARED_RULES,
  daihonVariantInstruction,
} from "@/lib/daihonPrompt";

export const runtime = "nodejs";
export const maxDuration = 300;

// プライバシー方針：アップロードされたレポート・生成した台本はサーバーに保存しない。
// ログはメタ情報のみ。

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

export async function POST(request: NextRequest) {
  const started = Date.now();
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const report = form.get("report");
  if (!(report instanceof File)) {
    return NextResponse.json(
      { error: "査定レポート（.pptx）をアップロードしてください" },
      { status: 400 }
    );
  }
  const company = String(form.get("company") ?? "").trim();
  const variant: DaihonVariant =
    form.get("variant") === "full" ? "full" : "brief";

  let reportSlides: string[];
  try {
    reportSlides = await extractPptxSlideTexts(await report.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: `${report.name} を読み取れませんでした（.pptx形式か確認してください）` },
      { status: 400 }
    );
  }
  if (reportSlides.join("").trim().length < 100) {
    return NextResponse.json(
      { error: "レポートからテキストを抽出できませんでした" },
      { status: 400 }
    );
  }

  // 任意: スコア根拠説明資料
  let scoreSlides: string[] | null = null;
  const scoreFile = form.get("score");
  if (scoreFile instanceof File && scoreFile.size > 0) {
    try {
      scoreSlides = await extractPptxSlideTexts(await scoreFile.arrayBuffer());
    } catch {
      scoreSlides = null; // 読めなければ無視して続行
    }
  }

  const parts: string[] = [];
  if (company) parts.push(`# 企業名\n${company}`);
  parts.push(
    `# 査定レポート（スライドごとのテキスト）\n` +
      reportSlides.map((t, i) => `## スライド${i + 1}\n${t}`).join("\n\n")
  );
  if (scoreSlides) {
    parts.push(
      `# スコア根拠説明資料（スライドごとのテキスト）\n` +
        scoreSlides.map((t, i) => `## スライド${i + 1}\n${t}`).join("\n\n")
    );
  }
  // 項目数はコード側で数えて事実として渡す（AIが数え間違えるため）
  const counted = [
    countSlideItems("査定レポート", reportSlides),
    scoreSlides ? countSlideItems("スコア根拠説明資料", scoreSlides) : null,
  ]
    .filter(Boolean)
    .join("\n");
  if (counted) {
    parts.push(
      `# 資料から機械的に数えた項目数（正確な数。これと食い違う言い方をしない）\n` +
        `${counted}\n\n` +
        `「◎が5つ・✕が4つ」のように読み上げる場合は、必ずこの数と一致させること。` +
        `全部読み上げないときは「資料には◯つ挙げていますが、今日は主なものを△つご説明します」と先に断る。`
    );
  }

  const userContent = parts.join("\n\n---\n\n");

  const client = new Anthropic();
  try {
    // 簡易版・詳細版を続けて生成するため、共通ルールと資料本文までを
    // キャッシュ対象にし、版ごとに違う構成の指示だけを後ろに足す。
    // こうすると2回目の呼び出しで資料の読み込み分がキャッシュに当たる。
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: DAIHON_MAX_TOKENS[variant],
      system: [
        {
          type: "text",
          text: DAIHON_SHARED_RULES,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userContent,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: daihonVariantInstruction(variant) },
          ],
        },
      ],
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "出力が上限に達しました。もう一度お試しください。" },
        { status: 502 }
      );
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "モデルからテキスト応答が得られませんでした" },
        { status: 502 }
      );
    }
    let result: DaihonResult;
    try {
      result = extractJson(textBlock.text) as DaihonResult;
    } catch {
      return NextResponse.json(
        { error: "生成結果の解析に失敗しました。もう一度お試しください。" },
        { status: 502 }
      );
    }

    // 版はサーバー側で確定させる（モデルの自己申告に任せない）
    result.variant = variant;
    if (!Array.isArray(result.needs_check)) result.needs_check = [];
    if (variant === "brief") result.needs_check = [];

    console.log(
      JSON.stringify({
        route: "daihon",
        variant,
        input_chars: userContent.length,
        duration_ms: Date.now() - started,
        input_tokens: response.usage.input_tokens,
        cache_read: response.usage.cache_read_input_tokens ?? 0,
        output_tokens: response.usage.output_tokens,
      })
    );
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Anthropic APIエラー (${err.status}): ${err.message}`
        : "生成中にエラーが発生しました";
    console.error(
      JSON.stringify({
        route: "daihon",
        duration_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
