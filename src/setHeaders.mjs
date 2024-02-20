import assert from 'node:assert';
import _ from 'lodash';
import filterHeaders from './filterHeaders.mjs';
import convertObjectToArray from './convertObjectToArray.mjs';

export default (headers, obj) => {
  assert(Array.isArray(headers));
  assert(_.isPlainObject(obj));
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
