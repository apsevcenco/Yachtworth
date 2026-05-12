import { Router, type IRouter } from "express";
import {
  CreateValuationBody,
  CreateValuationResponse,
} from "@workspace/api-zod";
import { runValuation, type ValuationRequest } from "../lib/valuation";

const router: IRouter = Router();

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

router.post("/valuations", async (req, res): Promise<void> => {
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
    res.json(CreateValuationResponse.parse(result));
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
