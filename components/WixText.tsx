"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/scoring";
import type { CompanyInfo, Scores, WixFields } from "@/lib/types";

// Tab3: Wix掲載用テキスト。フィールドごとにコピーボタン付き。

function CopyField({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gray-100 px-4 py-2">
        <h4 className="font-bold text-sm">{title}</h4>
        <button
          className="text-xs px-3 py-1 rounded bg-gray-900 text-yellow-400 hover:bg-gray-700"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "コピーしました ✓" : "コピー"}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

export default function WixText({
  wix,
  scores,
  companyInfo,
}: {
  wix: WixFields;
  scores: Scores;
  companyInfo: CompanyInfo;
}) {
  const sevenScores = CATEGORIES.map(
    (c) => `${c.label}${scores[c.key]?.normalized ?? 0}`
  ).join("／");
  const scoreLine = CATEGORIES.map((c) => scores[c.key]?.normalized ?? 0).join(
    ","
  );

  const fields: { title: string; text: string }[] = [
    { title: "【タイトル】", text: companyInfo.name },
    { title: "【属性】", text: companyInfo.attribute },
    {
      title: "【INTERVIEW人数／VISIT DATE／INDUSTRY】",
      text: `INTERVIEW: ${wix.interviewee_tags.length}名\nVISIT DATE: ${companyInfo.visitDate}\nINDUSTRY: ${companyInfo.industry}`,
    },
    { title: "【査定サマリー】", text: wix.summary_lead },
    {
      title: "【代表の言葉】",
      text: `${wix.founder_quote.text}\n— ${wix.founder_quote.name_title}`,
    },
    {
      title: "【インタビューから見えたこと】（4カード）",
      text: wix.insight_cards
        .map((c) => `■ ${c.title}\n${c.body}`)
        .join("\n\n"),
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
    {
      title: "【この会社が刺さる人】（タグ8個）",
      text: wix.fits_tags.join("\n"),
    },
    {
      title: "【この会社が合わない人】（タグ8個）",
      text: wix.mismatch_tags.join("\n"),
    },
    {
      title: "【7スコア】（100点換算）",
      text: `${sevenScores}\n\nチャートツール用1行コピペ：${scoreLine}`,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        ※ 個人が特定されうる発言（年齢・役職の組み合わせ等）は、掲載前に本人・企業への確認を行ってください。
      </p>
      {fields.map((f) => (
        <CopyField key={f.title} title={f.title} text={f.text} />
      ))}
    </div>
  );
}
