"use client";

import { useEffect, useState } from "react";
import LZString from "lz-string";
import type { DaihonResult } from "@/lib/daihon";
import DaihonView from "@/components/DaihonView";

// 台本の閲覧専用ページ（ログイン不要・スマホ向け）
// 台本データはURLの #d= 以降に圧縮して埋め込まれており、サーバーには送信されない。

export default function DaihonViewPage() {
  const [daihon, setDaihon] = useState<DaihonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = location.hash.match(/#d=(.+)/);
      if (!m) {
        setError("URLに台本データがありません。発行されたURLをそのまま開いてください。");
        return;
      }
      const json = LZString.decompressFromEncodedURIComponent(m[1]);
      if (!json) throw new Error("decompress failed");
      const data = JSON.parse(json) as DaihonResult;
      if (!Array.isArray(data.sections)) throw new Error("invalid data");
      setDaihon(data);
    } catch {
      setError("台本データを読み込めませんでした。URLが途中で切れていないか確認してください。");
    }
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-gray-600">
        {error}
      </main>
    );
  }
  if (!daihon) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center text-sm text-gray-400">
        読み込み中…
      </main>
    );
  }
  return <DaihonView daihon={daihon} />;
}
