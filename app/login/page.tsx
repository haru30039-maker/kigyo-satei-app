"use client";

import { useState } from "react";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `ログインに失敗しました (${res.status})`);
      }
      location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-xl p-8 shadow-xl"
      >
        <h1 className="text-xl font-bold mb-1">
          学生企業査定 <span className="text-yellow-500">自動化ツール</span>
        </h1>
        <p className="text-xs text-gray-500 mb-6">#ともあゆ メンバー専用</p>

        <label className="block text-xs font-bold text-gray-600 mb-1">ID</label>
        <input
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          autoComplete="username"
        />

        <label className="block text-xs font-bold text-gray-600 mb-1">
          パスワード
        </label>
        <input
          type="password"
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-5"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gray-900 text-yellow-400 font-bold hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "確認中…" : "ログイン"}
        </button>
      </form>
    </main>
  );
}
