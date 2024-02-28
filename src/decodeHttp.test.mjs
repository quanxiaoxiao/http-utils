import test from 'node:test';
import assert from 'node:assert';
import { decodeHttpRequest } from './decodeHttp.mjs';

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

test('decodeHttp > decodeHttpRequest startline 1', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'parse start line fail');
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET HTTP/1.1\r\n'));
  } catch (error) {
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'parse start line fail');
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\n'));
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
    console.log(error);
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
