import { Router, type IRouter } from "express";
import healthRouter from "./health";
import valuationsRouter from "./valuations";
import estimatesRouter from "./estimates";
import yachtsRouter from "./yachts";
import roiRouter from "./roi";

const router: IRouter = Router();

router.use(healthRouter);
router.use(valuationsRouter);
router.use(estimatesRouter);
router.use(yachtsRouter);
router.use(roiRouter);

export default router;
