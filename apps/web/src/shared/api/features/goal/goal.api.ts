import { legacyApi } from "../../core";

export const goalApi = {
  list: legacyApi.goals.list,
  get: legacyApi.goals.get,
  create: legacyApi.goals.create,
  update: legacyApi.goals.update,
  startPlanning: legacyApi.goals.startPlanning,
  startExecution: legacyApi.goals.startExecution,
  startRetrospective: legacyApi.goals.startRetrospective,
  completeRetrospective: legacyApi.goals.completeRetrospective,
  pause: legacyApi.goals.pause,
  resume: legacyApi.goals.resume,
  cancel: legacyApi.goals.cancel,
  reset: legacyApi.goals.reset,
  tickets: legacyApi.goals.tickets,
};
