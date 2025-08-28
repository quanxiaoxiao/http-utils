import assert from 'node:assert';
import qs from 'node:querystring';
import test, { describe } from 'node:test';
import { gzipSync } from 'node:zlib';

import decodeContentToJSON from './decodeContentToJSON.mjs';

test('decodeContentToJSON', () => {
  assert.throws(() => {
    decodeContentToJSON(Buffer.from(JSON.stringify({})));
  });
  assert.equal(
    decodeContentToJSON(Buffer.from('asdfw'), {}),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(JSON.stringify({ name: 'aaa' })), { 'content-type': 'application/json' }),
    { name: 'aaa' },
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(qs.stringify({ name: 'aaa' })), { 'content-type': 'application/json' }),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(qs.stringify({ name: 'aaa' })), { 'content-type': 'application/x-www-form-urlencoded' }),
    { name: 'aaa' },
  );
  assert.deepEqual(
    decodeContentToJSON(Buffer.from(qs.stringify({ name: 'aaa' })), { 'content-type': 'application/json' }),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(gzipSync(Buffer.from(JSON.stringify({ name: 'aaa' }))), { 'content-type': 'application/json' }),
    null,
  );
  assert.deepEqual(
    decodeContentToJSON(gzipSync(Buffer.from(JSON.stringify({ name: 'aaa' }))), { 'content-type': 'application/json', 'content-encoding': 'gzip' }),
    { name: 'aaa' },
  );
});

describe('decodeContentToJSON', () => {
  test('应该解析 JSON 内容', () => {
    const chunk = Buffer.from('{"name": "test", "value": 123}');
    const headers = { 'content-type': 'application/json' };

    const result = decodeContentToJSON(chunk, headers);

    assert.deepStrictEqual(result, { name: 'test', value: 123 });
  });

  test('应该解析 URL 编码内容', () => {
    const chunk = Buffer.from('name=test&value=123&active=true');
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const result = decodeContentToJSON(chunk, headers);
    assert.deepEqual(result, {
      name: 'test',
      value: '123',
      active: 'true',
    });
  });

  test('应该处理带字符集的 content-type', () => {
    const chunk = Buffer.from('{"test": "data"}');
    const headers = { 'content-type': 'application/json; charset=utf-8' };

    const result = decodeContentToJSON(chunk, headers);

    assert.deepStrictEqual(result, { test: 'data' });
  });

  test('应该处理大小写不敏感的 content-type', () => {
    const chunk = Buffer.from('{"case": "insensitive"}');
    const headers = { 'content-type': 'APPLICATION/JSON' };

    const result = decodeContentToJSON(chunk, headers);

    assert.deepStrictEqual(result, { case: 'insensitive' });
  });

  test('空 chunk 应该返回 null', () => {
    const headers = { 'content-type': 'application/json' };

    assert.strictEqual(decodeContentToJSON(null, headers), null);
    assert.strictEqual(decodeContentToJSON(undefined, headers), null);
    assert.strictEqual(decodeContentToJSON(Buffer.alloc(0), headers), null);
  });

  test('不支持的 content-type 应该返回 null', () => {
    const chunk = Buffer.from('some data');

    const textHeaders = { 'content-type': 'text/plain' };
    const xmlHeaders = { 'content-type': 'application/xml' };
    const noHeaders = {};

    assert.strictEqual(decodeContentToJSON(chunk, textHeaders), null);
    assert.strictEqual(decodeContentToJSON(chunk, xmlHeaders), null);
    assert.strictEqual(decodeContentToJSON(chunk, noHeaders), null);
  });

  test('无效的 JSON 应该返回 null', () => {
    const chunk = Buffer.from('{"invalid": json}');
    const headers = { 'content-type': 'application/json' };

    const result = decodeContentToJSON(chunk, headers);

    assert.strictEqual(result, null);
  });

  test('应该处理带编码的内容', () => {
    const chunk = gzipSync(Buffer.from(JSON.stringify({ name: 'xxx' })));
    const headers = {
      'content-type': 'application/json',
      'content-encoding': 'gzip',
    };

    const result = decodeContentToJSON(chunk, headers);

    assert.deepEqual(result, { name: 'xxx' });
  });

  test('复杂的 URL 编码数据', () => {
    const chunk = Buffer.from('user%5Bname%5D=John&user%5Bage%5D=30&tags%5B%5D=nodejs&tags%5B%5D=test');
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const result = decodeContentToJSON(chunk, headers);

    assert.deepEqual(result, {
      'user[name]': 'John',
      'user[age]': '30',
      'tags[]': ['nodejs', 'test'],
    });
  });

  test('嵌套 JSON 对象', () => {
    const chunk = Buffer.from(JSON.stringify({
      user: {
        name: 'Alice',
        profile: {
          age: 25,
          skills: ['JavaScript', 'Node.js'],
        },
      },
      timestamp: new Date().toISOString(),
    }));
    const headers = { 'content-type': 'application/json' };

    const result = decodeContentToJSON(chunk, headers);

    assert(typeof result === 'object');
    assert.strictEqual(result.user.name, 'Alice');
    assert.strictEqual(result.user.profile.age, 25);
    assert(Array.isArray(result.user.profile.skills));
  });

  test('headers 参数验证', () => {
    const chunk = Buffer.from('{"test": "data"}');

    // 应该抛出断言错误
    assert.throws(() => {
      decodeContentToJSON(chunk, 'invalid headers');
    }, /headers must be a plain object/);

    assert.throws(() => {
      decodeContentToJSON(chunk, null);
    }, /headers must be a plain object/);
  });

  test('边界情况 - 空 JSON 对象和数组', () => {
    const emptyObject = Buffer.from('{}');
    const emptyArray = Buffer.from('[]');
    const headers = { 'content-type': 'application/json' };

    assert.deepStrictEqual(decodeContentToJSON(emptyObject, headers), {});
    assert.deepStrictEqual(decodeContentToJSON(emptyArray, headers), []);
  });

  test('边界情况 - 空查询字符串', () => {
    const chunk = Buffer.from('');
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const result = decodeContentToJSON(chunk, headers);

    assert.strictEqual(result, null); // 因为 chunk.length === 0
  });

  test('特殊字符处理', () => {
    const chunk = Buffer.from('message=Hello%20World%21&symbol=%26%40%23');
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const result = decodeContentToJSON(chunk, headers);

    assert.deepEqual(result, {
      message: 'Hello World!',
      symbol: '&@#',
    });
  });
});
