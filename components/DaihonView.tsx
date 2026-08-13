"use client";

import type { DaihonResult } from "@/lib/daihon";

// 報告MTG台本のモバイル向け表示（/daihon プレビューと /daihon/view 共用）

export default function DaihonView({ daihon }: { daihon: DaihonResult }) {
  return (
    <div className="mx-auto max-w-xl px-4 pb-16 text-[16px] leading-[1.9]">
      {/* 固定ヘッダー */}
      <header className="sticky top-0 z-10 -mx-4 border-b border-gray-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur">
        <h1 className="text-base font-bold">{daihon.title}</h1>
        <p className="mt-0.5 text-xs text-gray-500">{daihon.duration_note}</p>
        <nav className="scrollbar-none -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {daihon.sections.map((s) => (
            <a
              key={s.no}
              href={`#sec-${s.no}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-800"
            >
              {s.no} {s.title.length > 6 ? s.title.slice(0, 6) : s.title}
            </a>
          ))}
          {daihon.qa.length > 0 && (
            <a
              href="#sec-qa"
              className="shrink-0 whitespace-nowrap rounded-full border border-yellow-400 bg-white px-3 py-1 text-xs font-semibold text-gray-800"
            >
              想定問答
            </a>
          )}
        </nav>
      </header>

      {/* 最重要ルール */}
      {daihon.rules.length > 0 && (
        <div className="mt-4 rounded-xl border-2 border-red-600 bg-red-50 px-4 py-3">
          <p className="text-xs font-extrabold tracking-wide text-red-700">
            最重要ルール（開始前に確認）
          </p>
          <ul className="mt-1 list-disc pl-5 text-[15px] leading-relaxed">
            {daihon.rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* セクション */}
      {daihon.sections.map((s) => (
        <section key={s.no} id={`sec-${s.no}`} className="mt-8 scroll-mt-28">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="rounded-md bg-yellow-400 px-2 py-0.5 text-sm font-extrabold text-gray-900">
              {s.no}
            </span>
            <h2 className="flex-1 text-lg font-extrabold">{s.title}</h2>
            <span className="text-xs font-semibold tabular-nums text-gray-500">
              {s.minutes}分
            </span>
          </div>
          {s.slide_cue && (
            <span className="mt-2 inline-block rounded-lg bg-gray-900 px-3 py-1 text-sm font-bold text-yellow-400">
              {s.slide_cue}
            </span>
          )}
          <div className="mt-2 rounded-2xl border-2 border-yellow-400 bg-white px-4 py-3 text-[17px] leading-[2]">
            {s.lines.map((l, i) => (
              <p key={i} className={i > 0 ? "mt-3" : ""}>
                {l}
              </p>
            ))}
          </div>
          {s.direction && (
            <p className="mt-1.5 text-sm font-semibold text-red-700">
              ★ {s.direction}
            </p>
          )}
        </section>
      ))}

      {/* 想定問答 */}
      {daihon.qa.length > 0 && (
        <section id="sec-qa" className="mt-10 scroll-mt-28 border-t border-gray-200 pt-5">
          <h2 className="text-lg font-extrabold">想定問答（聞かれたらタップ）</h2>
          <div className="mt-3 space-y-2.5">
            {daihon.qa.map((qa, i) => (
              <details key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <summary className="flex cursor-pointer items-baseline gap-2 px-4 py-3 font-bold">
                  <span className="shrink-0 rounded-md bg-yellow-400 px-1.5 text-sm text-gray-900">
                    Q
                  </span>
                  <span className="text-[15px]">{qa.q}</span>
                </summary>
                <p className="border-t border-dashed border-gray-200 px-4 py-3 text-[15px] leading-relaxed">
                  {qa.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* 補足メモ */}
      {daihon.memo.length > 0 && (
        <section className="mt-10 border-t border-gray-200 pt-5">
          <h2 className="text-base font-extrabold">補足メモ（読み上げない）</h2>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed text-gray-500">
            {daihon.memo.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 border-t border-gray-200 pt-3 text-xs text-gray-400">
        #ともあゆ 学生企業査定チーム ｜ 内部資料・社外共有不可
      </footer>
    </div>
  );
}
