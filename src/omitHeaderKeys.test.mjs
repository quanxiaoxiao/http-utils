import assert from 'node:assert';
import test from 'node:test';

import omitHeaderKeys from './omitHeaderKeys.mjs';

test('omitHeaderKeys', () => {
  assert.deepEqual(
    omitHeaderKeys(
      {
        Auth: 'quan',
        ding: 'xx',
      },
      ['auth', 'foo'],
    ),
    { ding: 'xx' },
  );
  assert.deepEqual(
    omitHeaderKeys(
      {
        Auth: 'quan',
        dIng: 'xx',
      },
      ['AUTH', 'foo'],
    ),
    { dIng: 'xx' },
  );
  assert.deepEqual(
    omitHeaderKeys(
      {
        Auth: 'quan',
        FOO: 'bar',
        dIng: 'xx',
      },
      ['AUTH', 'foo'],
    ),
    { dIng: 'xx' },
  );
});
