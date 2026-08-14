import PptxGenJS from "pptxgenjs";
import { CATEGORIES } from "./scoring";
import { drawRadarChart } from "./radarChart";
import { anonymizeDeep } from "./anonymize";
import type { CompanyInfo, ReportSections, Scores } from "./types";

// スコア根拠説明資料（報告MTGで学生がスコアの根拠を説明するための資料）
// 査定レポート本体とは別ファイルとして出力する。

const YELLOW = "FFC907";
const BLACK = "111111";
const WHITE = "FFFFFF";
const GRAY_BG = "F2F2F2";
const GRAY_TEXT = "555555";
const FONT = "Yu Gothic";
const PAGE_W = 10;
const PAGE_H = 5.63;

export interface ScoreDeckRequest {
  companyInfo: CompanyInfo;
  scores: Scores;
  report: ReportSections;
}

export function buildScoreDeck(
  data: ScoreDeckRequest,
  opts: { anonymous?: boolean } = {}
): PptxGenJS {
  const { companyInfo } = data;
  const anonymous = opts.anonymous !== false;
  // 匿名版は、拠点名で発言者を絞り込める書き方をスコアの根拠からも取り除く
  const ivs = data.report?.interviews;
  const scores = anonymous ? anonymizeDeep(data.scores, ivs) : data.scores;
  const report = anonymous ? anonymizeDeep(data.report, ivs) : data.report;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "#ともあゆ 学生企業査定";
  pptx.title = `${companyInfo.name} スコア根拠説明`;

  function bodySlide(title: string) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };
    slide.addShape("rect", { x: 0, y: 0, w: 0.18, h: PAGE_H, fill: { color: YELLOW } });
    slide.addText(title, {
      x: 0.45,
      y: 0.18,
      w: PAGE_W - 0.9,
      h: 0.5,
      fontFace: FONT,
      fontSize: 20,
      bold: true,
      color: BLACK,
    });
    slide.addShape("rect", { x: 0.45, y: 0.72, w: 2.2, h: 0.06, fill: { color: YELLOW } });
    return slide;
  }

  // ---------- 1. 表紙 ----------
  {
    const s = pptx.addSlide();
    s.background = { color: BLACK };
    s.addShape("rect", { x: 0, y: 4.9, w: PAGE_W, h: 0.18, fill: { color: YELLOW } });
    if (!anonymous) {
      s.addShape("rect", { x: 0.6, y: 0.35, w: 4.6, h: 0.42, fill: { color: "C62828" } });
      s.addText("チーム内用・実名版（社外提出不可）", {
        x: 0.6, y: 0.35, w: 4.6, h: 0.42,
        fontFace: FONT, fontSize: 12, bold: true, color: WHITE,
        align: "center", valign: "middle",
      });
    }
    s.addText("評価スコアの根拠説明", {
      x: 0.6, y: 1.2, w: PAGE_W - 1.2, h: 0.6,
      fontFace: FONT, fontSize: 20, color: YELLOW, bold: true,
    });
    s.addText(companyInfo.name, {
      x: 0.6, y: 1.8, w: PAGE_W - 1.2, h: 1.0,
      fontFace: FONT, fontSize: 40, color: WHITE, bold: true, fit: "shrink",
    });
    s.addText(
      [
        "※スコアはすり合わせ前のドラフトです",
        `訪問日：${companyInfo.visitDate}`,
        `調査者：${companyInfo.researchers}`,
        "#ともあゆ 学生企業査定チーム",
      ].join("\n"),
      {
        x: 0.6, y: 3.1, w: PAGE_W - 1.2, h: 1.3,
        fontFace: FONT, fontSize: 13, color: WHITE, lineSpacing: 22,
      }
    );
  }

  // ---------- 2. 評価の考え方 ----------
  {
    const s = bodySlide("評価の考え方（説明の前提）");
    s.addText(
      [
        {
          text: "「良い・悪い」のランク付けではなく、「どこに力を入れているか」の特徴分析。\n",
          options: { bold: true, fontSize: 13 },
        },
        {
          text:
            "・7カテゴリ・全31項目を、インタビュー・見学・求人票の根拠に基づき1〜5点で採点\n" +
            "・カテゴリ合計を100点換算（四捨五入）してチャート化\n" +
            "・根拠が取れない項目は「3点仮置き」と明示し、確認質問を添える\n" +
            "・全スコアは企業確認前ドラフト。すり合わせで確定する",
          options: { fontSize: 12 },
        },
      ],
      {
        x: 0.45, y: 1.0, w: PAGE_W - 0.9, h: 1.7,
        fontFace: FONT, color: BLACK, lineSpacing: 20, valign: "top",
      }
    );
    const header = [
      { text: "カテゴリ", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      { text: "小項目", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      { text: "満点", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      { text: "今回", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      { text: "100点換算", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
    ];
    const rows = CATEGORIES.map((c) => {
      const sc = scores[c.key];
      return [
        { text: c.fullLabel, options: { bold: true } },
        { text: `${sc?.items.length ?? 0}項目`, options: {} },
        { text: `${sc?.max ?? c.max}`, options: {} },
        { text: `${sc?.subtotal ?? 0}`, options: {} },
        { text: `${sc?.normalized ?? 0}`, options: { bold: true } },
      ];
    });
    s.addTable([header, ...rows], {
      x: 0.45, y: 2.85, w: PAGE_W - 0.9,
      colW: [3.4, 1.5, 1.3, 1.3, 1.6],
      fontFace: FONT, fontSize: 10, color: BLACK,
      border: { type: "solid", color: "CCCCCC", pt: 0.75 },
      autoPage: false,
    });
  }

  // ---------- 3. 総合チャート ----------
  {
    const s = bodySlide("総合スコア（100点換算）");
    drawRadarChart(
      s,
      CATEGORIES.map((c) => ({
        label: c.label,
        value: scores[c.key]?.normalized ?? 0,
      })),
      {
        cx: 2.7, cy: 3.1, r: 1.6,
        accent: YELLOW, gridColor: "CCCCCC", textColor: BLACK, font: FONT,
      }
    );
    let y = 1.15;
    for (const c of CATEGORIES) {
      const v = scores[c.key]?.normalized ?? 0;
      s.addText(c.fullLabel, {
        x: 5.4, y, w: 2.6, h: 0.42,
        fontFace: FONT, fontSize: 12, bold: true, color: BLACK, valign: "middle",
      });
      s.addShape("rect", { x: 8.0, y: y + 0.08, w: 1.2, h: 0.26, fill: { color: GRAY_BG } });
      s.addShape("rect", {
        x: 8.0, y: y + 0.08,
        w: Math.max(0.02, (1.2 * v) / 100), h: 0.26,
        fill: { color: YELLOW },
      });
      s.addText(`${v}`, {
        x: 9.25, y, w: 0.6, h: 0.42,
        fontFace: FONT, fontSize: 13, bold: true, color: BLACK, valign: "middle",
      });
      y += 0.55;
    }
  }

  // ---------- 4〜10. カテゴリ別の根拠 ----------
  for (const c of CATEGORIES) {
    const sc = scores[c.key];
    if (!sc) continue;
    const s = bodySlide(
      `${c.fullLabel}　${sc.subtotal}/${sc.max}点 → ${sc.normalized}/100点`
    );
    const n = Math.max(1, sc.items.length);
    const blockH = (PAGE_H - 1.35 - 0.42) / n;
    let y = 0.95;
    sc.items.forEach((it, i) => {
      s.addText(
        [
          { text: `${i + 1}. ${it.label}　`, options: { bold: true, color: BLACK } },
          { text: `${it.score}点`, options: { bold: true, color: BLACK, highlight: YELLOW } },
        ],
        {
          x: 0.45, y, w: PAGE_W - 0.9, h: 0.28,
          fontFace: FONT, fontSize: 11.5, valign: "middle",
        }
      );
      s.addText(it.evidence, {
        x: 0.7, y: y + 0.27, w: PAGE_W - 1.15, h: blockH - 0.3,
        fontFace: FONT, fontSize: 9.5, color: GRAY_TEXT, fit: "shrink", valign: "top",
      });
      y += blockH;
    });
    s.addShape("rect", {
      x: 0.45, y: PAGE_H - 0.48, w: PAGE_W - 0.9, h: 0.34, fill: { color: GRAY_BG },
    });
    s.addText(
      [
        { text: "主な出典  ", options: { bold: true, color: BLACK } },
        {
          text: anonymous
            ? "社長・社員インタビュー（匿名）／見学記録／求人票・企業HP"
            : "アップロードした文字起こし・見学記録・求人票／企業HP（実名版）",
          options: { color: GRAY_TEXT },
        },
      ],
      {
        x: 0.6, y: PAGE_H - 0.48, w: PAGE_W - 1.2, h: 0.34,
        fontFace: FONT, fontSize: 9.5, valign: "middle", fit: "shrink",
      }
    );
  }

  // ---------- 11. 本資料の位置づけ ----------
  {
    const s = bodySlide("本資料の位置づけ");
    s.addText(
      [
        { text: "① スコアは学生団体#ともあゆによる特徴分析であり、企業のランク付けではありません\n", options: {} },
        { text: "② 低いスコアは「悪い」ではなく「現在は力を入れていない・仕組み化されていない」ことを示します\n", options: {} },
        { text: "③ 引用はインタビュー文字起こしに忠実に記載し、確認できなかった内容は掲載していません\n", options: {} },
        { text: "④ ご発言者はすべて匿名化しています。Webサイトへの掲載範囲は別途ご相談させてください\n", options: {} },
        { text: "⑤ 本資料・レポートはすべて企業確認前ドラフトです。内容に事実誤認があればご指摘ください", options: {} },
      ],
      {
        x: 0.45, y: 1.05, w: PAGE_W - 0.9, h: 3.0,
        fontFace: FONT, fontSize: 12.5, color: BLACK, lineSpacing: 24, valign: "top",
      }
    );
    s.addShape("rect", {
      x: 0.45, y: 4.35, w: PAGE_W - 0.9, h: 0.85, fill: { color: GRAY_BG },
    });
    s.addText(
      [
        { text: "追加で確認させていただきたい点  ", options: { bold: true, color: BLACK } },
        {
          text: (report.missing_info ?? []).slice(0, 4).join("／") || "特になし",
          options: { color: GRAY_TEXT },
        },
      ],
      {
        x: 0.6, y: 4.35, w: PAGE_W - 1.2, h: 0.85,
        fontFace: FONT, fontSize: 10, valign: "middle", fit: "shrink",
      }
    );
  }

  return pptx;
}
