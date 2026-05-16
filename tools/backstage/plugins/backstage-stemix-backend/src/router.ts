import express from 'express';
import type { LoggerService } from '@backstage/backend-plugin-api';
import { createStemixGreeting } from './service';

export const createStemixRouter = (logger: LoggerService) => {
  const router = express.Router();

  router.get('/greeting', (_request, response) => {
    const greeting = createStemixGreeting();
    logger.info(`Stemix served ${greeting.partOfDay} greeting.`);
    response.json(greeting);
  });

  return router;
};
