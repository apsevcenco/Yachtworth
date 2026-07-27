import { aiChat, extractJson } from "../valuation/openai";

export type SurveyPolishMode = "note" | "finding" | "recommendation";

export type SurveyPolishInput = {
  text: string;
  mode: SurveyPolishMode;
  language?: string | null;
  sectionName?: string | null;
  itemNumber?: string | null;
  itemDescription?: string | null;
  condition?: string | null;
  recommendationLevel?: string | null;
};

export type SurveyPolishResult = {
  polished_text: string;
  recommendation_level?: "A" | "B" | "C" | "D" | null;
  confidence?: "low" | "medium" | "high";
};

function modeInstruction(mode: SurveyPolishMode): string {
  if (mode === "recommendation") {
    return [
      "Rewrite as a concise professional yacht survey recommendation.",
      "Use action-oriented wording, e.g. inspect, repair, renew, service, monitor, verify.",
      "If the input clearly implies urgency, suggest recommendation_level A/B/C/D.",
    ].join(" ");
  }
  if (mode === "finding") {
    return [
      "Rewrite as a professional yacht survey finding.",
      "State what was observed, where it was observed, and why it matters if clear.",
      "Do not invent measurements, serial numbers, standards, causes, or inaccessible details.",
    ].join(" ");
  }
  return [
    "Rewrite as a professional yacht survey note.",
    "Keep it factual, neutral, concise, and suitable for a formal survey report.",
    "Do not turn it into a recommendation unless the input explicitly asks for action.",
  ].join(" ");
}

export async function polishSurveyText(
  input: SurveyPolishInput,
): Promise<SurveyPolishResult> {
  const text = input.text.trim();
  if (!text) throw new Error("Text is required.");

  const raw = await aiChat(
    [
      {
        role: "system",
        content: [
          "You are a senior yacht surveyor writing formal marine survey reports.",
          "Return ONLY valid JSON with keys: polished_text, recommendation_level, confidence.",
          "polished_text must be in professional English regardless of source language.",
          "Preserve factual meaning. Do not add facts that are not present.",
          "Use British/European yacht survey terminology where appropriate.",
          "Avoid marketing language, legal conclusions, and certification claims.",
          "If uncertain, keep the wording cautious.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          task: modeInstruction(input.mode),
          mode: input.mode,
          source_language_hint: input.language || null,
          context: {
            section_name: input.sectionName || null,
            item_number: input.itemNumber || null,
            item_description: input.itemDescription || null,
            condition: input.condition || null,
            recommendation_level: input.recommendationLevel || null,
          },
          text,
        }),
      },
    ],
    process.env["OPENAI_SURVEY_POLISH_MODEL"] || "gpt-4o-mini",
    35_000,
  );

  const json = extractJson(raw);
  const polished =
    typeof json["polished_text"] === "string"
      ? json["polished_text"].trim()
      : "";
  if (!polished) throw new Error("AI returned empty polished text.");
  const level = json["recommendation_level"];
  const confidence = json["confidence"];
  return {
    polished_text: polished,
    recommendation_level:
      level === "A" || level === "B" || level === "C" || level === "D"
        ? level
        : null,
    confidence:
      confidence === "low" || confidence === "medium" || confidence === "high"
        ? confidence
        : "medium",
  };
}
