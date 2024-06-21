/* eslint no-nested-ternary: 0 */
import { Buffer } from 'node:buffer';
import assert from 'node:assert';
import _ from 'lodash';
import convertObjectToArray from './convertObjectToArray.mjs';
import filterHeaders from './filterHeaders.mjs';
import encodeHttpHeaders from './encodeHttpHeaders.mjs';
import wrapContentChunk from './wrapContentChunk.mjs';
import encodeHttpStartLine from './encodeHttpStartLine.mjs';
import getValue from './getValue.mjs';

const BODY_CHUNK_END = Buffer.from('0\r\n\r\n');

export default (options) => {
  const state = {
    complete: false,
    contentChunkLength: 0,
    contentLength: null,
  };

  if (options.onStartLine) {
    options.onStartLine(encodeHttpStartLine(options));
  }

  if (options.headers) {
    assert(Array.isArray(options.headers) || _.isPlainObject(options.headers));
  }

  const httpHeaderList = Array.isArray(options.headers) ? options.headers : convertObjectToArray(options.headers || {});

  assert(httpHeaderList.length % 2 === 0);

  const keyValuePairList = filterHeaders(
    httpHeaderList,
    ['content-length', 'transfer-encoding'],
  );

  if (Object.hasOwnProperty.call(options, 'body')) {
    keyValuePairList.push('Content-Length');
    if (options.body == null) {
      state.contentLength = 0;
      keyValuePairList.push(0);
    } else {
      assert(Buffer.isBuffer(options.body) || typeof options.body === 'string');
      state.contentLength = Buffer.byteLength(options.body);
      keyValuePairList.push(state.contentLength);
    }
    const bufList = [];

    if (options.onHeader) {
      options.onHeader(Buffer.concat([
        ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
        encodeHttpHeaders(keyValuePairList),
      ]));
    } else {
      if (!options.onStartLine) {
        bufList.push(encodeHttpStartLine(options));
      }
      bufList.push(encodeHttpHeaders(keyValuePairList));
    }

    if (state.contentLength > 0) {
      bufList.push(Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body));
    }

    if (bufList.length === 0) {
      return null;
    }

    return Buffer.concat(bufList);
  }

  const contentLength = getValue(httpHeaderList, 'content-length');
  if (contentLength != null) {
    state.contentLength = parseInt(contentLength, 10);
    assert(state.contentLength >= 0);
    keyValuePairList.push('Content-Length');
    keyValuePairList.push(state.contentLength);
    if (options.onHeader) {
      options.onHeader(Buffer.concat([
        ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
        encodeHttpHeaders(keyValuePairList),
      ]));
    }
    if (state.contentLength === 0) {
      return () => {
        assert(!state.complete);
        state.complete = true;
        if (options.onHeader) {
          return null;
        }
        return Buffer.concat([
          ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
          encodeHttpHeaders(keyValuePairList),
        ]);
      };
    }
    return (data) => {
      assert(!state.complete);
      assert(Buffer.isBuffer(data) || typeof data === 'string');
      const chunk = Buffer.from(data);
      const chunkSize = chunk.length;
      assert(chunkSize > 0);
      assert(state.contentChunkLength + chunkSize <= state.contentLength);
      if (state.contentChunkLength === 0) {
        state.contentChunkLength += chunkSize;
        if (state.contentChunkLength === state.contentLength) {
          state.complete = true;
        }
        if (!options.onHeader) {
          return Buffer.concat([
            ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
            encodeHttpHeaders(keyValuePairList),
            chunk,
          ]);
        }
        return chunk;
      }
      state.contentChunkLength += chunkSize;
      assert(state.contentChunkLength <= state.contentLength);
      if (state.contentChunkLength === state.contentLength) {
        state.complete = true;
      }
      return chunk;
    };
  }

  keyValuePairList.push('Transfer-Encoding');
  keyValuePairList.push('chunked');

  if (options.onHeader) {
    options.onHeader(Buffer.concat([
      ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
      encodeHttpHeaders(keyValuePairList),
    ]));
  }

  return (data) => {
    assert(!state.complete);
    if (data != null) {
      assert(Buffer.isBuffer(data) || typeof data === 'string');
    }
    const chunk = data != null ? Buffer.from(data) : null;
    if (chunk == null || chunk.length === 0) {
      state.complete = true;
      if (state.contentChunkLength === 0 && !options.onHeader) {
        return Buffer.concat([
          ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
          encodeHttpHeaders(keyValuePairList),
          BODY_CHUNK_END,
        ]);
      }
      return  BODY_CHUNK_END;
    }
    const chunkSize = chunk.length;
    if (state.contentChunkLength === 0) {
      state.contentChunkLength = chunkSize;
      if (!options.onHeader) {
        return Buffer.concat([
          ...options.onStartLine ? [] : [encodeHttpStartLine(options)],
          encodeHttpHeaders(keyValuePairList),
          wrapContentChunk(chunk),
        ]);
      }
      return wrapContentChunk(chunk);
    }
    state.contentChunkLength += chunkSize;
    return wrapContentChunk(chunk);
  };
};
