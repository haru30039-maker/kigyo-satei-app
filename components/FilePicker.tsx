"use client";

import { useRef } from "react";

// 複数ファイルを「追加」で選べるピッカー。
// ブラウザ標準の input[type=file] は選び直すたびに前の選択が消えるため、
// 選択済みリストを自前で保持し、あとから別フォルダのファイルも足せるようにする。

export default function FilePicker({
  label,
  accept,
  files,
  onChange,
  hint,
  required,
}: {
  label: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
  hint?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const key = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

  function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length > 0) {
      const seen = new Set(files.map(key));
      onChange([...files, ...incoming.filter((f) => !seen.has(key(f)))]);
    }
    // 同じファイルを選び直しても onChange が発火するようにクリアする
    e.target.value = "";
  }

  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">
        {label}
        {required && " *"}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border border-gray-400 bg-white px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-100"
        >
          {files.length > 0 ? "ファイルを追加" : "ファイルを選択"}
        </button>
        <span className="text-xs text-gray-500">
          {files.length > 0
            ? `${files.length}件を選択中（何回でも追加できます）`
            : "選択されていません"}
        </span>
        {files.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-gray-500 underline hover:text-red-600"
          >
            すべて削除
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleAdd}
      />

      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}

      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={key(f)}
              className="flex items-center gap-2 rounded bg-gray-50 px-2 py-1 text-xs"
            >
              <span className="w-5 shrink-0 text-gray-400 tabular-nums">
                {i + 1}.
              </span>
              <span className="flex-1 break-all">{f.name}</span>
              <span className="shrink-0 text-gray-400">
                {Math.max(1, Math.round(f.size / 1024)).toLocaleString()}KB
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="shrink-0 px-1 text-gray-400 hover:text-red-600"
                aria-label={`${f.name} を削除`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
