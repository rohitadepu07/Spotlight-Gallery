import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import photosRouter from "./photos";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/events", eventsRouter);
router.use("/photos", photosRouter);

export default router;
