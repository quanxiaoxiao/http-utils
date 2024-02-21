import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import {
  unzipSync,
  brotliDecompressSync,
} from 'node:zlib';

export default (chunk, encoding) => {
  assert(Buffer.isBuffer(chunk));

  if (chunk.length === 0) {
    return Buffer.from([]);
  }

  if (encoding == null) {
    return chunk;
  }

  if (/^gzip$/i.test(encoding)) {
    return unzipSync(chunk);
  }

  if (/^br$/i.test(encoding)) {
    return brotliDecompressSync(chunk);
  }
  return chunk;
};
