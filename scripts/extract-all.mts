import fs from "node:fs";
import path from "node:path";
const dirs = [
  "/Users/haruna/Downloads/安西工業関連/2026:06:24査定訪問インタビュー文字起こし",
  "/Users/haruna/Downloads/安西工業関連/2026:07:30査定訪問インタビュー文字起こし",
];
const outDir = "/private/tmp/claude-501/-Users-haruna-Downloads-------/ce62010f-4c19-42a8-9b2e-ff193332e58e/scratchpad/transcripts";
fs.mkdirSync(outDir, { recursive: true });
const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
for (const dir of dirs) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".pdf"))) {
    const data = new Uint8Array(fs.readFileSync(path.join(dir, f)));
    const doc = await getDocument({ data, useSystemFonts: true }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((it: any) => ("str" in it ? it.str : "")).join(""));
    }
    const name = f.replace(/\.pdf$/, ".txt");
    fs.writeFileSync(path.join(outDir, name), pages.join("\n"));
    console.log(name);
  }
}
