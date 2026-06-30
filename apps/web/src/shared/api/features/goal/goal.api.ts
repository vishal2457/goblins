import {
  cancelGoal,
  completeRetrospectiveGoal,
  createGoal,
  getGoal,
  listGoalTickets,
  listGoals,
  pauseGoal,
  resetGoal,
  resumeGoal,
  startExecutionGoal,
  startPlanningGoal,
  startRetrospectiveGoal,
  updateGoal,
} from "../../core";

export const goalApi = {
  list: listGoals,
  get: getGoal,
  create: createGoal,
  update: updateGoal,
  startPlanning: startPlanningGoal,
  startExecution: startExecutionGoal,
  startRetrospective: startRetrospectiveGoal,
  completeRetrospective: completeRetrospectiveGoal,
  pause: pauseGoal,
  resume: resumeGoal,
  cancel: cancelGoal,
  reset: resetGoal,
  tickets: {
    list: listGoalTickets,
  },
};
