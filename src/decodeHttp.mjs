/* eslint prefer-destructuring: 0 */
import assert from 'node:assert';
import { Buffer } from 'node:buffer';

import { parseInteger } from '@quanxiaoxiao/utils';

import { DecodeHttpError } from './errors.mjs';
import isHttpStream from './isHttpStream.mjs';
import isHttpWebSocketUpgrade from './isHttpWebSocketUpgrade.mjs';
import readHttpLine from './readHttpLine.mjs';

const crlf = Buffer.from([0x0d, 0x0a]);
const MAX_CHUNK_SIZE = 1024 * 1024 * 800;
const MAX_CHUNK_LENGTH = MAX_CHUNK_SIZE.toString(16).length;
const COLON_CHAR_CODE = 0x3a;

const REQUEST_STARTLINE_REG = /^([^ ]+) +([^ ]+) +HTTP\/(1\.1|1\.0|2)$/;
const RESPONSE_STARTLINE_REG = /^HTTP\/(1\.1|1\.0|2)\s+(\d+)(.*)/;

const STEP = {
  PARSE_STARTLINE: 0,
  PARSE_HEADERS: 1,
  PARSE_BODY: 2,
  COMPLETE: 3,
};

const throwDecodeHttpError = (message) => {
  throw new DecodeHttpError(`Decode Http Error, ${message}`);
};

const createInitialState = (isRequest) => ({
  step: STEP.PARSE_STARTLINE,
  count: 0,
  bytes: 0,
  isRequest,
  pending: false,

  httpVersion: null,
  statusText: null,
  statusCode: null,
  method: null,
  path: null,
  headers: {},
  headersRaw: [],

  timeStart: performance.now(),
  timeOnStartlineStart: null,
  timeOnStartlineEnd: null,
  timeOnHeadersStart: null,
  timeOnHeadersEnd: null,
  timeOnBodyStart: null,
  timeOnBodyEnd: null,

  size: 0,
  bodyChunkSize: 0,
  body: null,
  dataBuf: Buffer.from([]),
  bodyBuf: Buffer.from([]),
});

const decodeHttp = ({
  isRequest,
  onStartLine,
  onHeader,
  onBody,
  onEnd,
}) => {
  const state = createInitialState(isRequest);

  const isHeaderParseComplete = () => state.step >= STEP.PARSE_BODY;
  const isBodyParseComplete = () => state.step >= STEP.COMPLETE;

  const getState = () => {
    const result = {
      httpVersion: state.httpVersion,
      headers: state.headers,
      headersRaw: state.headersRaw,
      body: null,
      bytes: state.bytes,
      count: state.count,
      complete: isBodyParseComplete(),
      dataBuf: state.dataBuf,

      timeOnStartline: null,
      timeOnStartlineEnd: null,
      timeOnHeadersStart: null,
      timeOnHeaders: null,
      timeOnHeadersEnd: null,
      timeOnBodyStart: null,
      timeOnBody: null,
      timeOnBodyEnd: null,
    };

    if (isHeaderParseComplete() && !isHttpStream(state.headers)) {
      result.body = state.bodyBuf;
    }

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
    assert(state.step === STEP.PARSE_STARTLINE);
    assert(state.timeOnStartlineEnd == null);
    if (state.timeOnStartlineStart == null) {
      state.timeOnStartlineStart = performance.now();
    }
    const chunk = readHttpLine(state.dataBuf, 0, 65535, 'parse startline line');
    if (!chunk) {
      return;
    }
    const len = chunk.length;
    const line = chunk.toString();
    const regex = state.isRequest ? REQUEST_STARTLINE_REG : RESPONSE_STARTLINE_REG;
    const matches = line.match(regex);

    if (!matches) {
      throwDecodeHttpError('invalid start line format');
    }

    if (state.isRequest) {
      [, state.method, state.path, state.httpVersion] = matches;
      state.method = state.method.toUpperCase();
    } else {
      const [, httpVersion, statusCodeStr, statusTextPart] = matches;
      state.httpVersion = httpVersion;
      state.statusCode = parseInteger(statusCodeStr);
      if (state.statusCode == null) {
        throwDecodeHttpError('invalid status code');
      }
      if (statusTextPart) {
        if (statusTextPart[0] !== ' ') {
          throwDecodeHttpError('invalid status text format');
        }
        const statusText = statusTextPart.trim();
        if (statusText !== '') {
          state.statusText = statusText;
        }
      }
    }

    state.dataBuf = state.dataBuf.slice(len + 2);
    state.size -= (len + 2);
    state.timeOnStartlineEnd = performance.now();
    state.step = STEP.PARSE_HEADERS;
    if (onStartLine) {
      await onStartLine(getState());
    }
  };

  const processHeaderLine = (chunk) => {
    const indexSplit = chunk.findIndex((b) => b === COLON_CHAR_CODE);
    if (indexSplit === -1) {
      throwDecodeHttpError('invalid header format: missing colon');
    }
    const headerKey = chunk.slice(0, indexSplit).toString().trim();
    const headerValue = chunk.slice(indexSplit + 1).toString().trim();

    if (!headerKey || !headerValue) {
      return;
    }

    state.headersRaw.push(headerKey, headerValue);
    const headerName = headerKey.toLowerCase();

    if (headerName === 'content-length') {
      if (Object.hasOwnProperty.call(state.headers, 'content-length')) {
        throwDecodeHttpError('duplicate content-length header');
      }
      const contentLength = parseInteger(headerValue);
      if (contentLength == null || contentLength < 0) {
        throwDecodeHttpError('invalid content-length value');
      }
      state.headers[headerName] = contentLength;
    } else if (Object.hasOwnProperty.call(state.headers, headerName)) {
      const existing = state.headers[headerName];
      state.headers[headerName] = Array.isArray(existing)
        ? [...existing, headerValue]
        : [existing, headerValue];
    } else {
      state.headers[headerName] = headerValue;
    }
  };

  const parseHeaders = async () => {
    assert(state.step === STEP.PARSE_HEADERS);
    assert(state.timeOnHeadersEnd == null);
    assert(state.timeOnStartlineEnd != null);

    if (state.timeOnHeadersStart == null) {
      state.timeOnHeadersStart = performance.now();
    }
    let isHeaderComplete = false;

    while (!isHeaderComplete && state.size >= 2) {
      const chunk = readHttpLine(state.dataBuf, 0, 65535, 'parse startline header');
      if (!chunk) {
        return;
      }
      const len = chunk.length;
      state.dataBuf = state.dataBuf.slice(len + 2);
      state.size -= (len + 2);
      if (len === 0) {
        isHeaderComplete = true;
      } else {
        processHeaderLine(chunk);
      }
    }

    if (!isHeaderComplete) {
      return;
    }

    const transferEncoding = state.headers['transfer-encoding'];

    if (transferEncoding?.toLowerCase() === 'chunked') {
      state.bodyChunkSize = -1;
      delete state.headers['content-length'];
    }

    if (isHttpStream(state.headers)) {
      const isValidStream = state.statusCode === 200
        || state.statusCode === 101
        || isHttpWebSocketUpgrade({ method: state.method, headers: state.headers });
      if (isValidStream) {
        assert(typeof onBody === 'function', 'onBody callback required for streaming');
      } else {
        state.headers['content-length'] = 0;
      }
    }
    state.timeOnHeadersEnd = performance.now();
    state.step = STEP.PARSE_BODY;

    if (onHeader) {
      await onHeader(getState());
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

    if (contentLength === 0) {
      state.timeOnBodyEnd = performance.now();
      assert(state.bodyChunkSize === 0);
      state.step = STEP.COMPLETE;
      return;
    }

    const remainingBytes = contentLength - state.bodyChunkSize;
    const availableBytes = state.dataBuf.length;

    if (remainingBytes > availableBytes) {
      state.bodyChunkSize += availableBytes;
      state.bodyBuf = Buffer.concat([state.bodyBuf, state.dataBuf]);
      state.dataBuf = Buffer.from([]);
      state.size = 0;
      await emitBodyChunk();
    } else {
      if (remainingBytes > 0) {
        assert(state.dataBuf.length >= remainingBytes);
        state.bodyBuf = Buffer.concat([
          state.bodyBuf,
          state.dataBuf.slice(0, remainingBytes),
        ]);
        state.dataBuf = state.dataBuf.slice(remainingBytes);
      }
      state.size = state.dataBuf.length;
      state.bodyChunkSize = contentLength;
      state.timeOnBodyEnd = performance.now();
      await emitBodyChunk();
      state.step = STEP.COMPLETE;
    }
  };

  const parseBodyWithChunk = async () => {
    assert(state.step === STEP.PARSE_BODY);

    assert(state.timeOnBodyEnd == null);
    if (state.bodyChunkSize !== -1) {
      const totalChunkSize = state.bodyChunkSize + 2;
      if (state.dataBuf.length < totalChunkSize) {
        return;
      }
      if (state.dataBuf[state.bodyChunkSize] !== crlf[0]
            || state.dataBuf[state.bodyChunkSize + 1] !== crlf[1]) {
        throwDecodeHttpError('missing CRLF after chunk data');
      }
      if (state.bodyChunkSize === 0) {
        state.step = STEP.COMPLETE;
        state.bodyChunkSize = -1;
        state.dataBuf = state.dataBuf.slice(2);
        state.size = state.dataBuf.length;
        state.timeOnBodyEnd = performance.now();
      } else {
        const chunk = state.dataBuf.slice(0, state.bodyChunkSize);
        state.bodyBuf = Buffer.concat([state.bodyBuf, chunk]);
        state.dataBuf = state.dataBuf.slice(state.bodyChunkSize + 2);
        state.size = state.dataBuf.length;
        state.bodyChunkSize = -1;
        await emitBodyChunk();
        await parseBodyWithChunk();
      }
      return;
    }

    const searchLength = Math.min(MAX_CHUNK_LENGTH, state.size);
    const chunk = state.dataBuf.slice(0, searchLength);
    const crlfIndex = chunk.findIndex((b) => b === crlf[1]);

    if (crlfIndex === -1) {
      if (searchLength === MAX_CHUNK_LENGTH) {
        throwDecodeHttpError('chunk size line too long');
      }
      return;
    }

    if (crlfIndex <= 1 || chunk[crlfIndex - 1] !== crlf[0]) {
      throwDecodeHttpError('invalid chunk size format');
    }

    const hexChunkSize = chunk.slice(0, crlfIndex - 1).toString();
    const chunkSize = parseInt(hexChunkSize, 16);

    if (Number.isNaN(chunkSize)
          || chunkSize.toString(16) !== hexChunkSize
          || chunkSize < 0
          || chunkSize > MAX_CHUNK_SIZE
    ) {
      throwDecodeHttpError('invalid chunk size value');
    }

    state.dataBuf = state.dataBuf.slice(crlfIndex + 1);
    state.size = state.dataBuf.length;
    state.bodyChunkSize = chunkSize;

    await parseBodyWithChunk();
  };

  const parseBody = async () => {
    assert(state.step === STEP.PARSE_BODY);
    assert(state.timeOnHeadersEnd != null);
    assert(state.timeOnBodyEnd == null);
    if (state.timeOnBodyStart == null) {
      state.timeOnBodyStart = performance.now();
    }
    if (isHttpStream(state.headers)) {
      if (state.size > 0) {
        const buf = state.dataBuf;
        state.dataBuf = Buffer.from([]);
        state.size = 0;
        if (onBody) {
          await onBody(buf);
        }
      }
    } else if (!Object.hasOwnProperty.call(state.headers, 'content-length')) {
      assert(state.headers['transfer-encoding']);
      assert(state.headers['transfer-encoding'].toLowerCase() === 'chunked');
      await parseBodyWithChunk();
    } else {
      assert(!state.headers['transfer-encoding'] || Object.hasOwnProperty.call(state.headers, 'transfer-encoding').toLowerCase() !== 'chunked');
      await parseBodyWithContentLength();
    }
  };

  const processors = [
    parseStartLine,
    parseHeaders,
    parseBody,
  ];

  return async (chunk) => {
    assert(Buffer.isBuffer(chunk), 'Input must be a Buffer');
    assert(!isBodyParseComplete(), 'Parser already completed');
    state.count += 1;
    const bytes = chunk.length;

    if (bytes > 0) {
      state.bytes += bytes;
      state.size += bytes;
      state.dataBuf = Buffer.concat([state.dataBuf, chunk], state.size);
    }

    if (state.pending) {
      return getState();
    }

    while (state.step < processors.length) {
      const processor = processors[state.step];
      const current = state.step;
      state.pending = true;
      try {
        await processor();
      } finally {
        state.pending = false;
      }
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

export const decodeHttpRequest = (options) => decodeHttp({ ...options || {}, isRequest: true });

export const decodeHttpResponse = (options) => decodeHttp({ ...options || {}, isRequest: false });
