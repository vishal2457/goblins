import { legacyApi } from "../../core";

export const ticketApi = {
  listByModule: legacyApi.tickets.listByModule,
  remove: legacyApi.tickets.remove,
  comments: legacyApi.tickets.comments,
};
