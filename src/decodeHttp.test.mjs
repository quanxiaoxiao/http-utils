import { test, mock } from 'node:test';
import assert from 'node:assert';
import { waitFor } from '@quanxiaoxiao/utils';
import { DecodeHttpError } from './errors.mjs';
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

test('decodeHttp > decodeHttpResponse startline', async () => {
  let decode = decodeHttpResponse();
  let ret = await decode(Buffer.from('HTTP/1.1 200\r\nContent-Length: 0\r\n\r\n'));
  assert.equal(ret.statusText, null);
  decode = decodeHttpResponse();
  ret = await decode(Buffer.from('HTTP/1.1 200  \r\nContent-Length: 0\r\n\r\n'));
  assert.equal(ret.statusText, null);
  decode = decodeHttpResponse();
  ret = await decode(Buffer.from('HTTP/1.1 200  Ok\r\nContent-Length: 0\r\n\r\n'));
  assert.equal(ret.statusText, 'Ok');
});

test('decodeHttp > decodeHttpResponse 1', async () => {
  try {
    const decode = decodeHttpResponse();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    throw new Error('xxxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpResponse();
    await decode(Buffer.from(Buffer.from('HTTP/1.1 200OK\r\n')));
    throw new Error('xxxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpResponse();
    await decode(Buffer.from(Buffer.from('HTTP/1.1 0200 OK\r\n')));
    throw new Error('xxxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
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
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET HTTP/1.1\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  const decode = decodeHttpRequest();
  let ret = await decode(Buffer.from('GET /'));
  assert.equal(typeof ret.timeOnStartlineStart, 'number');
  assert.equal(ret.timeOnStartlineEnd, null);
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

test('decodeHttp > decodeHttpRequest onStartLine 1', async () => {
  const onStartLine = mock.fn((state) => {
    assert.equal(typeof state.timeOnStartlineStart, 'number');
    assert.equal(typeof state.timeOnStartline, 'number');
    assert.equal(typeof state.timeOnStartlineEnd, 'number');
    assert.equal(state.method, 'PUT');
    assert.equal(state.path, '/');
    assert.equal(state.httpVersion, '1.1');
  });
  const decode = decodeHttpRequest({
    onStartLine,
  });
  await decode(Buffer.from('put / HTTP/1.1'));
  assert.equal(onStartLine.mock.calls.length, 0);
  await decode(Buffer.from('\r\n'));
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('decodeHttp > decodeHttpRequest onStartLine 2', async () => {
  const onStartLine = mock.fn((state) => {
    assert.equal(typeof state.timeOnStartlineStart, 'number');
    assert.equal(typeof state.timeOnStartline, 'number');
    assert.equal(typeof state.timeOnStartlineEnd, 'number');
    assert.equal(state.method, 'GET');
    assert.equal(state.path, '/quan?name=aaa');
    assert.equal(state.httpVersion, '1.1');
  });
  const decode = decodeHttpRequest({
    onStartLine,
  });
  await decode(Buffer.from('GET /quan?name=aaa HTTP/1.1'));
  assert.equal(onStartLine.mock.calls.length, 0);
  await decode(Buffer.from('\r\nUser-Agent: quan\r\nContent-Length: 4\r\n'));
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('decodeHttp > decodeHttpRequest headers 1', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('name\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
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

test('decodeHttp > decodeHttpRequest onHeader', async () => {
  const onHeader = mock.fn((state) => {
    assert.deepEqual(state.headers, { name: 'bbb', 'content-length': 0 });
    assert.equal(typeof state.timeOnHeadersStart, 'number');
    assert.equal(typeof state.timeOnHeaders, 'number');
    assert.equal(typeof state.timeOnHeadersEnd, 'number');
  });
  const onBody = mock.fn(() => {});
  const decode = decodeHttpRequest({
    onHeader,
    onBody,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  assert.equal(onHeader.mock.calls.length, 0);
  await decode(Buffer.from('name:'));
  assert.equal(onHeader.mock.calls.length, 0);
  await decode(Buffer.from('bbb\r\n'));
  assert.equal(onHeader.mock.calls.length, 0);
  const ret = await decode(Buffer.from('\r\n'));
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onBody.mock.calls.length, 0);
  assert(ret.complete);
  try {
    await decode(Buffer.from('sss'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof assert.AssertionError);
  }
});

test('decodeHttp > decodeHttpRequest onHeader', async () => {
  const onHeader = mock.fn((state) => {
    assert.deepEqual(state.headers, { name: 'bbb' });
    assert.equal(typeof state.timeOnHeadersStart, 'number');
    assert.equal(typeof state.timeOnHeaders, 'number');
    assert.equal(typeof state.timeOnHeadersEnd, 'number');
  });
  const onBody = mock.fn(() => {});
  const decode = decodeHttpResponse({
    onHeader,
    onBody,
  });
  await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
  assert.equal(onHeader.mock.calls.length, 0);
  await decode(Buffer.from('name:'));
  assert.equal(onHeader.mock.calls.length, 0);
  await decode(Buffer.from('bbb\r\n'));
  assert.equal(onHeader.mock.calls.length, 0);
  await decode(Buffer.from('\r\n'));
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onBody.mock.calls.length, 0);
  await decode(Buffer.from('aaaa'));
  assert.equal(onBody.mock.calls.length, 1);
  const ret = await decode(Buffer.from('bbb'));
  assert.equal(onBody.mock.calls.length, 2);
  assert(!ret.complete);
});

test('decodeHttp > decodeHttpRequest with headers content-length invalid', async () => {
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: -1\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: NaN\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: -0\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 0.\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 0.8\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: .8\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 8.\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 08\r\n'));
    throw new Error();
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Content-Length: 66\r\n'));
    await decode(Buffer.from('Content-Length: 77\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
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

test('decodeHttp > decodeHttpResponse with stream', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpResponse({
    onHeader: (ret) => {
      assert.equal(ret.body, null);
    },
    onBody,
  });
  await decode(Buffer.from('HTTP/1.1 200 OK\r\n\r\naaaa'));
  await waitFor(100);
  await decode(Buffer.from('ccc'));
  await waitFor(1000);
  assert.equal(onBody.mock.calls.length, 2);
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'aaaa');
  assert.equal(onBody.mock.calls[1].arguments[0].toString(), 'ccc');
});

test('decodeHttp > decodeHttpResponse 22', async () => {
  const decode = decodeHttpResponse();
  const ret = await decode(Buffer.from('HTTP/1.1 500 OK\r\nName: aaaa\r\n\r\n'));
  assert.equal(ret.complete, true);
  assert.equal(ret.statusCode, 500);
  assert.equal(ret.headers['content-length'], 0);
});

test('decodeHttp > decodeHttpResponse headers set default content-length 1', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpResponse({
    onBody,
  });
  await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
  let ret = await decode(Buffer.from('\r'));
  assert.deepEqual(ret.headers, {});
  ret = await decode(Buffer.from('\n'));
  assert.deepEqual(ret.headers, {});
  assert.deepEqual(ret.headersRaw, []);
  assert(!ret.complete);
  assert.equal(onBody.mock.calls.length, 0);
});

test('decodeHttp > decodeHttpResponse headers set default content-length 2', async () => {
  const onBody = mock.fn((chunk) => {
    assert.equal(chunk.toString(), '\r\n');
  });
  const decode = decodeHttpResponse({
    onBody,
  });
  await decode(Buffer.from('HTTP/1.1 200\r\n'));
  let ret = await decode(Buffer.from('name  : aaa\r\n'));
  assert.deepEqual(ret.headers, { name: 'aaa' });
  assert.deepEqual(ret.headersRaw, ['name', 'aaa']);
  assert(!ret.complete);
  ret = await decode(Buffer.from('\r\n'));
  assert.deepEqual(ret.headers, { name: 'aaa' });
  assert.deepEqual(ret.headersRaw, ['name', 'aaa']);
  assert(!ret.complete);
  assert.equal(onBody.mock.calls.length, 0);
  ret = await decode(Buffer.from('\r\n'));
  assert(!ret.complete);
  assert.equal(onBody.mock.calls.length, 1);
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

test('decodeHttp > decodeHttpResponse body with content-length 2', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpResponse({
    onBody,
  });
  await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
  const ret = await decode(Buffer.from('name: aaa\r\n\r\n\r\n'));
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.timeOnBody, null);
  assert(!ret.complete);
  assert.equal(onBody.mock.calls.length, 1);
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), '\r\n');
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

test('decodeHttp > decodeHttpResponse body with content-length 5', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpResponse({
    onBody,
  });
  await decode(Buffer.from('HTTP/1.1 200 OK\r\n'));
  let ret = await decode(Buffer.from('name: aaa\r\n'));
  assert.equal(ret.body, null);
  ret = await decode(Buffer.from('\r\naaabbb'));
  assert(!ret.complete);
  assert.equal(onBody.mock.calls.length, 1);
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'aaabbb');
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
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n-0\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n-33\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n0.8\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n8.\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n8.9\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n12345689\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n12\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }
  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n2\r\naa\r\n1z\r\n'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
  }

  try {
    const decode = decodeHttpRequest();
    await decode(Buffer.from('GET / HTTP/1.1\r\n'));
    await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n2\r\naa\rb'));
    throw new Error('xxx');
  } catch (error) {
    assert(error instanceof DecodeHttpError);
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

test('decodeHttp > decodeHttpRequest body with chunked 3', async () => {
  const decode = decodeHttpRequest();
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Transfer-encoding: chunked\r\n\r\n5\r\nabc'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'abc');
  ret = await decode(Buffer.from('11'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'abc11');
  ret = await decode(Buffer.from('\r\n'));
  assert.equal(ret.body.toString(), 'abc11');
  assert.equal(ret.dataBuf.toString(), '');
  assert(!ret.complete);
  ret = await decode(Buffer.from('6\r'));
  assert.equal(ret.dataBuf.toString(), '6\r');
  assert.equal(ret.body.toString(), 'abc11');
  ret = await decode(Buffer.from('\n'));
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.body.toString(), 'abc11');
  assert(!ret.complete);
  assert.equal(ret.timeOnBody, null);
  ret = await decode(Buffer.from('123456\r\n'));
  assert(!ret.complete);
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.body.toString(), 'abc11123456');
  ret = await decode(Buffer.from('0\r\n'));
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.body.toString(), 'abc11123456');
  assert(!ret.complete);
  ret = await decode(Buffer.from('\r'));
  assert(!ret.complete);
  assert.equal(ret.dataBuf.toString(), '\r');
  ret = await decode(Buffer.from('\nabasdw'));
  assert(ret.complete);
  assert.equal(ret.body.toString(), 'abc11123456');
  assert.equal(ret.dataBuf.toString(), 'abasdw');
  assert.equal(typeof ret.timeOnBody, 'number');
});

test('decodeHttp > decodeHttpRequest body content-length onBody 1', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpRequest({
    onBody,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('Content-Length: 0\r\n\r\nabcd'));
  assert(ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'abcd');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert.equal(onBody.mock.calls.length, 0);
});

test('decodeHttp > decodeHttpRequest body content-length onBody 2', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpRequest({
    onBody,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  const ret = await decode(Buffer.from('Content-Length: 2\r\n\r\nabcd'));
  assert(ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'cd');
  assert.equal(typeof ret.timeOnBody, 'number');
  assert.equal(onBody.mock.calls.length, 1);
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'ab');
});

test('decodeHttp > decodeHttpRequest body content-length onBody 3', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpRequest({
    onBody,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Content-Length: 4\r\n\r\n'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '');
  assert(ret.timeOnBody === null);
  ret = await decode(Buffer.from('ca'));
  assert.equal(onBody.mock.calls.length, 1);
  assert(!ret.complete);
  assert(ret.timeOnBody === null);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'ca');
  assert.equal(ret.timeOnBody, null);
  ret = await decode(Buffer.from('35eddd'));
  assert(ret.complete);
  assert.equal(onBody.mock.calls.length, 2);
  assert.equal(onBody.mock.calls[1].arguments[0].toString(), '35');
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'eddd');
  assert.equal(typeof ret.timeOnBody, 'number');
});

test('decodeHttp > decodeHttpRequest body content-length onBody 4', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpRequest({
    onBody,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Content-Length: 4\r\n\r\n'));
  ret = await decode(Buffer.from('ca'));
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'ca');
  ret = await decode(Buffer.from('45'));
  assert(ret.complete);
  assert.equal(onBody.mock.calls.length, 2);
  assert.equal(onBody.mock.calls[1].arguments[0].toString(), '45');
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(typeof ret.timeOnBody, 'number');
});

test('decodeHttp > decodeHttpRequest body chunked onBody 1', async () => {
  const onBody = mock.fn(() => {});
  const decode = decodeHttpRequest({
    onBody,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  let ret = await decode(Buffer.from('Transfer-Encoding: chunked\r\n\r\n5\r\naa'));
  assert(!ret.complete);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.timeOnBody, null);
  assert.equal(onBody.mock.calls.length, 0);
  ret = await decode(Buffer.from('b'));
  assert(!ret.complete);
  assert.equal(ret.timeOnBody, null);
  assert.equal(onBody.mock.calls.length, 0);
  ret = await decode(Buffer.from('1'));
  assert.equal(ret.body.toString(), '');
  assert.equal(onBody.mock.calls.length, 0);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), 'aab1');
  ret = await decode(Buffer.from('1\r\n'));
  assert.equal(onBody.mock.calls.length, 1);
  assert.equal(ret.timeOnBody, null);
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'aab11');
  assert.equal(ret.dataBuf.toString(), '');
  assert.equal(ret.body.toString(), '');
  ret = await decode(Buffer.from('0\r\n\r\n22ccss'));
  assert.equal(typeof ret.timeOnBody, 'number');
  assert.equal(onBody.mock.calls.length, 1);
  assert.equal(ret.body.toString(), '');
  assert.equal(ret.dataBuf.toString(), '22ccss');
});

test('decodeHttp > decodeHttpRequest body chunked onEnd', async () => {
  const onEnd = mock.fn((state) => {
    assert(state.complete);
    assert.equal(typeof state.timeOnBodyStart, 'number');
    assert.equal(typeof state.timeOnBodyEnd, 'number');
    assert.equal(state.body.toString(), 'aabbb');
  });
  const decode = decodeHttpRequest({
    onEnd,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\n'));
  await decode(Buffer.from('Transfer-Encoding: chunked\r\n\r\n5\r\naa'));
  assert.equal(onEnd.mock.calls.length, 0);
  await decode(Buffer.from('bbb\r\n'));
  assert.equal(onEnd.mock.calls.length, 0);
  await decode(Buffer.from('0\r\n'));
  assert.equal(onEnd.mock.calls.length, 0);
  await decode(Buffer.from('\r\n'));
  assert.equal(onEnd.mock.calls.length, 1);
});

test('decodeHttp > decodeHttpRequest content-length onEnd', async () => {
  const onEnd = mock.fn((state) => {
    assert(state.complete);
    assert.equal(typeof state.timeOnBodyStart, 'number');
    assert.equal(typeof state.timeOnBodyEnd, 'number');
    assert.equal(state.body.toString(), 'bbaaaaaa');
  });
  const decode = decodeHttpRequest({
    onEnd,
  });
  await decode(Buffer.from('GET / HTTP/1.1\r\nContent-Length: 8\r\n\r\n'));
  assert.equal(onEnd.mock.calls.length, 0);
  await decode(Buffer.from('bb'));
  assert.equal(onEnd.mock.calls.length, 0);
  await decode(Buffer.from('aaaaaa'));
  assert.equal(onEnd.mock.calls.length, 1);
});

test('decodeHttp > decodeHttpRequest pending', async () => {
  const onStartLine = mock.fn(async (state) => {
    assert.deepEqual(state.headers, {});
    await waitFor(500);
  });
  const onHeader = mock.fn(async (state) => {
    assert.deepEqual(state.headers, { 'content-length': 8 });
    await waitFor(500);
  });
  const decode = decodeHttpRequest({
    onStartLine,
    onHeader,
  });
  setTimeout(async () => {
    assert.equal(onHeader.mock.calls.length, 0);
    assert.equal(onStartLine.mock.calls.length, 1);
    const ret = await decode(Buffer.from('aa'));
    assert.deepEqual(ret.headers, {});
    assert.equal(ret.dataBuf.toString(), 'Content-Length: 8\r\n\r\naa');
    assert.equal(ret.body, null);
  }, 100);
  setTimeout(async () => {
    assert.equal(onHeader.mock.calls.length, 1);
    assert.equal(onStartLine.mock.calls.length, 1);
    const ret = await decode(Buffer.from('bb'));
    assert.equal(ret.body.toString(), '');
    assert.equal(ret.dataBuf.toString(), 'aabb');
  }, 600);
  setTimeout(async () => {
    assert.equal(onHeader.mock.calls.length, 1);
    assert.equal(onStartLine.mock.calls.length, 1);
    const ret = await decode(Buffer.from('ccccasdfw'));
    assert.equal(ret.body.toString(), 'aabbcccc');
    assert.equal(ret.dataBuf.toString(), 'asdfw');
  }, 1200);
  const ret = await decode(Buffer.from('GET / HTTP/1.1\r\nContent-Length: 8\r\n\r\n'));
  assert(!ret.complete);
  assert.deepEqual(ret.headers, { 'content-length': 8 });
  assert.equal(ret.body.toString(), 'aabb');
});

test('decodeHttp url', async () => {
  const decode = decodeHttpRequest();
  const ret = await decode(Buffer.from('GET http://127.0.0.1:9090/static/mtruck/jessibuca.js HTTP/1.1\r\nContent-Length: 0\r\n\r\n'));
  assert.equal(ret.path, 'http://127.0.0.1:9090/static/mtruck/jessibuca.js');
});

test('decodeHttpResponse with websocket', async () => {
  const onHeader = mock.fn(() => {});
  const onBody = mock.fn(() => {});
  const decode = decodeHttpResponse({
    onHeader,
    onBody,
  });
  let ret = await decode(Buffer.from([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: HF2n5np4bBfjAM05DT4RVuU5Y8Q=',
    '\r\n',
  ].join('\r\n')));
  assert(!ret.complete);
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(ret.dataBuf.length, 0);
  assert.equal(onBody.mock.calls.length, 0);
  ret = await decode(Buffer.from('aaa'));
  assert.equal(onBody.mock.calls.length, 1);
  assert(!ret.complete);
  assert.equal(ret.dataBuf.length, 0);
  ret = await decode(Buffer.from('bbbb'));
  assert.equal(ret.dataBuf.length, 0);
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onBody.mock.calls.length, 2);
  assert.equal(onBody.mock.calls[0].arguments[0].toString(), 'aaa');
  assert.equal(onBody.mock.calls[1].arguments[0].toString(), 'bbbb');
});
