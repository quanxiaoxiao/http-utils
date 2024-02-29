import test from 'node:test';
import assert from 'node:assert';
import { decodeHttpRequest, decodeHttpResponse } from './decodeHttp.mjs';

test('decodeHttp > decodeHttpRequest check input', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode('GET /aa');
    throw new Error();
  } catch (error) {
    assert(error instanceof assert.AssertionError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode([]);
    throw new Error();
  } catch (error) {
    assert(error instanceof assert.AssertionError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(111);
    throw new Error();
  } catch (error) {
    assert(error instanceof assert.AssertionError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode();
    throw new Error();
  } catch (error) {
    assert(error instanceof assert.AssertionError);
  }
});

test('decodeHttp > decodeHttpRequest decodeHttpResponse 1', async () => {
  try {
    const decode = decodeHttpResponse();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    throw new Error('xxxx');
  } catch (error) {
    assert(error.statusCode == null);
    assert.equal(error.message, 'parse start line fail');
  }
  try {
    const decode = decodeHttpResponse();
    await decode(Buffer.from(Buffer.from('HTTP/1.1 200OK\r\n')));
    throw new Error('xxxx');
  } catch (error) {
    assert(error.statusCode == null);
    assert.equal(error.message, 'parse start line fail');
  }
  try {
    const decode = decodeHttpResponse();
    await decode(Buffer.from(Buffer.from('HTTP/1.1 0200 OK\r\n')));
    throw new Error('xxxx');
  } catch (error) {
    assert(error.statusCode == null);
    assert.equal(error.message, 'parse start line fail');
  }
  let decode = decodeHttpResponse();
  let ret = await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
  assert.equal(ret.httpVersion, '1.1');
  assert.equal(ret.statusCode, 200);
  assert.equal(ret.statusText, 'OK');

  decode = decodeHttpResponse();
  ret = await decode(Buffer.from('HTTP/1.0 208\r\n'));
  assert.equal(ret.httpVersion, '1.0');
  assert.equal(ret.statusCode, 208);
  assert.equal(ret.statusText, null);
});

test('decodeHttp > decodeHttpRequest startline 1', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'parse start line fail');
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET HTTP/1.1\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'parse start line fail');
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.statusCode, 400);
  }
  const decode = decodeHttpRequest();
  let ret = await decode(Buffer.from('GET /'));
  assert(!ret.complete);
  assert.equal(ret.dataBuf.toString(), 'GET /');
  assert.equal(ret.method, null);
  ret = await decode(Buffer.from('aa/bb?name=quan'));
  assert.equal(ret.dataBuf.toString(), 'GET /aa/bb?name=quan');
  assert.equal(ret.method, null);
  ret = await decode(Buffer.from(' '));
  assert.equal(ret.dataBuf.toString(), 'GET /aa/bb?name=quan ');
  assert.equal(ret.method, null);
  ret = await decode(Buffer.from('HTTP/1.1'));
  assert.equal(ret.dataBuf.toString(), 'GET /aa/bb?name=quan HTTP/1.1');
  assert.equal(ret.method, null);
  ret = await decode(Buffer.from([]));
  assert.equal(ret.method, null);
  ret = await decode(Buffer.from('\r\n'));
  assert.equal(ret.dataBuf.length, 0);
  assert.equal(ret.method, 'GET');
  assert.equal(ret.path, '/aa/bb?name=quan');
  assert.equal(ret.httpVersion, '1.1');
});

test('decodeHttp > decodeHttpRequest startline 2', async () => {
  const decode = decodeHttpRequest();
  const ret = await decode(Buffer.from('get /aa/bb? HTTP/1.0\r\n'));
  assert(!ret.complete);
  assert.equal(ret.method, 'GET');
  assert.equal(ret.path, '/aa/bb?');
  assert.equal(ret.httpVersion, '1.0');
  assert.equal(ret.dataBuf.length, 0);
});

test('decodeHttp > decodeHttpRequest startline 3', async () => {
  const decode = decodeHttpRequest();
  const ret = await decode(Buffer.from('put / HTTP/1.1\r\n'));
  assert(!ret.complete);
  assert.equal(ret.method, 'PUT');
  assert.equal(ret.path, '/');
  assert.equal(ret.httpVersion, '1.1');
});

test('decodeHttp > decodeHttpRequest headers 1', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('name\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'parse headers fail');
  }
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Name:'));
  assert.deepEqual(ret.headers, {});
  assert.equal(ret.dataBuf.toString(), 'Name:');
  ret = await decode(Buffer.from(' quan\r'));
  assert.deepEqual(ret.headers, {});
  assert.equal(ret.dataBuf.toString(), 'Name: quan\r');
  assert(!ret.complete);
  ret = await decode(Buffer.from('\n'));
  assert.equal(ret.dataBuf.length, 0);
  assert.deepEqual(ret.headers, {
    name: 'quan',
  });
  assert.deepEqual(ret.headersRaw, ['Name', 'quan']);
  ret = await decode(Buffer.from('Content-Length: 33\r\nServer'));
  assert.deepEqual(ret.headers, {
    name: 'quan',
    'content-length': 33,
  });
  assert.deepEqual(ret.headersRaw, ['Name', 'quan', 'Content-Length', '33']);
  assert.equal(ret.dataBuf.toString(), 'Server');
  ret = await decode(Buffer.from(':\r\n'));
  assert.deepEqual(ret.headers, {
    name: 'quan',
    'content-length': 33,
  });
  assert.deepEqual(ret.headersRaw, ['Name', 'quan', 'Content-Length', '33']);
  assert.equal(ret.dataBuf.toString(), '');
  assert(!ret.complete);
  ret = await decode(Buffer.from('foo     :      Bar     \r\n\r\naaa'));
  assert.deepEqual(ret.headers, {
    name: 'quan',
    'content-length': 33,
    foo: 'Bar',
  });
  assert.deepEqual(ret.headersRaw, ['Name', 'quan', 'Content-Length', '33', 'foo', 'Bar']);
  assert(!ret.complete);
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.body.toString(), 'aaa');
});

test('decodeHttp > decodeHttpRequest headers 2', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name:\r\n'));
  assert.equal(ret.dataBuf.length, 0);
  assert(!ret.complete);
  assert.deepEqual(ret.headers, {});
});

test('decodeHttp > decodeHttpRequest with headers content-length invalid', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: -1\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: NaN\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: -0\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 0.\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 0.8\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: .8\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 8.\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 08\r\n'));
    throw new Error();
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 66\r\n'));
    await decode(Buffer.from('Content-Length: 77\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse headers fail');
    assert.equal(error.statusCode, 400);
  }
});

test('decodeHttp > decodeHttpRequest headers content-length', async () => {
  let decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Content-Length: 0\r\n'));
  assert.equal(ret.headers['content-length'], 0);

  decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  ret = await decode(Buffer.from('Content-Length: 99\r\n'));
  assert.equal(ret.headers['content-length'], 99);

  decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  ret = await decode(Buffer.from('conTent-length    : 99   \r\n'));
  assert.equal(ret.headers['content-length'], 99);
});

test('decodeHttp > decodeHttpRequest headers multile header key', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('name: aaa\r\n'));
  assert.equal(ret.headers.name, 'aaa');
  ret = await decode(Buffer.from('name: bbb'));
  assert.equal(ret.headers.name, 'aaa');
  assert.deepEqual(ret.headersRaw, ['name', 'aaa']);
  assert.equal(ret.dataBuf.toString(), 'name: bbb');
  ret = await decode(Buffer.from('\r\n'));
  assert.deepEqual(ret.headers.name, ['aaa', 'bbb']);
  assert.deepEqual(ret.headersRaw, ['name', 'aaa', 'name', 'bbb']);
  ret = await decode(Buffer.from('server:quan\r\n'));
  assert.deepEqual(ret.headers, {
    name: ['aaa', 'bbb'],
    server: 'quan',
  });
  assert.deepEqual(ret.headersRaw, ['name', 'aaa', 'name', 'bbb', 'server', 'quan']);
});

test('decodeHttp > decodeHttpRequest headers set default content-length 1', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('\r'));
  assert.deepEqual(ret.headers, {});
  ret = await decode(Buffer.from('\n'));
  assert.deepEqual(ret.headers, { 'content-length': 0 });
  assert.deepEqual(ret.headersRaw, []);
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest headers set default content-length 2', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('name  : aaa\r\n'));
  assert.deepEqual(ret.headers, { name: 'aaa' });
  assert.deepEqual(ret.headersRaw, ['name', 'aaa']);
  assert(!ret.complete);
  ret = await decode(Buffer.from('\r\n'));
  assert.deepEqual(ret.headers, { 'content-length': 0, name: 'aaa' });
  assert.deepEqual(ret.headersRaw, ['name', 'aaa']);
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest headers with transfer-encoding: chunked 1', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Transfer-Encoding: chunked\r\n'));
  assert.deepEqual(ret.headers, { 'transfer-encoding': 'chunked' });
  assert.deepEqual(ret.headersRaw, ['Transfer-Encoding', 'chunked']);
  ret = await decode(Buffer.from('\r\n'));
  assert.deepEqual(ret.headers, { 'transfer-encoding': 'chunked' });
  assert.deepEqual(ret.headersRaw, ['Transfer-Encoding', 'chunked']);
  assert(!ret.complete);
});

test('decodeHttp > decodeHttpRequest headers with transfer-encoding: chunked 2', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Transfer-Encoding: chunked\r\nContent-Length: 22\r\n'));
  assert.deepEqual(ret.headers, { 'transfer-encoding': 'chunked', 'content-length': 22 });
  assert.deepEqual(ret.headersRaw, ['Transfer-Encoding', 'chunked', 'Content-Length', '22']);
  ret = await decode(Buffer.from('\r\n'));
  assert.deepEqual(ret.headers, { 'transfer-encoding': 'chunked' });
  assert.deepEqual(ret.headersRaw, ['Transfer-Encoding', 'chunked', 'Content-Length', '22']);
  assert(!ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 1', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Content-Length: 5\r\n\r\n'));
  assert(!ret.complete);
  ret = await decode(Buffer.from('bbb'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), 'bbb');
  assert.equal(ret.dataBuf.toString(), '');
  ret = await decode(Buffer.from('45678'));
  assert.equal(ret.body.toString(), 'bbb45');
  assert.equal(ret.dataBuf.toString(), '678');
  assert(ret.complete);
  try {
    await decode(Buffer.from('bbb'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof assert.AssertionError);
  }
});

test('decodeHttp > decodeHttpRequest body with content-length 2', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\n\r\n'));
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 3', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\nContent-Length: 0\r\n\r\n'));
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 4', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\nContent-Length: 0\r\n\r\naaabbb'));
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'aaabbb');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 5', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\n\r\naaabbb'));
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'aaabbb');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 6', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('name: aaa\r\nContent-Length: 10\r\nfoo'));
  assert.equal(ret.timeOnHeaders, null);
  ret = await decode(Buffer.from(':bar\r\n\r\n1abc'));
  assert.equal(typeof ret.timeOnHeaders, 'number');
  assert.equal(ret.body.toString(), '1abc');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.timeOnBody, null);
  assert(!ret.complete);
  ret = await decode(Buffer.from([]));
  assert.equal(ret.body.toString(), '1abc');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.timeOnBody, null);
  assert(!ret.complete);
  ret = await decode(Buffer.from('bb2390adsfjadsdf'));
  assert.equal(ret.body.toString(), '1abcbb2390');
  assert.equal(ret.dataBuf.toString(), 'adsfjadsdf');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 7', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('name: aaa\r\nContent-Length: 4\r\n\r\nfoo'));
  assert(!ret.complete);
  ret = await decode(Buffer.from('b'));
  assert.equal(ret.body.toString(), 'foob');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 8', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\nContent-Length: 4\r\n\r\nfoobc'));
  assert.equal(ret.body.toString(), 'foob');
  assert.equal(ret.dataBuf.toString(), 'c');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with content-length 9', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\nContent-Length: 4\r\n\r\nfoob'));
  assert.equal(ret.body.toString(), 'foob');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert(ret.complete);
});

test('decodeHttp > decodeHttpRequest body with chunked size invalid', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\nbz\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n-0\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n-33\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n0.8\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n8.\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n8.9\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n12345689\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n12\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n2\r\naa\r\n1z\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }

  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n2\r\naa\rb'));
    throw new Error('xxx');
  } catch (error) {
    assert.equal(error.message, 'parse body fail');
    assert.equal(error.statusCode, 400);
  }
});

test('decodeHttp > decodeHttpRequest body with chunked 1', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n'));
  assert(!ret.complete);
  ret = await decode(Buffer.from('3\r\naaa\r'));
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'aaa\r');
  ret = await decode(Buffer.from('\n5\r'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), 'aaa');
  assert.equal(ret.dataBuf.toString(), '5\r');
  ret = await decode(Buffer.from('\n45686\r\n0\r'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), 'aaa45686');
  assert.equal(ret.dataBuf.toString(), '0\r');
  ret = await decode(Buffer.from('\n\r\naabbc'));
  assert(ret.complete);
  assert.equal(ret.body.toString(), 'aaa45686');
  assert.equal(ret.dataBuf.toString(), 'aabbc');
});

test('decodeHttp > decodeHttpRequest body with chunked 2', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n0\r\n\r\n'));
  assert(ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '');
});
