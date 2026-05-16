import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const stemixPlugin = createPlugin({
  id: 'stemix',
  routes: {
    root: rootRouteRef,
  },
});

export const StemixPage = stemixPlugin.provide(
  createRoutableExtension({
    name: 'StemixPage',
    component: () =>
      import('./components/StemixPage').then(module => module.StemixPage),
    mountPoint: rootRouteRef,
  }),
);
