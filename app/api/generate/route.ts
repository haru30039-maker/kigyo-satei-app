import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  MASTER_PROMPT,
  STAGED_SYSTEM_PROMPT,
  STAGE_MAX_TOKENS,
  stageInstruction,
  type GenerateStage,
} from "@/lib/masterPrompt";
import { CATEGORIES } from "@/lib/scoring";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_MODELS = [
  "claude-sonnet-4-6", // デフォルト（コストと品質のバランス）
  "claude-haiku-4-5",
  "claude-opus-4-8",
];
const DEFAULT_MODEL = "claude-sonnet-4-6";

// プライバシー方針：文字起こし・生成結果はこのプロセスで保存しない（完全ステートレス）。
// ログには文字数・処理時間・トークン数などのメタ情報のみを出力し、本文は一切出力しない。

function buildUserContent(req: GenerateRequest): string {
  const { companyInfo, transcript, existingScores, jobPosting, visitNotes } =
    req;

  const parts: string[] = [];

  parts.push(`# 企業基本情報
企業名: ${companyInfo.name}
業種: ${companyInfo.industry}
所在地: ${companyInfo.location}
従業員数: ${companyInfo.employees}
訪問日: ${companyInfo.visitDate}
調査者: ${companyInfo.researchers}
属性: ${companyInfo.attribute}`);

  if (existingScores && Object.keys(existingScores).length > 0) {
    const lines: string[] = [];
    for (const cat of CATEGORIES) {
      const vals = existingScores[cat.key];
      if (vals && vals.length > 0) {
        lines.push(
          `${cat.fullLabel}: ` +
            cat.items
              .map((item, i) =>
                vals[i] != null ? `「${item}」=${vals[i]}点` : `「${item}」=未入力`
              )
              .join(" / ")
        );
      }
    }
    if (lines.length > 0) {
      parts.push(
        `# 評価表の既存スコア（入力済み。これを正とする）\n${lines.join("\n")}`
      );
    }
  }

  if (jobPosting.trim()) {
    parts.push(`# 求人票・企業HPの記載内容\n${jobPosting.trim()}`);
  }

  if (visitNotes.trim()) {
    parts.push(`# 見学メモ\n${visitNotes.trim()}`);
  }

  parts.push(`# インタビュー文字起こし\n${transcript.trim()}`);

  return parts.join("\n\n---\n\n");
}

// 前置きや ```json フェンスが混ざっても最初の { から最後の } までを取り出してパースする
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

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  if (!body.transcript?.trim()) {
    return NextResponse.json(
      { error: "インタビュー文字起こしを入力してください" },
      { status: 400 }
    );
  }
  if (!body.companyInfo?.name?.trim()) {
    return NextResponse.json(
      { error: "企業名を入力してください" },
      { status: 400 }
    );
  }

  const model = ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_MODEL;
  const userContent = buildUserContent(body);

  const client = new Anthropic(); // ANTHROPIC_API_KEY はサーバー側の環境変数から

  try {
    // クレジット節約方針：
    // - スコア案・レポート・Wixテキストを 1回のリクエストでまとめて生成
    // - 固定部分（マスタープロンプト）は prompt caching（cache_control: ephemeral）
    // 注: このスキーマは structured output の grammar サイズ上限を超えるため、
    //     マスタープロンプト末尾の「JSONのみ返す」指示＋パースで対応している。
    // ストリーミングで受信し完了までまとめる（非ストリーミングの長時間リクエスト制限と
    // 接続アイドルタイムアウトを回避。インタビューが多い案件は生成が数分かかる）。
    // 分割生成: stage 指定時はそのパートのみ生成する。
    // システムプロンプト＋入力資料（userContent）は3ステージで同一なので、
    // cache_control を userContent 側に付けることで2回目以降はキャッシュが効く。
    const stage = ([
      "warmup",
      "scores",
      "report",
      "report_main",
      "report_extra",
      "wix",
    ] as const).includes(
      body.stage as GenerateStage
    )
      ? (body.stage as GenerateStage)
      : null;

    const stream = stage
      ? client.messages.stream({
          model,
          max_tokens: STAGE_MAX_TOKENS[stage],
          system: [
            {
              type: "text",
              text: STAGED_SYSTEM_PROMPT,
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
                {
                  type: "text",
                  text: stageInstruction(stage, body.scoresSummary),
                },
              ],
            },
          ],
        })
      : client.messages.stream({
          model,
          max_tokens: 32000,
          system: [
            {
              type: "text",
              text: MASTER_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [{ role: "user", content: userContent }],
        });
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "モデルが生成を拒否しました。入力内容を確認してください。" },
        { status: 502 }
      );
    }
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        {
          error:
            "出力がトークン上限に達しました。文字起こしを分割するか、もう一度お試しください。",
        },
        { status: 502 }
      );
    }

    // warmup はキャッシュ作成が目的。本文は不要
    if (stage === "warmup") {
      console.log(
        JSON.stringify({
          route: "generate",
          stage: "warmup",
          model,
          input_chars: userContent.length,
          duration_ms: Date.now() - started,
          cache_creation_input_tokens:
            response.usage.cache_creation_input_tokens,
          cache_read_input_tokens: response.usage.cache_read_input_tokens,
        })
      );
      return NextResponse.json({ ok: true });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "モデルからテキスト応答が得られませんでした" },
        { status: 502 }
      );
    }

    let result: unknown;
    try {
      result = extractJson(textBlock.text);
    } catch {
      return NextResponse.json(
        { error: "生成結果のJSON解析に失敗しました。もう一度お試しください。" },
        { status: 502 }
      );
    }

    // メタ情報のみログ出力（本文・PIIは出力しない）
    console.log(
      JSON.stringify({
        route: "generate",
        stage: body.stage ?? "all",
        model,
        input_chars: userContent.length,
        duration_ms: Date.now() - started,
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_read_input_tokens: response.usage.cache_read_input_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens,
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Anthropic APIエラー (${err.status}): ${err.message}`
        : "生成中にエラーが発生しました";
    // エラーログもメタ情報のみ
    console.error(
      JSON.stringify({
        route: "generate",
        model,
        input_chars: userContent.length,
        duration_ms: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
