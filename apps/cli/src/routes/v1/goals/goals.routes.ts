import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { GoalsController } from "./goals.controller";
import {
  analyseRetrospectiveSchema,
  approveImprovementSchema,
  createGoalSchema,
  goalImprovementParamSchema,
  goalIdParamSchema,
  goalListQuerySchema,
  rejectImprovementSchema,
  startRetrospectiveSchema,
  updateGoalSchema,
} from "./goals.validation";

const goalsRouter: Router = Router();
const controller = new GoalsController();

goalsRouter.get(
  "/",
  validate({ query: goalListQuerySchema }),
  controller.findAll,
);
goalsRouter.get(
  "/:id/goal-tickets-snapshot",
  validate({ params: goalIdParamSchema }),
  controller.goalTicketsSnapshot,
);
goalsRouter.get(
  "/:id/overview",
  validate({ params: goalIdParamSchema }),
  controller.goalOverview,
);
goalsRouter.get(
  "/:id/improvements",
  validate({ params: goalIdParamSchema }),
  controller.listImprovements,
);
goalsRouter.post(
  "/:id/retrospective/analyse",
  validate({ params: goalIdParamSchema, body: analyseRetrospectiveSchema }),
  controller.analyseRetrospective,
);
goalsRouter.post(
  "/:id/improvements/:proposalId/approve",
  validate({
    params: goalImprovementParamSchema,
    body: approveImprovementSchema,
  }),
  controller.approveImprovement,
);
goalsRouter.post(
  "/:id/improvements/:proposalId/reject",
  validate({
    params: goalImprovementParamSchema,
    body: rejectImprovementSchema,
  }),
  controller.rejectImprovement,
);
goalsRouter.post(
  "/:id/improvements/:proposalId/apply",
  validate({ params: goalImprovementParamSchema }),
  controller.applyImprovement,
);
goalsRouter.get(
  "/:id",
  validate({ params: goalIdParamSchema }),
  controller.findById,
);
goalsRouter.post("/", validate({ body: createGoalSchema }), controller.create);
goalsRouter.post(
  "/:id/planning/start",
  validate({ params: goalIdParamSchema }),
  controller.startPlanning,
);
goalsRouter.post(
  "/:id/planning/complete",
  validate({ params: goalIdParamSchema }),
  controller.completePlanning,
);
goalsRouter.post(
  "/:id/execution/start",
  validate({ params: goalIdParamSchema }),
  controller.startExecution,
);
goalsRouter.post(
  "/:id/retrospective/start",
  validate({ params: goalIdParamSchema, body: startRetrospectiveSchema }),
  controller.startRetrospective,
);
goalsRouter.post(
  "/:id/retrospective/complete",
  validate({ params: goalIdParamSchema }),
  controller.completeRetrospective,
);
goalsRouter.put(
  "/:id",
  validate({ params: goalIdParamSchema, body: updateGoalSchema }),
  controller.update,
);
goalsRouter.patch(
  "/:id",
  validate({ params: goalIdParamSchema, body: updateGoalSchema }),
  controller.update,
);
goalsRouter.delete(
  "/:id",
  validate({ params: goalIdParamSchema }),
  controller.delete,
);

export { goalsRouter };
