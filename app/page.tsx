"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, type CategoryKey } from "@/lib/scoring";
import type {
  CompanyInfo,
  GenerateResult,
  Scores,
} from "@/lib/types";
import { parseScoreXlsx } from "@/lib/xlsxParse";
import ScoreTable from "@/components/ScoreTable";
import ReportPreview from "@/components/ReportPreview";
import WixText from "@/components/WixText";
import RadarChart, { downloadChartPng } from "@/components/RadarChart";
import { DEMO_RESULT } from "@/lib/demoData";

const EMPTY_COMPANY: CompanyInfo = {
  name: "",
  industry: "",
  location: "",
  employees: "",
  visitDate: "",
  researchers: "",
  attribute: "",
};

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6（標準・推奨）" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5（高速・低コスト）" },
  { id: "claude-opus-4-8", label: "Opus 4.8（最高品質・高コスト）" },
];

type Tab = "score" | "report" | "wix" | "chart";

export default function Home() {
  const [company, setCompany] = useState<CompanyInfo>(EMPTY_COMPANY);
  const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [jobPosting, setJobPosting] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [model, setModel] = useState(MODELS[0].id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [tab, setTab] = useState<Tab>("score");

  const normalizedScores = useMemo(() => {
    if (!result) return null;
    return CATEGORIES.map((c) => result.scores[c.key]?.normalized ?? 0);
  }, [result]);

  function setField(key: keyof CompanyInfo, value: string) {
    setCompany((prev) => ({ ...prev, [key]: value }));
  }

  function updateScores(next: Scores) {
    setResult((prev) => (prev ? { ...prev, scores: next } : prev));
  }

  async function generate() {
    setError(null);

    if (!company.name.trim()) {
      setError("企業名を入力してください");
      return;
    }
    if (transcriptFiles.length === 0) {
      setError("文字起こしファイル（.txt）を1つ以上アップロードしてください");
      return;
    }

    setLoading(true);
    try {
      // 文字起こしを結合（ファイル名を区切りに）
      const texts = await Promise.all(
        transcriptFiles.map(async (f) => `【ファイル: ${f.name}】\n${await f.text()}`)
      );
      const transcript = texts.join("\n\n");

      // 評価表 xlsx から既存スコアを抽出（任意・ベストエフォート）
      let existingScores: Partial<Record<CategoryKey, number[]>> | null = null;
      if (xlsxFile) {
        try {
          const parsed = await parseScoreXlsx(xlsxFile);
          existingScores = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (v && v.some((x) => x != null)) {
              existingScores[k as CategoryKey] = v.map((x) => x ?? 0);
            }
          }
          if (Object.keys(existingScores).length === 0) existingScores = null;
        } catch {
          // 読み取り失敗時は既存スコアなしとして続行
          existingScores = null;
        }
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyInfo: company,
          transcript,
          existingScores,
          jobPosting,
          visitNotes,
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `エラー (${res.status})`);
      }

      setResult(data as GenerateResult);
      setTab("score");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  const inputCls =
    "w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white";
  const labelCls = "block text-xs font-bold text-gray-600 mb-1";

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">
            学生企業査定 <span className="text-yellow-500">自動化ツール</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            #ともあゆ 企業査定チーム専用 ／ 文字起こし・生成結果はサーバーに保存されません
          </p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-500 underline hover:text-gray-800"
        >
          ログアウト
        </button>
      </header>

      {/* ===== 入力フォーム ===== */}
      <section className="border border-gray-300 rounded-lg p-5 mb-6">
        <h2 className="font-bold mb-4">企業基本情報</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className={labelCls}>企業名 *</label>
            <input className={inputCls} value={company.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="株式会社◯◯" />
          </div>
          <div>
            <label className={labelCls}>業種</label>
            <input className={inputCls} value={company.industry}
              onChange={(e) => setField("industry", e.target.value)}
              placeholder="製造業" />
          </div>
          <div>
            <label className={labelCls}>所在地</label>
            <input className={inputCls} value={company.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="愛知県◯◯市" />
          </div>
          <div>
            <label className={labelCls}>従業員数</label>
            <input className={inputCls} value={company.employees}
              onChange={(e) => setField("employees", e.target.value)}
              placeholder="45名" />
          </div>
          <div>
            <label className={labelCls}>訪問日</label>
            <input className={inputCls} type="date" value={company.visitDate}
              onChange={(e) => setField("visitDate", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>調査者</label>
            <input className={inputCls} value={company.researchers}
              onChange={(e) => setField("researchers", e.target.value)}
              placeholder="山田・佐藤" />
          </div>
          <div>
            <label className={labelCls}>属性</label>
            <select className={inputCls} value={company.attribute}
              onChange={(e) => setField("attribute", e.target.value)}>
              <option value="">選択してください</option>
              <option value="火属性">火属性</option>
              <option value="水属性">水属性</option>
              <option value="風属性">風属性</option>
              <option value="土属性">土属性</option>
            </select>
          </div>
        </div>
      </section>

      <section className="border border-gray-300 rounded-lg p-5 mb-6">
        <h2 className="font-bold mb-4">ファイルアップロード</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>
              インタビュー文字起こし（.txt 複数可・話者ラベル付き） *
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              multiple
              className="text-sm"
              onChange={(e) =>
                setTranscriptFiles(Array.from(e.target.files ?? []))
              }
            />
            {transcriptFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {transcriptFiles.map((f) => f.name).join(" / ")}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>評価表 .xlsx（任意・入力済みならそれを正とする）</label>
            <input
              type="file"
              accept=".xlsx"
              className="text-sm"
              onChange={(e) => setXlsxFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>求人票・企業HPの記載内容（任意）</label>
              <textarea className={`${inputCls} h-28`} value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder="求人票のテキストを貼り付け" />
            </div>
            <div>
              <label className={labelCls}>見学メモ（任意）</label>
              <textarea className={`${inputCls} h-28`} value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="オフィスの様子・タイムスタンプ＋印象メモ" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-600">モデル</label>
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={generate}
          disabled={loading}
          className="px-8 py-3 rounded-lg bg-gray-900 text-yellow-400 font-bold text-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "生成中…（1〜3分かかります）" : "生成する"}
        </button>
        {loading && (
          <span className="text-sm text-gray-500 animate-pulse">
            スコア案・レポート・Wixテキストをまとめて生成しています…
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600">
            {error}{" "}
            <button onClick={generate} className="underline font-bold">
              リトライ
            </button>
          </span>
        )}
        {!loading && !result && (
          <button
            onClick={() => {
              setCompany((prev) => ({
                ...prev,
                name: prev.name || "株式会社サンプル",
              }));
              setResult(structuredClone(DEMO_RESULT));
              setTab("score");
            }}
            className="text-xs text-gray-400 underline hover:text-gray-600"
          >
            サンプルデータでUIを確認（API消費なし）
          </button>
        )}
      </div>

      {/* ===== 結果タブ ===== */}
      {result && (
        <section>
          <div className="flex border-b border-gray-300 mb-5">
            {(
              [
                ["score", "① スコア案"],
                ["report", "② 査定レポート"],
                ["wix", "③ Wix掲載用テキスト"],
                ["chart", "④ チャート"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-5 py-2.5 text-sm font-bold border-b-2 -mb-px ${
                  tab === key
                    ? "border-yellow-400 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "score" && (
            <ScoreTable scores={result.scores} onChange={updateScores} />
          )}

          {tab === "report" && (
            <ReportPreview
              report={result.report_sections}
              scores={result.scores}
              wix={result.wix_fields}
              companyInfo={company}
            />
          )}

          {tab === "wix" && (
            <WixText
              wix={result.wix_fields}
              scores={result.scores}
              companyInfo={company}
            />
          )}

          {tab === "chart" && normalizedScores && (
            <div className="flex flex-col items-center gap-5">
              <RadarChart normalized={normalizedScores} size={440} />
              <div className="text-sm text-gray-600">
                {CATEGORIES.map((c, i) => (
                  <span key={c.key} className="mr-3">
                    {c.label}: <b>{normalizedScores[i]}</b>
                  </span>
                ))}
              </div>
              <button
                onClick={() =>
                  downloadChartPng(
                    normalizedScores,
                    `${company.name || "chart"}_企業特性チャート.png`
                  )
                }
                className="px-6 py-2.5 rounded-lg bg-gray-900 text-yellow-400 font-bold hover:bg-gray-700"
              >
                透過PNG（1200×1200）をダウンロード
              </button>
              <p className="text-xs text-gray-400">
                ※ ①スコア案タブで数値を修正すると即座に再描画されます
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
