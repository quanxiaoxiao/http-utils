/* eslint max-classes-per-file: 0 */
export class HttpUrlParseError extends Error {
  constructor(message) {
    super(message);
    this.code = 'ERR_HTTP_URL_PARSE';
    this.message = message || 'Http Url Parse Error';
  }
}

export class EncodeHttpError extends Error {
  constructor(message) {
    super(message);
    this.code = 'ERR_ENCODE_HTTP';
    this.message = message || 'Encode Http Error';
  }
}

export class DecodeHttpError extends Error {
  constructor(message) {
    super(message);
    this.code = 'ERR_DECODE_HTTP';
    this.message = message || 'Decode Http Error';
  }
}
