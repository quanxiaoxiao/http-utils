import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert';
import encodeHttp from './encodeHttp.mjs';

test('encodeHttp', () => {
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
    encodeHttp({ body: null }).toString(),
    'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(
    encodeHttp({
      headers: ['name', 'aa'],
      body: null,
    }).toString(),
    'HTTP/1.1 200 OK\r\nname: aa\r\nContent-Length: 0\r\n\r\n',
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
