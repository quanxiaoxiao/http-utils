import assert from 'node:assert';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import {
  gzipSync,
  brotliCompressSync,
} from 'node:zlib';
import decodeContentEncoding from './decodeContentEncoding.mjs';

test('decodeContentEncoding', () => {
  assert(Buffer.from([]).equals(decodeContentEncoding()));
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
      'xxxx',
    )));
});
