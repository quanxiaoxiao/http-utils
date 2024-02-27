import { Buffer } from 'node:buffer';
import assert from 'node:assert';

class HttpParseError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.message = message || 'HTTP Parser Error';
    this.statusCode = statusCode || null;
  }
}

const MAX_LINE_SIZE = 65535;
const crlf = Buffer.from([0x0d, 0x0a]);

export default (
  buf,
  start = 0,
  statusCode = null,
  max = MAX_LINE_SIZE,
) => {
  assert(Buffer.isBuffer(buf));
  assert(start >= 0);
  if (statusCode != null) {
    assert(statusCode > 0 && statusCode < 1000);
  }
  const len = buf.length;
  if (len === 0) {
    assert(start === 0);
    return null;
  }

  assert(start <= len - 1);

  if (buf[start] === crlf[1]) {
    throw new HttpParseError('parse fail', statusCode);
  }
  if (len === 1) {
    return null;
  }
  let index = -1;
  let i = start;
  const end = Math.min(len, start + max + 1);
  while (i < end) {
    const b = buf[i];
    if (b === crlf[1]) {
      if (i === start || buf[i - 1] !== crlf[0]) {
        throw new HttpParseError('parse fail', statusCode);
      }
      index = i;
      break;
    }
    i++;
  }
  if (index === -1) {
    if (len - start >= max) {
      throw new HttpParseError('chunk exceed max size', statusCode);
    }
    return null;
  }
  return buf.slice(start, index - 1);
};
