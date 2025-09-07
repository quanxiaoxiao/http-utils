import assert from 'node:assert';

import convertObjectToArray from './convertObjectToArray.mjs';
import filterHeaders from './filterHeaders.mjs';
import isPlainObject from './isPlainObject.mjs';

export default (headers, obj) => {
  assert(Array.isArray(headers));
  assert(isPlainObject(obj));
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return headers;
  }
  const other = filterHeaders(headers, keys);
  return [
    ...other,
    ...convertObjectToArray(obj),
  ];
};
