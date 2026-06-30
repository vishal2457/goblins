import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { ModulesController } from "./modules.controller";
import { moduleIdParamSchema } from "./modules.validation";

const modulesRouter: Router = Router();
const controller = new ModulesController();

modulesRouter.get(
  "/:id/tickets",
  validate({ params: moduleIdParamSchema }),
  controller.findTickets,
);

export { modulesRouter };
