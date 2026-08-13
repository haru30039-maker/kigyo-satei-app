import { NextRequest, NextResponse } from "next/server";
import { buildPptx, type ExportRequest } from "@/lib/pptxBuild";
import { buildScoreDeck } from "@/lib/scoreDeckBuild";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: ExportRequest & { kind?: "report" | "scores"; anonymous?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }
  if (!body.companyInfo || !body.scores || !body.report) {
    return NextResponse.json(
      { error: "生成結果がありません。先に「生成する」を実行してください。" },
      { status: 400 }
    );
  }

  try {
    const kind = body.kind === "scores" ? "scores" : "report";
    const anonymous = body.anonymous !== false;
    const pptx =
      kind === "scores"
        ? buildScoreDeck(body, { anonymous })
        : buildPptx(body, { anonymous });
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

    const suffix = anonymous ? "匿名版" : "実名版";
    const base =
      kind === "scores" ? "スコア根拠説明" : "査定レポート";
    const filename = `${body.companyInfo.name}_${base}（${suffix}）.pptx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="report.pptx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        route: "export-pptx",
        error: err instanceof Error ? err.message : String(err),
      })
    );
    return NextResponse.json(
      { error: "PPTXの生成に失敗しました" },
      { status: 500 }
    );
  }
}
