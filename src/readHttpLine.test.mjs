import assert from 'node:assert';
import test from 'node:test';

import { DecodeHttpError } from './errors.mjs';
import readHttpLine from './readHttpLine.mjs';

test('readHttpLine', () => {
  assert.throws(
    () => {
      readHttpLine('aaa');
    },
    (error) => error instanceof assert.AssertionError,
  );
  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('abc'),
        8,
      );
    },
    (error) => error instanceof assert.AssertionError,
  );
  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('abcefg\n'),
      );
    },
    (error) => error instanceof DecodeHttpError,
  );
  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('abcefg\n'),
        0,
      );
    },
    (error) => error instanceof DecodeHttpError,
  );
  assert.throws(
    () => {
      readHttpLine(
        Buffer.from([]),
        1,
      );
    },
    (error) => error instanceof assert.AssertionError,
  );
  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('aa\r\n'),
        3,
      );
    },
    (error) => error instanceof DecodeHttpError,
  );

  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('aa\r\nc'),
        3,
      );
    },
    (error) => error instanceof DecodeHttpError,
  );

  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('\n'),
        0,
      );
    },
    (error) => error instanceof DecodeHttpError,
  );

  assert.throws(
    () => {
      readHttpLine(
        Buffer.from('1234567'),
        0,
        5,
      );
    },
    (error) => error instanceof DecodeHttpError,
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
    readHttpLine(Buffer.from('abcde')),
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
  assert.equal(
    readHttpLine(Buffer.from('abc\r\n'), 1).toString(),
    'bc',
  );
});
