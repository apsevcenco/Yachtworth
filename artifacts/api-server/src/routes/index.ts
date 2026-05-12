import { Router, type IRouter } from "express";
import healthRouter from "./health";
import valuationsRouter from "./valuations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(valuationsRouter);

export default router;
