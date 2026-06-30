import {
  createProject,
  createProjectModule,
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
    create: createProjectModule,
  },
  agents: {
    discover: discoverProjectAgents,
    updateInstructions: updateProjectAgentInstructions,
  },
};
