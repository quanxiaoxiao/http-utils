/* eslint max-classes-per-file: 0 */

export class HttpParserError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.message = message || 'HTTP Parser Error';
    this.statusCode = statusCode || null;
  }
}

export class HttpUrlParseError extends Error {
  constructor(message) {
    super(message);
    this.message = message || 'Http Url Parse Error';
  }
}
