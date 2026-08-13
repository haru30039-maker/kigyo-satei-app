import PptxGenJS from "pptxgenjs";
import { CATEGORIES } from "./scoring";
import { drawRadarChart } from "./radarChart";
import type {
  CompanyInfo,
  ReportSections,
  Scores,
  WixFields,
} from "./types";

export interface ExportRequest {
  companyInfo: CompanyInfo;
  scores: Scores;
  report: ReportSections;
  wix: WixFields;
}

const YELLOW = "FFC907";
const BLACK = "111111";
const WHITE = "FFFFFF";
const GRAY_BG = "F2F2F2";
const GRAY_TEXT = "555555";
const GREEN = "2E7D32";
const RED = "C62828";
const FONT = "Yu Gothic";

const PAGE_W = 10; // インチ（16:9）
const PAGE_H = 5.63;

export function buildPptx(
  data: ExportRequest,
  opts: { chartPath?: string; anonymous?: boolean } = {}
): PptxGenJS {
  const { companyInfo, scores, report } = data;
  // 既定は匿名版。実名版はチーム内用（社外提出不可）。
  const anonymous = opts.anonymous !== false;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "#ともあゆ 学生企業査定";
  pptx.title = `${companyInfo.name} 査定レポート`;

  // --- 本文ページの共通レイアウト ---
  function bodySlide(title: string) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };
    // 黄色アクセントバー
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 0.18,
      h: PAGE_H,
      fill: { color: YELLOW },
    });
    slide.addText(title, {
      x: 0.45,
      y: 0.22,
      w: PAGE_W - 0.9,
      h: 0.55,
      fontFace: FONT,
      fontSize: 22,
      bold: true,
      color: BLACK,
    });
    slide.addShape("rect", {
      x: 0.45,
      y: 0.82,
      w: 2.2,
      h: 0.06,
      fill: { color: YELLOW },
    });
    return slide;
  }

  function insightBox(
    slide: PptxGenJS.Slide,
    text: string,
    y: number,
    h = 0.9
  ) {
    slide.addShape("rect", {
      x: 0.45,
      y,
      w: PAGE_W - 0.9,
      h,
      fill: { color: GRAY_BG },
    });
    slide.addText(
      [
        { text: "見えたこと  ", options: { bold: true, color: BLACK } },
        { text, options: { color: GRAY_TEXT } },
      ],
      {
        x: 0.6,
        y,
        w: PAGE_W - 1.2,
        h,
        fontFace: FONT,
        fontSize: 11,
        valign: "middle",
        fit: "shrink",
      }
    );
  }

  // ========== 1. 表紙 ==========
  {
    const slide = pptx.addSlide();
    slide.background = { color: BLACK };
    slide.addShape("rect", {
      x: 0,
      y: 4.9,
      w: PAGE_W,
      h: 0.18,
      fill: { color: YELLOW },
    });
    if (!anonymous) {
      slide.addShape("rect", {
        x: 0.6, y: 0.35, w: 4.6, h: 0.42, fill: { color: "C62828" },
      });
      slide.addText("チーム内用・実名版（社外提出不可）", {
        x: 0.6, y: 0.35, w: 4.6, h: 0.42,
        fontFace: FONT, fontSize: 12, bold: true, color: WHITE,
        align: "center", valign: "middle",
      });
    }
    slide.addText("学生企業査定レポート", {
      x: 0.6,
      y: 1.0,
      w: PAGE_W - 1.2,
      h: 0.5,
      fontFace: FONT,
      fontSize: 18,
      color: YELLOW,
      bold: true,
    });
    slide.addText(companyInfo.name, {
      x: 0.6,
      y: 1.6,
      w: PAGE_W - 1.2,
      h: 1.2,
      fontFace: FONT,
      fontSize: 44,
      color: WHITE,
      bold: true,
      fit: "shrink",
    });
    slide.addText(
      [
        `業種：${companyInfo.industry}`,
        `従業員数：${companyInfo.employees}`,
        `訪問日：${companyInfo.visitDate}`,
        `調査者：${companyInfo.researchers}`,
      ].join("\n"),
      {
        x: 0.6,
        y: 3.1,
        w: PAGE_W - 1.2,
        h: 1.5,
        fontFace: FONT,
        fontSize: 14,
        color: WHITE,
        lineSpacing: 24,
      }
    );
  }

  // ========== 2. 目次 ==========
  {
    const slide = bodySlide("目次");
    const items = [
      "このレポートについて",
      "求人票と現実のギャップ",
      "総合評価（7項目・100点換算）",
      "インタビュー",
      "オフィスの様子",
      "1日のスケジュール",
      "社内イベント・社風",
      "合う人・合わない人（総括）",
      "ターゲット人材の明確化",
      "最適な求人票の提案",
      "採用活動の改善提案",
      "総括",
    ];
    slide.addText(
      items.map((t, i) => `${String(i + 1).padStart(2, "0")}  ${t}`).join("\n"),
      {
        x: 0.7,
        y: 1.1,
        w: PAGE_W - 1.4,
        h: PAGE_H - 1.5,
        fontFace: FONT,
        fontSize: 14,
        color: BLACK,
        lineSpacing: 26,
      }
    );
  }

  // ========== 3. このレポートについて ==========
  {
    const slide = bodySlide("このレポートについて");
    slide.addText(
      "目的：合う人だけが応募し、合わない人が間違えて入らないようにする。",
      {
        x: 0.45,
        y: 1.05,
        w: PAGE_W - 0.9,
        h: 0.4,
        fontFace: FONT,
        fontSize: 14,
        bold: true,
        color: BLACK,
      }
    );
    slide.addText(
      [
        "読み方4ステップ：",
        "1. まず「求人票と現実のギャップ」を読む",
        "2. 総合評価で「この会社がどこに力を入れているか」をつかむ",
        "3. インタビューの生の声で裏付けを確認する",
        "4. 「合う人・合わない人」で自分と照らし合わせる",
      ].join("\n"),
      {
        x: 0.45,
        y: 1.55,
        w: PAGE_W - 0.9,
        h: 1.9,
        fontFace: FONT,
        fontSize: 13,
        color: BLACK,
        lineSpacing: 22,
      }
    );
    // 企業確認前ドラフトの注記（黄色枠）
    slide.addShape("rect", {
      x: 0.45,
      y: 3.9,
      w: PAGE_W - 0.9,
      h: 0.8,
      fill: { color: WHITE },
      line: { color: YELLOW, width: 2.5 },
    });
    slide.addText(report.draft_note || "本レポートは企業確認前ドラフトです。", {
      x: 0.6,
      y: 3.9,
      w: PAGE_W - 1.2,
      h: 0.8,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: BLACK,
      valign: "middle",
      fit: "shrink",
    });
  }

  // ========== 4. 求人票と現実のギャップ ==========
  // 長文の行が多いと1枚に収まらないため、3行ごとにスライドを分割する
  {
    const allRows = report.gap_table.slice(0, 9);
    const perSlide = 3;
    for (let i = 0; i < allRows.length; i += perSlide) {
      const slide = bodySlide(
        i === 0 ? "求人票と現実のギャップ" : "求人票と現実のギャップ（続き）"
      );
      const header = [
        { text: "求人票の表現", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
        { text: "実際の現場", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
        { text: "学生の本音", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      ];
      const rows = allRows.slice(i, i + perSlide).map((r) => [
        { text: r.job_posting, options: {} },
        { text: r.reality, options: {} },
        { text: r.student_voice, options: {} },
      ]);
      slide.addTable([header, ...rows], {
        x: 0.45,
        y: 1.05,
        w: PAGE_W - 0.9,
        colW: [(PAGE_W - 0.9) / 3, (PAGE_W - 0.9) / 3, (PAGE_W - 0.9) / 3],
        fontFace: FONT,
        fontSize: 10,
        color: BLACK,
        border: { type: "solid", color: "CCCCCC", pt: 0.75 },
        valign: "top",
        autoPage: false,
      });
    }
  }

  // ========== 5. 総合評価の見方 ==========
  {
    const slide = bodySlide("総合評価の見方（7カテゴリ・100点換算）");
    slide.addText(
      [
        {
          text: "「良い・悪い」のランク付けではなく、「どこに力を入れているか」の特徴分析です。\n",
          options: { bold: true, fontSize: 13 },
        },
        {
          text: "・7カテゴリ・全31項目を、インタビュー・見学・求人票の根拠に基づき1〜5点で採点\n・カテゴリ合計を100点換算（四捨五入）してチャート化\n・スコアはすべて企業確認前ドラフト",
          options: { fontSize: 12 },
        },
      ],
      {
        x: 0.45,
        y: 1.0,
        w: PAGE_W - 0.9,
        h: 1.4,
        fontFace: FONT,
        color: BLACK,
        lineSpacing: 20,
        valign: "top",
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
        { text: `${sc?.max ?? 0}`, options: {} },
        { text: `${sc?.subtotal ?? 0}`, options: {} },
        { text: `${sc?.normalized ?? 0}`, options: { bold: true } },
      ];
    });
    slide.addTable([header, ...rows], {
      x: 0.45,
      y: 2.55,
      w: PAGE_W - 0.9,
      colW: [3.4, 1.5, 1.3, 1.3, 1.6],
      fontFace: FONT,
      fontSize: 10,
      color: BLACK,
      border: { type: "solid", color: "CCCCCC", pt: 0.75 },
      autoPage: false,
    });
  }

  // ========== 6. 総合評価（チャート＋スコアバー） ==========
  {
    const slide = bodySlide("総合評価（100点換算）");
    // 左側にレーダーチャート。画像が指定されていればそれを、なければ
    // PPTX標準のレーダーチャートを埋め込む（Web版は画像を持たないためこちら）。
    if (opts.chartPath) {
      slide.addImage({ path: opts.chartPath, x: 0.55, y: 1.0, w: 4.3, h: 4.3 });
    } else {
      drawRadarChart(
        slide,
        CATEGORIES.map((c) => ({
          label: c.label,
          value: scores[c.key]?.normalized ?? 0,
        })),
        {
          cx: 2.75, cy: 3.1, r: 1.55,
          accent: YELLOW, gridColor: "CCCCCC", textColor: BLACK, font: FONT,
        }
      );
    }
    const hasChart = true;
    const x0 = hasChart ? 5.3 : 0.45;
    const labelW = hasChart ? 2.5 : 2.7;
    const barMaxW = hasChart ? 1.2 : 4.6;
    const barX = x0 + labelW + 0.1;
    const valX = barX + barMaxW + 0.1;
    let y = hasChart ? 1.15 : 1.05;
    for (const cat of CATEGORIES) {
      const s = scores[cat.key];
      const val = s?.normalized ?? 0;
      slide.addText(cat.fullLabel, {
        x: x0,
        y,
        w: labelW,
        h: 0.42,
        fontFace: FONT,
        fontSize: hasChart ? 12 : 11.5,
        bold: true,
        color: BLACK,
        valign: "middle",
      });
      slide.addShape("rect", {
        x: barX,
        y: y + 0.09,
        w: barMaxW,
        h: 0.24,
        fill: { color: GRAY_BG },
      });
      slide.addShape("rect", {
        x: barX,
        y: y + 0.09,
        w: Math.max(0.02, (barMaxW * val) / 100),
        h: 0.24,
        fill: { color: YELLOW },
      });
      slide.addText(`${val}`, {
        x: valX,
        y,
        w: 0.6,
        h: 0.42,
        fontFace: FONT,
        fontSize: 13,
        bold: true,
        color: BLACK,
        valign: "middle",
      });
      y += hasChart ? 0.55 : 0.58;
    }
  }

  // ========== 6〜. インタビュー ==========
  for (const interview of report.interviews) {
    // 2問ずつ1ページ
    for (let i = 0; i < interview.qa.length; i += 2) {
      const speakerLabel = anonymous
        ? interview.speaker
        : interview.speaker_internal || interview.speaker;
      const slide = bodySlide(`インタビュー：${speakerLabel}`);
      const pair = interview.qa.slice(i, i + 2);
      let y = 1.0;
      for (const qa of pair) {
        slide.addText(`Q. ${qa.q}`, {
          x: 0.45,
          y,
          w: PAGE_W - 0.9,
          h: 0.35,
          fontFace: FONT,
          fontSize: 12,
          bold: true,
          color: BLACK,
          fit: "shrink",
        });
        // 引用（黄色枠ボックス）
        slide.addShape("rect", {
          x: 0.45,
          y: y + 0.38,
          w: PAGE_W - 0.9,
          h: 0.95,
          fill: { color: WHITE },
          line: { color: YELLOW, width: 2.5 },
        });
        slide.addText(`「${qa.a}」`, {
          x: 0.6,
          y: y + 0.38,
          w: PAGE_W - 1.2,
          h: 0.95,
          fontFace: FONT,
          fontSize: 11,
          color: BLACK,
          valign: "middle",
          fit: "shrink",
        });
        // 見えたこと
        slide.addShape("rect", {
          x: 0.45,
          y: y + 1.4,
          w: PAGE_W - 0.9,
          h: 0.62,
          fill: { color: GRAY_BG },
        });
        slide.addText(
          [
            { text: "見えたこと  ", options: { bold: true, color: BLACK } },
            { text: qa.insight, options: { color: GRAY_TEXT } },
          ],
          {
            x: 0.6,
            y: y + 1.4,
            w: PAGE_W - 1.2,
            h: 0.62,
            fontFace: FONT,
            fontSize: 10.5,
            valign: "middle",
            fit: "shrink",
          }
        );
        y += 2.25;
      }
    }
  }

  // ========== オフィスの様子 ==========
  {
    const slide = bodySlide("オフィスの様子");
    const rows = report.office.rows.slice(0, 8).map((r) => [
      {
        text: r.label,
        options: { bold: true, fill: { color: GRAY_BG } as { color: string } },
      },
      { text: r.value, options: {} },
    ]);
    if (rows.length > 0) {
      slide.addTable(rows, {
        x: 0.45,
        y: 1.0,
        w: PAGE_W - 0.9,
        colW: [1.3, PAGE_W - 0.9 - 1.3],
        fontFace: FONT,
        fontSize: 9,
        color: BLACK,
        border: { type: "solid", color: "CCCCCC", pt: 0.75 },
        valign: "middle",
        autoPage: false,
      });
    }
    insightBox(slide, report.office.insight, PAGE_H - 1.15);
  }

  // ========== 1日のスケジュール ==========
  {
    const slide = bodySlide("1日のスケジュール");
    const roles = report.schedule.roles.slice(0, 2);
    const colW = (PAGE_W - 0.9 - 0.3) / Math.max(1, roles.length);
    roles.forEach((role, idx) => {
      const x = 0.45 + idx * (colW + 0.3);
      slide.addText(role.role, {
        x,
        y: 1.0,
        w: colW,
        h: 0.35,
        fontFace: FONT,
        fontSize: 12,
        bold: true,
        color: BLACK,
        fill: { color: YELLOW },
        align: "center",
        valign: "middle",
      });
      slide.addText(
        role.timeline.map((t) => `${t.time}  ${t.activity}`).join("\n"),
        {
          x,
          y: 1.42,
          w: colW,
          h: 2.4,
          fontFace: FONT,
          fontSize: 10,
          color: BLACK,
          lineSpacing: 16,
          fit: "shrink",
        }
      );
    });
    if (report.schedule.busy_note) {
      slide.addText(`※ ${report.schedule.busy_note}`, {
        x: 0.45,
        y: 3.85,
        w: PAGE_W - 0.9,
        h: 0.55,
        fontFace: FONT,
        fontSize: 9.5,
        color: GRAY_TEXT,
        fit: "shrink",
        valign: "top",
      });
    }
    insightBox(slide, report.schedule.insight, PAGE_H - 1.15);
  }

  // ========== 社内イベント・社風 ==========
  {
    const slide = bodySlide("社内イベント・社風");
    const annual = report.events.annual.slice(0, 8);
    if (annual.length > 0) {
      slide.addTable(
        annual.map((e) => [
          {
            text: e.month,
            options: { bold: true, fill: { color: GRAY_BG } as { color: string } },
          },
          { text: e.name, options: {} },
        ]),
        {
          x: 0.45,
          y: 1.0,
          w: 4.4,
          colW: [1.1, 3.3],
          fontFace: FONT,
          fontSize: 10,
          color: BLACK,
          border: { type: "solid", color: "CCCCCC", pt: 0.75 },
          autoPage: false,
        }
      );
    }
    slide.addText(report.events.daily, {
      x: 5.1,
      y: 1.0,
      w: PAGE_W - 5.55,
      h: 1.6,
      fontFace: FONT,
      fontSize: 10.5,
      color: BLACK,
      fit: "shrink",
    });
    if (report.events.quote) {
      slide.addShape("rect", {
        x: 5.1,
        y: 2.7,
        w: PAGE_W - 5.55,
        h: 1.3,
        fill: { color: WHITE },
        line: { color: YELLOW, width: 2.5 },
      });
      slide.addText(
        report.events.quote.trim().startsWith("「")
          ? report.events.quote.trim()
          : `「${report.events.quote.trim()}」`,
        {
        x: 5.25,
        y: 2.7,
        w: PAGE_W - 5.85,
        h: 1.3,
        fontFace: FONT,
        fontSize: 10.5,
        color: BLACK,
        valign: "middle",
        fit: "shrink",
      });
    }
    insightBox(slide, report.events.insight, PAGE_H - 1.15);
  }

  // ========== 合う人・合わない人 ==========
  {
    const slide = bodySlide("合う人・合わない人（総括）");
    const half = (PAGE_W - 0.9 - 0.3) / 2;
    slide.addText("非常に合う人", {
      x: 0.45,
      y: 1.0,
      w: half,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      bold: true,
      color: WHITE,
      fill: { color: GREEN },
      align: "center",
      valign: "middle",
    });
    slide.addText(
      report.fit.good_fit
        .slice(0, 5)
        .map((f) => `◎ ${f.point}\n　${f.reason}`)
        .join("\n"),
      {
        x: 0.45,
        y: 1.5,
        w: half,
        h: PAGE_H - 2.0,
        fontFace: FONT,
        fontSize: 10.5,
        color: BLACK,
        lineSpacing: 15,
        fit: "shrink",
        valign: "top",
      }
    );
    slide.addText("絶対に合わない人", {
      x: 0.45 + half + 0.3,
      y: 1.0,
      w: half,
      h: 0.4,
      fontFace: FONT,
      fontSize: 13,
      bold: true,
      color: WHITE,
      fill: { color: RED },
      align: "center",
      valign: "middle",
    });
    slide.addText(
      report.fit.bad_fit
        .slice(0, 5)
        .map((f) => `✕ ${f.point}\n　${f.reason}`)
        .join("\n"),
      {
        x: 0.45 + half + 0.3,
        y: 1.5,
        w: half,
        h: PAGE_H - 2.0,
        fontFace: FONT,
        fontSize: 10.5,
        color: BLACK,
        lineSpacing: 15,
        fit: "shrink",
        valign: "top",
      }
    );
  }

  // ========== ターゲット人材の明確化 ==========
  {
    const slide = bodySlide("ターゲット人材の明確化");
    slide.addText("求める人材像", {
      x: 0.45,
      y: 1.0,
      w: PAGE_W - 0.9,
      h: 0.35,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: BLACK,
    });
    slide.addText(report.target_persona.wanted_profile, {
      x: 0.45,
      y: 1.35,
      w: PAGE_W - 0.9,
      h: 0.9,
      fontFace: FONT,
      fontSize: 11,
      color: BLACK,
      fit: "shrink",
    });
    slide.addText("ペルソナ", {
      x: 0.45,
      y: 2.35,
      w: PAGE_W - 0.9,
      h: 0.35,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: BLACK,
    });
    slide.addText(report.target_persona.persona, {
      x: 0.45,
      y: 2.7,
      w: PAGE_W - 0.9,
      h: 0.9,
      fontFace: FONT,
      fontSize: 11,
      color: BLACK,
      fit: "shrink",
    });
    slide.addText(
      report.target_persona.traits.map((t) => `・${t}`).join("   "),
      {
        x: 0.45,
        y: 3.7,
        w: PAGE_W - 0.9,
        h: 1.4,
        fontFace: FONT,
        fontSize: 10.5,
        color: GRAY_TEXT,
        fit: "shrink",
      }
    );
  }

  // ========== 最適な求人票の提案 ==========
  {
    const slide = bodySlide("最適な求人票の提案");
    const header = [
      { text: "現状", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      { text: "修正案", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
      { text: "見込める効果", options: { bold: true, fill: { color: BLACK }, color: YELLOW } },
    ];
    const rows = report.job_posting_proposal.slice(0, 5).map((r) => [
      { text: r.current, options: {} },
      { text: r.proposal, options: {} },
      { text: r.effect, options: {} },
    ]);
    slide.addTable([header, ...rows], {
      x: 0.45,
      y: 1.05,
      w: PAGE_W - 0.9,
      colW: [(PAGE_W - 0.9) * 0.35, (PAGE_W - 0.9) * 0.35, (PAGE_W - 0.9) * 0.3],
      fontFace: FONT,
      fontSize: 10,
      color: BLACK,
      border: { type: "solid", color: "CCCCCC", pt: 0.75 },
      valign: "top",
      autoPage: false,
    });
  }

  // ========== 採用活動の改善提案 ==========
  for (let i = 0; i < report.improvement_proposals.length; i += 2) {
    const slide = bodySlide("採用活動の改善提案");
    const pair = report.improvement_proposals.slice(i, i + 2);
    let y = 1.0;
    for (const p of pair) {
      slide.addText(p.title, {
        x: 0.45,
        y,
        w: PAGE_W - 0.9,
        h: 0.35,
        fontFace: FONT,
        fontSize: 12.5,
        bold: true,
        color: BLACK,
        fit: "shrink",
      });
      slide.addText(
        [
          { text: "現状の課題  ", options: { bold: true } },
          { text: `${p.issue}\n` },
          { text: "改善案  ", options: { bold: true } },
          { text: `${p.proposal}\n` },
          { text: "見込める効果  ", options: { bold: true } },
          { text: p.effect },
        ],
        {
          x: 0.6,
          y: y + 0.38,
          w: PAGE_W - 1.2,
          h: 1.6,
          fontFace: FONT,
          fontSize: 10.5,
          color: BLACK,
          lineSpacing: 16,
          fit: "shrink",
          valign: "top",
        }
      );
      y += 2.2;
    }
  }

  // ========== 総括 ==========
  {
    const slide = bodySlide("総括");
    slide.addText(report.summary, {
      x: 0.45,
      y: 1.05,
      w: PAGE_W - 0.9,
      h: 2.6,
      fontFace: FONT,
      fontSize: 12,
      color: BLACK,
      lineSpacing: 20,
      fit: "shrink",
      valign: "top",
    });
    if (report.missing_info.length > 0) {
      insightBox(
        slide,
        `情報不足・追加で確認すべき点：${report.missing_info.join("／")}`,
        PAGE_H - 1.5,
        1.2
      );
    }
  }

  // ========== 裏表紙 ==========
  {
    const slide = pptx.addSlide();
    slide.background = { color: BLACK };
    slide.addText("ご協力ありがとうございました", {
      x: 0.6,
      y: 1.8,
      w: PAGE_W - 1.2,
      h: 0.7,
      fontFace: FONT,
      fontSize: 28,
      bold: true,
      color: WHITE,
      align: "center",
    });
    slide.addText("#ともあゆ 学生企業査定チーム", {
      x: 0.6,
      y: 2.7,
      w: PAGE_W - 1.2,
      h: 0.5,
      fontFace: FONT,
      fontSize: 16,
      color: YELLOW,
      align: "center",
    });
    slide.addText("お問い合わせ：nukui.event.staff@gmail.com", {
      x: 0.6,
      y: 3.3,
      w: PAGE_W - 1.2,
      h: 0.5,
      fontFace: FONT,
      fontSize: 12,
      color: WHITE,
      align: "center",
    });
  }

  return pptx;
}

