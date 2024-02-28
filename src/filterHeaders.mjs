import assert from 'node:assert';
import { escapeString } from '@quanxiaoxiao/utils';

export default (headers, keys) => {
  assert(Array.isArray(headers));
  assert(Array.isArray(keys));
  if (keys.length === 0) {
    return headers;
  }
  const regexp = new RegExp(`^${keys.map((s) => escapeString(s)).join('|')}$`, 'i');
  const result = [];
  for (let i = 0; i < headers.length;) {
    const key = headers[i];
    const value = headers[i + 1];
    i += 2;
    if (!regexp.test(key)) {
      result.push(key);
      result.push(value);
    }
  }
  return result;
};
