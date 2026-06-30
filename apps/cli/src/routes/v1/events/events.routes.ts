import { Router } from "express";
import { EventsController } from "./events.controller";

const eventsRouter: Router = Router();
const controller = new EventsController();

eventsRouter.get("/", controller.stream);

export { eventsRouter };
