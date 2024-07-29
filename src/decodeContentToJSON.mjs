import qs from 'node:querystring';
import assert from 'node:assert';
import _ from 'lodash';
import decodeContentEncoding from './decodeContentEncoding.mjs';

export default (chunk, headers) => {
  assert(_.isPlainObject(headers));
  if (!chunk
    || chunk.length === 0
    || !/application\/(json|x-www-form-urlencoded)/i.test(headers['content-type'])
  ) {
    return null;
  }
  try {
    const content = decodeContentEncoding(
      chunk,
      headers['content-encoding'],
    );
    if (/\/json/i.test(headers['content-type'])) {
      return JSON.parse(content.toString());
    }
    return qs.parse(content.toString());
  } catch (error) { // eslint-disable-line
    return null;
  }
};
