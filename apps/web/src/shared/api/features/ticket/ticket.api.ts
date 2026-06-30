import {
  deleteTicket,
  listModuleTickets,
  listTicketComments,
} from "../../core";

export const ticketApi = {
  listByModule: listModuleTickets,
  remove: deleteTicket,
  comments: {
    list: listTicketComments,
  },
};
