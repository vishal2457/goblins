import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { WorkflowController } from "./workflow.controller";
import {
  updateWorkflowSchema,
  workflowPresetIdParamSchema,
} from "./workflow.validation";

const workflowRouter: Router = Router();
const controller = new WorkflowController();

workflowRouter.get("/", controller.get);
workflowRouter.put(
  "/",
  validate({ body: updateWorkflowSchema }),
  controller.update,
);
workflowRouter.post("/reset", controller.reset);
workflowRouter.get("/presets", controller.presets);
workflowRouter.post(
  "/presets/:id",
  validate({ params: workflowPresetIdParamSchema }),
  controller.applyPreset,
);

export { workflowRouter };
