/* eslint no-nested-ternary: 0 */
import http from 'node:http';
import assert from 'node:assert';
import _ from 'lodash';
import convertObjectToArray from './convertObjectToArray.mjs';
import filterHeaders from './filterHeaders.mjs';

const crlf = Buffer.from('\r\n');
const HTTP_VERSION = '1.1';
const BODY_CHUNK_END = Buffer.from('0\r\n\r\n');

export class HttpEncodeError extends Error {
  constructor(message) {
    super(message);
    this.message = message || 'HTTP Encode Error';
  }
}

const encodeHeaders = (arr) => {
  const result = [];
  const len = arr.length;
  assert(len % 2 === 0);
  for (let i = 0; i < len;) {
    const key = arr[i];
    const value = arr[i + 1];
    result.push(Buffer.from(`${key}: ${value == null ? '' : value}`));
    result.push(crlf);
    i += 2;
  }
  return Buffer.concat(result);
};

export default (options) => {
  const {
    httpVersion,
    headers,
    body,
    onStartLine,
    onHeader,
    onEnd,
  } = options;

  const state = {
    complete: false,
    contentSize: 0,
  };

  if (headers) {
    assert(Array.isArray(headers) || _.isPlainObject(headers));
  }

  const httpHeaders = Array.isArray(headers) ? headers : convertObjectToArray(headers || {});

  assert(httpHeaders.length % 2 === 0);

  const keyValuePairList = filterHeaders(
    httpHeaders,
    ['content-length', 'transfer-encoding'],
  );

  const hasBody = Object.hasOwnProperty.call(options, 'body');
  const isBodyStream = options.body && (typeof options.body.pipe === 'function');

  const startLines = [];

  if (options.method) {
    startLines.push(options.method.toUpperCase());
    startLines.push(options.path || '/');
    startLines.push(`HTTP/${httpVersion || HTTP_VERSION}`);
  } else {
    const code = options.statusCode == null ? 200 : options.statusCode;
    assert(code >= 0 && code <= 999);
    startLines.push(`HTTP/${httpVersion || HTTP_VERSION}`);
    startLines.push(`${code}`);
    if (!Object.hasOwnProperty.call(options, 'statusText')) {
      if (http.STATUS_CODES[code]) {
        startLines.push(http.STATUS_CODES[code]);
      }
    } else if (options.statusText != null) {
      startLines.push(options.statusText);
    }
  }

  const startlineBuf = Buffer.from(startLines.join(' '));

  if (onStartLine) {
    onStartLine(startlineBuf);
  }

  if (isBodyStream) {
    keyValuePairList.push('Transfer-Encoding');
    keyValuePairList.push('chunked');
  } else if (hasBody) {
    keyValuePairList.push('Content-Length');
    if (body == null) {
      state.contentLength = 0;
      keyValuePairList.push(0);
    } else if (Buffer.isBuffer(body) || typeof body === 'string') {
      state.contentLength = Buffer.byteLength(body);
      keyValuePairList.push(state.contentLength);
    } else {
      throw new HttpEncodeError('encode body invalid');
    }
  }

  if (hasBody) {
    const headersBuf = encodeHeaders(keyValuePairList);
    if (onHeader) {
      onHeader(Buffer.concat([
        ...onStartLine ? [] : [startlineBuf, crlf],
        headersBuf,
      ]));
    }
    if (!isBodyStream) {
      const bufList = [
        startlineBuf,
        crlf,
        headersBuf,
        crlf,
      ];
      if (state.contentLength > 0) {
        bufList.push(Buffer.isBuffer(body) ? body : Buffer.from(body));
      }
      const dataChunk = Buffer.concat(bufList);
      if (onEnd) {
        onEnd(state.contentLength);
      }

      return dataChunk;
    }
  }

  return (data) => {
    if (data != null) {
      if (!Buffer.isBuffer(data) && typeof data !== 'string') {
        throw new HttpEncodeError('body invalid');
      }
    }
    assert(!state.complete);
    const chunk = data != null ? Buffer.from(data) : null;

    if (!chunk || chunk.length === 0) {
      state.complete = true;
      if (state.contentSize === 0) {
        const headersBuf = encodeHeaders(keyValuePairList);
        if (onHeader) {
          if (isBodyStream) {
            if (onEnd) {
              onEnd(0);
            }
            return Buffer.concat([
              crlf,
              BODY_CHUNK_END,
            ]);
          }
          onHeader(Buffer.concat([
            ...onStartLine ? [] : [startlineBuf, crlf],
            headersBuf,
          ]));
        }
        if (onEnd) {
          onEnd(0);
        }
        return Buffer.concat([
          startlineBuf,
          crlf,
          headersBuf,
          crlf,
          ...isBodyStream ? [BODY_CHUNK_END] : [],
        ]);
      }
      if (onEnd) {
        onEnd(state.contentSize);
      }
      return BODY_CHUNK_END;
    }

    const chunkSize = chunk.length;
    const lineBuf = Buffer.from(`${chunkSize.toString(16)}\r\n`);
    if (state.contentSize === 0) {
      if (!isBodyStream) {
        keyValuePairList.push('Transfer-Encoding');
        keyValuePairList.push('chunked');
      }
      const headersBuf = encodeHeaders(keyValuePairList);
      if (!onHeader) {
        state.contentSize = chunkSize;
        return Buffer.concat([
          ...onStartLine ? [] : [startlineBuf, crlf],
          headersBuf,
          crlf,
          lineBuf,
          chunk,
          crlf,
        ]);
      }
      if (!isBodyStream) {
        onHeader(Buffer.concat([
          ...onStartLine ? [] : [startlineBuf, crlf],
          headersBuf,
        ]));
      }
    }
    state.contentSize += chunkSize;
    return Buffer.concat([
      lineBuf,
      chunk,
      crlf,
    ]);
  };
};
