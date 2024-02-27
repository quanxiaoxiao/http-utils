import test from 'node:test';
import assert from 'node:assert';
import readHttpLine from './readHttpLine.mjs';

test('readHttpLine', () => {
  assert.throws(() => {
    readHttpLine('aaa');
  });
  assert.throws(() => {
    readHttpLine(
      Buffer.from('abc'),
      8,
    );
  });
  assert.throws(() => {
    readHttpLine(
      Buffer.from('abc'),
      0,
      1110,
    );
  });
  assert.throws(() => {
    readHttpLine(
      Buffer.from([]),
      1,
    );
  });
  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('aa\r\n'),
        3,
      );
    },
    (error) => error.statusCode == null && error.message === 'parse fail',
  );

  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('aa\r\nc'),
        3,
      );
    },
    (error) => error.statusCode == null && error.message === 'parse fail',
  );

  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('\n'),
        0,
        400,
      );
    },
    (error) => error.statusCode === 400 && error.message === 'parse fail',
  );

  assert.equal(
    readHttpLine(Buffer.from([])),
    null,
  );
  assert.equal(
    readHttpLine(Buffer.from('a')),
    null,
  );
  assert.equal(
    readHttpLine(Buffer.from('abc\r\n')).toString(),
    'abc',
  );
  assert.equal(
    readHttpLine(Buffer.from('abc\r\n'), 1).toString(),
    'bc',
  );
  assert.equal(
    readHttpLine(Buffer.from('abc\r\n'), 2).toString(),
    'c',
  );
  assert.equal(
    readHttpLine(Buffer.from('abc\r\n'), 3).toString(),
    '',
  );
});
