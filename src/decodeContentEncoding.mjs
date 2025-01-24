import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import {
  brotliDecompressSync,
  unzipSync,
} from 'node:zlib';

export default (chunk, contentEncoding) => {
  assert(Buffer.isBuffer(chunk));

  if (chunk.length === 0) {
    return Buffer.from([]);
  }

  if (!contentEncoding) {
    return chunk;
  }

  if (/^gzip$/i.test(contentEncoding)) {
    return unzipSync(chunk);
  }
  if (/^br$/i.test(contentEncoding)) {
    return brotliDecompressSync(chunk);
  }

  return chunk;
};
