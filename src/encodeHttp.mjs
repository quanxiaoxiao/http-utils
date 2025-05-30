/* eslint no-nested-ternary: 0 */
import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';

import _ from 'lodash';

import convertObjectToArray from './convertObjectToArray.mjs';
import encodeHttpHeaders from './encodeHttpHeaders.mjs';
import encodeHttpStartLine from './encodeHttpStartLine.mjs';
import { EncodeHttpError } from './errors.mjs';
import filterHeaders from './filterHeaders.mjs';
import getHeaderValue from './getHeaderValue.mjs';
import wrapContentChunk from './wrapContentChunk.mjs';

const BODY_CHUNK_END = Buffer.from('0\r\n\r\n');

const handleWithContentBody = ({
  method,
  path,
  httpVersion,
  statusCode,
  statusText,
  headers,
  body,
  onHeader,
  onStartLine,
}) => {
  const keyValuePairList = [...headers];
  let contentLength = 0;
  keyValuePairList.push('Content-Length');
  if (body == null) {
    contentLength = 0;
  } else {
    assert(Buffer.isBuffer(body) || typeof body === 'string');
    contentLength = Buffer.byteLength(body);
  }
  keyValuePairList.push(`${contentLength}`);
  const bufList = [];

  if (onHeader) {
    onHeader(Buffer.concat([
      ...onStartLine ? [] : [encodeHttpStartLine({
        method,
        path,
        httpVersion,
        statusCode,
        statusText,
      })],
      encodeHttpHeaders(keyValuePairList),
    ]));
  } else {
    if (!onStartLine) {
      bufList.push(encodeHttpStartLine({
        method,
        path,
        httpVersion,
        statusCode,
        statusText,
      }));
    }
    bufList.push(encodeHttpHeaders(keyValuePairList));
  }

  if (contentLength > 0) {
    bufList.push(Buffer.isBuffer(body) ? body : Buffer.from(body));
  }

  if (bufList.length === 0) {
    return Buffer.from([]);
  }

  return Buffer.concat(bufList);
};

const handleWithContentLengthStream = ({
  method,
  path,
  httpVersion,
  contentLength,
  statusCode,
  statusText,
  headers,
  onHeader,
  onStartLine,
}) => {
  if (!Number.isInteger(contentLength) || contentLength < 0) {
    throw new EncodeHttpError(`Encode Http Error, Content-Length \`${contentLength}\` invalid`);
  }
  const state = {
    complete: false,
    contentChunkLength: 0,
  };
  const keyValuePairList = [...headers];
  keyValuePairList.push('Content-Length');
  keyValuePairList.push(contentLength);
  if (onHeader) {
    onHeader(Buffer.concat([
      ...onStartLine ? [] : [encodeHttpStartLine({
        method,
        path,
        httpVersion,
        statusCode,
        statusText,
      })],
      encodeHttpHeaders(keyValuePairList),
    ]));
  }
  if (contentLength === 0) {
    return (args) => {
      if (args != null) {
        assert(Buffer.isBuffer(args) || typeof args === 'string');
        if (Buffer.byteLength(args) > 0) {
          throw new EncodeHttpError(`Encoding Http Error, Content-Length exceed \`${0}\``);
        }
      }
      assert(!state.complete);
      state.complete = true;
      if (onHeader) {
        return Buffer.from([]);
      }
      return Buffer.concat([
        ...onStartLine ? [] : [encodeHttpStartLine({
          method,
          path,
          httpVersion,
          statusCode,
          statusText,
        })],
        encodeHttpHeaders(keyValuePairList),
      ]);
    };
  }
  return (data) => {
    if (state.complete) {
      assert(data == null);
      return Buffer.from([]);
    }
    assert(!state.complete);
    assert(Buffer.isBuffer(data) || typeof data === 'string');
    const chunk = Buffer.from(data);
    const chunkSize = chunk.length;
    assert(chunkSize > 0);
    if (state.contentChunkLength + chunkSize > contentLength) {
      throw new EncodeHttpError(`Encoding Http Error, Content-Length exceed \`${contentLength}\``);
    }
    if (state.contentChunkLength === 0) {
      state.contentChunkLength += chunkSize;
      if (state.contentChunkLength === contentLength) {
        state.complete = true;
      }
      if (!onHeader) {
        return Buffer.concat([
          ...onStartLine ? [] : [encodeHttpStartLine({
            method,
            path,
            httpVersion,
            statusCode,
            statusText,
          })],
          encodeHttpHeaders(keyValuePairList),
          chunk,
        ]);
      }
      return chunk;
    }
    state.contentChunkLength += chunkSize;
    if (state.contentChunkLength === contentLength) {
      state.complete = true;
    }
    return chunk;
  };
};

const handleWithContentChunkStream = ({
  method,
  path,
  httpVersion,
  statusCode,
  statusText,
  headers,
  onHeader,
  onStartLine,
}) => {
  const keyValuePairList = [...headers];
  const state = {
    complete: false,
    contentChunkLength: 0,
  };
  keyValuePairList.push('Transfer-Encoding');
  keyValuePairList.push('chunked');

  if (onHeader) {
    onHeader(Buffer.concat([
      ...onStartLine ? [] : [encodeHttpStartLine({
        method,
        path,
        httpVersion,
        statusCode,
        statusText,
      })],
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
      if (state.contentChunkLength === 0 && !onHeader) {
        return Buffer.concat([
          ...onStartLine ? [] : [encodeHttpStartLine({
            method,
            path,
            httpVersion,
            statusCode,
            statusText,
          })],
          encodeHttpHeaders(keyValuePairList),
          BODY_CHUNK_END,
        ]);
      }
      return BODY_CHUNK_END;
    }
    const chunkSize = chunk.length;
    if (state.contentChunkLength === 0) {
      state.contentChunkLength = chunkSize;
      if (!onHeader) {
        return Buffer.concat([
          ...onStartLine ? [] : [encodeHttpStartLine({
            method,
            path,
            httpVersion,
            statusCode,
            statusText,
          })],
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

export default (options) => {
  if (options.onStartLine) {
    options.onStartLine(encodeHttpStartLine({
      method: options.method,
      path: options.path,
      httpVersion: options.httpVersion,
      statusCode: options.statusCode,
      statusText: options.statusText,
    }));
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

  const contentLength = getHeaderValue(httpHeaderList, 'content-length');

  if (Object.hasOwnProperty.call(options, 'body')) {
    if (options.body instanceof Readable) {
      if (contentLength != null) {
        return handleWithContentLengthStream({
          contentLength: Number(contentLength),
          method: options.method,
          path: options.path,
          httpVersion: options.httpVersion,
          statusCode: options.statusCode,
          statusText: options.statusText,
          headers: keyValuePairList,
          body: options.body,
          onHeader: options.onHeader,
          onStartLine: options.onStartLine,
        });
      }
      return handleWithContentChunkStream({
        method: options.method,
        path: options.path,
        httpVersion: options.httpVersion,
        statusCode: options.statusCode,
        statusText: options.statusText,
        headers: keyValuePairList,
        body: options.body,
        onHeader: options.onHeader,
        onStartLine: options.onStartLine,
      });
    }
    return handleWithContentBody({
      method: options.method,
      path: options.path,
      httpVersion: options.httpVersion,
      statusCode: options.statusCode,
      statusText: options.statusText,
      headers: keyValuePairList,
      body: options.body,
      onHeader: options.onHeader,
      onStartLine: options.onStartLine,
    });
  }

  if (contentLength != null) {
    return handleWithContentLengthStream({
      contentLength: Number(contentLength),
      method: options.method,
      path: options.path,
      httpVersion: options.httpVersion,
      statusCode: options.statusCode,
      statusText: options.statusText,
      headers: keyValuePairList,
      body: options.body,
      onHeader: options.onHeader,
      onStartLine: options.onStartLine,
    });
  }

  return handleWithContentChunkStream({
    method: options.method,
    path: options.path,
    httpVersion: options.httpVersion,
    statusCode: options.statusCode,
    statusText: options.statusText,
    headers: keyValuePairList,
    body: options.body,
    onHeader: options.onHeader,
    onStartLine: options.onStartLine,
  });
};
