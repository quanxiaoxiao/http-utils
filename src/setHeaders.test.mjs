import assert from 'node:assert';
import test from 'node:test';

import setHeaders from './setHeaders.mjs';

test('setHeaders', () => {
  assert.throws(() => {
    setHeaders({}, {});
  });
  assert.throws(() => {
    setHeaders([], null);
  });
  assert.throws(() => {
    setHeaders([], []);
  });
  assert.deepEqual(setHeaders([], {}), []);
  assert.deepEqual(setHeaders([], { name: 'aa' }), ['name', 'aa']);
  assert.deepEqual(setHeaders(['name', 'cc', 'foo', 'bar'], { name: 'aa' }), ['foo', 'bar', 'name', 'aa']);
  assert.deepEqual(setHeaders(['name', 'cc', 'foo', 'bar', 'name', 'bb'], { name: 'aa' }), ['foo', 'bar', 'name', 'aa']);
  assert.deepEqual(setHeaders(['foo', 'bar'], { name: ['aa'] }), ['foo', 'bar', 'name', 'aa']);
  assert.deepEqual(setHeaders(['foo', 'bar'], { name: ['aa', 'cc'] }), ['foo', 'bar', 'name', 'aa', 'name', 'cc']);
  assert.deepEqual(setHeaders(['foo', 'bar', 'name', 'cc'], { name: null }), ['foo', 'bar']);
  assert.deepEqual(setHeaders(['foo', 'bar', 'Name', 'cc'], { name: 'ee' }), ['foo', 'bar', 'name', 'ee']);
  assert.deepEqual(setHeaders(['foo', 'bar', 'name', 'cc'], { Name: 'ee' }), ['foo', 'bar', 'Name', 'ee']);
  assert.deepEqual(setHeaders(['foo', 'bar', 'Content-length', '66'], { 'content-length': 18 }), ['foo', 'bar', 'content-length', '18']);
  assert.deepEqual(
    setHeaders(['Content-Type', 'text/html'], { 'content-type': 'application/json' }),
    ['content-type', 'application/json'],
  );
  assert.deepEqual(
    setHeaders(['Date', 'Tue, 31 Oct 2023 08:38:15 GMT'], {}),
    ['Date', 'Tue, 31 Oct 2023 08:38:15 GMT'],
  );
  assert.deepEqual(
    setHeaders([], {
      Date: 'Tue, 31 Oct 2023 08:38:15 GMT',
    }),
    ['Date', 'Tue, 31 Oct 2023 08:38:15 GMT'],
  );
});
