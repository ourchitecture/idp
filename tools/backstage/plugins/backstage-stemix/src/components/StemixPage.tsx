import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@material-ui/core';
import {
  Content,
  ContentHeader,
  InfoCard,
  Page,
  Progress,
  WarningPanel,
} from '@backstage/core-components';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { StemixClient } from '../client';

type StemixLoadState =
  | { status: 'loading'; message: string }
  | { status: 'ready'; message: string }
  | { status: 'error'; message: string; detail: string };

export const StemixPage = () => {
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const client = useMemo(
    () => new StemixClient(discoveryApi, fetchApi),
    [discoveryApi, fetchApi],
  );
  const [state, setState] = useState<StemixLoadState>({
    status: 'loading',
    message: 'Stemix says [loading...]',
  });

  const loadGreeting = useCallback(async () => {
    setState({
      status: 'loading',
      message: 'Stemix says [loading...]',
    });

    try {
      const greeting = await client.getGreeting();
      setState({
        status: 'ready',
        message: greeting.message,
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown Stemix network error.';

      setState({
        status: 'error',
        message: 'Stemix says [unavailable]',
        detail,
      });
    }
  }, [client]);

  useEffect(() => {
    void loadGreeting();
  }, [loadGreeting]);

  return (
    <Page themeId="tool">
      <Content>
        <ContentHeader title="Stemix" />
        <InfoCard title="Greeting">
          <p>{state.message}</p>
          {state.status === 'loading' ? <Progress /> : null}
          {state.status === 'error' ? (
            <WarningPanel
              severity="error"
              title="Stemix could not reach the backend."
            >
              <p>{state.detail}</p>
              <Button color="primary" variant="contained" onClick={loadGreeting}>
                Retry
              </Button>
            </WarningPanel>
          ) : null}
        </InfoCard>
      </Content>
    </Page>
  );
};
