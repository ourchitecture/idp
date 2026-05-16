import test from 'node:test';
import assert from 'node:assert/strict';
import { StemixClient } from './client';

test('StemixClient returns a parsed greeting payload', async () => {
  const client = new StemixClient(
    {
      getBaseUrl: async pluginId => {
        assert.equal(pluginId, 'stemix');
        return 'http://stemix.test/api/stemix';
      },
    },
    {
      fetch: async input => {
        assert.equal(input, 'http://stemix.test/api/stemix/greeting');
        return new Response(
          JSON.stringify({
            message: 'Stemix says good morning.',
            partOfDay: 'morning',
            generatedAt: '2026-05-16T12:00:00.000Z',
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      },
    },
  );

  const greeting = await client.getGreeting();

  assert.equal(greeting.message, 'Stemix says good morning.');
  assert.equal(greeting.partOfDay, 'morning');
});

test('StemixClient rejects non-OK responses', async () => {
  const client = new StemixClient(
    {
      getBaseUrl: async () => 'http://stemix.test/api/stemix',
    },
    {
      fetch: async () => new Response('nope', { status: 503 }),
    },
  );

  await assert.rejects(
    () => client.getGreeting(),
    /Stemix backend request failed with 503\./,
  );
});
