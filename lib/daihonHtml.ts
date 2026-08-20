// 台本を1枚のHTMLファイルに書き出す（クライアント側）。
//
// 共有URLは詳細版で2万字を超え、LINE等では途中で切られて開けない。
// ファイルにしておけばAirDrop・メール添付で確実に渡せ、電波がなくても開ける。

import type { DaihonResult } from "./daihon";
import { VARIANT_LABEL } from "./daihon";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLE = `
:root{--ink:#111;--paper:#fff;--sunk:#f4f4f2;--line:#ddd;--accent:#facc15;--danger:#b91c1c}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic","Noto Sans JP",sans-serif;
  font-size:16px;line-height:1.9;-webkit-text-size-adjust:100%}
.wrap{max-width:40rem;margin:0 auto;padding:0 1rem 4rem}
header.top{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.96);
  border-bottom:1px solid var(--line);padding:.8rem 0 .6rem;backdrop-filter:blur(6px)}
h1{font-size:1rem;font-weight:800;margin:0}
.meta{margin:.2rem 0 0;font-size:.75rem;color:#666}
.badge{background:var(--ink);color:var(--accent);font-weight:800;padding:.1rem .4rem;border-radius:.2rem;margin-right:.4rem}
.rules{margin-top:1rem;border:2px solid var(--danger);background:#fef2f2;border-radius:.75rem;padding:.8rem 1rem}
.rules p{margin:0 0 .3rem;font-size:.75rem;font-weight:800;color:var(--danger);letter-spacing:.04em}
.rules ul{margin:0;padding-left:1.2rem;font-size:.95rem;line-height:1.75}
section{margin-top:2rem}
.hd{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem}
.no{background:var(--accent);color:#111;font-weight:800;border-radius:.35rem;padding:0 .5rem;font-size:.9rem}
.hd h2{flex:1;font-size:1.1rem;font-weight:800;margin:0}
.min{font-size:.75rem;font-weight:700;color:#666;font-variant-numeric:tabular-nums}
.cue{display:inline-block;margin-top:.5rem;background:var(--ink);color:var(--accent);
  font-weight:700;font-size:.85rem;border-radius:.5rem;padding:.15rem .7rem}
.lines{margin-top:.5rem;border:2px solid var(--accent);border-radius:1rem;padding:.7rem 1rem;font-size:1.05rem;line-height:2}
.lines p{margin:0}
.lines p+p{margin-top:.7rem}
.dir{margin:.4rem 0 0;font-size:.85rem;font-weight:700;color:var(--danger)}
.needs{margin-top:2.5rem;border-top:2px solid var(--ink);padding-top:1.2rem}
.needs>.lead{background:var(--sunk);border-radius:.5rem;padding:.5rem .8rem;font-size:.9rem;margin:.4rem 0 0}
.nc{border:2px solid var(--ink);border-radius:1rem;margin-top:1rem;overflow:hidden}
.nc .top2{border-bottom:1px solid var(--line);padding:.5rem .9rem}
.nc .svc{font-size:.75rem;font-weight:800;color:#999;margin:0}
.nc .basis{font-size:.75rem;color:#777;margin:.15rem 0 0;line-height:1.7}
.nc .ask{padding:.6rem .9rem}
.nc .lbl{font-size:.72rem;font-weight:800;color:#777;margin:0}
.nc .q{font-size:1.05rem;line-height:2;margin:.2rem 0 0}
.br{display:grid;gap:1px;background:var(--line)}
.br>div{background:#fff;padding:.6rem .9rem}
.br>div.no2{background:#fefce8}
.br p.t{font-size:.95rem;line-height:1.75;margin:.2rem 0 0}
details{border:1px solid var(--line);border-radius:.75rem;margin-top:.6rem;overflow:hidden}
summary{cursor:pointer;padding:.6rem .9rem;font-weight:700;font-size:.95rem}
details p{border-top:1px dashed var(--line);margin:0;padding:.6rem .9rem;font-size:.95rem;line-height:1.75}
.memo{margin-top:2.5rem;border-top:1px solid var(--line);padding-top:1rem}
.memo h2{font-size:1rem;margin:0 0 .3rem}
.memo ul{margin:0;padding-left:1.2rem;font-size:.85rem;color:#666;line-height:1.8}
footer{margin-top:3rem;border-top:1px solid var(--line);padding-top:.8rem;font-size:.75rem;color:#999}
@media print{header.top{position:static}.lines{break-inside:avoid}}
`;

export function buildDaihonHtml(d: DaihonResult): string {
  const totalMinutes = d.sections.reduce(
    (s, x) => s + (Number(x.minutes) || 0),
    0
  );
  const duration =
    totalMinutes > 0 ? `説明 約${totalMinutes}分＋質疑` : d.duration_note;
  const needs = d.needs_check ?? [];

  const rules = d.rules.length
    ? `<div class="rules"><p>最重要ルール（開始前に確認）</p><ul>${d.rules
        .map((r) => `<li>${esc(r)}</li>`)
        .join("")}</ul></div>`
    : "";

  const sections = d.sections
    .map(
      (s) => `<section>
  <div class="hd"><span class="no">${esc(s.no)}</span><h2>${esc(s.title)}</h2><span class="min">${esc(s.minutes)}分</span></div>
  ${s.slide_cue ? `<span class="cue">${esc(s.slide_cue)}</span>` : ""}
  <div class="lines">${s.lines.map((l) => `<p>${esc(l)}</p>`).join("")}</div>
  ${s.direction ? `<p class="dir">★ ${esc(s.direction)}</p>` : ""}
</section>`
    )
    .join("\n");

  const needsHtml = needs.length
    ? `<div class="needs">
  <h2 style="font-size:1.1rem;margin:0">ここから先について</h2>
  <p class="lead"><b>売り込みではありません。</b>まず質問して、社長がいまどうされているかを聞きます。すでに取り組まれていたら、そこで引き下がってください。</p>
  ${needs
    .map(
      (n, i) => `<div class="nc">
    <div class="top2">
      <p class="svc">${i + 1}. ${esc(n.service)}（読み上げない）</p>
      <p class="basis">根拠：${esc(n.basis)}</p>
    </div>
    <div class="ask"><p class="lbl">まず聞く</p><p class="q">${esc(n.question)}</p></div>
    <div class="br">
      <div><p class="lbl">「もうやっている」と言われたら</p><p class="t">${esc(n.if_yes)}</p></div>
      <div class="no2"><p class="lbl">「やっていない」と言われたら</p><p class="t">${esc(n.if_no)}</p></div>
    </div>
  </div>`
    )
    .join("")}
  <p class="dir">★ 金額・期間を聞かれたら「持ち帰って改めてご提案させてください」と答える。その場で決めない。</p>
</div>`
    : "";

  const qa = d.qa.length
    ? `<div class="needs"><h2 style="font-size:1.1rem;margin:0">想定問答（聞かれたら開く）</h2>${d.qa
        .map(
          (q) =>
            `<details><summary>Q. ${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`
        )
        .join("")}</div>`
    : "";

  const memo = d.memo.length
    ? `<div class="memo"><h2>補足メモ（読み上げない）</h2><ul>${d.memo
        .map((m) => `<li>${esc(m)}</li>`)
        .join("")}</ul></div>`
    : "";

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <h1>${esc(d.title)}</h1>
    <p class="meta">${d.variant ? `<span class="badge">${esc(VARIANT_LABEL[d.variant])}</span>` : ""}${esc(duration)}</p>
  </header>
  ${rules}
  ${sections}
  ${needsHtml}
  ${qa}
  ${memo}
  <footer>#ともあゆ 学生企業査定チーム ｜ 内部資料・社外共有不可</footer>
</div>
</body>
</html>`;
}

export function buildDaihonHtmlBlob(d: DaihonResult): Blob {
  return new Blob([buildDaihonHtml(d)], { type: "text/html;charset=utf-8" });
}
