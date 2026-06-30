import { legacyApi } from "../../core";

export const projectApi = {
  list: legacyApi.projects.list,
  get: legacyApi.projects.get,
  create: legacyApi.projects.create,
  update: legacyApi.projects.update,
  modules: legacyApi.projects.modules,
  agents: legacyApi.projects.agents,
};
