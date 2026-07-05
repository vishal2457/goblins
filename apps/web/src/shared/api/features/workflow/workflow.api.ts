import {
  applyWorkflowPreset,
  getWorkflow,
  listWorkflowPresets,
  resetWorkflow,
  updateWorkflow,
} from "../../core";

export const workflowApi = {
  get: getWorkflow,
  update: updateWorkflow,
  reset: resetWorkflow,
  presets: listWorkflowPresets,
  applyPreset: applyWorkflowPreset,
};
