import assert from 'node:assert';
import { describe,test } from 'node:test';

import omitHeaderKeys from './omitHeaderKeys.mjs';

describe('omitHeaderKeys 函数测试', () => {
  test('基本过滤功能 - 过滤指定的header', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
      'User-Agent': 'MyApp/1.0',
      Accept: 'application/json',
    };

    const headerNameList = ['authorization', 'user-agent'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    assert.deepStrictEqual(result, expected);
  });

  test('大小写不敏感 - headers大写，过滤列表小写', () => {
    const headers = {
      'CONTENT-TYPE': 'text/html',
      AUTHORIZATION: 'Bearer xyz',
      HOST: 'example.com',
    };

    const headerNameList = ['content-type', 'authorization'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      HOST: 'example.com',
    };

    assert.deepStrictEqual(result, expected);
  });

  test('大小写不敏感 - headers小写，过滤列表大写', () => {
    const headers = {
      'content-type': 'application/xml',
      authorization: 'Basic abc123',
      'cache-control': 'no-cache',
    };

    const headerNameList = ['CONTENT-TYPE', 'AUTHORIZATION'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      'cache-control': 'no-cache',
    };

    assert.deepStrictEqual(result, expected);
  });

  test('空headers对象', () => {
    const headers = {};
    const headerNameList = ['authorization', 'content-type'];
    const result = omitHeaderKeys(headers, headerNameList);

    assert.deepStrictEqual(result, {});
  });

  test('空过滤列表 - 应该返回所有headers', () => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
      'User-Agent': 'TestAgent',
    };

    const headerNameList = [];
    const result = omitHeaderKeys(headers, headerNameList);

    assert.deepStrictEqual(result, headers);
  });

  test('过滤列表包含不存在的header名称', () => {
    const headers = {
      'Content-Type': 'application/json',
      Host: 'api.example.com',
    };

    const headerNameList = ['authorization', 'x-custom-header', 'content-type'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      Host: 'api.example.com',
    };

    assert.deepStrictEqual(result, expected);
  });

  test('所有headers都被过滤', () => {
    const headers = {
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    };

    const headerNameList = ['authorization', 'content-type'];
    const result = omitHeaderKeys(headers, headerNameList);

    assert.deepStrictEqual(result, {});
  });

  test('header值包含特殊字符和数字', () => {
    const headers = {
      'X-Request-ID': '12345-abcde-67890',
      'Content-Length': '1024',
      'X-Custom-Header': 'value with spaces & symbols!',
      Authorization: 'Bearer token',
    };

    const headerNameList = ['authorization'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      'X-Request-ID': '12345-abcde-67890',
      'Content-Length': '1024',
      'X-Custom-Header': 'value with spaces & symbols!',
    };

    assert.deepStrictEqual(result, expected);
  });

  test('header名称包含特殊字符', () => {
    const headers = {
      'x-custom-header-1': 'value1',
      X_CUSTOM_HEADER_2: 'value2',
      'x.custom.header.3': 'value3',
    };

    const headerNameList = ['x-custom-header-1', 'X_CUSTOM_HEADER_2'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      'x.custom.header.3': 'value3',
    };

    assert.deepStrictEqual(result, expected);
  });

  test('性能测试 - 大量headers', () => {
    // 生成大量headers用于性能测试
    const headers = {};
    for (let i = 0; i < 1000; i++) {
      headers[`header-${i}`] = `value-${i}`;
    }

    const headerNameList = ['header-100', 'header-200', 'header-300'];

    const startTime = process.hrtime.bigint();
    const result = omitHeaderKeys(headers, headerNameList);
    const endTime = process.hrtime.bigint();

    // 验证结果正确性
    assert.strictEqual(Object.keys(result).length, 997);
    assert.strictEqual(result['header-0'], 'value-0');
    assert.strictEqual(result['header-999'], 'value-999');
    assert.strictEqual(result['header-100'], undefined);
    assert.strictEqual(result['header-200'], undefined);
    assert.strictEqual(result['header-300'], undefined);

    // 验证执行时间合理 (应该很快)
    const executionTimeMs = Number(endTime - startTime) / 1_000_000;
    console.log(`大量数据执行时间: ${executionTimeMs.toFixed(2)}ms`);
    assert.ok(executionTimeMs < 100, '执行时间应该小于100ms');
  });

  test('边界情况 - undefined和null值', () => {
    const headers = {
      header1: 'value1',
      header2: null,
      header3: undefined,
      header4: '',
    };

    const headerNameList = ['header1'];
    const result = omitHeaderKeys(headers, headerNameList);

    const expected = {
      header2: null,
      header3: undefined,
      header4: '',
    };

    assert.deepStrictEqual(result, expected);
  });
});
