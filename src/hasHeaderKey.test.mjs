import assert from 'node:assert';
import test from 'node:test';

import hasHeaderKey from './hasHeaderKey.mjs';

test('hasHeaderKey', () => {
  assert(hasHeaderKey({ 'Content-Type': 'application/json' })('content-type'));
  assert(hasHeaderKey({ 'Content-Type': 'application/json', 'x-auth': 'quan' })('content-type'));
  assert(hasHeaderKey({ 'content-Type': 'application/json' })('content-type'));
  assert(hasHeaderKey({ 'Content-type': 'application/json' })('content-type'));
  assert(!hasHeaderKey({ 'content-types': 'application/json' })('content-type'));
});
