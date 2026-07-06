// APIクレジットを消費せずにUI（スコア表・レポート・Wix・チャート・pptx）を確認するための
// サンプルデータ。架空の企業です。
import { CATEGORIES } from "./scoring";
import { normalize } from "./scoring";
import type { GenerateResult, Scores } from "./types";

function demoScores(): Scores {
  const base: Record<string, number[]> = {
    vision: [5, 4, 4, 3],
    system: [2, 3, 3, 3, 2],
    environment: [4, 4, 3, 3],
    compensation: [2, 3, 3, 4, 3],
    relationships: [5, 5, 4, 4, 5],
    growth: [3, 3, 5, 3, 4],
    uniqueness: [4, 4, 3],
  };
  const scores = {} as Scores;
  for (const cat of CATEGORIES) {
    const vals = base[cat.key];
    const subtotal = vals.reduce((a, b) => a + b, 0);
    scores[cat.key] = {
      items: cat.items.map((label, i) => ({
        label,
        score: vals[i],
        evidence:
          i === 0
            ? "（サンプル）社長「うちは◯◯で地域一番を目指す」と繰り返し言及"
            : "（サンプル）根拠となる発言・観察の要約が入ります",
      })),
      subtotal,
      max: cat.max,
      normalized: normalize(subtotal, cat.max),
    };
  }
  return scores;
}

export const DEMO_RESULT: GenerateResult = {
  scores: demoScores(),
  report_sections: {
    draft_note:
      "本レポートは企業確認前ドラフトです。発表範囲は企業と協議のうえ確定します。",
    gap_table: [
      {
        job_posting: "「アットホームな職場です」",
        reality: "社員同士の距離は近いが、繁忙期は月40時間程度の残業がある",
        student_voice: "雰囲気は本当に良い。ただし忙しさは覚悟が必要",
      },
      {
        job_posting: "「未経験歓迎・充実の研修」",
        reality: "体系的な研修はなくOJT中心。マニュアルは整備途中",
        student_voice: "自分から聞きに行ける人でないと最初は苦労しそう",
      },
    ],
    interviews: [
      {
        speaker: "代表取締役（サンプル）",
        qa: [
          {
            q: "会社として一番大切にしていることは？",
            a: "社員が誇りを持てる仕事をすること。売上より先に人を見る。",
            insight:
              "ビジョンが採用・評価にも一貫している可能性がある。（サンプル）",
          },
          {
            q: "どんな人に来てほしいですか？",
            a: "素直で、自分から動ける人。スキルは後からでいい。",
            insight: "教育体制が薄いぶん、自走力を求める構造。（サンプル）",
          },
        ],
      },
      {
        speaker: "入社3年目・営業（サンプル）",
        qa: [
          {
            q: "入社前後のギャップは？",
            a: "最初の1年は正直きつかった。でも先輩が必ず助けてくれた。",
            insight:
              "離職リスクのサインと人間関係の強さが同居している。（サンプル）",
          },
        ],
      },
    ],
    office: {
      rows: [
        { label: "場所", value: "駅から徒歩8分・幹線道路沿い" },
        { label: "雰囲気", value: "フロア全体が見渡せるオープンな配置" },
        { label: "休憩", value: "休憩室あり。コーヒー無料" },
        { label: "服装", value: "オフィスカジュアル" },
      ],
      insight:
        "コミュニケーション重視のレイアウト。集中作業が好きな人には向かない可能性。（サンプル）",
    },
    schedule: {
      roles: [
        {
          role: "営業職",
          timeline: [
            { time: "8:30", activity: "朝礼・1日の予定共有" },
            { time: "9:00", activity: "顧客訪問（2〜3件）" },
            { time: "12:00", activity: "昼食" },
            { time: "13:00", activity: "訪問・見積作成" },
            { time: "18:00", activity: "退社（繁忙期は19:30頃）" },
          ],
        },
        {
          role: "事務職",
          timeline: [
            { time: "8:30", activity: "朝礼" },
            { time: "9:00", activity: "受発注処理" },
            { time: "13:00", activity: "請求書対応" },
            { time: "17:30", activity: "退社" },
          ],
        },
      ],
      busy_note: "繁忙期（12〜3月）は営業職の残業が月30〜40時間に増える",
      insight: "職種で働き方が大きく異なる。応募時に職種を明確にすべき。（サンプル）",
    },
    events: {
      annual: [
        { month: "4月", name: "新人歓迎会" },
        { month: "8月", name: "社員旅行" },
        { month: "12月", name: "忘年会" },
      ],
      daily: "昼食は社長も混ざって全員でとることが多い。",
      quote: "行事は強制じゃない。でもみんな来る。それが答えだと思う。",
      insight: "行事参加が実質的な文化。プライベート重視の人には負担の可能性。（サンプル）",
    },
    fit: {
      good_fit: [
        { point: "人との距離が近い環境で働きたい人", reason: "社員間の関係密度が非常に高い" },
        { point: "自分から動いて学べる人", reason: "研修より実践で覚える文化" },
      ],
      bad_fit: [
        { point: "マニュアルに沿って正確に働きたい人", reason: "仕組み・マニュアルが未整備" },
        { point: "定時退社を最優先したい人", reason: "繁忙期の残業が月30〜40時間" },
      ],
    },
    target_persona: {
      wanted_profile: "素直で自走力があり、人間関係を大切にする人材（サンプル）",
      persona:
        "地元志向の21歳・専門学校生。チームで動く部活経験があり、初任給より職場の空気を重視。",
      traits: ["自分から質問できる", "変化に柔軟", "地元で長く働きたい"],
    },
    job_posting_proposal: [
      {
        current: "「アットホームな職場です」",
        proposal: "「昼食は社長も一緒。距離の近さは地域随一（繁忙期残業 月30〜40h）」",
        effect: "ミスマッチ応募の減少・信頼度の向上",
      },
    ],
    improvement_proposals: [
      {
        title: "OJT頼みの教育体制の補強",
        issue: "新人の立ち上がりが先輩の忙しさに左右される",
        proposal: "週1の振り返り面談＋簡易マニュアルの整備",
        effect: "早期離職リスクの低減",
      },
    ],
    summary:
      "人間関係の密度とビジョンの浸透が突出した企業。一方で仕組み・給与面は発展途上であり、「環境より人で選ぶ」タイプの学生に強く合う。（サンプル）",
    missing_info: ["有給取得率の実数", "新卒3年以内離職率"],
  },
  wix_fields: {
    summary_lead:
      "（サンプル）社長との距離が近く、社員同士の助け合いが日常になっている会社。研修制度は未整備でOJT中心、繁忙期は残業もある。「人と一緒に頑張る空気」が好きな人には刺さる環境。",
    founder_quote: {
      text: "売上より先に人を見る。社員が誇りを持てる仕事をすることが一番。",
      name_title: "代表取締役 ◯◯ ◯◯",
    },
    insight_cards: [
      { title: "成長スピードについて", body: "（サンプル）研修はOJT中心。自分から動ける人ほど早く成長できる環境。" },
      { title: "給与・待遇について", body: "（サンプル）初任給は地域平均並み。昇給は勤続ベースの傾向。" },
      { title: "チームの空気について", body: "（サンプル）困ったら誰かが助ける文化が根付いている。" },
      { title: "働き続ける理由", body: "（サンプル）「人がいいから」という回答が全員から出た。" },
    ],
    interviewee_tags: ["社長", "入社3年目社員", "新入社員"],
    real_voice_note:
      "（サンプル）入社3年目社員の「最初の1年は正直きつかった」の発言。リアルな立ち上がり期の空気が伝わる。",
    numbers_cards: [
      { label: "社員の平均年齢", number: "34歳", note: "（サンプル）若手とベテランのバランスが良い。" },
      { label: "繁忙期の月平均残業", number: "30〜40h", note: "（サンプル）12〜3月に集中する。" },
      { label: "社長と昼食を共にする頻度", number: "週3回", note: "（サンプル）距離の近さの象徴。" },
      { label: "年間行事", number: "6回", note: "（サンプル）参加は任意だが出席率は高い。" },
    ],
    chart_tabs: [
      { tab: "評価制度", body: "（サンプル）評価基準は明文化されておらず、社長の裁量が大きい。", fit_line: "信頼関係ベースで働きたい人", mismatch_line: "明確な評価基準が欲しい人" },
      { tab: "裁量", body: "（サンプル）若手でも顧客担当を任される。", fit_line: "早く任されたい人", mismatch_line: "手厚い指導が欲しい人" },
      { tab: "給与・福利厚生", body: "（サンプル）水準は平均並み。独自の福利厚生は少ない。", fit_line: "環境より人で選ぶ人", mismatch_line: "待遇最優先の人" },
      { tab: "残業・休日", body: "（サンプル）繁忙期に偏りがある。", fit_line: "メリハリ型の働き方が合う人", mismatch_line: "毎日定時が絶対の人" },
      { tab: "人間関係", body: "（サンプル）この会社の最大の強み。", fit_line: "チームで動きたい人", mismatch_line: "一人で黙々と働きたい人" },
    ],
    office_captions: [
      "（サンプル）フロア全体が見渡せるオープンなデスク配置。",
      "（サンプル）休憩室のホワイトボードには社員の誕生日が書かれている。",
      "（サンプル）会議室は1つのみ。打ち合わせは立ち話で済むことが多い。",
      "（サンプル）玄関に社訓と社員全員の写真。",
      "（サンプル）駐車場は全員分完備。車通勤が多数派。",
    ],
    fits_tags: [
      "人の近さを重視する人",
      "自分から動ける人",
      "地元で長く働きたい人",
      "チーム戦が好きな人",
      "変化を楽しめる人",
      "素直に吸収できる人",
      "行事を楽しめる人",
      "早く任されたい人",
    ],
    mismatch_tags: [
      "明確なルールが欲しい人",
      "研修で学びたい人",
      "定時退社が絶対の人",
      "個人で黙々と働きたい人",
      "待遇を最優先する人",
      "都会で働きたい人",
      "行事が苦手な人",
      "転職前提の人",
    ],
  },
  attribute: "水属性",
};
