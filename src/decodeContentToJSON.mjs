import assert from 'node:assert';
import qs from 'node:querystring';

import _ from 'lodash';

import decodeContentEncoding from './decodeContentEncoding.mjs';
import getHeaderValue from './getHeaderValue.mjs';

const SUPPORTED_CONTENT_TYPES = /application\/(json|x-www-form-urlencoded)\b/i;
const JSON_CONTENT_TYPE = /\/json\b/i;

export default function parseRequestBody(chunk, headers) {
  assert(_.isPlainObject(headers), 'headers must be a plain object');

  if (!chunk || chunk.length === 0) {
    return null;
  }
  const contentType = getHeaderValue(headers, 'content-type');
  if (!contentType || !SUPPORTED_CONTENT_TYPES.test(contentType)) {
    return null;
  }
  try {
    const contentEncoding = getHeaderValue(headers, 'content-encoding');
    const decodedContent = decodeContentEncoding(chunk, contentEncoding);
    const contentString = decodedContent.toString();
    if (JSON_CONTENT_TYPE.test(contentType)) {
      return JSON.parse(contentString);
    }
    return qs.parse(contentString);
  } catch (error) {
    return null;
  }
}
