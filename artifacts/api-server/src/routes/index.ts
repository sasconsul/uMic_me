import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import eventsRouter from "./events";
import attendeesRouter from "./attendees";
import feedbackRouter from "./feedback";
import pollSetsRouter from "./pollSets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(eventsRouter);
router.use(attendeesRouter);
router.use(feedbackRouter);
router.use(pollSetsRouter);

export default router;
