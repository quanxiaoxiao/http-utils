import assert from 'node:assert';

import _ from 'lodash';

import isHttpStream from './isHttpStream.mjs';

export default (headers) => {
  assert(_.isPlainObject(headers));
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
