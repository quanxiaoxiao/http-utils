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

const CHUNK_END_MARKER = Buffer.from('0\r\n\r\n');
const FILTERED_HEADERS = ['content-length', 'transfer-encoding'];

const buildHttpHeader = ({
  method,
  path,
  httpVersion,
  statusCode,
  statusText,
  headers,
  includeStartLine = true,
}) => {
  const buffers = [];

  if (includeStartLine) {
    buffers.push(encodeHttpStartLine({
      method,
      path,
      httpVersion,
      statusCode,
      statusText,
    }));
  }

  buffers.push(encodeHttpHeaders(headers));
  return Buffer.concat(buffers);
};

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

const handleContentLengthStream = (options) => {
  const {
    method,
    path,
    httpVersion,
    contentLength,
    statusCode,
    statusText,
    headers,
    onHeader,
    onStartLine,
  } = options;
  if (!Number.isInteger(contentLength) || contentLength < 0) {
    throw new EncodeHttpError(`Encode Http Error, Content-Length \`${contentLength}\` invalid`);
  }
  const state = {
    complete: false,
    contentChunkLength: 0,
  };
  const headersWithLength = [...headers, 'Content-Length', contentLength];
  if (onHeader) {
    const httpHeader = buildHttpHeader({
      ...options,
      headers: headersWithLength,
      includeStartLine: !onStartLine,
    });
    onHeader(httpHeader);
  }
  if (contentLength === 0) {
    return (data) => {
      if (data != null) {
        assert(Buffer.isBuffer(data) || typeof data === 'string');
        if (Buffer.byteLength(data) > 0) {
          throw new EncodeHttpError(`Encoding Http Error, Content-Length exceed \`${0}\``);
        }
      }
      assert(!state.complete, 'Stream already completed');
      state.complete = true;
      if (onHeader) {
        return Buffer.from([]);
      }
      return buildHttpHeader({
        ...options,
        headers: headersWithLength,
        includeStartLine: !onStartLine,
      });
    };
  }
  return (data) => {
    if (state.complete) {
      assert(data == null, 'No data expected after completion');
      return Buffer.from([]);
    }
    assert(!state.complete);
    assert(Buffer.isBuffer(data) || typeof data === 'string');
    const chunk = Buffer.from(data);
    const chunkSize = chunk.length;
    assert(chunkSize > 0, 'Chunk size must be greater than 0');
    if (state.contentChunkLength + chunkSize > contentLength) {
      throw new EncodeHttpError(`Encoding Http Error, Content-Length exceed \`${contentLength}\``);
    }
    if (state.contentChunkLength === 0) {
      state.contentChunkLength += chunkSize;
      if (state.contentChunkLength === contentLength) {
        state.complete = true;
      }
      if (!onHeader) {
        const httpHeader = buildHttpHeader({
          ...options,
          headers: headersWithLength,
          includeStartLine: !onStartLine,
        });
        return Buffer.concat([httpHeader, chunk]);
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
          CHUNK_END_MARKER,
        ]);
      }
      return CHUNK_END_MARKER;
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
    assert(
      Array.isArray(options.headers) || _.isPlainObject(options.headers),
      'Headers must be an array or plain object',
    );
  }

  const httpHeaderList = Array.isArray(options.headers)
    ? options.headers
    : convertObjectToArray(options.headers || {});

  assert(httpHeaderList.length % 2 === 0, 'Headers array must have even length');

  const filteredHeaders = filterHeaders(httpHeaderList, FILTERED_HEADERS);
  const contentLength = getHeaderValue(httpHeaderList, 'content-length');

  const baseOptions = {
    method: options.method,
    path: options.path,
    httpVersion: options.httpVersion,
    statusCode: options.statusCode,
    statusText: options.statusText,
    headers: filteredHeaders,
    onHeader: options.onHeader,
    onStartLine: options.onStartLine,
  };

  if (Object.hasOwnProperty.call(options, 'body')) {
    if (options.body instanceof Readable) {
      if (contentLength != null) {
        return handleContentLengthStream({
          ...baseOptions,
          contentLength: Number(contentLength),
        });
      }
      return handleWithContentChunkStream(baseOptions);
    }
    return handleWithContentBody({
      ...baseOptions,
      body: options.body,
    });
  }

  if (contentLength != null) {
    return handleContentLengthStream({
      ...baseOptions,
      contentLength: Number(contentLength),
    });
  }

  return handleWithContentChunkStream(baseOptions);
};
