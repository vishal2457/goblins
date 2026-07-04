import {
  createTicketComment,
  deleteTicket,
  listModuleTickets,
  listTicketComments,
  updateTicket,
} from "../../core";

export const ticketApi = {
  listByModule: listModuleTickets,
  update: updateTicket,
  remove: deleteTicket,
  comments: {
    list: listTicketComments,
    create: createTicketComment,
  },
};
