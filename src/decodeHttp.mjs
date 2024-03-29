/* eslint prefer-destructuring: 0 */
import { Buffer } from 'node:buffer';
import assert from 'node:assert';
import readHttpLine from './readHttpLine.mjs';

class HttpParserError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.message = message || 'HTTP Parser Error';
    this.statusCode = statusCode || null;
  }
}

const crlf = Buffer.from([0x0d, 0x0a]);
const MAX_CHUNK_SIZE = 1024 * 1024 * 800;
const MAX_CHUNK_LENGTH = MAX_CHUNK_SIZE.toString(16).length;
const COLON_CHAR_CODE = 0x3a;

const REQUEST_STARTLINE_REG = /^([^ ]+) +([^ ]+) +HTTP\/(1\.1|1\.0|2)$/;
const RESPONSE_STARTLINE_REG = /^HTTP\/(1\.1|1\.0|2)\s+(\d+)(.*)/;

const decodeHttp = ({
  isRequest,
  onStartLine,
  onHeader,
  onBody,
  onEnd,
}) => {
  const state = {
    step: 0,
    count: 0,
    bytes: 0,
    isRequest,
    pending: false,
    httpVersion: null,
    statusText: null,
    timeStart: performance.now(),
    timeOnStartlineStart: null,
    timeOnStartlineEnd: null,
    timeOnHeadersStart: null,
    timeOnHeadersEnd: null,
    timeOnBodyStart: null,
    timeOnBodyEnd: null,
    statusCode: null,
    method: null,
    path: null,
    headers: {},
    headersRaw: [],
    size: 0,
    bodyChunkSize: 0,
    dataBuf: Buffer.from([]),
    bodyBuf: Buffer.from([]),
  };

  const isHeaderPraseComplete = () => state.step >= 2;
  const isBodyParseComplete = () => state.step >= 3;

  const getState = () => {
    const result = {
      httpVersion: state.httpVersion,
      headers: state.headers,
      headersRaw: state.headersRaw,
      body: state.bodyBuf,
      bytes: state.bytes,
      count: state.count,
      complete: isBodyParseComplete(),
      dataBuf: state.dataBuf,
      timeOnStartline: null,
      timeOnHeaders: null,
      timeOnBody: null,
      timeOnStartlineEnd: null,
      timeOnHeadersStart: null,
      timeOnBodyStart: null,
      timeOnBodyEnd: null,
    };

    if (state.isRequest) {
      result.method = state.method;
      result.path = state.path;
    } else {
      result.statusCode = state.statusCode;
      result.statusText = state.statusText;
    }

    if (state.timeOnStartlineStart != null) {
      result.timeOnStartlineStart = state.timeOnStartlineStart - state.timeStart;
    }

    if (state.timeOnStartlineEnd != null) {
      assert(state.timeOnStartlineStart != null);
      result.timeOnStartline = state.timeOnStartlineEnd - state.timeOnStartlineStart;
      result.timeOnStartlineEnd = state.timeOnStartlineEnd - state.timeStart;
    }

    if (state.timeOnHeadersStart != null) {
      result.timeOnHeadersStart = state.timeOnHeadersStart - state.timeStart;
    }

    if (state.timeOnHeadersEnd != null) {
      assert(state.timeOnHeadersStart != null);
      result.timeOnHeaders = state.timeOnHeadersEnd - state.timeOnHeadersStart;
      result.timeOnHeadersEnd = state.timeOnHeadersEnd - state.timeStart;
    }

    if (state.timeOnBodyStart != null) {
      result.timeOnBodyStart = state.timeOnBodyStart - state.timeStart;
    }

    if (state.timeOnBodyEnd != null) {
      assert(state.timeOnBodyStart != null);
      result.timeOnBody = state.timeOnBodyEnd - state.timeOnBodyStart;
      result.timeOnBodyEnd = state.timeOnBodyEnd - state.timeStart;
    }

    if (result.complete) {
      assert(result.timeOnBodyEnd != null);
    }

    return result;
  };

  const parseStartLine = async () => {
    assert(state.step === 0);
    assert(state.timeOnStartlineEnd == null);
    if (state.timeOnStartlineStart == null) {
      state.timeOnStartlineStart = performance.now();
    }
    const chunk = readHttpLine(
      state.dataBuf,
      0,
      state.isRequest ? 400 : null,
      65535,
      state.isRequest ? 'request startline' : 'response startline',
    );
    if (!chunk) {
      return;
    }
    const len = chunk.length;
    const matches = chunk.toString().match(state.isRequest ? REQUEST_STARTLINE_REG : RESPONSE_STARTLINE_REG);
    if (!matches) {
      throw new HttpParserError(`parse ${state.isRequest ? 'request' : 'response'} start line fail`, state.isRequest ? 400 : null);
    }
    if (state.isRequest) {
      state.method = matches[1].toUpperCase();
      state.path = matches[2];
      state.httpVersion = matches[3];
    } else {
      if (matches[3]) {
        if (matches[3][0] !== ' ') {
          throw new HttpParserError(`parse ${state.isRequest ? 'request' : 'response'} start line fail`);
        }
        const statusText = matches[3].trim();
        if (statusText !== '') {
          state.statusText = statusText;
        }
      }
      state.httpVersion = matches[1];
      state.statusCode = parseInt(matches[2], 10);
      if (Number.isNaN(state.statusCode) || `${state.statusCode}` !== matches[2]) {
        throw new HttpParserError(`parse ${state.isRequest ? 'request' : 'response'} start line fail`);
      }
    }
    state.dataBuf = state.dataBuf.slice(len + 2);
    state.size -= (len + 2);
    state.timeOnStartlineEnd = performance.now();
    if (onStartLine) {
      await onStartLine(getState());
    }
    state.step += 1;
  };

  const parseHeaders = async () => {
    let isHeaderComplete = isHeaderPraseComplete();
    assert(state.timeOnHeadersEnd == null);
    assert(state.timeOnStartlineEnd != null);
    if (state.timeOnHeadersStart == null) {
      state.timeOnHeadersStart = performance.now();
    }
    while (!isHeaderComplete
      && state.size >= 2) {
      const chunk = readHttpLine(
        state.dataBuf,
        0,
        state.isRequest ? 400 : null,
        65535,
        state.isRequest ? 'request headers' : 'response headers',
      );
      if (!chunk) {
        return;
      }
      const len = chunk.length;
      state.dataBuf = state.dataBuf.slice(len + 2);
      state.size -= (len + 2);
      if (len === 0) {
        isHeaderComplete = true;
      } else {
        const indexSplit = chunk.findIndex((b) => b === COLON_CHAR_CODE);
        if (indexSplit === -1) {
          throw new HttpParserError(`parse ${state.isRequest ? 'request' : 'response'} headers fail`, state.isRequest ? 400 : null);
        }
        const headerKey = chunk.slice(0, indexSplit).toString().trim();
        const headerValue = chunk.slice(indexSplit + 1).toString().trim();
        if (headerKey !== '' && headerValue !== '') {
          state.headersRaw.push(headerKey);
          state.headersRaw.push(headerValue);
          const headerName = headerKey.toLowerCase();
          if (headerName === 'content-length') {
            if (Object.hasOwnProperty.call(state.headers, 'content-length')) {
              throw new HttpParserError(`parse ${state.isRequest ? 'request' : 'response'} headers fail`, state.isRequest ? 400 : null);
            }
            const contentLength = parseInt(headerValue, 10);
            if (Number.isNaN(contentLength)
                || `${contentLength}` !== headerValue
                || contentLength < 0
            ) {
              throw new HttpParserError(`parse ${state.isRequest ? 'request' : 'response'} headers fail`, state.isRequest ? 400 : null);
            }
            state.headers[headerName] = contentLength;
          } else if (Object.hasOwnProperty.call(state.headers, headerName)) {
            state.headers[headerName] = Array.isArray(state.headers[headerName])
              ? [...state.headers[headerName], headerValue]
              : [state.headers[headerName], headerValue];
          } else {
            state.headers[headerName] = headerValue;
          }
        }
      }
    }
    if (isHeaderComplete) {
      if (state.headers['transfer-encoding']
        && state.headers['transfer-encoding'].toLowerCase() === 'chunked') {
        state.bodyChunkSize = -1;
        if (Object.hasOwnProperty.call(state.headers, 'content-length')) {
          delete state.headers['content-length'];
        }
      } else if (!Object.hasOwnProperty.call(state.headers, 'content-length')) {
        state.headers['content-length'] = 0;
      }
      state.timeOnHeadersEnd = performance.now();
      if (onHeader) {
        await onHeader(getState());
      }
      state.step += 1;
    }
  };

  const emitBodyChunk = async () => {
    if (onBody && state.bodyBuf.length > 0) {
      const bodyChunk = state.bodyBuf;
      state.bodyBuf = Buffer.from([]);
      await onBody(bodyChunk);
    }
  };

  const parseBodyWithContentLength = async () => {
    const contentLength = state.headers['content-length'];
    assert(contentLength >= 0);
    if (contentLength !== 0) {
      if (state.bodyChunkSize + state.dataBuf.length < contentLength) {
        state.bodyChunkSize += state.dataBuf.length;
        state.bodyBuf = Buffer.concat([
          state.bodyBuf,
          state.dataBuf,
        ]);
        state.dataBuf = Buffer.from([]);
        state.size = 0;
        await emitBodyChunk();
      } else {
        const bodyChunkRemainSize = contentLength - state.bodyChunkSize;
        if (bodyChunkRemainSize > 0) {
          assert(state.dataBuf.length >= bodyChunkRemainSize);
          state.bodyBuf = Buffer.concat([
            state.bodyBuf,
            state.dataBuf.slice(0, bodyChunkRemainSize),
          ]);
          state.dataBuf = state.dataBuf.slice(bodyChunkRemainSize);
        }
        state.size = state.dataBuf.length;
        state.bodyChunkSize = contentLength;
        state.timeOnBodyEnd = performance.now();
        await emitBodyChunk();
        state.step += 1;
      }
    } else {
      state.timeOnBodyEnd = performance.now();
      assert(state.bodyChunkSize === 0);
      state.step += 1;
    }
  };

  const parseBodyWithChunk = async () => {
    assert(!isBodyParseComplete());
    assert(state.timeOnBodyEnd == null);
    if (state.bodyChunkSize !== -1) {
      if (state.bodyChunkSize + 2 <= state.dataBuf.length) {
        if (state.dataBuf[state.bodyChunkSize] !== crlf[0]
              || state.dataBuf[state.bodyChunkSize + 1] !== crlf[1]) {
          throw new HttpParserError('parse body fail', state.isRequest ? 400 : null);
        }
        if (state.bodyChunkSize === 0) {
          state.step += 1;
          state.bodyChunkSize = -1;
          state.dataBuf = state.dataBuf.slice(2);
          state.size = state.dataBuf.length;
          state.timeOnBodyEnd = performance.now();
        } else {
          const chunk = state.dataBuf.slice(0, state.bodyChunkSize);
          state.bodyBuf = Buffer.concat([
            state.bodyBuf,
            chunk,
          ]);
          state.dataBuf = state.dataBuf.slice(state.bodyChunkSize + 2);
          state.size = state.dataBuf.length;
          state.bodyChunkSize = -1;
          await emitBodyChunk();
          await parseBodyWithChunk();
        }
      }
    } else {
      const chunk = state.dataBuf.slice(0, Math.min(MAX_CHUNK_LENGTH, state.size));
      const index = chunk.findIndex((b) => b === crlf[1]);
      if (index !== -1) {
        if (index <= 1 || chunk[index - 1] !== crlf[0]) {
          throw new HttpParserError('parse body fail', state.isRequest ? 400 : null);
        }
        const hexChunkSize = chunk.slice(0, index - 1).toString();
        const chunkSize = parseInt(hexChunkSize, 16);
        if (Number.isNaN(chunkSize)
              || chunkSize.toString(16) !== hexChunkSize
              || chunkSize < 0
              || chunkSize > MAX_CHUNK_SIZE
        ) {
          throw new HttpParserError('parse body fail', state.isRequest ? 400 : null);
        }
        state.dataBuf = state.dataBuf.slice(index + 1);
        state.size = state.dataBuf.length;
        state.bodyChunkSize = chunkSize;
        await parseBodyWithChunk();
      } else if (chunk.length === MAX_CHUNK_LENGTH) {
        throw new HttpParserError('parse body fail', state.isRequest ? 400 : null);
      }
    }
  };

  const parseBody = async () => {
    assert(state.timeOnHeadersEnd != null);
    assert(state.timeOnBodyEnd == null);
    if (state.timeOnBodyStart == null) {
      state.timeOnBodyStart = performance.now();
    }
    assert(!isBodyParseComplete());
    if (!Object.hasOwnProperty.call(state.headers, 'content-length')) {
      assert(state.headers['transfer-encoding']);
      assert(state.headers['transfer-encoding'].toLowerCase() === 'chunked');
      await parseBodyWithChunk();
    } else {
      assert(!state.headers['transfer-encoding'] || Object.hasOwnProperty.call(state.headers, 'transfer-encoding').toLowerCase() !== 'chunked');
      await parseBodyWithContentLength();
    }
  };

  const processes = [
    parseStartLine,
    parseHeaders,
    parseBody,
  ];

  return async (chunk) => {
    assert(Buffer.isBuffer(chunk));
    assert(!isBodyParseComplete());
    state.count += 1;
    const bytes = chunk.length;

    if (bytes > 0) {
      state.bytes += bytes;
      state.size += bytes;
      state.dataBuf = Buffer.concat([
        state.dataBuf,
        chunk,
      ], state.size);
    }

    if (state.pending) {
      return getState();
    }

    while (state.step < processes.length) {
      const fn = processes[state.step];
      const current = state.step;
      state.pending = true;
      await fn(); // eslint-disable-line
      state.pending = false;
      if (current === state.step) {
        return getState();
      }
    }

    if (isBodyParseComplete() && onEnd) {
      await onEnd(getState());
    }

    return getState();
  };
};

export const decodeHttpRequest = (options) => decodeHttp({
  ...options || {},
  isRequest: true,
});

export const decodeHttpResponse = (options) => decodeHttp({
  ...options || {},
  isRequest: false,
});
