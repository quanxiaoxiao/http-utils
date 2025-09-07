import assert from 'node:assert';

import isPlainObject from './isPlainObject.mjs';

export default (headers) => {
  assert(isPlainObject(headers));
  if (Object.hasOwnProperty.call(headers, 'content-length')) {
    return false;
  }
  if (Object.hasOwnProperty.call(headers, 'transfer-encoding')) {
    return false;
  }
  return true;
};
