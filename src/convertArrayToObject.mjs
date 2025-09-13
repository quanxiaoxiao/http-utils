import assert from 'node:assert';

import { parseInteger } from '@quanxiaoxiao/utils';

export default (arr) => {
  assert(Array.isArray(arr), 'Expected an array');
  assert(arr.length % 2 === 0, 'Array length must be even');
  const result = {};

  for (let i = 0; i < arr.length;) {
    const key = arr[i].toLowerCase();
    const rawValue = arr[i + 1];
    i += 2;
    if (key === 'content-length') {
      if (!(key in result)) {
        result[key] = parseInteger(rawValue);
      }
      continue;
    }
    const decodedValue = decodeURIComponent(rawValue);

    if (key in result) {
      result[key] = Array.isArray(result[key])
        ? [...result[key], decodedValue]
        : [result[key], decodedValue];
    } else {
      result[key] = decodedValue;
    }
  }

  return result;
};
