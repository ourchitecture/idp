import React from 'react';
import { EntitySwitch, isKind } from '@backstage/plugin-catalog';
import {
  EntityAboutCard,
  EntityLinksCard,
  EntityLayout,
} from '@backstage/plugin-catalog';
import { Grid } from '@material-ui/core';

const defaultEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityLinksCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);

export const entityPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isKind('component')}>
      {defaultEntityPage}
    </EntitySwitch.Case>
    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);
