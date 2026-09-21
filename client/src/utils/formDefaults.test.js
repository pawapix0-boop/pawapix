import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLoggedInEmail } from './formDefaults.js';

test('uses the logged in email when the form email is empty', () => {
  assert.equal(applyLoggedInEmail('', 'user@example.com'), 'user@example.com');
});

test('keeps any email already entered in the form', () => {
  assert.equal(applyLoggedInEmail('custom@example.com', 'user@example.com'), 'custom@example.com');
});
