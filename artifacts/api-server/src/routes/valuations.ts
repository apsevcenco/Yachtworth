import { Router, type IRouter } from "express";
import {
  CreateValuationBody,
  CreateValuationResponse,
} from "@workspace/api-zod";
import { runValuation, type ValuationRequest } from "../lib/valuation";
import { ESTIMATES_TABLE, getSupabase } from "../lib/supabase";
import { softClerkAuth } from "../middlewares/clerkAuth";

const router: IRouter = Router();

const TYPE_LABELS: Record<string, string> = {
  motor_yacht: "Motor Yacht",
  sailing_yacht: "Sailing Yacht",
  catamaran: "Catamaran",
  superyacht: "Superyacht",
};

function buildYachtLabel(req: ValuationRequest): string {
  const parts = [req.builder, req.model, req.year_built ? String(req.year_built) : null]
    .filter((s): s is string => Boolean(s && s.trim()));
  if (parts.length) return parts.join(" ");
  return TYPE_LABELS[req.type] ?? req.type;
}

type Body = ValuationRequest;

const REGIONS_REQUIRING_VAT = new Set([
  "mediterranean",
  "northern_europe",
  "global",
]);

function validateBypassRules(d: Body): string | null {
  if (
    REGIONS_REQUIRING_VAT.has(d.sale_region) &&
    (d.vat_status === undefined || d.vat_status === null)
  ) {
    return "vat_status is required for this sale region";
  }
  if (d.bypass_required) return null;

  // Strict mode — enforce all "*" fields from the spec.
  if (d.mode === "builder") {
    if (!d.builder?.trim()) return "builder is required in builder mode";
    if (!d.model?.trim()) return "model is required in builder mode";
  }
  if (!d.configuration?.trim()) return "configuration is required";
  if (!d.condition) return "condition is required";
  if (d.beam_meters == null) return "beam_meters is required";
  if (d.draft_meters == null) return "draft_meters is required";
  if (!d.engine_maker?.trim()) return "engine_maker is required";
  if (!d.engine_config) return "engine_config is required";
  if (d.engine_count == null) return "engine_count is required";
  if (d.horse_power == null) return "horse_power is required";
  if (d.cabins == null) return "cabins is required";
  if (d.heads == null) return "heads is required";
  if (d.crew == null) return "crew is required";
  return null;
}

router.post("/valuations", softClerkAuth(), async (req, res): Promise<void> => {
  const parsed = CreateValuationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid valuation input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ruleError = validateBypassRules(parsed.data);
  if (ruleError) {
    req.log.warn({ ruleError }, "Valuation bypass rule failed");
    res.status(400).json({ error: ruleError });
    return;
  }

  try {
    const result = await runValuation(parsed.data, req.log);

    let savedId: string | null = null;
    if (req.userId) {
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb
          .from(ESTIMATES_TABLE)
          .insert({
            clerk_user_id: req.userId,
            yacht_label: buildYachtLabel(parsed.data),
            yacht_type: parsed.data.type,
            length_meters: parsed.data.length_meters,
            estimated_price_eur: result.estimated_price_eur,
            currency: result.currency,
            request: parsed.data,
            result,
          })
          .select("id")
          .single();
        if (error) {
          req.log.warn(
            { err: error.message },
            "Persist estimate failed — returning result anyway",
          );
        } else {
          savedId = data.id as string;
        }
      }
    }

    res.json(CreateValuationResponse.parse({ ...result, id: savedId }));
  } catch (err) {
    req.log.error(
      { err: err instanceof Error ? err.message : String(err) },
      "Valuation failed",
    );
    res.status(500).json({
      error: err instanceof Error ? err.message : "Valuation failed",
    });
  }
});

export default router;
