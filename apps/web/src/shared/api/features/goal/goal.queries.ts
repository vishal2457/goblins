import { goalApi } from "./goal.api";

export const goalQueries = {
  list: goalApi.list,
  get: goalApi.get,
  create: goalApi.create,
  update: goalApi.update,
  startPlanning: goalApi.startPlanning,
  startExecution: goalApi.startExecution,
  startRetrospective: goalApi.startRetrospective,
  completeRetrospective: goalApi.completeRetrospective,
  pause: goalApi.pause,
  resume: goalApi.resume,
  cancel: goalApi.cancel,
  reset: goalApi.reset,
  tickets: goalApi.tickets,
};
