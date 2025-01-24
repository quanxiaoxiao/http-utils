import assert from 'node:assert';

import { select } from '@quanxiaoxiao/datav';

const toInteger = select({ type: 'integer' });

export default (arr) => {
  assert(Array.isArray(arr));
  const result = {};
  assert(arr.length % 2 === 0);

  for (let i = 0; i < arr.length;) {
    const key = arr[i].toLowerCase();
    const value = arr[i + 1];
    i += 2;
    if (Object.hasOwnProperty.call(result, key)) {
      if (key === 'content-length') {
        continue;
      }
      if (Array.isArray(result[key])) {
        result[key].push(decodeURIComponent(value));
      } else {
        result[key] = [result[key], decodeURIComponent(value)];
      }
    } else {
      result[key] = key === 'content-length' ? toInteger(value) : decodeURIComponent(value);
    }
  }

  return result;
};
