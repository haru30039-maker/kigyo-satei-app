"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/scoring";
import type { CompanyInfo, ReportSections, Scores, WixFields } from "@/lib/types";

// Tab2: 査定レポートの簡易プレビュー ＋ .pptx ダウンロード

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-300 rounded-lg overflow-hidden">
      <h3 className="bg-gray-900 text-yellow-400 font-bold px-4 py-2 text-sm">
        {title}
      </h3>
      <div className="px-4 py-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <p className="mt-2 bg-gray-100 rounded px-3 py-2 text-xs text-gray-600">
      <span className="font-bold text-gray-800">見えたこと　</span>
      {text}
    </p>
  );
}

export default function ReportPreview({
  report,
  scores,
  wix,
  companyInfo,
}: {
  report: ReportSections;
  scores: Scores;
  wix: WixFields;
  companyInfo: CompanyInfo;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadPptx() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/export-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyInfo, scores, report, wix }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `エラー (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyInfo.name}_査定レポート.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ダウンロードに失敗しました");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={downloadPptx}
          disabled={downloading}
          className="px-5 py-2.5 rounded-lg bg-gray-900 text-yellow-400 font-bold hover:bg-gray-700 disabled:opacity-50"
        >
          {downloading ? "生成中…" : ".pptx をダウンロード"}
        </button>
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>

      <p className="bg-yellow-50 border border-yellow-400 rounded px-3 py-2 text-xs font-bold">
        {report.draft_note}
      </p>

      <Section title="求人票と現実のギャップ（最重要）">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1">求人票の表現</th>
              <th className="border border-gray-300 px-2 py-1">実際の現場</th>
              <th className="border border-gray-300 px-2 py-1">学生の本音</th>
            </tr>
          </thead>
          <tbody>
            {report.gap_table.map((r, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-1 align-top">{r.job_posting}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{r.reality}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{r.student_voice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="総合評価（100点換算）">
        <div className="space-y-1.5">
          {CATEGORIES.map((c) => {
            const v = scores[c.key]?.normalized ?? 0;
            return (
              <div key={c.key} className="flex items-center gap-2 text-xs">
                <span className="w-36 font-bold">{c.fullLabel}</span>
                <div className="flex-1 h-3 bg-gray-100 rounded">
                  <div
                    className="h-3 bg-yellow-400 rounded"
                    style={{ width: `${v}%` }}
                  />
                </div>
                <span className="w-8 text-right font-bold">{v}</span>
              </div>
            );
          })}
        </div>
      </Section>

      {report.interviews.map((iv, i) => (
        <Section key={i} title={`インタビュー：${iv.speaker}`}>
          <div className="space-y-3">
            {iv.qa.map((qa, j) => (
              <div key={j}>
                <p className="font-bold">Q. {qa.q}</p>
                <p className="mt-1 border-2 border-yellow-400 rounded px-3 py-2">
                  「{qa.a}」
                </p>
                <Insight text={qa.insight} />
              </div>
            ))}
          </div>
        </Section>
      ))}

      <Section title="オフィスの様子">
        <table className="w-full text-xs">
          <tbody>
            {report.office.rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-200">
                <td className="py-1 pr-3 font-bold whitespace-nowrap">{r.label}</td>
                <td className="py-1">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Insight text={report.office.insight} />
      </Section>

      <Section title="1日のスケジュール">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.schedule.roles.map((role, i) => (
            <div key={i}>
              <p className="font-bold bg-yellow-100 px-2 py-1 rounded">{role.role}</p>
              <ul className="mt-1 text-xs space-y-0.5">
                {role.timeline.map((t, j) => (
                  <li key={j}>
                    <span className="font-mono text-gray-500">{t.time}</span>　{t.activity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {report.schedule.busy_note && (
          <p className="mt-2 text-xs text-gray-500">※ {report.schedule.busy_note}</p>
        )}
        <Insight text={report.schedule.insight} />
      </Section>

      <Section title="社内イベント・社風">
        {report.events.annual.length > 0 && (
          <ul className="text-xs space-y-0.5">
            {report.events.annual.map((e, i) => (
              <li key={i}>
                <span className="font-bold">{e.month}</span>　{e.name}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs">{report.events.daily}</p>
        {report.events.quote && (
          <p className="mt-2 border-2 border-yellow-400 rounded px-3 py-2 text-xs">
            「{report.events.quote}」
          </p>
        )}
        <Insight text={report.events.insight} />
      </Section>

      <Section title="合う人・合わない人（総括）">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-bold text-white bg-green-700 px-2 py-1 rounded text-center">
              非常に合う人
            </p>
            <ul className="mt-1 space-y-1">
              {report.fit.good_fit.map((f, i) => (
                <li key={i}>
                  <span className="font-bold">◎ {f.point}</span>
                  <br />
                  <span className="text-gray-600">{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold text-white bg-red-700 px-2 py-1 rounded text-center">
              絶対に合わない人
            </p>
            <ul className="mt-1 space-y-1">
              {report.fit.bad_fit.map((f, i) => (
                <li key={i}>
                  <span className="font-bold">✕ {f.point}</span>
                  <br />
                  <span className="text-gray-600">{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section title="ターゲット人材の明確化">
        <p className="text-xs">
          <span className="font-bold">求める人材像：</span>
          {report.target_persona.wanted_profile}
        </p>
        <p className="mt-2 text-xs">
          <span className="font-bold">ペルソナ：</span>
          {report.target_persona.persona}
        </p>
        <p className="mt-2 text-xs text-gray-600">
          {report.target_persona.traits.map((t) => `・${t}`).join("　")}
        </p>
      </Section>

      <Section title="最適な求人票の提案">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1">現状</th>
              <th className="border border-gray-300 px-2 py-1">修正案</th>
              <th className="border border-gray-300 px-2 py-1">見込める効果</th>
            </tr>
          </thead>
          <tbody>
            {report.job_posting_proposal.map((r, i) => (
              <tr key={i}>
                <td className="border border-gray-300 px-2 py-1 align-top">{r.current}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{r.proposal}</td>
                <td className="border border-gray-300 px-2 py-1 align-top">{r.effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="採用活動の改善提案">
        <div className="space-y-3 text-xs">
          {report.improvement_proposals.map((p, i) => (
            <div key={i}>
              <p className="font-bold">{p.title}</p>
              <p>
                <span className="font-bold">現状の課題：</span>
                {p.issue}
              </p>
              <p>
                <span className="font-bold">改善案：</span>
                {p.proposal}
              </p>
              <p>
                <span className="font-bold">見込める効果：</span>
                {p.effect}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="総括">
        <p className="text-sm whitespace-pre-wrap">{report.summary}</p>
        {report.missing_info.length > 0 && (
          <Insight
            text={`情報不足・追加で確認すべき点：${report.missing_info.join("／")}`}
          />
        )}
      </Section>
    </div>
  );
}
