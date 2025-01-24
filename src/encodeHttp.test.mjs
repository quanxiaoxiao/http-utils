import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import { mock,test } from 'node:test';

import encodeHttp from './encodeHttp.mjs';
import { EncodeHttpError } from './errors.mjs';

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
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\n');
  });
  encodeHttp({
    onStartLine,
    body: null,
  });
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with onStartLine 2', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.0 204 no content\r\n');
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
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n');
  });
  const ret = encodeHttp({
    onHeader,
    body: null,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert(Buffer.isBuffer(ret) && ret.length === 0);
});

test('encodeHttp with onHeader 2', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 0\r\n\r\n');
  });
  const ret = encodeHttp({
    onHeader,
    headers: {
      'content-length': 33,
      'Transfer-Encoding': 'chunked',
      name: 'quan',
    },
    body: null,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert(Buffer.isBuffer(ret) && ret.length === 0);
});

test('encodeHttp with onHeader 3', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\n');
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'Content-Length: 0\r\n\r\n');
  });
  const ret = encodeHttp({
    onHeader,
    onStartLine,
    body: null,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
  assert(Buffer.isBuffer(ret) && ret.length === 0);
});

test('encodeHttp with onHeader 4', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\n');
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(chunk.toString(), 'name: quan\r\nContent-Length: 3\r\n\r\n');
  });
  const chunk = encodeHttp({
    onHeader,
    onStartLine,
    headers: { name: 'quan' },
    body: 'abc',
  });
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(chunk.toString(), 'abc');
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
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n');
  assert.throws(() => {
    encode(Buffer.from('aa'));
  });
});

test('encodeHttp content-length 1', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
  });
  assert.equal(typeof encode, 'function');
  assert.equal(
    encode('aaa').toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 3\r\n\r\naaa',
  );
  assert.throws(() => {
    encode('1');
  });
});

test('encodeHttp content-length 2', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 9,
    },
  });
  assert.equal(
    encode('aaa').toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 9\r\n\r\naaa',
  );
  assert.equal(
    encode('bbb').toString(),
    'bbb',
  );
  assert.equal(
    encode('ccc').toString(),
    'ccc',
  );
  assert.throws(() => {
    encode('1');
  });
});

test('encodeHttp content-length 3', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
  });
  assert.throws(() => {
    encode('aaabbb');
  });
});

test('encodeHttp content-length 4', () => {
  const onStartLine = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    onStartLine,
  });
  assert.equal(
    encode('a').toString(),
    'name: quan\r\nContent-Length: 3\r\n\r\na',
  );
  assert.equal(
    onStartLine.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\n',
  );
  assert.equal(
    encode('bb').toString(),
    'bb',
  );
  assert.throws(() => {
    encode('c');
  });
});

test('encodeHttp content-length 5', () => {
  const onStartLine = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    onStartLine,
  });
  assert.equal(
    onStartLine.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\n',
  );
  assert.throws(() => {
    encode('abcd');
  });
});

test('encodeHttp content-length 6', () => {
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    onHeader,
  });
  assert.equal(
    onHeader.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 3\r\n\r\n',
  );
  assert.equal(
    encode('ab').toString(),
    'ab',
  );
});

test('encodeHttp content-length 8', () => {
  const onStartLine = mock.fn(() => {});
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    onStartLine,
    onHeader,
  });
  assert.equal(
    onHeader.mock.calls[0].arguments[0].toString(),
    'name: quan\r\nContent-Length: 3\r\n\r\n',
  );
  assert.equal(
    onStartLine.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\n',
  );
  assert.equal(
    encode('ab').toString(),
    'ab',
  );
});

test('encodeHttp content-length 9', () => {
  const onStartLine = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    onStartLine,
  });
  assert.equal(
    onStartLine.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\n',
  );
  assert.equal(
    encode('ab').toString(),
    'name: quan\r\nContent-Length: 3\r\n\r\nab',
  );
});

test('encodeHttp content-length stream 1', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 6,
    },
    body: new PassThrough(),
  });
  assert.equal(
    encode('ab').toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 6\r\n\r\nab',
  );
  assert.equal(
    encode('ccca').toString(),
    'ccca',
  );
  assert.throws(() => {
    encode('asdfw');
  });
});

test('encodeHttp content-length stream 2', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 6,
    },
    body: new PassThrough(),
  });
  assert.equal(
    encode('ab').toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 6\r\n\r\nab',
  );
  assert.equal(
    encode('ccca').toString(),
    'ccca',
  );
  const ret = encode();
  assert(Buffer.isBuffer(ret) && ret.length === 0);
});

test('encodeHttp content-length stream 3', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    body: new PassThrough(),
  });
  assert.equal(
    encode('abe').toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 3\r\n\r\nabe',
  );
  let ret = encode();
  assert(Buffer.isBuffer(ret) && ret.length === 0);
  ret = encode();
  assert(Buffer.isBuffer(ret) && ret.length === 0);
});

test('encodeHttp content-length invalid 1', () => {
  assert.throws(
    () => {
      encodeHttp({
        headers: {
          name: 'quan',
          'content-length': -3,
        },
      });
    },
    (error) => error instanceof EncodeHttpError,
  );
});

test('encodeHttp content-length invalid 2', () => {
  assert.throws(
    () => {
      encodeHttp({
        headers: {
          name: 'quan',
          'content-length': 8.8,
        },
      });
    },
    (error) => error instanceof EncodeHttpError,
  );
});

test('encodeHttp content-length:0 1', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 0,
    },
  });
  assert.equal(typeof encode, 'function');
  assert.equal(
    encode().toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 0\r\n\r\n',
  );
  assert.throws(() => {
    encode('1');
  });
});

test('encodeHttp content-length:0 2', () => {
  const onStartLine = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 0,
    },
    onStartLine,
  });
  assert.equal(
    encode().toString(),
    'name: quan\r\nContent-Length: 0\r\n\r\n',
  );
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(
    onStartLine.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\n',
  );
  assert.throws(() => {
    encode();
  });
});

test('encodeHttp content-length:0 3', () => {
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 0,
    },
    onHeader,
  });
  const ret = encode();
  assert(Buffer.isBuffer(ret) && ret.length === 0);
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    onHeader.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 0\r\n\r\n',
  );
  assert.throws(() => {
    encode();
  });
});

test('encodeHttp content-length:0 4', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 0,
    },
    body: new PassThrough(),
  });
  assert.equal(typeof encode, 'function');
  assert.throws(
    () => {
      encode('aaa');
    },
    (error) => {
      return error instanceof EncodeHttpError;
    },
  );
});

test('encodeHttp content-length and body 1', () => {
  const ret = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 3,
    },
    body: null,
  });
  assert.equal(
    ret.toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 0\r\n\r\n',
  );
});

test('encodeHttp content-length and body 2', () => {
  const ret = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 0,
    },
    body: 'aaa',
  });
  assert.equal(
    ret.toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nContent-Length: 3\r\n\r\naaa',
  );
});

test('encodeHttp content-length:0 4', () => {
  const onHeader = mock.fn(() => {});
  const onStartLine = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
      'content-length': 0,
    },
    onHeader,
    onStartLine,
  });
  const ret = encode();
  assert(Buffer.isBuffer(ret) && ret.length === 0);
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    onStartLine.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\n',
  );
  assert.equal(
    onHeader.mock.calls[0].arguments[0].toString(),
    'name: quan\r\nContent-Length: 0\r\n\r\n',
  );
  assert.throws(() => {
    encode();
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
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  const chunk = encode(Buffer.from('aaa'));
  assert.equal(chunk.toString(), '3\r\naaa\r\n');
  const chunkWithEnd = encode();
  assert.equal(chunkWithEnd.toString(), '0\r\n\r\n');
});

test('encodeHttp with stream body 2', () => {
  const encode = encodeHttp({});
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
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  const chunk = encode();
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
});

test('encodeHttp with stream body 4', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\n',
    );
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'Transfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
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

test('encodeHttp with stream body 6', () => {
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
  chunk = encode(null);
  assert.equal(
    chunk.toString(),
    '0\r\n\r\n',
  );
  assert.throws(() => {
    encode('aaa');
  });
});

test('encodeHttp with stream body 7', () => {
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
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
  const encode = encodeHttp({
    onHeader: (chunk) => {
      bufList.push(chunk);
    },
  });
  bufList.push(encode('bbb'));
  bufList.push(encode('11'));
  bufList.push(encode(null));
  assert.equal(
    Buffer.concat(bufList),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nbbb\r\n2\r\n11\r\n0\r\n\r\n',
  );
});

test('encodeHttp with stream body 9', () => {
  const bufList = [];
  const encode = encodeHttp({
    headers: {
      Name: 'quan',
    },
    onStartLine: (chunk) => {
      bufList.push(chunk);
    },
    onHeader: (chunk) => {
      bufList.push(chunk);
    },
  });
  bufList.push(encode('bbb'));
  bufList.push(encode('11'));
  bufList.push(encode(null));
  assert.equal(
    Buffer.concat(bufList).toString(),
    'HTTP/1.1 200 OK\r\nName: quan\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nbbb\r\n2\r\n11\r\n0\r\n\r\n',
  );
});

test('encodeHttp with stream body 10', () => {
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  encode();
  assert.equal(onHeader.mock.calls.length, 1);
});

test('encodeHttp with stream body 11', () => {
  const onStartLine = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'HTTP/1.1 200 OK\r\n',
    );
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'name: quan\r\nTransfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
    onStartLine,
    onHeader,
    headers: {
      name: 'quan',
    },
  });
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 1);
  encode();
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(onStartLine.mock.calls.length, 1);
});

test('encodeHttp with chunk 1', () => {
  const encode = encodeHttp({});
  assert.equal(
    encode().toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n',
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
    'HTTP/1.1 200 OK\r\nname: quan\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n',
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
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
    onHeader,
  });
  assert.equal(onHeader.mock.calls.length, 1);
  let chunk = encode('aaa');
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    '3\r\naaa\r\n',
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
      'HTTP/1.1 200 OK\r\n',
    );
  });
  const onHeader = mock.fn((chunk) => {
    assert.equal(
      chunk.toString(),
      'Transfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
    onStartLine,
    onHeader,
  });
  assert.equal(onStartLine.mock.calls.length, 1);
  assert.equal(onHeader.mock.calls.length, 1);
  let chunk = encode('aaa');
  assert.equal(onHeader.mock.calls.length, 1);
  assert.equal(
    chunk.toString(),
    '3\r\naaa\r\n',
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
      'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n',
    );
  });
  const encode = encodeHttp({
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

test('encodeHttp with chunk 8', () => {
  const largeSize = 65535 * 2 + 22;
  const encode = encodeHttp({});
  let chunk = encode('abc');
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n',
  );
  const buf = Buffer.alloc(largeSize);
  chunk = encode(buf);
  assert.equal(
    chunk.toString(),
    Buffer.concat([
      Buffer.from('ffff\r\n'),
      Buffer.alloc(65535),
      Buffer.from('\r\n'),
      Buffer.from('ffff\r\n'),
      Buffer.alloc(65535),
      Buffer.from('\r\n'),
      Buffer.from('16\r\n'),
      Buffer.alloc(22),
      Buffer.from('\r\n'),
    ]).toString(),
  );
  chunk = encode();
  assert.equal(chunk.toString(), '0\r\n\r\n');
});

test('encodeHttp with chunk 9', () => {
  const largeSize = 65535 * 2;
  const encode = encodeHttp({});
  let chunk = encode('abc');
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n',
  );
  const buf = Buffer.alloc(largeSize);
  chunk = encode(buf);
  assert.equal(
    chunk.toString(),
    Buffer.concat([
      Buffer.from('ffff\r\n'),
      Buffer.alloc(65535),
      Buffer.from('\r\n'),
      Buffer.from('ffff\r\n'),
      Buffer.alloc(65535),
      Buffer.from('\r\n'),
    ]).toString(),
  );
  chunk = encode();
  assert.equal(chunk.toString(), '0\r\n\r\n');
});

test('encodeHttp with chunk 10', () => {
  const largeSize = 65535;
  const encode = encodeHttp({});
  let chunk = encode('abc');
  assert.equal(
    chunk.toString(),
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n',
  );
  const buf = Buffer.alloc(largeSize);
  chunk = encode(buf);
  assert.equal(
    chunk.toString(),
    Buffer.concat([
      Buffer.from('ffff\r\n'),
      Buffer.alloc(65535),
      Buffer.from('\r\n'),
    ]).toString(),
  );
  chunk = encode();
  assert.equal(chunk.toString(), '0\r\n\r\n');
});

test('encodeHttp with chunk 11', () => {
  const encode = encodeHttp({
    headers: {
      name: 'quan',
    },
    body: new PassThrough(),
  });
  assert.equal(typeof encode, 'function');
  const chunk = encode(Buffer.from('aaa'));
  assert.equal(chunk.toString(), 'HTTP/1.1 200 OK\r\nname: quan\r\nTransfer-Encoding: chunked\r\n\r\n3\r\naaa\r\n');
});

test('encodeHttp with chunk 12', () => {
  const onHeader = mock.fn(() => {});
  const encode = encodeHttp({
    headers: {
      name: 'quan',
    },
    body: new PassThrough(),
    onHeader,
  });
  assert.equal(
    onHeader.mock.calls[0].arguments[0].toString(),
    'HTTP/1.1 200 OK\r\nname: quan\r\nTransfer-Encoding: chunked\r\n\r\n',
  );
  assert.equal(typeof encode, 'function');
  const chunk = encode(Buffer.from('aaa'));
  assert.equal(chunk.toString(), '3\r\naaa\r\n');
  assert.equal(onHeader.mock.calls.length, 1);
});
