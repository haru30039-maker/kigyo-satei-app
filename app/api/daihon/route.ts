import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractPptxSlideTexts, type DaihonResult } from "@/lib/daihon";

export const runtime = "nodejs";
export const maxDuration = 300;

// プライバシー方針：アップロードされたレポート・生成した台本はサーバーに保存しない。
// ログはメタ情報のみ。

const DAIHON_PROMPT = `あなたは学生団体 #ともあゆ の「学生企業査定」チームのアシスタントです。
入力として、完成した査定レポート（スライドごとのテキスト。任意でスコア根拠説明資料も）が与えられます。
これをもとに、**学生が企業の社長への報告MTGでそのまま音読できる説明台本**を作ってください。

## 台本の構成（この順序・この考え方を必ず守る）
0. 冒頭あいさつ（1分）— 訪問への感謝、「要点に絞って報告し、全体は資料でお渡しする」
1. 最初に必ず伝えること（2分）— ①スコアはランク付けではなく特徴分析。低い点は「悪い」ではなく「仕組みにしていない」の意味 ②インタビューは匿名の約束なので発言者は言えない ③すべて確定前ドラフトで、事実誤認はこの場で指摘してほしい
2. 会社の「形」（2分）— 総合スコアのチャートを見せ、突出して高いカテゴリと低いカテゴリを数字で示し、「今日は高い2つと低い2つだけ説明する」と宣言
3. 高い2つ（3分）— 各カテゴリの根拠を、レポート内の発言引用を使って説明
4. 低い2つ（3分）— 「悪いではない」と前置きし、根拠発言を添え、特徴の裏返しとして前向きに言い換える
5. レポートからの重要フィードバック（3分）— 「求人票と現実のギャップ」から最も実利のある指摘1〜2個（すぐ直せる指摘があれば必ず入れる）
6. 結論：合う人・合わない人（2分）— 「合う人だけが応募し、合わない人が間違えて入らないようにする」という目的を述べ、最後に必ず「社長、この整理はご自身の感覚と合っていますか？」と質問して反応をもらう
7. 確認のお願いとクロージング（2分）— レポートの「情報不足・追加で確認すべき点」を後日でよいので教えてほしいと依頼し、「Web掲載の範囲は内容確認後に別途相談」で締める

## 絶対に守るルール
- セリフはレポートに書かれている内容だけから作る。レポートにない数字・エピソード・発言を創作しない
- 社長以外の個人名・役職名は一切出さない（「管理部門の方」「現場のベテランの方」のような匿名表記にする）
- セリフは「」で括った自然な話し言葉。学生が社長に話す丁寧語
- rules には開始前に確認する最重要注意（名前を口に出さない／インタビュー個別スライドには触れない／指摘はメモ 等）を入れる
- qa には想定問答を4件（発言者を聞かれたら／低スコアへの反発／数字の誤り指摘／公開されているのか）
- slide_cue はアップロードされた資料のスライド番号に即して書く（スライド番号が特定できない場合は「該当スライド」と書く）

## 出力形式（単一のJSONオブジェクトのみ。前置き・コードフェンス禁止）
{
  "company": "企業名",
  "title": "企業名を入れて「有限会社○○さま 報告MTG台本」の形式（個人名は入れない）",
  "duration_note": "説明 約15分＋質疑",
  "rules": ["…", "…"],
  "sections": [
    { "no": "0", "title": "冒頭あいさつ", "minutes": 1, "slide_cue": "スライド1", "lines": ["「…」"], "direction": "任意の注意書き" }
  ],
  "qa": [{ "q": "…", "a": "「…」" }],
  "memo": ["読み上げない補足", "…"]
}`;

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
  const userContent = parts.join("\n\n---\n\n");

  const client = new Anthropic();
  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: [
        {
          type: "text",
          text: DAIHON_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
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

    console.log(
      JSON.stringify({
        route: "daihon",
        input_chars: userContent.length,
        duration_ms: Date.now() - started,
        input_tokens: response.usage.input_tokens,
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
