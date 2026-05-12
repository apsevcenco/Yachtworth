import { Router, type IRouter } from "express";
import { CreateValuationBody, CreateValuationResponse } from "@workspace/api-zod";
import { runValuation } from "../lib/valuation";

const router: IRouter = Router();

router.post("/valuations", async (req, res): Promise<void> => {
  const parsed = CreateValuationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid valuation input");
    res.status(400).json({ error: parsed.error.message });
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
