import assert from 'node:assert';

import _ from 'lodash';

export default (headers) => {
  assert(_.isPlainObject(headers));
  if (Object.hasOwnProperty.call(headers, 'content-length')) {
    return false;
  }
  if (Object.hasOwnProperty.call(headers, 'transfer-encoding')) {
    return false;
  }
  return true;
};
