import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { StepsController } from "./steps.controller";
import {
  createStepSchema,
  stepIdParamSchema,
  stepListQuerySchema,
  updateStepSchema,
} from "./steps.validation";

const stepsRouter: Router = Router();
const controller = new StepsController();

stepsRouter.get("/", validate({ query: stepListQuerySchema }), controller.findAll);
stepsRouter.get("/:id", validate({ params: stepIdParamSchema }), controller.findById);
stepsRouter.post("/", validate({ body: createStepSchema }), controller.create);
stepsRouter.put("/:id", validate({ params: stepIdParamSchema, body: updateStepSchema }), controller.update);
stepsRouter.patch("/:id", validate({ params: stepIdParamSchema, body: updateStepSchema }), controller.update);
stepsRouter.delete("/:id", validate({ params: stepIdParamSchema }), controller.delete);

export { stepsRouter };
