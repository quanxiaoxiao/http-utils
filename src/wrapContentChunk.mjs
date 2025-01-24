import assert from 'node:assert';
import { Buffer } from 'node:buffer';

const crlf = Buffer.from('\r\n');
const MAX_CHUNK_SIZE = 65535;

const encodeSize = (n) => {
  assert(n >= 0 && n <= MAX_CHUNK_SIZE);
  return Buffer.from(n.toString(16));
};

export default (chunk) => {
  assert(Buffer.isBuffer(chunk));
  const size = chunk.length;
  if (size > MAX_CHUNK_SIZE) {
    const n = Math.floor(size / MAX_CHUNK_SIZE);
    const remain = size - n * MAX_CHUNK_SIZE;
    const result = [];
    for (let i = 0; i < n; i++) {
      result.push(encodeSize(MAX_CHUNK_SIZE));
      result.push(crlf);
      result.push(chunk.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE));
      result.push(crlf);
    }
    if (remain !== 0) {
      result.push(encodeSize(remain));
      result.push(crlf);
      result.push(chunk.slice(n * MAX_CHUNK_SIZE));
      result.push(crlf);
    }
    return Buffer.concat(result);
  }
  return Buffer.concat([
    encodeSize(size),
    crlf,
    chunk,
    crlf,
  ]);
};
