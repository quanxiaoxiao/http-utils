import assert from 'node:assert';

import convertObjectToArray from './convertObjectToArray.mjs';
import isPlainObject from './isPlainObject.mjs';

export default (data, keyName) => {
  assert(
    Array.isArray(data) || isPlainObject(data),
    'First parameter must be an array or plain object',
  );
  assert(
    typeof keyName === 'string' && keyName.trim() !== '',
    'Second parameter must be a non-empty string',
  );
  const keyValueArray = Array.isArray(data) ? data : convertObjectToArray(data);
  const searchKey = keyName.toLowerCase().trim();
  const matches = [];
  for (let i = 0; i < keyValueArray.length - 1; i += 2) {
    const currentKey = keyValueArray[i];
    const currentValue = keyValueArray[i + 1];

    if (typeof currentKey === 'string' && currentKey.toLowerCase() === searchKey) {
      try {
        matches.push(decodeURIComponent(currentValue));
      } catch (error) {
        matches.push(currentValue);
      }
    }
  }
  switch (matches.length) {
  case 0:
    return null;
  case 1:
    return matches[0];
  default:
    return matches;
  }
};
