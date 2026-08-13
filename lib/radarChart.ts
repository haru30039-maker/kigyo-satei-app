import type PptxGenJS from "pptxgenjs";

// レーダーチャートを「図形」で描画する。
// PPTX標準のグラフ機能はKeynote等の一部アプリで表示されないことがあるため、
// どのアプリでも確実に見えるよう線と多角形で描いている。

// pptxgenjs の型定義に custGeom が未登録のため（実行時は対応済み）
const CUSTOM_GEOM = "custGeom" as PptxGenJS.SHAPE_NAME;

export interface RadarItem {
  label: string;
  value: number; // 0〜100
}

export interface RadarOptions {
  cx: number; // 中心X（インチ）
  cy: number; // 中心Y（インチ）
  r: number; // 外周までの半径（インチ）
  accent: string; // データ多角形の色
  gridColor: string; // 目盛りの色
  textColor: string; // ラベルの色
  font: string;
  labelFontSize?: number;
}

export function drawRadarChart(
  slide: PptxGenJS.Slide,
  items: RadarItem[],
  o: RadarOptions
): void {
  const n = items.length;
  if (n < 3) return;

  // 中心から見た各頂点の座標（真上から時計回り）
  const pointAt = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: o.cx + radius * Math.cos(angle), y: o.cy + radius * Math.sin(angle) };
  };

  // custGeom はシェイプ原点からの相対座標で指定する
  const boxX = o.cx - o.r;
  const boxY = o.cy - o.r;
  const rel = (p: { x: number; y: number }) => ({
    x: Number((p.x - boxX).toFixed(3)),
    y: Number((p.y - boxY).toFixed(3)),
  });

  function polygon(
    radiusOrValues: number | number[],
    style: { line: string; lineWidth: number; fill?: string; transparency?: number }
  ) {
    const pts = Array.from({ length: n }, (_, i) =>
      rel(
        pointAt(
          i,
          typeof radiusOrValues === "number"
            ? radiusOrValues
            : (o.r * Math.max(0, Math.min(100, radiusOrValues[i]))) / 100
        )
      )
    );
    slide.addShape(CUSTOM_GEOM, {
      x: boxX,
      y: boxY,
      w: o.r * 2,
      h: o.r * 2,
      points: [...pts, { close: true }],
      line: { color: style.line, width: style.lineWidth },
      ...(style.fill
        ? { fill: { color: style.fill, transparency: style.transparency ?? 0 } }
        : { fill: { type: "none" } }),
    });
  }

  // 1) 目盛りの同心多角形（25/50/75/100%）
  for (const level of [0.25, 0.5, 0.75, 1]) {
    polygon(o.r * level, { line: o.gridColor, lineWidth: level === 1 ? 1 : 0.5 });
  }

  // 2) 中心から各頂点への軸線
  for (let i = 0; i < n; i++) {
    const p = rel(pointAt(i, o.r));
    const c = rel({ x: o.cx, y: o.cy });
    slide.addShape(CUSTOM_GEOM, {
      x: boxX,
      y: boxY,
      w: o.r * 2,
      h: o.r * 2,
      points: [c, p],
      line: { color: o.gridColor, width: 0.5 },
      fill: { type: "none" },
    });
  }

  // 3) スコアの多角形
  polygon(
    items.map((it) => it.value),
    { line: o.accent, lineWidth: 2.25, fill: o.accent, transparency: 55 }
  );

  // 4) 各頂点のラベル（項目名＋点数）
  const labelSize = o.labelFontSize ?? 10;
  for (let i = 0; i < n; i++) {
    const p = pointAt(i, o.r + 0.34);
    slide.addText(`${items[i].label}\n${items[i].value}`, {
      x: p.x - 0.62,
      y: p.y - 0.22,
      w: 1.24,
      h: 0.44,
      fontFace: o.font,
      fontSize: labelSize,
      bold: true,
      color: o.textColor,
      align: "center",
      valign: "middle",
      lineSpacing: labelSize * 1.25,
    });
  }
}
