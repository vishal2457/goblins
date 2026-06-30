import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { AuditController } from "./audit.controller";
import { auditFiltersSchema, auditIdParamSchema, auditPurgeQuerySchema } from "./audit.validation";

const auditRouter: Router = Router();
const auditController = new AuditController();

auditRouter.get("/stats/modules", auditController.getModuleStats);
auditRouter.get("/stats/actions", validate({ query: auditFiltersSchema }), auditController.getActionStats);

auditRouter.get("/entity/:entityName/:entityId", auditController.getAuditsByEntity);

auditRouter.get("/", validate({ query: auditFiltersSchema }), auditController.getAllAudits);
auditRouter.delete("/purge", validate({ query: auditPurgeQuerySchema }), auditController.purgeAuditLogs);

auditRouter.get("/:id", validate({ params: auditIdParamSchema }), auditController.getAuditById);

export { auditRouter };
