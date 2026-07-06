#!/usr/bin/env node
// メンバー用パスワードの bcrypt ハッシュを生成するスクリプト
// 使い方: node scripts/hash-password.mjs <パスワード>
// 出力されたハッシュを MEMBER_CREDENTIALS に "id:ハッシュ" の形式で登録する。

import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("使い方: node scripts/hash-password.mjs <パスワード>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
