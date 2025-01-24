import assert from 'node:assert';
import test from 'node:test';

import parseHttpPath from './parseHttpPath.mjs';

test('parseHttpPath', () => {
  assert.throws(() => {
    parseHttpPath(33);
  });
  assert.deepEqual(parseHttpPath(''), ['/', '', {}]);
  assert.deepEqual(parseHttpPath('?'), ['/', '', {}]);
  assert.deepEqual(parseHttpPath('?name=bbb'), ['/', 'name=bbb', { name: 'bbb' }]);
  assert.deepEqual(parseHttpPath('aaaa?name='), ['/aaaa', 'name=', { name: '' }]);
  assert.deepEqual(parseHttpPath('/aaaa?name='), ['/aaaa', 'name=', { name: '' }]);
  assert.deepEqual(
    parseHttpPath('/api/requests?keywords=%2F%28.%2A%29%2Fdefatt&method='),
    ['/api/requests', 'keywords=%2F%28.%2A%29%2Fdefatt&method=', { method: '', keywords: '/(.*)/defatt' }],
  );
  assert.deepEqual(parseHttpPath('/?name='), ['/', 'name=', { name: '' }]);
  assert.deepEqual(
    parseHttpPath('/api/requests?keywords=aa+bbb&method='),
    ['/api/requests', 'keywords=aa+bbb&method=', { method: '', keywords: 'aa+bbb' }],
  );
});
