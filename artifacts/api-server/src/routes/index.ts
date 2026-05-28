import { Router, type IRouter } from "express";
import healthRouter from "./health";
import valuationsRouter from "./valuations";
import estimatesRouter from "./estimates";
import yachtsRouter from "./yachts";
import roiRouter from "./roi";
import costEstimatesRouter from "./costEstimates";
import chartersRouter from "./charters";
import clientsRouter from "./clients";
import listingsRouter from "./listings";
import proposalsRouter from "./proposals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(valuationsRouter);
router.use(estimatesRouter);
router.use(yachtsRouter);
router.use(roiRouter);
router.use(costEstimatesRouter);
router.use(chartersRouter);
router.use(clientsRouter);
router.use(listingsRouter);
router.use(proposalsRouter);

export default router;
