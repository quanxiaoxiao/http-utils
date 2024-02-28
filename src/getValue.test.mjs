import assert from 'node:assert';
import test from 'node:test';
import getValue from './getValue.mjs';

test('getValue', () => {
  assert.throws(() => {
    getValue();
  });
  assert.throws(() => {
    getValue({ name: 'xx' }, 'name');
  });
  assert.throws(() => {
    getValue([], '');
  });
  assert.equal(getValue([], 'name'), null);
  assert.equal(getValue(['age', '33', 'name', 'quan'], 'name'), 'quan');
  assert.equal(getValue(['age', '33', 'name', 'quan'], 'na'), null);
  assert.equal(getValue(['age', '33', 'name', 'quan'], 'big'), null);
  assert.equal(getValue(['age', '33', 'nAme', 'quan'], 'name'), 'quan');
  assert.equal(getValue(['age', '33', 'nAme', 'quan'], 'NAME'), 'quan');
  assert.equal(getValue(['age', '33', 'nAme', '%E4%BD%A0%E5%A5%BD'], 'NAME'), '你好');
  assert.deepEqual(getValue(['age', '33', 'nAme', '%E4%BD%A0%E5%A5%BD', 'name', 'bbb'], 'NAME'), ['你好', 'bbb']);
});
