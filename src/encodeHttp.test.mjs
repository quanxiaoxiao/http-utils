import { PassThrough } from 'node:stream';
import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert';
import encodeHttp from './encodeHttp.mjs';

test('encodeHttp', () => {
  assert.equal(
    encodeHttp({ body: null }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    typeof encodeHttp({}),
    'function',
  );
});

test('encodeHttp response with startline', () => {
  assert.throws(() => {
    encodeHttp({
      statusCode: 1001,
      body: null,
    });
  });
  assert.equal(
    encodeHttp({
      body: null,
      statusText: null,
    }).toString(),
    'HTTP/1.1 200\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      body: null,
      statusCode: 666,
    }).toString(),
    'HTTP/1.1 666\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      body: null,
      statusText: 'Good',
    }).toString(),
    'HTTP/1.1 200 Good\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      body: null,
      statusCode: 204,
      statusText: 'Good',
    }).toString(),
    'HTTP/1.1 204 Good\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      body: null,
      statusCode: 204,
    }).toString(),
    `HTTP/1.1 204 ${http.STATUS_CODES['204']}\r\nContent-Length: 0\r\n\r\n`,
  );
  assert.equal(
    encodeHttp({
      body: null,
      httpVersion: '1.0',
    }).toString(),
    'HTTP/1.0 200 OK\r\nContent-Length: 0\r\n\r\n',
  );
});

test('encodeHttp request with startline', () => {
  assert.equal(
    encodeHttp({
      method: 'GET',
      body: null,
    }).toString(),
    'GET / HTTP/1.1\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      method: 'GET',
      path: '/aa',
      body: null,
    }).toString(),
    'GET /aa HTTP/1.1\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      method: 'GET',
      path: '/bb',
      httpVersion: '1.0',
      body: null,
    }).toString(),
    'GET /bb HTTP/1.0\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      method: 'get',
      path: '/bb',
      body: null,
    }).toString(),
    'GET /bb HTTP/1.1\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      method: 'options',
      path: '/bb',
      body: null,
    }).toString(),
    'OPTIONS /bb HTTP/1.1\r\nContent-Length: 0\r\n\r\n',
  );
});

test('encodeHttp with headers', () => {
  assert.throws(() => {
    encodeHttp({
      body: null,
      headers: 'aa',
    });
  });
  assert.throws(() => {
    encodeHttp({
      headers: ['name'],
      body: null,
    });
  });
  assert.equal(
    encodeHttp({
      headers: ['name', 'aa'],
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nname: aa\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: ['Content-Length', '99'],
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: ['Transfer-Encoding', 'chunked'],
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: {
        name: 'aa',
      },
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nname: aa\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: {
        foo: null,
        name: 'aa',
      },
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nname: aa\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: {
        'Content-Length': 99,
        name: 'aa',
      },
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nname: aa\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: {
        'Transfer-Encoding': 'chunked',
        name: 'aa',
      },
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nname: aa\r\nContent-Length: 0\r\n\r\n',
  );
});

test('encodeHttp with body', () => {
  assert.throws(() => {
    encodeHttp({
      body: 1,
    });
  });
  assert.throws(() => {
    encodeHttp({
      body: [],
    });
  });
  assert.throws(() => {
    encodeHttp({
      body: {},
    });
  });
  assert.equal(
    encodeHttp({
      body: Buffer.from([]),
    }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      body: 'aaa',
    }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\naaa',
  );
  assert.equal(
    encodeHttp({
      body: Buffer.from('aaa'),
    }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 3\r\n\r\naaa',
  );
  assert.equal(
    typeof encodeHttp({
      body: new PassThrough(),
    }),
    'function',
  );
});
