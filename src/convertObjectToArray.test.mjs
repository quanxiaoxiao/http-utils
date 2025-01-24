import assert from 'node:assert';
import test from 'node:test';

import convertObjectToArray from './convertObjectToArray.mjs';

test('convertObjectToArray', () => {
  assert.deepEqual(convertObjectToArray([]), []);
  assert.deepEqual(convertObjectToArray(null), []);
  assert.deepEqual(convertObjectToArray(), []);
  assert.deepEqual(convertObjectToArray('aaa'), []);
  assert.deepEqual(
    convertObjectToArray({ name: 'quan' }),
    ['name', 'quan'],
  );
  assert.deepEqual(
    convertObjectToArray({ name: '你好' }),
    ['name', '你好'],
  );
  assert.deepEqual(
    convertObjectToArray({ name: 'quan', bar: [1, 2, 3] }),
    ['name', 'quan', 'bar', '1', 'bar', '2', 'bar', '3'],
  );
  assert.deepEqual(
    convertObjectToArray({ name: 'quan', age: 33 }),
    ['name', 'quan', 'age', '33'],
  );
  assert.deepEqual(
    convertObjectToArray({ name: 'quan', age: null }),
    ['name', 'quan'],
  );
  assert.deepEqual(
    convertObjectToArray({ name: 'quan', foo: true, bar: false }),
    ['name', 'quan', 'foo', 'true', 'bar', 'false'],
  );
});
