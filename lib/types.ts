import type { CategoryKey } from "./scoring";

export interface CompanyInfo {
  name: string;
  industry: string;
  location: string;
  employees: string;
  visitDate: string;
  researchers: string;
  attribute: string; // 火属性/水属性/風属性 など
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
  speaker: string;
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
}
