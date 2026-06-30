import swaggerJsdoc from "swagger-jsdoc";
import { auditPaths, auditComponents } from "../routes/v1/audit/audit.doc";
import { apiComponents, apiPaths } from "./api-doc";

const openapi = {
  openapi: "3.0.0",
  info: {
    title: "Goblins API",
    version: "1.0.0",
    description:
      "Projects, goals, phases, tickets, ticket comments, and audit log APIs.",
  },
  servers: [
    {
      url: "http://localhost:3001/api/v1",
      description: "Development server",
    },
  ],
  paths: {
    ...apiPaths,
    ...auditPaths,
  },
  components: {
    schemas: {
      ...apiComponents.schemas,
      ...auditComponents.schemas,
    },
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  definition: openapi,
  apis: ["./src/routes/v1/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
