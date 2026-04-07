import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// App
backend.add(import('@backstage/plugin-app-backend/alpha'));

// Auth
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));

// Catalog
backend.add(import('@backstage/plugin-catalog-backend/alpha'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// Permission
backend.add(import('@backstage/plugin-permission-backend/alpha'));
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);

// Proxy
backend.add(import('@backstage/plugin-proxy-backend/alpha'));

// Scaffolder
backend.add(import('@backstage/plugin-scaffolder-backend/alpha'));

// Search
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs/alpha'));

// TechDocs
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));

backend.start();
