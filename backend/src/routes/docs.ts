import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const router = Router();

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Management API',
      version: '1.0.0',
      description: 'RESTful API for Library Management System',
    },
    servers: [{ url: 'http://localhost:8000' }],
    paths: {
      '/auth/login': {
        post: {
          summary: 'User login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Login success' } },
        },
      },
      '/books': {
        get: { summary: 'Get books', responses: { '200': { description: 'OK' } } },
        post: { summary: 'Create book', responses: { '201': { description: 'Created' } } },
      },
    },
  },
  apis: [],
});

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
