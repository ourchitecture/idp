import type { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import type { StemixGreetingResponse } from './types';

const isStemixGreetingResponse = (
  value: unknown,
): value is StemixGreetingResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.message === 'string' &&
    typeof candidate.partOfDay === 'string' &&
    typeof candidate.generatedAt === 'string'
  );
};

export class StemixClient {
  constructor(
    private readonly discoveryApi: DiscoveryApi,
    private readonly fetchApi: FetchApi,
  ) {}

  async getGreeting(): Promise<StemixGreetingResponse> {
    const baseUrl = await this.discoveryApi.getBaseUrl('stemix');
    const response = await this.fetchApi.fetch(`${baseUrl}/greeting`);

    if (!response.ok) {
      throw new Error(`Stemix backend request failed with ${response.status}.`);
    }

    const payload = await response.json();

    if (!isStemixGreetingResponse(payload)) {
      throw new Error('Stemix backend returned an invalid greeting payload.');
    }

    return payload;
  }
}
