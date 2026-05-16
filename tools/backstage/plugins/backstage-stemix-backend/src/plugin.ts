import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createStemixRouter } from './router';

export const stemixBackendPlugin = createBackendPlugin({
  pluginId: 'stemix',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({ httpRouter, logger }) {
        httpRouter.addAuthPolicy({
          path: '/greeting',
          allow: 'unauthenticated',
        });
        httpRouter.use(createStemixRouter(logger));
      },
    });
  },
});
