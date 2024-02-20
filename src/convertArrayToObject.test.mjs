import assert from 'node:assert';
import test from 'node:test';
import convertArrayToObject from './convertArrayToObject.mjs';

test('convertArrayToObject', () => {
  assert.throws(() => {
    convertArrayToObject({});
  });
  assert.throws(() => {
    convertArrayToObject(['aa', 'bb', 'cc']);
  });
  assert.deepEqual(convertArrayToObject([]), {});
  assert.deepEqual(convertArrayToObject(['name', '']), { name: '' });
  assert.deepEqual(convertArrayToObject(['name', '%E4%BD%A0%E5%A5%BD']), { name: '你好' });
  assert.deepEqual(convertArrayToObject(['name', '', 'Content-length', '33']), { name: '', 'content-length': 33 });
  assert.deepEqual(convertArrayToObject(['name', '', 'Content-length', '33', 'Content-length', '66']), { name: '', 'content-length': 33 });
  assert.deepEqual(convertArrayToObject(['name', '', 'name', 'ccc', 'foo', 'bar']), { name: ['', 'ccc'], foo: 'bar' });
  assert.deepEqual(convertArrayToObject(['name', '', 'name', 'ccc', 'foo', 'bar', 'name', 'xxx']), { name: ['', 'ccc', 'xxx'], foo: 'bar' });
});
