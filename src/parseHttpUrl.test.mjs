import assert from 'node:assert';
import test from 'node:test';

import parseHttpUrl from './parseHttpUrl.mjs';

test('parseHttpUrl', () => {
  assert.throws(() => {
    parseHttpUrl('ftp://127.0.0.1:4433/aaa/bb');
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com'), {
    protocol: 'http:',
    port: 80,
    path: '/',
    hash: null,
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666'), {
    protocol: 'http:',
    port: 6666,
    path: '/',
    hash: null,
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666/'), {
    protocol: 'http:',
    port: 6666,
    path: '/',
    hash: null,
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666/aaa/'), {
    protocol: 'http:',
    port: 6666,
    path: '/aaa/',
    hash: null,
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666/aaa'), {
    protocol: 'http:',
    port: 6666,
    hash: null,
    path: '/aaa',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com'), {
    protocol: 'https:',
    port: 443,
    path: '/',
    hash: null,
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com:6666'), {
    protocol: 'https:',
    port: 6666,
    hash: null,
    path: '/',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com:6666?name=aaa'), {
    protocol: 'https:',
    port: 6666,
    hash: null,
    path: '/?name=aaa',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com:6666/quan?name=aaa'), {
    protocol: 'https:',
    port: 6666,
    hash: null,
    path: '/quan?name=aaa',
    hostname: 'www.aa.com',
  });
});
