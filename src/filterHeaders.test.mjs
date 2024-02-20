import test from 'node:test';
import assert from 'node:assert';
import filterHeaders from './filterHeaders.mjs';

test('filterHeaders', () => {
  assert.throws(() => {
    filterHeaders({}, ['name']);
  });
  assert.throws(() => {
    filterHeaders([], {});
  });
  assert.deepEqual(
    filterHeaders(['aa', 'bb', 'cc', 'dd'], []),
    ['aa', 'bb', 'cc', 'dd'],
  );
  assert.deepEqual(
    filterHeaders(['aa', 'bb', 'cc', 'dd'], ['bb']),
    ['aa', 'bb', 'cc', 'dd'],
  );
  assert.deepEqual(
    filterHeaders(['aa', 'bb', 'cc', 'dd'], ['cc']),
    ['aa', 'bb'],
  );
  assert.deepEqual(
    filterHeaders(['aA', 'bb', 'cC', 'dd'], ['cc']),
    ['aA', 'bb'],
  );
  assert.deepEqual(
    filterHeaders(['aA', 'bb', 'cC', 'dd', 'aa', 'xx'], ['aa']),
    ['cC', 'dd'],
  );
  assert.deepEqual(
    filterHeaders(['aA', 'bb', 'cC', 'dd'], ['cc', 'aa']),
    [],
  );
  assert.deepEqual(
    filterHeaders(['user-agent', 'quan', 'content-length', '333', 'transfer-encoding', 'chunked'], ['Content-length', 'transfer-encoding']),
    ['user-agent', 'quan'],
  );
  assert.deepEqual(
    filterHeaders(['aA', 'bb', 'cC', 'dd'], ['CC']),
    ['aA', 'bb'],
  );
});
