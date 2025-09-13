import assert from 'node:assert';
import test from 'node:test';

import filterHeaders from './filterHeaders.mjs';

test('filterHeaders - Basic Filtering', () => {
  const headers = ['Content-Type', 'application/json', 'Accept', 'application/xml', 'X-Custom', 'my-value'];
  const keysToFilter = ['Accept'];
  const expected = ['Content-Type', 'application/json', 'X-Custom', 'my-value'];
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), expected);
});

test('filterHeaders - Case Insensitive Filtering', () => {
  const headers = ['content-type', 'application/json', 'ACCEPT', 'application/xml', 'x-custom', 'my-value'];
  const keysToFilter = ['accept']; // 测试小写 key 也能过滤大写 header
  const expected = ['content-type', 'application/json', 'x-custom', 'my-value'];
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), expected);
});

test('filterHeaders - Multiple Keys to Filter', () => {
  const headers = ['Content-Type', 'json', 'Accept', 'xml', 'X-API-Key', 'secret', 'User-Agent', 'browser'];
  const keysToFilter = ['Accept', 'X-API-Key'];
  const expected = ['Content-Type', 'json', 'User-Agent', 'browser'];
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), expected);
});

test('filterHeaders - No Keys to Filter (Empty Array)', () => {
  const headers = ['Content-Type', 'application/json', 'Accept', 'application/xml'];
  const keysToFilter = [];
  // 期望返回原始 headers
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), headers);
});

test('filterHeaders - No Headers Provided', () => {
  const headers = [];
  const keysToFilter = ['Accept'];
  const expected = [];
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), expected);
});

test('filterHeaders - Headers with Odd Number of Elements (Should not happen in typical use, but test robustness)', () => {
  // 这个测试用例假定 headers 总是成对出现的，如果不是，for 循环的 i += 2 会导致 index out of bounds
  // 在实际应用中，你应该确保 headers 数组的健壮性，或者在这里处理这种情况。
  // 对于当前实现，我们期望它能正确处理（最后一个元素可能被忽略）
  const headers = ['Key1', 'Value1', 'Key2']; // Key2 没有对应的 Value
  const keysToFilter = ['Key1'];
  const expected = ['Key2', '']; // Key2 没有被过滤，但也没有配对的值被 pushed
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), expected);
});

test('filterHeaders - Filtering Non-existent Keys', () => {
  const headers = ['Content-Type', 'application/json', 'Accept', 'application/xml'];
  const keysToFilter = ['Non-existent-key', 'Another-one'];
  // 期望返回原始 headers，因为没有匹配项被过滤
  assert.deepStrictEqual(filterHeaders(headers, keysToFilter), headers);
});

test('filterHeaders - Assertions for Invalid Input', () => {
  // 测试 headers 不是数组
  assert.throws(() => filterHeaders('not an array', ['key']), { message: 'headers must be an array' });
  // 测试 keys 不是数组
  assert.throws(() => filterHeaders(['key', 'value'], 'not an array'), { message: 'keys must be an array' });
});
