import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { WorkflowController } from "./workflow.controller";
import { updateWorkflowSchema } from "./workflow.validation";

const workflowRouter: Router = Router();
const controller = new WorkflowController();

workflowRouter.get("/", controller.get);
workflowRouter.put(
  "/",
  validate({ body: updateWorkflowSchema }),
  controller.update,
);

export { workflowRouter };
