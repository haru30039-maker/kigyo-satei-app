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

/**
 * AIが属性を返さなかった場合に、100点換算スコアから属性を判定する保険。
 * 判定基準はマスタープロンプトと同じ。
 */
export function deriveAttribute(
  normalized: Record<CategoryKey, number>
): { attribute: string; reason: string } | null {
  const v = normalized.vision ?? 0;
  const sy = normalized.system ?? 0;
  const en = normalized.environment ?? 0;
  const co = normalized.compensation ?? 0;
  const re = normalized.relationships ?? 0;
  const gr = normalized.growth ?? 0;
  const un = normalized.uniqueness ?? 0;

  const candidates: { attribute: string; score: number; reason: string }[] = [
    {
      attribute: "火属性",
      score: (v >= 85 ? 1 : 0) + (un >= 85 ? 1 : 0) + (gr >= 75 ? 1 : 0),
      reason: `ビジョンの強さ${v}・独自性${un}・成長機会${gr}と、挑戦志向を示す項目が高いため。`,
    },
    {
      attribute: "水属性",
      score: (re >= 80 ? 1.5 : 0) + (sy >= 70 ? 1 : 0),
      reason: `人間関係の密度${re}・仕組みの充実度${sy}と、共感とコミュニティを重視する傾向が強いため。`,
    },
    {
      attribute: "風属性",
      score: (sy < 60 ? 1.5 : 0) + (v >= 75 ? 1 : 0),
      reason: `仕組みの充実度${sy}が低い一方でビジョンの強さ${v}が高く、自由度の高い個性的な組織であるため。`,
    },
    {
      attribute: "土属性",
      score: (co >= 75 ? 1 : 0) + (en >= 75 ? 1 : 0) + (sy >= 75 ? 1 : 0),
      reason: `給与・休日${co}・環境の快適さ${en}が高く、安定志向で堅実な運営であるため。`,
    },
  ];
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score <= 0) return null;
  return { attribute: best.attribute, reason: best.reason + "（スコアから自動判定）" };
}

/**
 * 学生の採点の書き出し（全員一致／おおむね一致／割れた）を、
 * 実際の点差から計算し直して補正する。
 * AIが最大・最小を数え間違えることがあるため、判定はコード側で行う。
 * 例：「おおむね一致（井上4・沖田5・星野4・赤松4・田中3）」→ 差2点なので「学生の採点が割れた（…）」
 */
export function fixScoreSpreadWording(evidence: string): string {
  const PHRASES = /(全員一致|おおむね一致|学生の採点が割れた|学生の採点は割れた)\s*[（(]([^）)]*)[）)]/g;
  return evidence.replace(PHRASES, (whole, _phrase: string, inner: string) => {
    // 「井上4・沖田5・…」を区切り、各要素の末尾の数字を点数として取る
    const scores = inner
      .split(/[・、,]/)
      .map((seg) => {
        const m = seg.trim().match(/([1-5])\s*(?:点)?$/);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n != null);
    if (scores.length < 3) return whole; // 学生の採点でなければ触らない

    const diff = Math.max(...scores) - Math.min(...scores);
    const correct =
      diff === 0 ? "全員一致" : diff === 1 ? "おおむね一致" : "学生の採点が割れた";
    return `${correct}（${inner}）`;
  });
}
