"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  RadarController,
  type ChartConfiguration,
} from "chart.js";

Chart.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  RadarController
);

// チャート仕様（過去のチャート生成ツールから抽出済みの正確な値）
// - 0〜10目盛り（2刻み）
// - 塗り: rgba(40,170,222,0.4) / 線: rgba(40,170,222,1) 1.5px / point非表示
// - グリッド線・軸ラベルとも黒 #111111
// - 透過背景、書き出しは 1200×1200px

const LABELS = [
  "ビジョン",
  "仕組み",
  "環境",
  "給与・休日",
  "人間関係",
  "成長",
  "独自性",
];

function buildConfig(
  values: number[], // 0〜10 スケール
  fontSize: number
): ChartConfiguration<"radar"> {
  return {
    type: "radar",
    data: {
      labels: LABELS,
      datasets: [
        {
          data: values,
          backgroundColor: "rgba(40,170,222,0.4)",
          borderColor: "rgba(40,170,222,1)",
          borderWidth: 1.5,
          pointRadius: 0,
          pointHitRadius: 0,
          fill: true,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 2,
            color: "#111111",
            font: { size: fontSize * 0.75 },
            backdropColor: "transparent",
          },
          grid: { color: "#111111" },
          angleLines: { color: "#111111" },
          pointLabels: {
            color: "#111111",
            font: { size: fontSize },
          },
        },
      },
    },
  };
}

/** normalized(0〜100) 7つ → 0〜10スケールへ */
export function toChartValues(normalized: number[]): number[] {
  return normalized.map((v) => Math.round((v / 10) * 10) / 10);
}

/** 透過PNG（1200×1200px）を生成してダウンロード */
export function downloadChartPng(normalized: number[], filename: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const chart = new Chart(canvas, {
    ...buildConfig(toChartValues(normalized), 40),
    options: {
      ...buildConfig(toChartValues(normalized), 40).options,
      devicePixelRatio: 1,
    },
  });
  const url = canvas.toDataURL("image/png"); // 背景を塗らないので透過
  chart.destroy();
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export default function RadarChart({
  normalized,
  size = 420,
}: {
  normalized: number[];
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<"radar"> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    chartRef.current?.destroy();
    canvas.width = size;
    canvas.height = size;
    chartRef.current = new Chart(canvas, buildConfig(toChartValues(normalized), 14));
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [normalized, size]);

  return <canvas ref={canvasRef} width={size} height={size} />;
}
