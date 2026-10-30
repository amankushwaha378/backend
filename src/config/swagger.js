import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Blog API",
      version: "1.0.0",
      description:
        "REST API for users, authentication, posts, comments, and likes.",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "connect.sid",
          description:
            "Session-cookie authentication. Log in first to establish a session.",
        },
      },
    },
  },

  // Scan route files for OpenAPI documentation comments.
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
