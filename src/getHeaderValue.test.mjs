import assert from 'node:assert';
import test from 'node:test';

import getHeaderValue from './getHeaderValue.mjs';

test('getHeaderValue', () => {
  assert.throws(() => {
    getHeaderValue();
  });
  assert.throws(() => {
    getHeaderValue([], '');
  });
  assert.equal(getHeaderValue({ Name: 'xx' }, 'name'), 'xx');
  assert.equal(getHeaderValue({ name: 'xx' }, 'Name'), 'xx');
  assert.deepEqual(getHeaderValue({ name: 'xx', Name: 'sss' }, 'NAME'), ['xx', 'sss']);
  assert.equal(getHeaderValue([], 'name'), null);
  assert.equal(getHeaderValue(['age', '33', 'name', 'quan'], 'name'), 'quan');
  assert.equal(getHeaderValue(['age', '33', 'name', 'quan'], 'na'), null);
  assert.equal(getHeaderValue(['age', '33', 'name', 'quan'], 'big'), null);
  assert.equal(getHeaderValue(['age', '33', 'nAme', 'quan'], 'name'), 'quan');
  assert.equal(getHeaderValue(['age', '33', 'nAme', 'quan'], 'NAME'), 'quan');
  assert.equal(getHeaderValue(['age', '33', 'nAme', '%E4%BD%A0%E5%A5%BD'], 'NAME'), '你好');
  assert.deepEqual(getHeaderValue(['age', '33', 'nAme', '%E4%BD%A0%E5%A5%BD', 'name', 'bbb'], 'NAME'), ['你好', 'bbb']);
  assert.deepEqual(getHeaderValue(['Host', 'www.test.com'], 'host'), 'www.test.com');
  assert.deepEqual(getHeaderValue(['host', 'www.test.com'], 'host'), 'www.test.com');
});
