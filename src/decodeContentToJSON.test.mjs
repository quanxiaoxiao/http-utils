import assert from 'node:assert';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import qs from 'node:querystring';
import decodeContentToJSON from './decodeContentToJSON.mjs';

test('decodeContentToJSON', () => {
  assert.throws(() => {
    decodeContentToJSON(Buffer.from(JSON.stringify({})));
  });
  assert.equal(
    decodeContentToJSON(Buffer.from('asdfw'), {}),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(JSON.stringify({ name: 'aaa' })), { 'content-type': 'application/json' }),
    { name: 'aaa' },
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(qs.stringify({ name: 'aaa' })), { 'content-type': 'application/json' }),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(qs.stringify({ name: 'aaa' })), { 'content-type': 'application/x-www-form-urlencoded' }),
    { name: 'aaa' },
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(qs.stringify({ name: 'aaa' })), { 'content-type': 'application/json' }),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(gzipSync(Buffer.from(JSON.stringify({ name: 'aaa' }))), { 'content-type': 'application/json' }),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(gzipSync(Buffer.from(JSON.stringify({ name: 'aaa' }))), { 'content-type': 'application/json', 'content-encoding': 'gzip' }),
    { name: 'aaa' },
  );
});
