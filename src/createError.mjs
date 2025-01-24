import assert from 'node:assert';
import http from 'node:http';

export default (statusCode = 500, message) => {
  assert(Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599);
  const error = new Error(message || http.STATUS_CODES[statusCode]);
  error.statusCode = statusCode;
  return error;
};
