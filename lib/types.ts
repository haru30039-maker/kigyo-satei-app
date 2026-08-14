import type { CategoryKey } from "./scoring";

/** 訪問1日分の日程と、その日に参加したメンバー */
export interface VisitDay {
  date: string; // YYYY-MM-DD
  members: string; // 「沖田、赤松、井上」のようにカンマ区切り
}

export interface CompanyInfo {
  name: string;
  industry: string;
  location: string;
  employees: string;
  /** 表示用にまとめた訪問日（例：2026/06/24・2026/07/30） */
  visitDate: string;
  /** 表示用にまとめた調査者（全日程の重複なし一覧） */
  researchers: string;
  attribute: string; // 火属性/水属性/風属性 など
  /** 日程ごとの詳細（日によって参加メンバーが違うため） */
  visits?: VisitDay[];
}

/** Claudeに渡す画像（求人票のスクリーンショット、手書きメモの写真など） */
export interface ImagePart {
  name: string;
  media_type: string;
  data: string; // base64
}

/** 学生1人分の採点（評価表xlsx 1ファイル＝1人） */
export interface StudentScoreSheet {
  name: string; // ファイル名から取った学生名
  scores: Partial<Record<CategoryKey, (number | null)[]>>;
}

export interface ScoreItem {
  label: string;
  score: number; // 1〜5
  evidence: string;
}

export interface CategoryScore {
  items: ScoreItem[];
  subtotal: number;
  max: number;
  normalized: number; // 100点換算（整数）
}

export type Scores = Record<CategoryKey, CategoryScore>;

export interface GapRow {
  job_posting: string;
  reality: string;
  student_voice: string;
}

export interface InterviewQA {
  q: string;
  a: string;
  insight: string;
}

export interface Interview {
  /** 匿名表記（既定・企業提出用）。例：「現場のベテラン社員」 */
  speaker: string;
  /** 実名版（チーム内用）。文字起こし上の呼称・役職＋出典ファイル名 */
  speaker_internal?: string;
  qa: InterviewQA[];
}

export interface LabeledRow {
  label: string;
  value: string;
}

export interface ScheduleRole {
  role: string;
  timeline: { time: string; activity: string }[];
}

export interface FitEntry {
  point: string;
  reason: string;
}

export interface ReportSections {
  draft_note: string;
  gap_table: GapRow[];
  interviews: Interview[];
  office: { rows: LabeledRow[]; insight: string };
  schedule: { roles: ScheduleRole[]; busy_note: string; insight: string };
  events: {
    annual: { month: string; name: string }[];
    daily: string;
    quote: string;
    insight: string;
  };
  fit: { good_fit: FitEntry[]; bad_fit: FitEntry[] };
  target_persona: { wanted_profile: string; persona: string; traits: string[] };
  job_posting_proposal: { current: string; proposal: string; effect: string }[];
  improvement_proposals: {
    title: string;
    issue: string;
    proposal: string;
    effect: string;
  }[];
  summary: string;
  missing_info: string[];
}

export interface WixFields {
  summary_lead: string;
  founder_quote: { text: string; name_title: string };
  insight_cards: { title: string; body: string }[];
  interviewee_tags: string[];
  real_voice_note: string;
  numbers_cards: { label: string; number: string; note: string }[];
  chart_tabs: {
    tab: string;
    body: string;
    fit_line: string;
    mismatch_line: string;
  }[];
  office_captions: string[];
  fits_tags: string[];
  mismatch_tags: string[];
}

export interface GenerateResult {
  scores: Scores;
  /** 属性をその値にした理由（スコアの数値付き） */
  attribute_reason?: string;
  report_sections: ReportSections;
  wix_fields: WixFields;
  attribute: string;
}

export interface GenerateRequest {
  companyInfo: CompanyInfo;
  transcript: string;
  existingScores: Partial<Record<CategoryKey, number[]>> | null;
  jobPosting: string;
  visitNotes: string;
  model: string;
  /** 求人票のスクリーンショットや手書きメモの写真など */
  images?: ImagePart[];
  /** 学生ごとの採点。AIはこれと全体情報から総合判定案を出す */
  studentScores?: StudentScoreSheet[];
  /** 分割生成のステージ。省略時は全パートを1回で生成（レガシー） */
  stage?: "scores" | "report" | "wix";
  /** report/wix ステージに渡す、確定済みスコアの要約文字列 */
  scoresSummary?: string;
}

/**
 * 分割生成でレポートの一部セクションが欠けた場合でも pptx 生成が落ちないよう
 * 既定値で補完する。欠けたセクションは「情報不足」と明示される。
 */
export function withReportDefaults(
  r: Partial<ReportSections>
): ReportSections {
  return {
    draft_note: r.draft_note ?? "本レポートは企業確認前ドラフトです。",
    gap_table: r.gap_table ?? [],
    interviews: r.interviews ?? [],
    office: { rows: r.office?.rows ?? [], insight: r.office?.insight ?? "情報不足" },
    schedule: {
      roles: r.schedule?.roles ?? [],
      busy_note: r.schedule?.busy_note ?? "",
      insight: r.schedule?.insight ?? "情報不足",
    },
    events: {
      annual: r.events?.annual ?? [],
      daily: r.events?.daily ?? "",
      quote: r.events?.quote ?? "",
      insight: r.events?.insight ?? "情報不足",
    },
    fit: { good_fit: r.fit?.good_fit ?? [], bad_fit: r.fit?.bad_fit ?? [] },
    target_persona: {
      wanted_profile: r.target_persona?.wanted_profile ?? "情報不足",
      persona: r.target_persona?.persona ?? "情報不足",
      traits: r.target_persona?.traits ?? [],
    },
    job_posting_proposal: r.job_posting_proposal ?? [],
    improvement_proposals: r.improvement_proposals ?? [],
    summary: r.summary ?? "情報不足",
    missing_info: r.missing_info ?? [],
  };
}
