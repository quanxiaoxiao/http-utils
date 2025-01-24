import assert from 'node:assert';
import test from 'node:test';

import parseContentRange from './parseContentRange.mjs';

test('parseContentRange', () => {
  assert.throws(() => {
    parseContentRange('bytes=1.1-', 20);
  });
  assert.throws(() => {
    parseContentRange('bytes=-1-', 20);
  });
  assert.throws(() => {
    parseContentRange('bytes=21-', 20);
  });
  assert.throws(() => {
    parseContentRange('bytes=9', 20);
  });
  assert.throws(() => {
    parseContentRange('bytes=-21', 20);
  });
  assert.throws(() => {
    parseContentRange('bytes=-20', 20);
  });
  assert.deepEqual(
    parseContentRange('bytes=5-8', 20),
    [5, 8],
  );
  assert.deepEqual(
    parseContentRange('bytes=5-', 20),
    [5, 19],
  );
  assert.deepEqual(
    parseContentRange('bytes=0-', 0),
    [0, 0],
  );
  assert.deepEqual(
    parseContentRange('bytes=-8', 20),
    [11, 19],
  );
  assert.deepEqual(
    parseContentRange('bytes=-19', 20),
    [0, 19],
  );
  assert.deepEqual(
    parseContentRange('bytes =5-8', 20),
    [5, 8],
  );
  assert.deepEqual(
    parseContentRange('bytes= 5-8', 20),
    [5, 8],
  );
  assert.deepEqual(
    parseContentRange('bytes= 5 - 8', 20),
    [5, 8],
  );
});
