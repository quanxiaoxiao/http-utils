import { PassThrough } from 'node:stream';
import { test, mock } from 'node:test';
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

test('encodeHttp body invalid', () => {
  assert.throws(() => {
    encodeHttp({
      body: {},
    });
  });
  assert.throws(() => {
    encodeHttp({
      body: [],
    });
  });
  assert.throws(() => {
    encodeHttp({
      onHeader: () => {
        throw new Error('aaa');
      },
      onStartLine: () => {
        throw new Error('bbb');
      },
      body: 123,
    });
  }, (error) => error instanceof assert.AssertionError);
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

test('encodeHttp with onStartLine 1', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK');
  });
  encodeHttp({
    onStartLine,
    body: null,
  });
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with onStartLine 2', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.0 204 no content');
  });
  encodeHttp({
    onStartLine,
    httpVersion: '1.0',
    statusCode: 204,
    statusText: 'no content',
    body: null,
  });
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with onHeader 1', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n');
  });
  const chunk = encodeHttp({
    onHeader,
    body: null,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n');
});

test('encodeHttp with onHeader 2', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 0\r\n');
  });
  const chunk = encodeHttp({
    onHeader,
    headers: {
      'content-length': 33,
      'Transfer-Encoding': 'chunked',
      name: 'quan',
    },
    body: null,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 0\r\n\r\n');
});

test('encodeHttp with onHeader 3', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK');
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'Content-Length: 0\r\n');
  });
  const chunk = encodeHttp({
    onHeader,
    onStartLine,
    body: null,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n');
});

test('encodeHttp with onHeader 4', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK');
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'name: quan\r\nContent-Length: 3\r\n');
  });
  const chunk = encodeHttp({
    onHeader,
    onStartLine,
    headers: { name: 'quan' },
    body: 'abc',
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 3\r\n\r\nabc');
});

test('encodeHttp with body 1', () => {
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

test('encodeHttp with body 2', () => {
  const onEnd = mock.fn(() => {});
  encodeHttp({
    onEnd,
    body: '123',
  });
  assert.equal(onEnd.mock.calls.length, 0);
});

test('encodeHttp with empty chunked 1', () => {
  const encode = encodeHttp({});
  assert.equal(typeof encode, 'function');
  const chunk = encode();
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\n\r\n');
  assert.throws(() => {
    encode(Buffer.from('aa'));
  });
});

test('encodeHttp with empty chunked 2', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      foo: 'bar',
      'content-length': 99,
    },
  });
  assert.equal(typeof encode, 'function');
  const chunk = encode();
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nfoo: bar\r\n\r\n');
  assert.throws(() => {
    encode(Buffer.from('aa'));
  });
});

test('encodeHttp with chunked 1', () => {
  const encode = encodeHttp({});
  const chunk = encode(Buffer.from('aaa'));
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n');
});

test('encodeHttp with chunked 2', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 0);
  const chunk = encode(Buffer.from('aaa'));
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n');
  assert.equal(onHeader.mock.calls.length, 1);
  const chunkWithEnd = encode();
  assert.equal(chunkWithEnd.toString(), '0\r\n\r\n');
});

test('encodeHttp with chunked 3', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\nname: quan\r\nTransfer-Encoding: chunked\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
    headers: {
      'content-length': 66,
      name: 'quan',
    },
  });
  assert.equal(onHeader.mock.calls.length, 0);
  const chunk = encode(Buffer.from('aaa'));
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n');
  assert.equal(onHeader.mock.calls.length, 1);
  const chunkWithEnd = encode();
  assert.equal(chunkWithEnd.toString(), '0\r\n\r\n');
});

test('encodeHttp with stream body 1', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nTransfer-Encoding: chunked\r\n');
  });
  const encode = encodeHttp({
    onHeader,
    headers: {
      'Content-Length': 33,
      name: 'quan',
    },
    body: new PassThrough(),
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(typeof encode, 'function');
  const bodyChunk = encode(Buffer.from('abc'));
  assert.equal(bodyChunk.toString(), '3\r\nabc\r\n');
  assert.throws(() => {
    encode(33);
  });
  const bodyEndChunk = encode();
  assert.equal(bodyEndChunk.toString(), '0\r\n\r\n');
  assert.throws(() => {
    encode(Buffer.from('aaa'));
  });
});

test('encodeHttp with stream body 2', () => {
  const encode = encodeHttp({
    body: new PassThrough(),
  });
  const chunk = encode();
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n',
  );
});

test('encodeHttp with stream body 3', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n',
    );
  });
  const encode = encodeHttp({
    body: new PassThrough(),
    onHeader,
  });
  const chunk = encode();
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
  assert.equal(onHeader.mock.calls.length, 1);
});

test('encodeHttp with stream body 4', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK',
    );
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'Transfer-Encoding: chunked\r\n',
    );
  });
  const encode = encodeHttp({
    body: new PassThrough(),
    onStartLine,
    onHeader,
  });
  const chunk = encode();
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with stream body 5', () => {
  const onEnd = mock.fn((size) => {
    assert.equal(size, 0);
  });
  const encode = encodeHttp({
    body: new PassThrough(),
    onEnd,
  });
  const chunk = encode();
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n',
  );
  assert.equal(onEnd.mock.calls.length, 1);
});

test('encodeHttp with stream body 6', () => {
  const onEnd = mock.fn((size) => {
    assert.equal(size, 5);
  });
  const encode = encodeHttp({
    body: new PassThrough(),
    onEnd,
  });
  let chunk = encode('aaa');
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n',
  );
  assert.equal(onEnd.mock.calls.length, 0);
  chunk = encode('bb');
  assert.equal(
    chunk.toString(),
    '2\r\nbb\r\n',
  );
  assert.equal(onEnd.mock.calls.length, 0);
  chunk = encode(null);
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
  assert.equal(onEnd.mock.calls.length, 1);
});

test('encodeHttp with stream body 6', () => {
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
    body: new PassThrough(),
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  const chunk = encode();
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
});

test('encodeHttp with stream body 7', () => {
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
    body: new PassThrough(),
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  let chunk = encode('bbb');
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    '3\r\nbbb\r\n',
  );
  chunk = encode(null);
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
});

test('encodeHttp with stream body 8', () => {
  const bufList = [];
  const onEnd = mock.fn((size) => {
    assert.equal(size, 5);
  });
  const encode = encodeHttp({
    body: new PassThrough(),
    onEnd,
    onHeader: (chunk) => {
      bufList.push(chunk);
    },
  });
  bufList.push(Buffer.from('\r\n'));
  assert.equal(onEnd.mock.calls.length, 0);
  bufList.push(encode('bbb'));
  assert.equal(onEnd.mock.calls.length, 0);
  bufList.push(encode('11'));
  bufList.push(encode(null));
  assert.equal(
    Buffer.concat(bufList),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nbbb\r\n2\r\n11\r\n0\r\n\r\n',
  );
  assert.equal(onEnd.mock.calls.length, 1);
});

test('encodeHttp with stream body 9', () => {
  const bufList = [];
  const onEnd = mock.fn((size) => {
    assert.equal(size, 5);
  });
  const encode = encodeHttp({
    body: new PassThrough(),
    onStartLine: (chunk) => {
      bufList.push(chunk);
    },
    onEnd,
    onHeader: (chunk) => {
      bufList.push(Buffer.from('\r\n'));
      bufList.push(chunk);
    },
  });
  assert.equal(onEnd.mock.calls.length, 0);
  bufList.push(Buffer.from('\r\n'));
  bufList.push(encode('bbb'));
  assert.equal(onEnd.mock.calls.length, 0);
  bufList.push(encode('11'));
  assert.equal(onEnd.mock.calls.length, 0);
  bufList.push(encode(null));
  assert.equal(
    Buffer.concat(bufList),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nbbb\r\n2\r\n11\r\n0\r\n\r\n',
  );
  assert.equal(onEnd.mock.calls.length, 1);
});

test('encodeHttp with stream body 10', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n',
    );
  });
  const onEnd = mock.fn((size) => {
    assert.equal(size, 0);
  });
  const encode = encodeHttp({
    onHeader,
    body: new PassThrough(),
    onEnd,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onEnd.mock.calls.length, 0);
  encode();
  assert.equal(onEnd.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 1);
});

test('encodeHttp with stream body 11', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK',
    );
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'name: quan\r\nTransfer-Encoding: chunked\r\n',
    );
  });
  const onEnd = mock.fn((size) => {
    assert.equal(size, 0);
  });
  const encode = encodeHttp({
    onStartLine,
    onHeader,
    body: new PassThrough(),
    headers: {
      name: 'quan',
    },
    onEnd,
  });
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onEnd.mock.calls.length, 0);
  encode();
  assert.equal(onEnd.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with chunk 1', () => {
  const encode = encodeHttp({});
  assert.equal(
    encode().toString(),
    'HTTP/1.1 200 OK\r\n\r\n',
  );
});

test('encodeHttp with chunk 2', () => {
  const encode = encodeHttp({
    headers: {
      'content-length': 22,
    },
  });
  assert.equal(
    encode().toString(),
    'HTTP/1.1 200 OK\r\n\r\n',
  );
});

test('encodeHttp with chunk 3', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
    },
  });
  assert.equal(
    encode().toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\n\r\n',
  );
});

test('encodeHttp with chunk 4', () => {
  const encode = encodeHttp({});
  let chunk = encode('aaa');
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n',
  );
  chunk = encode('bb');
  assert.equal(
    chunk.toString(),
    '2\r\nbb\r\n',
  );
  chunk = encode();
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
});

test('encodeHttp with chunk 5', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 0);
  let chunk = encode('aaa');
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n',
  );
  chunk = encode();
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
  assert.equal(onHeader.mock.calls.length, 1);
});

test('encodeHttp with chunk 6', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK',
    );
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'Transfer-Encoding: chunked\r\n',
    );
  });
  const encode = encodeHttp({
    onStartLine,
    onHeader,
  });
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 0);
  let chunk = encode('aaa');
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n',
  );
  chunk = encode();
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with chunk 7', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 0);
  const chunk = encode();
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\n\r\n',
  );
});
