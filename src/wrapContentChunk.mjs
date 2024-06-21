import { Buffer } from 'node:buffer';
import assert from 'node:assert';

const crlf = Buffer.from('\r\n');
const MAX_CHUNK_SIZE = 65535;

export default (chunk) => {
  assert(Buffer.isBuffer(chunk));
  const size = chunk.length;
  if (size > MAX_CHUNK_SIZE) {
    const n = Math.floor(size / MAX_CHUNK_SIZE);
    const remain = size - n * MAX_CHUNK_SIZE;
    const result = [];
    for (let i = 0; i < n; i++) {
      result.push(Buffer.from('ffff\r\n'));
      result.push(chunk.slice(i * MAX_CHUNK_SIZE, (i + 1) * MAX_CHUNK_SIZE));
      result.push(crlf);
    }
    if (remain !== 0) {
      result.push(Buffer.from(`${remain.toString(16)}\r\n`));
      result.push(chunk.slice(n * MAX_CHUNK_SIZE));
      result.push(crlf);
    }
    return Buffer.concat(result);
  }
  return Buffer.concat([
    Buffer.from(`${size.toString(16)}\r\n`),
    chunk,
    crlf,
  ]);
};
