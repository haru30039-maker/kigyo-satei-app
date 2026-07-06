// 評価表 .xlsx から既存スコアを読み取る（クライアント側・ベストエフォート）。
// 31項目のラベルにセル内容が一致した行から、1〜5の数値を拾う。
// 読み取れなかった項目は null のままにし、生成後にスコア表で手動修正できる。

import * as XLSX from "xlsx";
import { CATEGORIES, type CategoryKey } from "./scoring";

function norm(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, "");
}

export async function parseScoreXlsx(
  file: File
): Promise<Partial<Record<CategoryKey, (number | null)[]>>> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
  });

  // ラベル（空白除去済み）→ {cat, idx} の索引
  const labelIndex = new Map<string, { cat: CategoryKey; idx: number }>();
  for (const cat of CATEGORIES) {
    cat.items.forEach((item, idx) => {
      labelIndex.set(norm(item), { cat: cat.key, idx });
    });
  }

  const result: Partial<Record<CategoryKey, (number | null)[]>> = {};
  for (const cat of CATEGORIES) {
    result[cat.key] = new Array(cat.items.length).fill(null);
  }

  for (const row of rows) {
    for (const cell of row) {
      const hit = labelIndex.get(norm(cell));
      if (!hit) continue;
      // 同じ行にある 1〜5 の数値を右側から探す（スコア列を優先）
      let score: number | null = null;
      for (let i = row.length - 1; i >= 0; i--) {
        const v = row[i];
        if (typeof v === "number" && v >= 1 && v <= 5 && Number.isInteger(v)) {
          score = v;
          break;
        }
      }
      if (score != null) {
        result[hit.cat]![hit.idx] = score;
      }
      break;
    }
  }

  return result;
}
