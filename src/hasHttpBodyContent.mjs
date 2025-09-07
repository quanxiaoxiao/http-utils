import assert from 'node:assert';

import isHttpStream from './isHttpStream.mjs';
import isPlainObject from './isPlainObject.mjs';

export default (headers) => {
  assert(isPlainObject(headers));
  if (Object.hasOwnProperty.call(headers, 'transfer-encoding')) {
    if (headers['transfer-encoding'] != null) {
      return true;
    }
  }
  if (Object.hasOwnProperty.call(headers, 'content-length')) {
    return headers['content-length'] > 0;
  }
  return isHttpStream(headers);
};
