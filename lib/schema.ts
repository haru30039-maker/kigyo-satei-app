// /api/generate の structured output 用 JSONスキーマ。
// structured outputs の制約：全オブジェクトに additionalProperties:false、全プロパティ required。

type JSONSchema = Record<string, unknown>;

const str: JSONSchema = { type: "string" };

function obj(properties: Record<string, JSONSchema>): JSONSchema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

function arr(items: JSONSchema): JSONSchema {
  return { type: "array", items };
}

const scoreItem = obj({
  label: str,
  score: { type: "integer", enum: [1, 2, 3, 4, 5] },
  evidence: str,
});

const categoryScore = obj({
  items: arr(scoreItem),
  subtotal: { type: "integer" },
  max: { type: "integer" },
  normalized: { type: "integer" },
});

const scores = obj({
  vision: categoryScore,
  system: categoryScore,
  environment: categoryScore,
  compensation: categoryScore,
  relationships: categoryScore,
  growth: categoryScore,
  uniqueness: categoryScore,
});

const reportSections = obj({
  draft_note: str,
  gap_table: arr(obj({ job_posting: str, reality: str, student_voice: str })),
  interviews: arr(
    obj({
      speaker: str,
      qa: arr(obj({ q: str, a: str, insight: str })),
    })
  ),
  office: obj({
    rows: arr(obj({ label: str, value: str })),
    insight: str,
  }),
  schedule: obj({
    roles: arr(
      obj({
        role: str,
        timeline: arr(obj({ time: str, activity: str })),
      })
    ),
    busy_note: str,
    insight: str,
  }),
  events: obj({
    annual: arr(obj({ month: str, name: str })),
    daily: str,
    quote: str,
    insight: str,
  }),
  fit: obj({
    good_fit: arr(obj({ point: str, reason: str })),
    bad_fit: arr(obj({ point: str, reason: str })),
  }),
  target_persona: obj({
    wanted_profile: str,
    persona: str,
    traits: arr(str),
  }),
  job_posting_proposal: arr(obj({ current: str, proposal: str, effect: str })),
  improvement_proposals: arr(
    obj({ title: str, issue: str, proposal: str, effect: str })
  ),
  summary: str,
  missing_info: arr(str),
});

const wixFields = obj({
  summary_lead: str,
  founder_quote: obj({ text: str, name_title: str }),
  insight_cards: arr(obj({ title: str, body: str })),
  interviewee_tags: arr(str),
  real_voice_note: str,
  numbers_cards: arr(obj({ label: str, number: str, note: str })),
  chart_tabs: arr(
    obj({ tab: str, body: str, fit_line: str, mismatch_line: str })
  ),
  office_captions: arr(str),
  fits_tags: arr(str),
  mismatch_tags: arr(str),
});

export const GENERATE_OUTPUT_SCHEMA = obj({
  scores,
  report_sections: reportSections,
  wix_fields: wixFields,
});
