import { Router } from "express";
import { projectsRouter } from "./projects/projects.routes";
import { auditRouter } from "./audit/audit.routes";
import { stepsRouter } from "./steps/steps.routes";
import { goalsRouter } from "./goals/goals.routes";
import { modulesRouter } from "./modules/modules.routes";
import { ticketsRouter } from "./tickets/tickets.routes";
import { eventsRouter } from "./events/events.routes";
import { workflowRouter } from "./workflow/workflow.routes";

const routerv1: Router = Router();

routerv1.use("/projects", projectsRouter);
routerv1.use("/audit-logs", auditRouter);
routerv1.use("/steps", stepsRouter);
routerv1.use("/goals", goalsRouter);
routerv1.use("/modules", modulesRouter);
routerv1.use("/tickets", ticketsRouter);
routerv1.use("/events", eventsRouter);
routerv1.use("/workflow", workflowRouter);

export default routerv1;
