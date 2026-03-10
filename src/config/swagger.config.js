const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Imaniya Kavalai API Documentation',
            version: '1.0.0',
            description: 'Professional Imaniya Kavalai Backend API with Multi-tenancy and RBAC',
        },
        servers: [
            {
                url: process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'], // files containing annotations
};

const specs = swaggerJsdoc(options);
module.exports = specs;
