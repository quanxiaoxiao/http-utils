import assert from 'node:assert';
import test from 'node:test';

import parseCookie from './parseCookie.mjs';

test('parseCookie', () => {
  assert.deepEqual(parseCookie(), {});
  assert.deepEqual(parseCookie('name=aa'), { name: 'aa' });
  assert.deepEqual(parseCookie('=aa'), {});
  assert.deepEqual(parseCookie('  =  aa'), {});
  assert.deepEqual(parseCookie('FOO    = bar;   baz  =   raz'), { FOO: 'bar', baz: 'raz' });
  assert.deepEqual(parseCookie('foo= ; bar='), { foo: '', bar: '' });
  assert.deepEqual(parseCookie('foo="bar=123456789&name=Magic+Mouse"'), { foo: 'bar=123456789&name=Magic+Mouse' });
  assert.deepEqual(parseCookie('email=%20%22%2c%3b%2f'), { email: ' ",;/' });
  assert.deepEqual(parseCookie('foo=%1;bar=bar'), { foo: '%1', bar: 'bar' });
  assert.deepEqual(parseCookie('foo=bar;fizz  ;  buzz'), { foo: 'bar', fizz: true, buzz: true });
  assert.deepEqual(parseCookie('  fizz; foo=  bar'), { foo: 'bar', fizz: true });
  assert.deepEqual(parseCookie('foo=%1;bar=bar;foo=boo'), { foo: '%1', bar: 'bar' });
  assert.deepEqual(parseCookie('foo=false;bar=bar;foo=true'), { foo: 'false', bar: 'bar' });
  assert.deepEqual(parseCookie('foo=;bar=bar;foo=boo'), { foo: '', bar: 'bar' });
  assert.deepEqual(
    parseCookie('_auth=aaa; path=/; expires=Invalid Date; secure; httponly'),
    { _auth: 'aaa', path: '/', expires: 'Invalid Date', secure: true, httponly: true },
  );
});
