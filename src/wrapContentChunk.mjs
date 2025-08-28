import assert from 'node:assert';
import { Buffer } from 'node:buffer';

const CRLF = Buffer.from('\r\n');
const MAX_CHUNK_SIZE = 65535;

const encodeChunkSize = (size) => {
  assert(size >= 0 && size <= MAX_CHUNK_SIZE, `Chunk size must be between 0 and ${MAX_CHUNK_SIZE}`);
  return Buffer.from(size.toString(16));
};

const createEncodedChunk = (data) => {
  const size = encodeChunkSize(data.length);
  return Buffer.concat([size, CRLF, data, CRLF]);
};

export default (chunk) => {
  assert(Buffer.isBuffer(chunk), 'Input must be a Buffer');
  const size = chunk.length;
  if (size <= MAX_CHUNK_SIZE) {
    return createEncodedChunk(chunk);
  }
  const fullChunks = Math.floor(size / MAX_CHUNK_SIZE);
  const remainingSize = size % MAX_CHUNK_SIZE;

  const totalChunks = fullChunks + (remainingSize > 0 ? 1 : 0);
  const result = new Array(totalChunks);

  for (let i = 0; i < fullChunks; i++) {
    const start = i * MAX_CHUNK_SIZE;
    const end = start + MAX_CHUNK_SIZE;
    const chunkData = chunk.slice(start, end);
    result[i] = createEncodedChunk(chunkData);
  }
  if (remainingSize !== 0) {
    const remainingData = chunk.slice(fullChunks * MAX_CHUNK_SIZE);
    result[fullChunks] = createEncodedChunk(remainingData);
  }
  return Buffer.concat(result);
};
