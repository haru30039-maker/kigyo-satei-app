# 学生企業査定 自動化ツール

学生団体 #ともあゆ 企業査定チーム用の社内ツール。
インタビュー文字起こし・評価表をアップロードすると、以下を自動生成します。

1. **評価スコア案**（7カテゴリ×31項目・100点換算・手動修正可）
2. **査定レポート**（.pptx ダウンロード）
3. **Wix掲載用テキスト**（フィールド別・コピーボタン付き）
4. **企業特性チャート**（透過PNG 1200×1200）

## 技術構成

- Next.js (App Router) + TypeScript / Vercelにそのままデプロイ可能
- Anthropic API（サーバー側のみ・デフォルトモデル: claude-sonnet-4-6）
  - スコア案・レポート・Wixテキストを **1回のAPIリクエスト** でまとめて生成（クレジット節約）
  - マスタープロンプトは **prompt caching**（`cache_control: ephemeral`）でキャッシュ
- pptx生成: pptxgenjs ／ xlsx読込: SheetJS ／ チャート: Chart.js（クライアント側でPNG書き出し）

## セットアップ（ローカル）

```bash
npm install
cp .env.local.example .env.local
# .env.local を編集（下記）
npm run dev
```

### 環境変数

| 変数 | 内容 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console で発行したAPIキー |
| `MEMBER_CREDENTIALS` | `id1:bcryptハッシュ,id2:bcryptハッシュ` 形式。**平文パスワードは登録しない** |
| `SESSION_SECRET` | セッションクッキー署名用のランダム文字列（`openssl rand -hex 32`） |

パスワードハッシュの作成:

```bash
node scripts/hash-password.mjs <パスワード>
```

> ⚠️ **ローカルの .env.local では bcrypt ハッシュ内の `$` を `\$` にエスケープすること**
> （Next.js が `$変数` を展開してしまうため）。例:
> `MEMBER_CREDENTIALS=haruna:\$2b\$10\$xxxx...`
> Vercel のダッシュボードに登録する場合はエスケープ不要（そのまま貼る）。

## メンバーの使い方

1. 配布された ID・パスワードでログイン
2. 企業基本情報を入力し、文字起こし（.txt・話者ラベル付き）をアップロード
   - 評価表xlsx・求人票テキスト・見学メモは任意（あると精度が上がる）
3. 「生成する」→ 1〜3分待つ
4. **①スコア案** タブでチームすり合わせの結果に合わせて数値を修正
5. **②査定レポート** から .pptx をダウンロード
6. **③Wixテキスト** をフィールドごとにコピーしてCMSに貼り付け
7. **④チャート** から透過PNGをダウンロードしてWixにアップ

※ 「サンプルデータでUIを確認」リンクで、API を消費せずに画面の動きを確認できます。

## デプロイ（Vercel）

```bash
# 1. GitHubリポジトリを作成してpush
git init && git add -A && git commit -m "initial"
gh repo create tomoayu-satei --private --source=. --push   # または手動でリポジトリ作成

# 2. Vercelでリポジトリをインポート
#    https://vercel.com/new から対象リポジトリを選択（設定はデフォルトのままでOK）

# 3. Vercelの Settings → Environment Variables に3つの環境変数を登録
#    （MEMBER_CREDENTIALS はエスケープなしでそのまま貼る）

# 4. デプロイ後、本番URLでログイン→ダミー文字起こしで一連の流れを確認
```

## プライバシー・セキュリティ（実装済み事項）

- **ステートレス設計**: 文字起こし・生成結果はサーバー側に一切保存しない
  （DB・ファイルストレージなし。`/api/generate` はAnthropic APIへの素通し）
- **音声ファイルは扱わない**: テキスト化済みの文字起こしのみ
- **ログにPIIを出さない**: Function Logs には文字数・処理時間・トークン数・エラー種別のみ
- **認証**: メンバーごとの個別ID＋bcryptハッシュ照合。クッキーは
  `httpOnly` / `secure`(本番) / `sameSite=strict`。ログインは1分5回のレート制限
- Anthropic APIはAPIキー経由（Commercial Terms適用。入出力は学習に使われず30日で自動削除）

### 運用ルール（コード外）

- インタビュー同意取得時に「録音データはAIツールで分析します」の一文を含める
- 個人が特定されうる記述は、公開前に本人確認を取る（出力は常に企業確認前ドラフト）
- メンバー退会時は `MEMBER_CREDENTIALS` から該当IDを削除して再デプロイ

### リリース前チェックリスト

- [ ] ダミー文字起こしで アップロード→生成→スコア修正→pptx→PNG が完走する
- [ ] Vercel Function Logs に文字起こし本文・生成結果本文が出ていないことを目視確認
- [ ] メンバー全員分のID・ハッシュを登録し、テスト用アカウントを削除
