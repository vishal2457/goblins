import {
  createProject,
  discoverProjectAgents,
  getProject,
  listProjectModules,
  listProjects,
  updateProject,
  updateProjectAgentInstructions,
} from "../../core";

export const projectApi = {
  list: listProjects,
  get: getProject,
  create: createProject,
  update: updateProject,
  modules: {
    list: listProjectModules,
  },
  agents: {
    discover: discoverProjectAgents,
    updateInstructions: updateProjectAgentInstructions,
  },
};
