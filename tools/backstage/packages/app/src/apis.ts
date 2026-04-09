import { createApiFactory, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef, CatalogClient } from '@backstage/plugin-catalog-react';
import { scaffolderApiRef, ScaffolderClient } from '@backstage/plugin-scaffolder-react';
import { techDocsApiRef, TechDocsClient } from '@backstage/plugin-techdocs-react';
import { searchApiRef, SearchClient } from '@backstage/plugin-search-react';

export const apis = [
  createApiFactory({
    api: catalogApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new CatalogClient({ discoveryApi, fetchApi }),
  }),
  createApiFactory({
    api: scaffolderApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new ScaffolderClient({ discoveryApi, fetchApi }),
  }),
  createApiFactory({
    api: techDocsApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new TechDocsClient({ discoveryApi, fetchApi }),
  }),
  createApiFactory({
    api: searchApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new SearchClient({ discoveryApi, fetchApi }),
  }),
];
