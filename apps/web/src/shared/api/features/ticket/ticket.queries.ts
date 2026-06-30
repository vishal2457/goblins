import { ticketApi } from "./ticket.api";

export const ticketQueries = {
  listByModule: ticketApi.listByModule,
  remove: ticketApi.remove,
  comments: ticketApi.comments,
};
