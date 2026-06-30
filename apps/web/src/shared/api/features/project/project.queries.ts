import { projectApi } from "./project.api";

export const projectQueries = {
  list: projectApi.list,
  get: projectApi.get,
  create: projectApi.create,
  update: projectApi.update,
  modules: projectApi.modules,
  agents: projectApi.agents,
};
