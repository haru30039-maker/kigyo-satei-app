"use client";

import { useState } from "react";
import LZString from "lz-string";
import type { DaihonResult } from "@/lib/daihon";
import DaihonView from "@/components/DaihonView";

// 報告台本ジェネレーター
// 完成した査定レポート(.pptx)をアップロード → 台本を生成 → 微調整 → 専用URLを発行。
// 台本データはURLの#以降に圧縮して埋め込む（サーバーには保存されない）。

export default function DaihonPage() {
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [scoreFile, setScoreFile] = useState<File | null>(null);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daihon, setDaihon] = useState<DaihonResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setError(null);
    setCopied(false);
    if (!reportFile) {
      setError("査定レポート（.pptx）を選択してください");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("report", reportFile);
      if (scoreFile) form.append("score", scoreFile);
      if (company.trim()) form.append("company", company.trim());

      const res = await fetch("/api/daihon", { method: "POST", body: form });
      const raw = await res.text();
      let data: { error?: string } & Partial<DaihonResult> = {};
      let isJson = true;
      try {
        data = JSON.parse(raw);
      } catch {
        isJson = false;
      }
      if (!res.ok || !isJson) {
        if (res.status === 401)
          throw new Error("セッションが切れています。再ログインしてください。");
        throw new Error(
          data?.error ?? `サーバーエラー (HTTP ${res.status})。時間をおいて再試行してください。`
        );
      }
      setDaihon(data as DaihonResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function shareUrl(): string {
    const packed = LZString.compressToEncodedURIComponent(JSON.stringify(daihon));
    return `${location.origin}/daihon/view#d=${packed}`;
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard不可の環境ではプロンプト表示
      window.prompt("このURLをコピーしてください", shareUrl());
    }
  }

  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white";
  const labelCls = "block text-xs font-bold text-gray-600 mb-1";

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">
          報告台本<span className="text-yellow-500">ジェネレーター</span>
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          完成した査定レポート（編集後の.pptxでOK）から、報告MTGでそのまま読める台本を作ります。
          スマホ用の専用URLを発行できます（台本はサーバーに保存されません）。
          レポートを編集し直したら、もう一度アップロードすれば台本も作り直せます。
        </p>
        <a href="/" className="mt-1 inline-block text-xs text-gray-400 underline">
          ← レポート生成に戻る
        </a>
      </header>

      <section className="mb-6 rounded-lg border border-gray-300 p-5">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>査定レポート（.pptx） *</label>
            <input
              type="file"
              accept=".pptx"
              className="text-sm"
              onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className={labelCls}>スコア根拠説明資料（.pptx・任意）</label>
            <input
              type="file"
              accept=".pptx"
              className="text-sm"
              onChange={(e) => setScoreFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="max-w-sm">
            <label className={labelCls}>企業名（任意・表紙から読み取れない場合に）</label>
            <input
              className={inputCls}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="有限会社◯◯"
            />
          </div>
        </div>
      </section>

      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-8 py-3 text-lg font-bold text-yellow-400 hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "生成中…（1分ほど）" : "台本を生成する"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {daihon && (
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3">
            <button
              onClick={copyUrl}
              className="rounded-lg bg-gray-900 px-5 py-2 font-bold text-yellow-400 hover:bg-gray-700"
            >
              {copied ? "コピーしました ✓" : "スマホ用URLをコピー"}
            </button>
            <button
              onClick={() => setEditing((v) => !v)}
              className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-bold text-gray-700"
            >
              {editing ? "編集を終える" : "セリフを微調整する"}
            </button>
            <p className="w-full text-xs text-gray-600">
              URLに台本が埋め込まれています。LINE等でそのまま共有できます（開くのにログイン不要）。
              セリフを微調整した場合は、もう一度コピーしてください。
            </p>
          </div>

          {editing ? (
            <div className="space-y-5">
              {daihon.sections.map((s, si) => (
                <div key={s.no} className="rounded-lg border border-gray-300 p-4">
                  <p className="mb-2 text-sm font-bold">
                    {s.no}. {s.title}
                  </p>
                  {s.lines.map((line, li) => (
                    <textarea
                      key={li}
                      className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-sm leading-relaxed"
                      rows={Math.max(2, Math.ceil(line.length / 40))}
                      value={line}
                      onChange={(e) =>
                        setDaihon((prev) => {
                          if (!prev) return prev;
                          const next = structuredClone(prev);
                          next.sections[si].lines[li] = e.target.value;
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200">
              <p className="border-b border-gray-200 px-4 py-2 text-xs font-bold text-gray-400">
                プレビュー（スマホでの見え方）
              </p>
              <DaihonView daihon={daihon} />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
