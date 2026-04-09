import React from 'react';
import { Grid, List, ListItem, ListItemText } from '@material-ui/core';
import { Content, Header, Page } from '@backstage/core-components';

export const searchPage = (
  <Page themeId="home">
    <Header title="Search" />
    <Content>
      <Grid container direction="row">
        <Grid item xs={12}>
          <List>
            <ListItem>
              <ListItemText primary="Search functionality will be configured here" />
            </ListItem>
          </List>
        </Grid>
      </Grid>
    </Content>
  </Page>
);
