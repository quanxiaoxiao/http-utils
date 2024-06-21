import assert from 'node:assert';

const crlf = Buffer.from('\r\n');

export default (arr) => {
  assert(Array.isArray(arr));
  const len = arr.length;
  assert(len % 2 === 0);
  const result = [];
  for (let i = 0; i < len;) {
    const key = arr[i];
    const value = arr[i + 1];
    result.push(Buffer.from(`${key}: ${value == null ? '' : value}`));
    result.push(crlf);
    i += 2;
  }
  result.push(crlf);
  return Buffer.concat(result);
};
