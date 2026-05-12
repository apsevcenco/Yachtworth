import { Router, type IRouter } from "express";
import healthRouter from "./health";
import valuationsRouter from "./valuations";
import estimatesRouter from "./estimates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(valuationsRouter);
router.use(estimatesRouter);

export default router;
