import assert from 'node:assert';
import http from 'node:http';

const HTTP_VERSION = '1.1';

export default ({
  method,
  path,
  httpVersion,
  statusCode,
  statusText,
}) => {
  const result = [];
  const version = httpVersion || HTTP_VERSION;
  if (method) {
    result.push(method.toUpperCase());
    result.push(path || '/');
    result.push(`HTTP/${version}`);
  } else {
    const code = statusCode == null ? 200 : statusCode;
    assert(code >= 0 && code <= 999);
    result.push(`HTTP/${version}`);
    result.push(`${code}`);
    if ((typeof statusText) !== 'undefined') {
      if (statusText !== '' && statusText != null) {
        result.push(statusText);
      }
    } else if (http.STATUS_CODES[code]) {
      result.push(http.STATUS_CODES[code]);
    }
  }

  return Buffer.from(`${result.join(' ')}\r\n`);
};
