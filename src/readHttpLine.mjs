import assert from 'node:assert';
import { Buffer } from 'node:buffer';

import { DecodeHttpError } from './errors.mjs';

const MAX_LINE_SIZE = 65535;
const CRLF = Buffer.from([0x0d, 0x0a]);

function throwDecodeHttpError(message) {
  throw new DecodeHttpError(message ? `Decode Http Error, ${message}` : 'Decode Http Error');
}

export default (
  buf,
  start = 0,
  limit = MAX_LINE_SIZE,
  message = null,
) => {
  assert(Buffer.isBuffer(buf));
  assert(start >= 0);
  const len = buf.length;
  if (len === 0) {
    assert(start === 0);
    return null;
  }

  assert(start <= len - 1);

  if (buf[start] === CRLF[1]) {
    throwDecodeHttpError(message);
  }
  if (len === 1) {
    return null;
  }
  let index = -1;
  let i = start;
  const end = Math.min(len, start + limit + 1);
  while (i < end) {
    const b = buf[i];
    if (b === CRLF[1]) {
      if (i === start || buf[i - 1] !== CRLF[0]) {
        throwDecodeHttpError(message);
      }
      index = i;
      break;
    }
    i++;
  }
  if (index === -1) {
    if (len - start >= limit) {
      throwDecodeHttpError(message);
    }
    return null;
  }
  return buf.slice(start, index - 1);
};
