import assert from 'node:assert';
import test from 'node:test';
import isHttpStream from './isHttpStream.mjs';

test('isHttpStream', () => {
  assert.throws(() => {
    isHttpStream([]);
  });
  assert.equal(isHttpStream({}), true);
  assert.equal(isHttpStream({ name: 'quan' }), true);
  assert.equal(isHttpStream({ 'content-length': 0 }), false);
  assert.equal(isHttpStream({ 'content-length': null }), false);
  assert.equal(isHttpStream({ 'transfer-encoding': 'chunked' }), false);
});
