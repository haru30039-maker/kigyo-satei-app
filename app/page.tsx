"use client";

export const dynamic = 'force-dynamic';

import { useMemo, useRef, useState } from "react";
import { CATEGORIES, type CategoryKey } from "@/lib/scoring";
import type {
  CompanyInfo,
  GenerateResult,
  ImagePart,
  Scores,
  StudentScoreSheet,
  VisitDay,
} from "@/lib/types";
import { withReportDefaults } from "@/lib/types";
import { parseScoreXlsx } from "@/lib/xlsxParse";
import { extractTextFromPdf } from "@/lib/pdfExtract";
import { extractFiles } from "@/lib/fileExtract";
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
  const [xlsxFiles, setXlsxFiles] = useState<File[]>([]);
  const [jobPosting, setJobPosting] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  // 訪問は複数日にわたり、日によって参加メンバーも違う
  const [visits, setVisits] = useState<VisitDay[]>([{ date: "", members: "" }]);
  // 学生メモ・求人票は Word/PDF/画像でも提出されるためファイルでも受け取る
  const [notesFiles, setNotesFiles] = useState<File[]>([]);
  const [jobFiles, setJobFiles] = useState<File[]>([]);
  const [model, setModel] = useState(MODELS[0].id);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [tab, setTab] = useState<Tab>("score");

  const normalizedScores = useMemo(() => {
    if (!result) return null;
    return CATEGORIES.map((c) => result.scores[c.key]?.normalized ?? 0);
  }, [result]);

  function setField(key: keyof CompanyInfo, value: string) {
    setCompany((prev) => ({ ...prev, [key]: value }));
  }

  function updateVisit(i: number, key: keyof VisitDay, value: string) {
    setVisits((prev) =>
      prev.map((v, idx) => (idx === i ? { ...v, [key]: value } : v))
    );
  }
  function addVisit() {
    setVisits((prev) => [...prev, { date: "", members: "" }]);
  }
  function removeVisit(i: number) {
    setVisits((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  function updateScores(next: Scores) {
    setResult((prev) => (prev ? { ...prev, scores: next } : prev));
  }

  // 分割生成の途中結果（リトライ時に完了済みステージを再利用する）
  const partialRef = useRef<{
    key: string;
    warmed?: boolean;
    scores?: Scores;
    attribute?: string;
    reportMain?: Partial<GenerateResult["report_sections"]>;
    reportExtra?: Partial<GenerateResult["report_sections"]>;
    wix?: GenerateResult["wix_fields"];
  } | null>(null);

  async function generate() {
    setError(null);

    if (!company.name.trim()) {
      setError("企業名を入力してください");
      return;
    }
    if (transcriptFiles.length === 0) {
      setError("文字起こしファイル（.txt または .pdf）を1つ以上アップロードしてください");
      return;
    }

    setLoading(true);
    try {
      // 文字起こしを結合（ファイル名を区切りに）
      const texts = await Promise.all(
        transcriptFiles.map(async (f) => {
          let content: string;
          if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
            try {
              content = await extractTextFromPdf(f);
            } catch (e) {
              throw new Error(`PDF読み取り失敗 (${f.name}): ${e instanceof Error ? e.message : '不明なエラー'}`);
            }
          } else {
            content = await f.text();
          }
          return `【ファイル: ${f.name}】\n${content}`;
        })
      );
      const transcript = texts.join("\n\n");

      // 学生メモ・求人票のファイル（Word/PDF/画像）を読み取る
      const noteParts = await extractFiles(notesFiles, "学生メモ");
      const jobParts = await extractFiles(jobFiles, "求人票・企業HP");
      const images: ImagePart[] = [...noteParts.images, ...jobParts.images];
      const visitNotesAll = [visitNotes.trim(), noteParts.text]
        .filter(Boolean)
        .join("\n\n");
      const jobPostingAll = [jobPosting.trim(), jobParts.text]
        .filter(Boolean)
        .join("\n\n");

      // 評価表 xlsx（学生1人＝1ファイル）。ファイル名を学生名として扱う
      const studentScores: StudentScoreSheet[] = [];
      for (const f of xlsxFiles) {
        try {
          const parsed = await parseScoreXlsx(f);
          const scores: StudentScoreSheet["scores"] = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (v && v.some((x) => x != null)) {
              scores[k as CategoryKey] = v;
            }
          }
          if (Object.keys(scores).length > 0) {
            studentScores.push({
              name: f.name.replace(/\.[^.]+$/, ""),
              scores,
            });
          }
        } catch {
          // 読み取れないファイルは無視して続行
        }
      }

      // 訪問日程から表示用の日付・調査者を組み立てる
      const activeVisits = visits.filter((v) => v.date || v.members.trim());
      const visitDate = activeVisits
        .map((v) => v.date.replace(/-/g, "/"))
        .filter(Boolean)
        .join("・");
      const researchers = Array.from(
        new Set(
          activeVisits.flatMap((v) =>
            v.members
              .split(/[,、\/／・]/)
              .map((x) => x.trim())
              .filter(Boolean)
          )
        )
      ).join("、");
      const companyInfo: CompanyInfo = {
        ...company,
        visitDate: visitDate || company.visitDate,
        researchers: researchers || company.researchers,
        visits: activeVisits,
      };

      const base = {
        companyInfo,
        transcript,
        existingScores: null,
        studentScores,
        jobPosting: jobPostingAll,
        visitNotes: visitNotesAll,
        images,
        model,
      };

      // 入力が変わっていたら途中結果を破棄（同一入力ならリトライ時に再利用）
      const inputKey = JSON.stringify([
        companyInfo,
        transcriptFiles.map((f) => `${f.name}:${f.size}`),
        notesFiles.map((f) => `${f.name}:${f.size}`),
        jobFiles.map((f) => `${f.name}:${f.size}`),
        xlsxFiles.map((f) => `${f.name}:${f.size}`),
        jobPosting.length,
        visitNotes.length,
        model,
      ]);
      if (partialRef.current?.key !== inputKey) {
        partialRef.current = { key: inputKey };
      }
      const partial = partialRef.current;

      // サーバー基盤(Vercel等)がタイムアウトすると JSON でないエラーページが返ることが
      // あるため、無条件に res.json() せずテキストで受けて自前でパースする。
      async function callStage<T>(
        stage: "warmup" | "scores" | "report_main" | "report_extra" | "wix",
        scoresSummary?: string
      ): Promise<T> {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...base, stage, scoresSummary }),
        });
        const raw = await res.text();
        let data: { error?: string } = {};
        let isJson = true;
        try {
          data = JSON.parse(raw);
        } catch {
          isJson = false;
        }
        if (!res.ok || !isJson) {
          if (res.status === 401) {
            throw new Error("セッションが切れています。再ログインしてください。");
          }
          throw new Error(
            data?.error ??
              `サーバーエラー (HTTP ${res.status})。時間をおいて「リトライ」を押すと、失敗したところから再開します。`
          );
        }
        return data as T;
      }

      // ⓪ ウォームアップ（資料を読み込ませてキャッシュを作る。以降の各ステージが速くなる）
      if (!partial.warmed) {
        setProgress("準備中…　資料を読み込んでいます（1〜2分）");
        await callStage<{ ok: boolean }>("warmup");
        partial.warmed = true;
      }

      // ① スコア案
      if (!partial.scores) {
        setProgress("①/④ スコア案を生成中…（1〜2分）");
        const r = await callStage<{ scores: Scores; attribute: string }>(
          "scores"
        );
        partial.scores = r.scores;
        partial.attribute = r.attribute;
      }
      const scoresSummary = CATEGORIES.map(
        (c) =>
          `${c.fullLabel}: ${partial.scores?.[c.key]?.normalized ?? 0}/100点`
      ).join(" / ");

      // ② レポート前半（求人票ギャップ・インタビュー）
      if (!partial.reportMain) {
        setProgress("②/④ 求人票ギャップ・インタビューを生成中…（1〜3分）");
        const r = await callStage<{
          report_sections: Partial<GenerateResult["report_sections"]>;
        }>("report_main", scoresSummary);
        partial.reportMain = r.report_sections;
      }

      // ③ レポート後半（オフィス〜総括）
      if (!partial.reportExtra) {
        setProgress("③/④ オフィス〜総括を生成中…（1〜3分）");
        const r = await callStage<{
          report_sections: Partial<GenerateResult["report_sections"]>;
        }>("report_extra", scoresSummary);
        partial.reportExtra = r.report_sections;
      }

      // ④ Wixテキスト
      if (!partial.wix) {
        setProgress("④/④ Wix掲載用テキストを生成中…（1分ほど）");
        const r = await callStage<{ wix_fields: GenerateResult["wix_fields"] }>(
          "wix",
          scoresSummary
        );
        partial.wix = r.wix_fields;
      }

      const result: GenerateResult = {
        scores: partial.scores!,
        attribute: partial.attribute ?? "",
        report_sections: withReportDefaults({
          ...partial.reportMain,
          ...partial.reportExtra,
        }),
        wix_fields: partial.wix!,
      };
      setIsDemo(false);
      setResult(result);
      // 生成結果の属性で企業情報を更新
      if (result.attribute) {
        setCompany((prev) => ({ ...prev, attribute: result.attribute }));
      }
      setTab("score");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setLoading(false);
      setProgress(null);
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
        <div className="flex items-center gap-4">
          <a
            href="/daihon"
            className="text-xs font-bold text-gray-700 underline hover:text-gray-900"
          >
            報告台本ジェネレーター
          </a>
          <button
            onClick={logout}
            className="text-xs text-gray-500 underline hover:text-gray-800"
          >
            ログアウト
          </button>
        </div>
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
          <div className="col-span-2">
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

        <div className="mt-5">
          <label className={labelCls}>
            訪問日程（複数日可・日付ごとに参加メンバーを入力）
          </label>
          <div className="space-y-2">
            {visits.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="date"
                  className={`${inputCls} w-44 shrink-0`}
                  value={v.date}
                  onChange={(e) => updateVisit(i, "date", e.target.value)}
                />
                <input
                  className={inputCls}
                  value={v.members}
                  placeholder="この日の参加メンバー（例：沖田、赤松、井上）"
                  onChange={(e) => updateVisit(i, "members", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeVisit(i)}
                  disabled={visits.length <= 1}
                  className="px-2 py-2 text-gray-400 hover:text-red-600 disabled:opacity-30"
                  aria-label="この日程を削除"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addVisit}
            className="mt-2 text-xs font-bold text-gray-700 underline"
          >
            ＋ 訪問日を追加
          </button>
          <p className="text-xs text-gray-500 mt-1">
            レポートには全日程の日付と、参加した全メンバー（重複なし）が載ります。
          </p>
        </div>
      </section>

      <section className="border border-gray-300 rounded-lg p-5 mb-6">
        <h2 className="font-bold mb-4">ファイルアップロード</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>
              インタビュー文字起こし（.txt / .pdf 複数可・話者ラベル付き） *
            </label>
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
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
            <label className={labelCls}>
              評価表 .xlsx（任意・複数可／学生1人につき1ファイル）
            </label>
            <input
              type="file"
              accept=".xlsx"
              multiple
              className="text-sm"
              onChange={(e) => setXlsxFiles(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-gray-500 mt-1">
              ファイル名を学生名として扱います（例：沖田_3年.xlsx）。
              複数人分あると、AIが各自の採点のばらつきも踏まえて総合判定案を出します。
            </p>
            {xlsxFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {xlsxFiles.map((f) => f.name).join(" / ")}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>
              学生メモ（任意・複数可／.docx .pdf .txt / 写真・スクショ）
            </label>
            <input
              type="file"
              accept=".docx,.pdf,.txt,.md,image/*"
              multiple
              className="text-sm"
              onChange={(e) => setNotesFiles(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-gray-500 mt-1">
              参加した学生の人数分アップロードできます。ファイル名は「氏名_学年」推奨（例：井上_2年.docx）。
            </p>
            {notesFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {notesFiles.map((f) => f.name).join(" / ")}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              求人票・企業HP（任意・複数可／.pdf .docx / スクリーンショット・画像）
            </label>
            <input
              type="file"
              accept=".docx,.pdf,.txt,.md,image/*"
              multiple
              className="text-sm"
              onChange={(e) => setJobFiles(Array.from(e.target.files ?? []))}
            />
            <p className="text-xs text-gray-500 mt-1">
              求人サイトやHPのスクリーンショットでも読み取れます。
            </p>
            {jobFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {jobFiles.map((f) => f.name).join(" / ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>求人票・企業HP（テキストで貼る場合）</label>
              <textarea className={`${inputCls} h-24`} value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder="求人票のテキストを貼り付け（上のファイルと併用可）" />
            </div>
            <div>
              <label className={labelCls}>見学メモ（テキストで貼る場合）</label>
              <textarea className={`${inputCls} h-24`} value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="オフィスの様子・印象メモ（上のファイルと併用可）" />
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
          {loading ? "生成中…" : "生成する"}
        </button>
        {loading && (
          <span className="text-sm text-gray-500 animate-pulse">
            {progress ?? "生成しています…"}
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
              setIsDemo(true);
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
      {result && isDemo && (
        <div className="mb-4 rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          ⚠️ サンプルデータ（架空企業）を表示中です。実データの生成結果ではありません。
          このままダウンロード・提出しないでください。
        </div>
      )}
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
              demo={isDemo}
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
