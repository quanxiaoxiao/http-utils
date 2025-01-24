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
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzip')
      .buf
      .equals(gzipSync(Buffer.from('xxx'))),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'br, gzip')
      .buf
      .equals(brotliCompressSync(Buffer.from('xxx'))),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'br,gzip')
      .buf
      .equals(brotliCompressSync(Buffer.from('xxx'))),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzip, br')
      .buf
      .equals(gzipSync(Buffer.from('xxx'))),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzipp, brr')
      .buf
      .equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'brs, gzip')
      .buf
      .equals(gzipSync(Buffer.from('xxx'))),
  );
});
