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
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666'), {
    protocol: 'http:',
    port: 6666,
    path: '/',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666/'), {
    protocol: 'http:',
    port: 6666,
    path: '/',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666/aaa/'), {
    protocol: 'http:',
    port: 6666,
    path: '/aaa/',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('http://www.aa.com:6666/aaa'), {
    protocol: 'http:',
    port: 6666,
    path: '/aaa',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com'), {
    protocol: 'https:',
    port: 443,
    path: '/',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com:6666'), {
    protocol: 'https:',
    port: 6666,
    path: '/',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com:6666?name=aaa'), {
    protocol: 'https:',
    port: 6666,
    path: '/?name=aaa',
    hostname: 'www.aa.com',
  });
  assert.deepEqual(parseHttpUrl('https://www.aa.com:6666/quan?name=aaa'), {
    protocol: 'https:',
    port: 6666,
    path: '/quan?name=aaa',
    hostname: 'www.aa.com',
  });
});
