import assert from 'node:assert';
import qs from 'node:querystring';

import _ from 'lodash';

import decodeContentEncoding from './decodeContentEncoding.mjs';
import getHeaderValue from './getHeaderValue.mjs';

export default (chunk, headers) => {
  assert(_.isPlainObject(headers));
  const contentType = getHeaderValue(headers, 'content-type');
  const contentEncoding = getHeaderValue(headers, 'content-encoding');
  if (!chunk
    || chunk.length === 0
    || !contentType
    || !/application\/(json|x-www-form-urlencoded)\b/i.test(contentType)
  ) {
    return null;
  }
  try {
    const content = decodeContentEncoding(
      chunk,
      contentEncoding,
    );
    if (/\/\bjson\b/i.test(contentType)) {
      return JSON.parse(content.toString());
    }
    return qs.parse(content.toString());
  } catch (error) {
    return null;
  }
};
