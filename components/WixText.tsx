"use client";

import { useState } from "react";
import type { CompanyInfo, Scores, WixFields } from "@/lib/types";
import {
  buildWixSections,
  buildWixText,
  buildWixTextBlob,
  downloadBlob,
  safeName,
} from "@/lib/exportFiles";

// Tab3: Wix掲載用テキスト。フィールドごとにコピーボタン付き。
// 全体を .txt で保存することもできる（整形は lib/exportFiles.ts に集約）。

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
  demo,
}: {
  wix: WixFields;
  scores: Scores;
  companyInfo: CompanyInfo;
  demo?: boolean;
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const fields = buildWixSections(wix, scores, companyInfo);

  async function copyAll() {
    await navigator.clipboard.writeText(
      buildWixText(wix, scores, companyInfo)
    );
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3">
        <button
          onClick={() =>
            downloadBlob(
              buildWixTextBlob(wix, scores, companyInfo),
              `${safeName(companyInfo.name)}_Wix掲載用テキスト.txt`
            )
          }
          disabled={demo}
          className="rounded-lg bg-gray-900 px-5 py-2.5 font-bold text-yellow-400 hover:bg-gray-700 disabled:opacity-50"
        >
          {demo ? "サンプル表示中はダウンロード不可" : "Wix掲載用テキスト .txt"}
        </button>
        <button
          onClick={copyAll}
          className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
        >
          {copiedAll ? "コピーしました ✓" : "全項目をまとめてコピー"}
        </button>
        <span className="text-xs text-gray-500">
          下の各項目のコピーボタンは、Wixに1つずつ貼るとき用です。
        </span>
      </div>

      <p className="text-xs text-gray-500">
        ※
        個人が特定されうる発言（年齢・役職の組み合わせ等）は、掲載前に本人・企業への確認を行ってください。
      </p>
      {fields.map((f) => (
        <CopyField key={f.title} title={f.title} text={f.text} />
      ))}
    </div>
  );
}
