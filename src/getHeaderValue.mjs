import assert from 'node:assert';

import _ from 'lodash';

import convertObjectToArray from './convertObjectToArray.mjs';

export default (obj, name) => {
  assert(Array.isArray(obj) || _.isPlainObject(obj));
  assert(typeof name === 'string');
  assert(name !== '');
  const arr = Array.isArray(obj) ? obj : convertObjectToArray(obj);
  const result = [];
  const keyName = name.toLowerCase();
  for (let i = 0; i < arr.length;) {
    const key = arr[i];
    const value = arr[i + 1];
    if (keyName === key.toLowerCase()) {
      result.push(decodeURIComponent(value));
    }
    i += 2;
  }
  if (result.length === 0) {
    return null;
  }
  if (result.length === 1) {
    return result[0];
  }
  return result;
};
