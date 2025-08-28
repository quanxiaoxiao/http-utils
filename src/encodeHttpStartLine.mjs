import assert from 'node:assert';
import http from 'node:http';

const HTTP_VERSION = '1.1';
const DEFAULT_STATUS_CODE = 200;
const MIN_STATUS_CODE = 0;
const MAX_STATUS_CODE = 999;

const resolveStatusText = (statusText, statusCode) => {
  if (statusText !== undefined) {
    return (statusText && statusText.trim()) ? statusText : null;
  }
  return http.STATUS_CODES[statusCode] || null;
};

export default ({
  method,
  path = '/',
  httpVersion = HTTP_VERSION,
  statusCode,
  statusText,
} = {}) => {
  const version = `HTTP/${httpVersion}`;
  if (method) {
    return Buffer.from(`${method.toUpperCase()} ${path} ${version}\r\n`);
  }
  const code = statusCode ?? DEFAULT_STATUS_CODE;
  assert(Number.isInteger(code) && code >= MIN_STATUS_CODE && code <= MAX_STATUS_CODE, `Status code must be an integer between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}, got: ${code}`);
  const resolvedStatusText = resolveStatusText(statusText, code);
  const statusLine = resolvedStatusText
    ? `${version} ${code} ${resolvedStatusText}`
    : `${version} ${code}`;

  return Buffer.from(`${statusLine}\r\n`);
};
