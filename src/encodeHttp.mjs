/* eslint no-nested-ternary: 0 */
import http from 'node:http';
import assert from 'node:assert';
import _ from 'lodash';
import convertObjectToArray from './convertObjectToArray.mjs';
import filterHeaders from './filterHeaders.mjs';

const crlf = Buffer.from('\r\n');
const HTTP_VERSION = '1.1';
const BODY_CHUNK_END = Buffer.from('0\r\n\r\n');

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

  const hasBody = Object.hasOwnProperty.call(options, 'body');
  const isBodyStream = options.body && (typeof options.body.pipe === 'function');

  if (hasBody && !isBodyStream && body != null) {
    assert(Buffer.isBuffer(body) || typeof body === 'string');
  }

  const keyValuePairList = filterHeaders(
    httpHeaders,
    ['content-length', 'transfer-encoding'],
  );

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
    } else {
      state.contentLength = Buffer.byteLength(body);
      keyValuePairList.push(state.contentLength);
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

      return Buffer.concat(bufList);
    }
  }

  return (data) => {
    assert(!state.complete);
    if (data != null) {
      assert(Buffer.isBuffer(data) || typeof data === 'string');
    }
    const chunk = data != null ? Buffer.from(data) : null;

    if (!chunk || chunk.length === 0) {
      state.complete = true;
      if (state.contentSize === 0) {
        if (onHeader) {
          if (isBodyStream) {
            if (onEnd) {
              onEnd(state.contentSize);
            }
            return BODY_CHUNK_END;
          }
          onHeader(Buffer.concat([
            ...onStartLine ? [] : [startlineBuf, crlf],
            encodeHeaders(keyValuePairList),
          ]));
        }
        if (onEnd) {
          onEnd(state.contentSize);
        }
        return Buffer.concat([
          startlineBuf,
          crlf,
          encodeHeaders(keyValuePairList),
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
      state.contentSize = chunkSize;
      if (isBodyStream) {
        if (!onHeader) {
          return Buffer.concat([
            ...onStartLine ? [] : [startlineBuf, crlf],
            encodeHeaders(keyValuePairList),
            crlf,
            lineBuf,
            chunk,
            crlf,
          ]);
        }
        return Buffer.concat([
          lineBuf,
          chunk,
          crlf,
        ]);
      }
      keyValuePairList.push('Transfer-Encoding');
      keyValuePairList.push('chunked');
      if (onHeader) {
        const headersBuf = encodeHeaders(keyValuePairList);
        onHeader(Buffer.concat([
          ...onStartLine ? [] : [startlineBuf, crlf],
          headersBuf,
        ]));
      }
      return Buffer.concat([
        startlineBuf,
        crlf,
        encodeHeaders(keyValuePairList),
        crlf,
        lineBuf,
        chunk,
        crlf,
      ]);
    }
    state.contentSize += chunkSize;
    return Buffer.concat([
      lineBuf,
      chunk,
      crlf,
    ]);
  };
};
