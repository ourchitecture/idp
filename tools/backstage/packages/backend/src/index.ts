import { createBackend } from '@backstage/backend-defaults';
import { createServiceFactory } from '@backstage/backend-plugin-api';
import { metricsServiceRef } from '@backstage/backend-plugin-api/alpha';
import type {
  MetricsService,
  MetricsServiceObservableCallback,
} from '@backstage/backend-plugin-api/alpha';

const backend = createBackend();

// Some current Backstage plugins require the alpha metrics service even when
// metrics export is not configured. Provide a no-op implementation for dev use.
const createObservable = () => {
  const callbacks = new Set<MetricsServiceObservableCallback>();

  return {
    addCallback(callback: MetricsServiceObservableCallback) {
      callbacks.add(callback);
    },
    removeCallback(callback: MetricsServiceObservableCallback) {
      callbacks.delete(callback);
    },
  };
};

backend.add(
  createServiceFactory({
    service: metricsServiceRef,
    deps: {},
    factory: async (): Promise<MetricsService> => ({
      createCounter: () => ({ add: () => {} }),
      createUpDownCounter: () => ({ add: () => {} }),
      createHistogram: () => ({ record: () => {} }),
      createGauge: () => ({ record: () => {} }),
      createObservableCounter: createObservable,
      createObservableUpDownCounter: createObservable,
      createObservableGauge: createObservable,
    }),
  }),
);

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(import('@backstage/plugin-permission-backend-module-allow-all-policy'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-search-backend'));
backend.add(import('@ourchitecture/backstage-plugin-stemix/backend'));
backend.add(import('@backstage/plugin-techdocs-backend'));

backend.start();
