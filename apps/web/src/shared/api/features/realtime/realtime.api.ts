import { API_PATHS } from "goblins-shared-constants";

export const realtimeApi = {
  eventsUrl: () => {
    const base = import.meta.env.VITE_AGENT_SERVER_URL || "";
    return `${base}${API_PATHS.events}`;
  },
};
