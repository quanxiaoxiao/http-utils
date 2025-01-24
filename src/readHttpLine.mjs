import assert from 'node:assert';
import { Buffer } from 'node:buffer';

import { DecodeHttpError } from './errors.mjs';

const MAX_LINE_SIZE = 65535;
const crlf = Buffer.from([0x0d, 0x0a]);

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

  if (buf[start] === crlf[1]) {
    throw new DecodeHttpError(message ? `Decode Http Error, ${message}` : 'Decode Http Error');
  }
  if (len === 1) {
    return null;
  }
  let index = -1;
  let i = start;
  const end = Math.min(len, start + limit + 1);
  while (i < end) {
    const b = buf[i];
    if (b === crlf[1]) {
      if (i === start || buf[i - 1] !== crlf[0]) {
        throw new DecodeHttpError(message ? `Decode Http Error, ${message}` : 'Decode Http Error');
      }
      index = i;
      break;
    }
    i++;
  }
  if (index === -1) {
    if (len - start >= limit) {
      throw new DecodeHttpError(message ? `Decode Http Error, ${message}` : 'Decode Http Error');
    }
    return null;
  }
  return buf.slice(start, index - 1);
};
