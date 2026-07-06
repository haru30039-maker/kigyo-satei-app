// 評価表（企業査定_評価表.xlsx）と同一の 7カテゴリ × 31項目 定義
export type CategoryKey =
  | "vision"
  | "system"
  | "environment"
  | "compensation"
  | "relationships"
  | "growth"
  | "uniqueness";

export interface CategoryDef {
  key: CategoryKey;
  label: string; // チャート・サマリー表示用の短いラベル
  fullLabel: string; // 評価表の正式名称
  max: number; // 満点（項目数 × 5）
  items: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "vision",
    label: "ビジョン",
    fullLabel: "① ビジョンの強さ",
    max: 20,
    items: [
      "社長が会社のビジョン・想いを情熱を持って語っている",
      "社員がビジョンを自分の言葉で語れる",
      "ビジョン実現に向けた具体的な取り組みがある",
      "採用時にビジョンへの共感を重視している",
    ],
  },
  {
    key: "system",
    label: "仕組み",
    fullLabel: "② 仕組みの充実度",
    max: 25,
    items: [
      "評価基準が明確に定められており社員に共有されている",
      "評価結果に対して社員が納得感を持っている",
      "法定以外の独自の福利厚生がある",
      "福利厚生が実際に社員に使われている",
      "社内ルール・マニュアルが整備されている",
    ],
  },
  {
    key: "environment",
    label: "環境",
    fullLabel: "③ 環境の快適さ",
    max: 20,
    items: [
      "駅や主要道路からのアクセスが良い",
      "オフィス・作業スペースが快適に保たれている",
      "トイレ・休憩室などの共用スペースが清潔",
      "働く環境の整備に会社として力を入れている印象がある",
    ],
  },
  {
    key: "compensation",
    label: "給与・休日",
    fullLabel: "④ 給与・休日の重視度",
    max: 25,
    items: [
      "給与水準が業界平均と比較して高い",
      "昇給・賞与の仕組みが明確に定められている",
      "年間休日数が業界平均以上ある",
      "有給休暇が取得しやすい雰囲気・仕組みがある",
      "残業を抑制する仕組みや文化がある",
    ],
  },
  {
    key: "relationships",
    label: "人間関係",
    fullLabel: "⑤ 人間関係の密度",
    max: 25,
    items: [
      "社員同士が日常的に活発にコミュニケーションを取っている",
      "上司と部下の距離が近くフラットな関係性がある",
      "困った時に気軽に相談できる文化がある",
      "社内イベント・懇親会など交流の場が設けられている",
      "チームで協力して仕事をする文化がある",
    ],
  },
  {
    key: "growth",
    label: "成長",
    fullLabel: "⑥ 成長機会の豊富さ",
    max: 25,
    items: [
      "新入社員・若手向けの研修制度が充実している",
      "資格取得支援・外部研修参加など自己成長への投資がある",
      "若手社員でも責任ある仕事・プロジェクトを任される",
      "キャリアパス・将来の成長イメージが明確に示されている",
      "新しいことへの挑戦を会社として後押しする文化がある",
    ],
  },
  {
    key: "uniqueness",
    label: "独自性",
    fullLabel: "⑦ 独自性の強さ",
    max: 15,
    items: [
      "他社にはないユニークな制度や取り組みがある",
      "業界や地域の中で独自のポジションを持っている",
      "社風・文化に独自のこだわりを感じる",
    ],
  },
];

export const CATEGORY_ORDER: CategoryKey[] = CATEGORIES.map((c) => c.key);

export function normalize(subtotal: number, max: number): number {
  return Math.round((subtotal / max) * 100);
}
