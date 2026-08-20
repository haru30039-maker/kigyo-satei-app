// スコア案・Wix掲載用テキストをファイルとして保存する（クライアント側）。
// 画面に出ている内容と保存した内容がずれないよう、Wixの整形はここに一本化し、
// 画面側（WixText.tsx）も同じ関数を使う。

import * as XLSX from "xlsx";
import { CATEGORIES } from "./scoring";
import type { CompanyInfo, Scores, WixFields } from "./types";

/** ファイル名に使えない文字を落とす */
export function safeName(s: string): string {
  return (s || "無題").replace(/[\\/:*?"<>|]/g, "_").trim();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // click() 直後に revoke するとダウンロードが始まらないブラウザがあるため遅らせる
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ------------------------------ ① スコア案 ------------------------------ */

/**
 * スコア案を .xlsx にする。
 * 「サマリー」＝カテゴリごとの合計と100点換算、「明細」＝31項目のスコアと根拠。
 */
export function buildScoresXlsx(scores: Scores, company: CompanyInfo): Blob {
  const summary: (string | number)[][] = [
    ["企業名", company.name],
    ["業種", company.industry],
    ["所在地", company.location],
    ["従業員数", company.employees],
    ["訪問日", company.visitDate],
    ["調査者", company.researchers],
    ["属性", company.attribute],
    [],
    ["カテゴリ", "素点", "満点", "100点換算"],
  ];
  for (const cat of CATEGORIES) {
    const c = scores[cat.key];
    if (!c) continue;
    summary.push([cat.fullLabel, c.subtotal, c.max, c.normalized]);
  }

  const detail: (string | number)[][] = [
    ["カテゴリ", "No.", "項目", "スコア（1〜5）", "根拠・特記事項"],
  ];
  for (const cat of CATEGORIES) {
    const c = scores[cat.key];
    if (!c) continue;
    c.items.forEach((item, i) => {
      detail.push([cat.fullLabel, i + 1, item.label, item.score, item.evidence]);
    });
  }

  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "サマリー");

  const ws2 = XLSX.utils.aoa_to_sheet(detail);
  ws2["!cols"] = [
    { wch: 20 },
    { wch: 5 },
    { wch: 42 },
    { wch: 14 },
    { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "明細");

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/* -------------------------- ③ Wix掲載用テキスト -------------------------- */

export interface WixSection {
  title: string;
  text: string;
}

/** 画面表示にも保存にも使う、Wix掲載用テキストの整形 */
export function buildWixSections(
  wix: WixFields,
  scores: Scores,
  company: CompanyInfo
): WixSection[] {
  const sevenScores = CATEGORIES.map(
    (c) => `${c.label}${scores[c.key]?.normalized ?? 0}`
  ).join("／");
  const scoreLine = CATEGORIES.map((c) => scores[c.key]?.normalized ?? 0).join(
    ","
  );

  return [
    { title: "【タイトル】", text: company.name },
    { title: "【属性】", text: company.attribute },
    {
      title: "【INTERVIEW人数／VISIT DATE／INDUSTRY】",
      text: `INTERVIEW: ${wix.interviewee_tags.length}名\nVISIT DATE: ${company.visitDate}\nINDUSTRY: ${company.industry}`,
    },
    { title: "【査定サマリー】", text: wix.summary_lead },
    {
      title: "【代表の言葉】",
      text: `${wix.founder_quote.text}\n— ${wix.founder_quote.name_title}`,
    },
    {
      title: "【インタビューから見えたこと】（4カード）",
      text: wix.insight_cards.map((c) => `■ ${c.title}\n${c.body}`).join("\n\n"),
    },
    {
      title: "【インタビュー協力者タグ】",
      text: wix.interviewee_tags.join(" / "),
    },
    { title: "【Real Voice紹介文】", text: wix.real_voice_note },
    {
      title: "【数字から読み解く】（4カード）",
      text: wix.numbers_cards
        .map((c) => `■ ${c.label}：${c.number}\n${c.note}`)
        .join("\n\n"),
    },
    {
      title: "【チャートが示す企業特性】（タブ別）",
      text: wix.chart_tabs
        .map(
          (t) =>
            `▼ ${t.tab}\n${t.body}\n合う・おすすめ：${t.fit_line}\n合わない：${t.mismatch_line}`
        )
        .join("\n\n"),
    },
    {
      title: "【働く環境から見えたこと】（写真キャプション）",
      text: wix.office_captions
        .map((c, i) => `写真${String(i + 1).padStart(2, "0")}：${c}`)
        .join("\n"),
    },
    { title: "【この会社が刺さる人】（タグ8個）", text: wix.fits_tags.join("\n") },
    {
      title: "【この会社が合わない人】（タグ8個）",
      text: wix.mismatch_tags.join("\n"),
    },
    {
      title: "【7スコア】（100点換算）",
      text: `${sevenScores}\n\nチャートツール用1行コピペ：${scoreLine}`,
    },
  ];
}

/** Wix掲載用テキスト全体を1つのテキストにまとめる */
export function buildWixText(
  wix: WixFields,
  scores: Scores,
  company: CompanyInfo
): string {
  const head = [
    `${company.name}　Wix掲載用テキスト`,
    `訪問日：${company.visitDate}　／　調査者：${company.researchers}`,
    `書き出し日：${new Date().toLocaleDateString("ja-JP")}`,
    "※ 個人が特定されうる発言（年齢・役職の組み合わせ等）は、掲載前に本人・企業への確認を行ってください。",
  ].join("\n");

  const body = buildWixSections(wix, scores, company)
    .map((f) => `${"=".repeat(52)}\n${f.title}\n${"=".repeat(52)}\n${f.text}`)
    .join("\n\n");

  // Windowsのメモ帳でも改行が崩れないよう CRLF にする
  return `${head}\n\n${body}\n`.replace(/\r?\n/g, "\r\n");
}

export function buildWixTextBlob(
  wix: WixFields,
  scores: Scores,
  company: CompanyInfo
): Blob {
  // Excel等で開いたときに文字化けしないよう BOM を付ける
  return new Blob(["﻿", buildWixText(wix, scores, company)], {
    type: "text/plain;charset=utf-8",
  });
}
