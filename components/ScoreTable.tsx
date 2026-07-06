"use client";

import { CATEGORIES } from "@/lib/scoring";
import { normalize } from "@/lib/scoring";
import type { Scores } from "@/lib/types";

// Tab1: 7カテゴリ×31項目のスコア表。score は 1〜5 で手動上書き可能。
// 上書きすると subtotal / normalized を再計算して親に返す（チャートも即再描画される）。

export default function ScoreTable({
  scores,
  onChange,
}: {
  scores: Scores;
  onChange: (next: Scores) => void;
}) {
  function updateScore(catKey: string, itemIdx: number, value: number) {
    const cat = scores[catKey as keyof Scores];
    const items = cat.items.map((it, i) =>
      i === itemIdx ? { ...it, score: value } : it
    );
    const subtotal = items.reduce((sum, it) => sum + it.score, 0);
    const next: Scores = {
      ...scores,
      [catKey]: {
        ...cat,
        items,
        subtotal,
        normalized: normalize(subtotal, cat.max),
      },
    };
    onChange(next);
  }

  return (
    <div className="space-y-6">
      {CATEGORIES.map((catDef) => {
        const cat = scores[catDef.key];
        if (!cat) return null;
        return (
          <div key={catDef.key} className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-900 text-yellow-400 px-4 py-2">
              <h3 className="font-bold">{catDef.fullLabel}</h3>
              <div className="text-sm">
                合計 {cat.subtotal} / {cat.max} 点　→
                <span className="text-lg font-bold">{cat.normalized}</span> /100点
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-gray-600">
                  <th className="px-3 py-1.5 w-8">No.</th>
                  <th className="px-3 py-1.5">項目</th>
                  <th className="px-3 py-1.5 w-24">スコア</th>
                  <th className="px-3 py-1.5 w-[40%]">根拠・特記事項</th>
                </tr>
              </thead>
              <tbody>
                {cat.items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-200 align-top">
                    <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2">{item.label}</td>
                    <td className="px-3 py-2">
                      <select
                        className="border border-gray-300 rounded px-2 py-1 bg-white"
                        value={item.score}
                        onChange={(e) =>
                          updateScore(catDef.key, i, Number(e.target.value))
                        }
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs leading-relaxed">
                      {item.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
