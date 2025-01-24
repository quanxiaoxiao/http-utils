import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import {
  brotliCompressSync,
  gzipSync,
} from 'node:zlib';

export default (chunk, acceptEncoding) => {
  assert(Buffer.isBuffer(chunk));
  if (!acceptEncoding) {
    return {
      name: null,
      buf: chunk,
    };
  }

  if (chunk.length === 0) {
    return {
      name: null,
      buf: Buffer.from([]),
    };
  }

  const nameList = acceptEncoding.split(',');
  for (let i = 0; i < nameList.length; i++) {
    const name = nameList[i].trim();
    if (/^gzip$/i.test(name)) {
      return {
        name: 'gzip',
        buf: gzipSync(chunk),
      };
    }
    if (/^br$/i.test(name)) {
      return {
        name: 'br',
        buf: brotliCompressSync(chunk),
      };
    }
  }

  return {
    name: null,
    buf: chunk,
  };
};
