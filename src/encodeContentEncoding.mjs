import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import zlib, {
  brotliCompressSync,
  gzipSync,
} from 'node:zlib';

const MIN_COMPRESS_SIZE = 1024;

const parseAcceptEncoding = (acceptEncoding) => {
  const encodings = acceptEncoding
    .split(',')
    .map((item) => {
      const parts = item.trim().split(';');
      const encoding = parts[0].trim().toLowerCase();

      let quality = 1.0;
      for (let i = 1; i < parts.length; i++) {
        const param = parts[i].trim();
        if (param.startsWith('q=')) {
          quality = parseFloat(param.substring(2)) || 0;
          break;
        }
      }

      return { encoding, quality };
    })
    .filter(item =>
      item.quality > 0 &&
      (item.encoding === 'gzip' || item.encoding === 'br'),
    )
    .sort((a, b) => {
      if (a.quality !== b.quality) {
        return b.quality - a.quality;
      }
      return a.encoding === 'br' ? -1 : 1;
    });

  return encodings.map((item) => item.encoding);
};

export default (chunk, acceptEncoding, brQualityValue = 4) => {
  assert(Buffer.isBuffer(chunk), 'chunk must be a Buffer');
  if (!acceptEncoding || chunk.length === 0) {
    return {
      name: null,
      buf: chunk.length === 0 ? Buffer.alloc(0) : chunk,
    };
  }

  assert(typeof acceptEncoding === 'string', 'acceptEncoding must be a string');

  if (chunk.length < MIN_COMPRESS_SIZE) {
    return {
      name: null,
      buf: chunk,
    };
  }

  const encodings = parseAcceptEncoding(acceptEncoding);

  for (const encoding of encodings) {
    assert(Number.isInteger(brQualityValue) && brQualityValue > 0 && brQualityValue <= 15);
    if (encoding === 'br') {
      return {
        name: 'br',
        buf: brotliCompressSync(chunk, {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: brQualityValue,
          },
        }),
      };
    }
    if (encoding === 'gzip') {
      return {
        name: 'gzip',
        buf: gzipSync(chunk),
      };
    }
  }

  return {
    name: null,
    buf: chunk,
  };
};
