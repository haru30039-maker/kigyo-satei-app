"use client";

import { useState } from "react";
import LZString from "lz-string";
import type { DaihonResult, DaihonVariant } from "@/lib/daihon";
import { VARIANT_LABEL } from "@/lib/daihon";
import { buildDaihonHtmlBlob } from "@/lib/daihonHtml";
import { downloadBlob, safeName } from "@/lib/exportFiles";
import DaihonView from "@/components/DaihonView";

// 報告台本ジェネレーター
// 完成した査定レポート(.pptx)をアップロード → 簡易版・詳細版の台本を生成 → 微調整 → 専用URLを発行。
// 台本データはURLの#以降に圧縮して埋め込む（サーバーには保存されない）。

type Daihons = Partial<Record<DaihonVariant, DaihonResult>>;

export default function DaihonPage() {
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [scoreFile, setScoreFile] = useState<File | null>(null);
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [daihons, setDaihons] = useState<Daihons>({});
  const [variant, setVariant] = useState<DaihonVariant>("brief");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const daihon = daihons[variant];

  async function callApi(v: DaihonVariant): Promise<DaihonResult> {
    const form = new FormData();
    form.append("report", reportFile!);
    if (scoreFile) form.append("score", scoreFile);
    if (company.trim()) form.append("company", company.trim());
    form.append("variant", v);

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
        data?.error ??
          `サーバーエラー (HTTP ${res.status})。時間をおいて再試行してください。`
      );
    }
    return data as DaihonResult;
  }

  async function generate() {
    setError(null);
    setCopied(false);
    if (!reportFile) {
      setError("査定レポート（.pptx）を選択してください");
      return;
    }
    setLoading(true);
    setDaihons({});
    try {
      // 簡易版を先に出して表示し、続けて詳細版を足す。
      // 資料の読み込み分はキャッシュに載るので、2本目のほうが速い。
      setProgress("簡易版（約20分）を生成中…（1分ほど）");
      const brief = await callApi("brief");
      setDaihons({ brief });
      setVariant("brief");

      setProgress("詳細版（約60分）を生成中…（2〜3分）");
      const full = await callApi("full");
      setDaihons({ brief, full });
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  function shareUrl(): string {
    const packed = LZString.compressToEncodedURIComponent(JSON.stringify(daihon));
    return `${location.origin}/daihon/view#d=${packed}`;
  }

  async function copyUrl() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard不可の環境ではプロンプト表示
      window.prompt("このURLをコピーしてください", url);
    }
  }

  const urlLength = daihon ? shareUrl().length : 0;

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
          <b>簡易版（約20分）と詳細版（約60分）の2つ</b>ができるので、当日の時間に合わせて選べます。
          スマホ用の専用URLを発行できます（台本はサーバーに保存されません）。
        </p>
        <p className="mt-2 rounded border border-red-600 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          必ず「匿名版」をアップロードしてください。台本は社長の前で読み上げるものです。
          実名版を使うと、匿名をお約束した協力者の名前がセリフに混ざる恐れがあります。
        </p>
        <a href="/" className="mt-2 inline-block text-xs text-gray-400 underline">
          ← レポート生成に戻る
        </a>
      </header>

      <section className="mb-6 rounded-lg border border-gray-300 p-5">
        <div className="space-y-4">
          <div>
            <label className={labelCls}>
              査定レポート（.pptx・<span className="text-red-700">匿名版</span>） *
            </label>
            <input
              type="file"
              accept=".pptx"
              className="text-sm"
              onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <label className={labelCls}>
              スコア根拠説明資料（.pptx・任意・
              <span className="text-red-700">匿名版</span>）
            </label>
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

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-8 py-3 text-lg font-bold text-yellow-400 hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "生成中…" : "台本を生成する（2種類）"}
        </button>
        {loading && (
          <span className="animate-pulse text-sm text-gray-500">
            {progress ?? "生成しています…"}
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600">
            {error}{" "}
            <button onClick={generate} className="font-bold underline">
              リトライ
            </button>
          </span>
        )}
      </div>

      {daihon && (
        <section>
          {/* 版の切り替え */}
          <div className="mb-4 flex border-b border-gray-300">
            {(["brief", "full"] as DaihonVariant[]).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setVariant(v);
                  setCopied(false);
                }}
                disabled={!daihons[v]}
                className={`-mb-px border-b-2 px-5 py-2.5 text-sm font-bold disabled:opacity-40 ${
                  variant === v
                    ? "border-yellow-400 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {VARIANT_LABEL[v]}
                {!daihons[v] && loading && "　生成中…"}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-3">
            <button
              onClick={copyUrl}
              className="rounded-lg bg-gray-900 px-5 py-2 font-bold text-yellow-400 hover:bg-gray-700"
            >
              {copied
                ? "コピーしました ✓"
                : `${VARIANT_LABEL[variant]}のスマホ用URLをコピー`}
            </button>
            <button
              onClick={() =>
                downloadBlob(
                  buildDaihonHtmlBlob(daihon),
                  `${safeName(daihon.company)}_報告台本_${
                    variant === "brief" ? "簡易版" : "詳細版"
                  }.html`
                )
              }
              className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
            >
              HTMLファイルで保存
            </button>
            <button
              onClick={() => setEditing((x) => !x)}
              className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"
            >
              {editing ? "編集を終える" : "セリフを微調整する"}
            </button>
            <p className="w-full text-xs text-gray-600">
              URLもファイルも版ごとに別々です。いま表示している版が出力されます。
              セリフを微調整した場合は、もう一度コピー／保存してください。
            </p>
            {urlLength > 8000 && (
              <p className="w-full rounded border border-red-600 bg-white px-3 py-2 text-xs font-bold text-red-700">
                このURLは約{urlLength.toLocaleString()}文字あります。
                LINEなどでは途中で切られて開けないことがあります。
                {variant === "full" ? (
                  <>
                    <b>詳細版はURLではなく「HTMLファイルで保存」を使ってください。</b>
                    AirDropやメール添付で渡せば切れません。
                  </>
                ) : (
                  <>
                    <b>共有したあと必ず自分のスマホで開いて確認してください。</b>
                    開けない場合は「HTMLファイルで保存」で渡します。
                  </>
                )}
              </p>
            )}
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
                        setDaihons((prev) => {
                          const cur = prev[variant];
                          if (!cur) return prev;
                          const next = structuredClone(cur);
                          next.sections[si].lines[li] = e.target.value;
                          return { ...prev, [variant]: next };
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
