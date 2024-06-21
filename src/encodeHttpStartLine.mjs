import assert from 'node:assert';
import http from 'node:http';

const HTTP_VERSION = '1.1';

export default (options) => {
  const result = [];
  if (options.method) {
    result.push(options.method.toUpperCase());
    result.push(options.path || '/');
    result.push(`HTTP/${options.httpVersion || HTTP_VERSION}`);
  } else {
    const code = options.statusCode == null ? 200 : options.statusCode;
    assert(code >= 0 && code <= 999);
    result.push(`HTTP/${options.httpVersion || HTTP_VERSION}`);
    result.push(`${code}`);
    if (!Object.hasOwnProperty.call(options, 'statusText')) {
      if (http.STATUS_CODES[code]) {
        result.push(http.STATUS_CODES[code]);
      }
    } else if (options.statusText != null) {
      result.push(options.statusText);
    }
  }

  return Buffer.from(result.join(' '));
};
