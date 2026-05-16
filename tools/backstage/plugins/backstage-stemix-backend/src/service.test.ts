import test from 'node:test';
import assert from 'node:assert/strict';
import { createStemixGreeting, getStemixPartOfDay } from './service';

test('getStemixPartOfDay returns morning before noon', () => {
  assert.equal(getStemixPartOfDay(new Date(2026, 4, 16, 9, 0, 0)), 'morning');
});

test('getStemixPartOfDay returns afternoon before 18:00', () => {
  assert.equal(
    getStemixPartOfDay(new Date(2026, 4, 16, 15, 0, 0)),
    'afternoon',
  );
});

test('getStemixPartOfDay returns evening at or after 18:00', () => {
  assert.equal(getStemixPartOfDay(new Date(2026, 4, 16, 20, 0, 0)), 'evening');
});

test('createStemixGreeting formats the message', () => {
  const date = new Date(2026, 4, 16, 15, 0, 0);
  const greeting = createStemixGreeting(date);

  assert.equal(greeting.message, 'Stemix says good afternoon.');
  assert.equal(greeting.partOfDay, 'afternoon');
  assert.equal(greeting.generatedAt, date.toISOString());
});
