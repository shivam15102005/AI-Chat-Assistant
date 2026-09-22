import express from 'express';

import cors from 'cors';

import helmet from 'helmet';

import rateLimit from
  'express-rate-limit';

import { env } from './config/env.js';

import {
  connectDatabase,
} from './config/database.js';

import conversationRoutes from
  './routes/conversationRoutes.js';

import {
  errorHandler,
} from './middleware/errorHandler.js';

import {
  notFound,
} from './middleware/notFound.js';

/*
 * Validate environment variables
 * before doing anything else.
 */

const app =
  express();

/*
 * Security headers.
 */

app.use(
  helmet()
);

/*
 * CORS.
 */

app.use(
  cors({
    origin:
      env.CLIENT_ORIGIN,

    methods: [
      'GET',
      'POST',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Accept',
    ],
  })
);

/*
 * Body parsing.
 */

app.use(
  express.json({
    limit: '32kb',
  })
);

/*
 * Rate limiting.
 *
 * This applies to normal API requests.
 * Streaming endpoint requests are also
 * covered.
 */

const apiLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    limit: 100,

    standardHeaders: 'draft-8',

    legacyHeaders: false,

    message: {
      error:
        'Too many requests. Please try again later.',
    },
  });

app.use(
  '/api',
  apiLimiter
);

/*
 * Health endpoint.
 */

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      ok: true,

      service:
        'ai-chat-assistant-server',

      database:
        'connected',
    });
  }
);

/*
 * Conversation API.
 */

app.use(
  '/api/conversations',
  conversationRoutes
);

/*
 * Unknown route.
 */

app.use(notFound);

/*
 * Global error handler.
 */

app.use(errorHandler);

/*
 * Start application.
 */

async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(
  env.PORT,
  '0.0.0.0',
  () => {
    console.log(
      `AI Chat Assistant server running on port ${env.PORT}`
    );
  }
);

    /*
     * Graceful shutdown.
     */

    const shutdown =
      async (signal) => {
        console.log(
          `\n${signal} received. Shutting down...`
        );

        server.close(
          async () => {
            try {
              const mongoose =
                await import(
                  'mongoose'
                );

              await mongoose.default.connection.close();

              console.log(
                'MongoDB connection closed.'
              );

              process.exit(0);
            } catch (error) {
              console.error(
                'Shutdown error:',
                error.message
              );

              process.exit(1);
            }
          }
        );
      };

    process.on(
      'SIGINT',
      () => shutdown('SIGINT')
    );

    process.on(
      'SIGTERM',
      () => shutdown('SIGTERM')
    );
  } catch (error) {
    console.error(
      'Server startup failed:',
      error.message
    );

    process.exit(1);
  }
}

startServer();
