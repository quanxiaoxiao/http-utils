import assert from 'node:assert';
import test from 'node:test';
import {
  brotliCompressSync,
  gzipSync,
} from 'node:zlib';

import encodeContentEncoding from './encodeContentEncoding.mjs';

test('encodeContentEncoding', () => {
  assert(
    encodeContentEncoding(Buffer.from('xxx')).buf.equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzz')
      .buf
      .equals(Buffer.from('xxx')),
  );
  const buf = Buffer.alloc(1028).fill('xxx');
  assert(
    encodeContentEncoding(buf, 'gzip')
      .buf
      .equals(gzipSync(buf)),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzip')
      .buf
      .equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'br')
      .buf
      .equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(buf, 'br, gzip')
      .buf
      .equals(brotliCompressSync(buf)),
  );
  assert(
    encodeContentEncoding(buf, 'br,gzip')
      .buf
      .equals(brotliCompressSync(buf)),
  );
  assert(
    encodeContentEncoding(buf, 'gzip, br')
      .buf
      .equals(brotliCompressSync(buf)),
  );
  assert(
    encodeContentEncoding(buf, 'gzipp, brr')
      .buf
      .equals(buf),
  );
  assert(
    encodeContentEncoding(buf, 'brs, gzip')
      .buf
      .equals(gzipSync(buf)),
  );
});
