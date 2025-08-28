import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import {
  brotliDecompressSync,
  gunzipSync,
  inflateSync,
} from 'node:zlib';

export default (chunk, contentEncoding) => {
  assert(Buffer.isBuffer(chunk), 'chunk must be a Buffer');

  if (chunk.length === 0) {
    return Buffer.alloc(0);
  }

  if (!contentEncoding) {
    return chunk;
  }

  const encoding = contentEncoding.trim().toLowerCase();

  try {
    switch (encoding) {
    case 'gzip':
      return gunzipSync(chunk);

    case 'deflate':
      return inflateSync(chunk);

    case 'br':
    case 'brotli':
      return brotliDecompressSync(chunk);

    default:
      return chunk;
    }
  } catch (error) {
    throw new Error(`Failed to decompress data with encoding '${encoding}': ${error.message}`);
  }
};
