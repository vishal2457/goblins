import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { ProjectsController } from "./projects.controller";
import { ModulesController } from "../modules/modules.controller";
import {
  createProjectSchema,
  projectIdParamSchema,
  projectListQuerySchema,
  updateDiscoveredAgentInstructionsSchema,
  updateProjectSchema,
} from "./projects.validation";

const projectsRouter: Router = Router();
const controller = new ProjectsController();
const modulesController = new ModulesController();

projectsRouter.get(
  "/",
  validate({ query: projectListQuerySchema }),
  controller.findAll,
);
projectsRouter.post(
  "/",
  validate({ body: createProjectSchema }),
  controller.create,
);
projectsRouter.get(
  "/:id/modules",
  validate({ params: projectIdParamSchema }),
  modulesController.findByProject,
);
projectsRouter.get(
  "/:id/agents",
  validate({ params: projectIdParamSchema }),
  controller.discoverAgents,
);
projectsRouter.put(
  "/:id/agents/instructions",
  validate({
    params: projectIdParamSchema,
    body: updateDiscoveredAgentInstructionsSchema,
  }),
  controller.updateDiscoveredAgentInstructions,
);
projectsRouter.get(
  "/:id",
  validate({ params: projectIdParamSchema }),
  controller.findById,
);
projectsRouter.put(
  "/:id",
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  controller.update,
);
projectsRouter.patch(
  "/:id",
  validate({ params: projectIdParamSchema, body: updateProjectSchema }),
  controller.update,
);
projectsRouter.delete(
  "/:id",
  validate({ params: projectIdParamSchema }),
  controller.delete,
);
export { projectsRouter };
