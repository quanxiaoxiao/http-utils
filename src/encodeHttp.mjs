/* eslint no-nested-ternary: 0 */
import { Buffer } from 'node:buffer';
import assert from 'node:assert';
import { Readable } from 'node:stream';
import _ from 'lodash';
import convertObjectToArray from './convertObjectToArray.mjs';
import filterHeaders from './filterHeaders.mjs';
import encodeHttpHeaders from './encodeHttpHeaders.mjs';
import wrapContentChunk from './wrapContentChunk.mjs';
import encodeHttpStartLine from './encodeHttpStartLine.mjs';
import getValue from './getValue.mjs';

const crlf = Buffer.from('\r\n');
const BODY_CHUNK_END = Buffer.from('0\r\n\r\n');

const isBodyStream = (options) => options.body && options.body instanceof Readable;

const isChunkEmpty = (chunk) => {
  if (chunk == null) {
    return true;
  }
  return chunk.length === 0;
};

export default (options) => {
  const state = {
    complete: false,
    contentChunkLength: 0,
    contentLength: null,
  };

  if (options.headers) {
    assert(Array.isArray(options.headers) || _.isPlainObject(options.headers));
  }

  const httpHeaderList = Array.isArray(options.headers) ? options.headers : convertObjectToArray(options.headers || {});

  assert(httpHeaderList.length % 2 === 0);

  const hasBody = Object.hasOwnProperty.call(options, 'body');

  if (hasBody && options.body != null && !isBodyStream(options)) {
    assert(Buffer.isBuffer(options.body) || typeof options.body === 'string');
  }

  const keyValuePairList = filterHeaders(
    httpHeaderList,
    ['content-length', 'transfer-encoding'],
  );

  const startlineBuf = encodeHttpStartLine(options);

  if (options.onStartLine) {
    options.onStartLine(startlineBuf);
  }

  const contentLength = getValue(httpHeaderList, 'content-length');
  if (contentLength != null) {
    const len = parseInt(contentLength, 10);
    assert(len >= 0);
    state.contentLength = len;
  }

  if (hasBody) {
    if (isBodyStream(options)) {
      keyValuePairList.push('Transfer-Encoding');
      keyValuePairList.push('chunked');
    } else {
      keyValuePairList.push('Content-Length');
      if (options.body == null) {
        state.contentLength = 0;
        keyValuePairList.push(0);
      } else {
        state.contentLength = Buffer.byteLength(options.body);
        keyValuePairList.push(state.contentLength);
      }
    }

    const headersBuf = encodeHttpHeaders(keyValuePairList);
    if (options.onHeader) {
      options.onHeader(Buffer.concat([
        ...options.onStartLine ? [] : [startlineBuf, crlf],
        headersBuf,
      ]));
    }
    if (!isBodyStream(options)) {
      const bufList = [
        startlineBuf,
        crlf,
        headersBuf,
        crlf,
      ];

      if (state.contentLength > 0) {
        bufList.push(Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body));
      }

      return Buffer.concat(bufList);
    }
  } else if (state.contentLength != null) {
    // console.log('-----------', state.contentLength);
  }

  return (data) => {
    assert(!state.complete);
    if (data != null) {
      assert(Buffer.isBuffer(data) || typeof data === 'string');
    }

    const chunk = data != null ? Buffer.from(data) : null;

    if (isChunkEmpty(chunk)) {
      state.complete = true;
      if (state.contentChunkLength > 0) {
        if (options.onEnd) {
          options.onEnd(state.contentChunkLength);
        }

        return BODY_CHUNK_END;
      }
      if (options.onHeader) {
        if (isBodyStream(options)) {
          if (options.onEnd) {
            options.onEnd(state.contentChunkLength);
          }
          return BODY_CHUNK_END;
        }
        options.onHeader(Buffer.concat([
          ...options.onStartLine ? [] : [startlineBuf, crlf],
          encodeHttpHeaders(keyValuePairList),
        ]));
      }
      if (options.onEnd) {
        options.onEnd(state.contentChunkLength);
      }
      return Buffer.concat([
        startlineBuf,
        crlf,
        encodeHttpHeaders(keyValuePairList),
        crlf,
        ...isBodyStream(options) ? [BODY_CHUNK_END] : [],
      ]);
    }

    const chunkSize = chunk.length;
    if (state.contentChunkLength === 0) {
      state.contentChunkLength = chunkSize;
      if (isBodyStream(options)) {
        if (!options.onHeader) {
          return Buffer.concat([
            ...options.onStartLine ? [] : [startlineBuf, crlf],
            encodeHttpHeaders(keyValuePairList),
            crlf,
            wrapContentChunk(chunk),
          ]);
        }
        return wrapContentChunk(chunk);
      }
      keyValuePairList.push('Transfer-Encoding');
      keyValuePairList.push('chunked');
      if (options.onHeader) {
        const headersBuf = encodeHttpHeaders(keyValuePairList);
        options.onHeader(Buffer.concat([
          ...options.onStartLine ? [] : [startlineBuf, crlf],
          headersBuf,
        ]));
      }
      return Buffer.concat([
        startlineBuf,
        crlf,
        encodeHttpHeaders(keyValuePairList),
        crlf,
        wrapContentChunk(chunk),
      ]);
    }
    state.contentChunkLength += chunkSize;
    return wrapContentChunk(chunk);
  };
};
