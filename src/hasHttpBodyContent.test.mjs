import assert from 'node:assert';
import test from 'node:test';
import hasHttpBodyContent from './hasHttpBodyContent.mjs';

test('hasHttpBodyContent', () => {
  assert.equal(hasHttpBodyContent({}), true);
  assert.equal(hasHttpBodyContent({ 'content-length': 0 }), false);
  assert.equal(hasHttpBodyContent({ 'Content-Length': 0 }), true);
  assert.equal(hasHttpBodyContent({ 'content-encoding': null, 'content-length': 0 }), false);
  assert.equal(hasHttpBodyContent({ 'content-encoding': null, 'content-length': 1 }), true);
  assert.equal(hasHttpBodyContent({ name: 'aaa' }), true);
});
