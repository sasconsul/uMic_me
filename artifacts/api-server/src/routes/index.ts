import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import eventsRouter from "./events";
import attendeesRouter from "./attendees";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(storageRouter);
router.use(eventsRouter);
router.use(attendeesRouter);

export default router;
