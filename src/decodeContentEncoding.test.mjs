import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import test from 'node:test';
import {
  brotliCompressSync,
  gzipSync,
} from 'node:zlib';

import decodeContentEncoding from './decodeContentEncoding.mjs';

test('decodeContentEncoding', () => {
  assert(Buffer.from([]).equals(decodeContentEncoding(Buffer.from([]))));
  assert.throws(() => {
    decodeContentEncoding();
  });
  assert.throws(() => {
    decodeContentEncoding('aaa');
  });
  assert(Buffer.from('aaa').equals(decodeContentEncoding(Buffer.from('aaa'))));

  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      gzipSync(Buffer.from('aaa')),
      'gzip',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      gzipSync(Buffer.from('aaa')),
      'GZIP',
    )));
  assert(!Buffer.from('aaa')
    .equals(decodeContentEncoding(
      gzipSync(Buffer.from('aaa')),
    )));
  assert.throws(() => {
    decodeContentEncoding(gzipSync(Buffer.from('aaa')), 'br');
  });
  assert.throws(() => {
    decodeContentEncoding(brotliCompressSync(Buffer.from('aaa')), 'gzip');
  });
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      brotliCompressSync(Buffer.from('aaa')),
      'br',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'br, gzip',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'gzip, br',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'xxxx',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'gzips',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'brs',
    )));
});
