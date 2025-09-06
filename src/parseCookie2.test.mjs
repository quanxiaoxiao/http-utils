import assert from 'node:assert';
import { describe,test } from 'node:test';

import parseCookie from './parseCookie.mjs';

describe('Cookie Parser Tests', () => {

  test('应该返回空对象当输入为空', () => {
    assert.deepStrictEqual(parseCookie(''), {});
    assert.deepStrictEqual(parseCookie(null), {});
    assert.deepStrictEqual(parseCookie(undefined), {});
  });

  test('应该解析简单的键值对', () => {
    const result = parseCookie('name=value');
    assert.deepStrictEqual(result, { name: 'value' });
  });

  test('应该解析多个键值对', () => {
    const result = parseCookie('name=value; age=30; city=Beijing');
    assert.deepStrictEqual(result, {
      name: 'value',
      age: '30',
      city: 'Beijing',
    });
  });

  test('应该处理带引号的值', () => {
    const result = parseCookie('name="John Doe"; city="New York"');
    assert.deepStrictEqual(result, {
      name: 'John Doe',
      city: 'New York',
    });
  });

  test('应该处理 URL 编码的值', () => {
    const result = parseCookie('name=John%20Doe; city=New%20York');
    assert.deepStrictEqual(result, {
      name: 'John Doe',
      city: 'New York',
    });
  });

  test('应该处理带引号的 URL 编码值', () => {
    const result = parseCookie('name="John%20Doe"; data="%7B%22key%22%3A%22value%22%7D"');
    assert.deepStrictEqual(result, {
      name: 'John Doe',
      data: '{"key":"value"}',
    });
  });

  test('应该处理无效的 URL 编码', () => {
    const result = parseCookie('name=John%ZZ; invalid=%GG');
    assert.deepStrictEqual(result, {
      name: 'John%ZZ',
      invalid: '%GG',
    });
  });

  test('应该处理布尔值（没有等号的键）', () => {
    const result = parseCookie('secure; httpOnly; name=value');
    assert.deepStrictEqual(result, {
      secure: true,
      httpOnly: true,
      name: 'value',
    });
  });

  test('应该忽略空键', () => {
    const result = parseCookie('=value; name=John; =another');
    assert.deepStrictEqual(result, {
      name: 'John',
    });
  });

  test('应该处理空值', () => {
    const result = parseCookie('name=; value=test; empty=""');
    assert.deepStrictEqual(result, {
      name: '',
      value: 'test',
      empty: '',
    });
  });

  test('应该处理带空格的键值对', () => {
    const result = parseCookie('  name  =  value  ;  age  =  30  ');
    assert.deepStrictEqual(result, {
      name: 'value',
      age: '30',
    });
  });

  test('应该避免重复键（保留第一个）', () => {
    const result = parseCookie('name=first; age=30; name=second');
    assert.deepStrictEqual(result, {
      name: 'first',
      age: '30',
    });
  });

  test('应该处理复杂的 Cookie 字符串', () => {
    const cookieString = 'sessionId=abc123; user="John%20Doe"; preferences="%7B%22theme%22%3A%22dark%22%7D"; secure; httpOnly; maxAge=3600';
    const result = parseCookie(cookieString);
    assert.deepStrictEqual(result, {
      sessionId: 'abc123',
      user: 'John Doe',
      preferences: '{"theme":"dark"}',
      secure: true,
      httpOnly: true,
      maxAge: '3600',
    });
  });

  test('应该处理特殊字符', () => {
    const result = parseCookie('name=value!@#$%^&*(); special="test;value=123"');
    assert.deepStrictEqual(result, {
      name: 'value!@#$%^&*()',
      special: 'test;value=123',
    });
  });

  test('应该处理中文字符', () => {
    const result = parseCookie('用户名=张三; city="北京市"');
    assert.deepStrictEqual(result, {
      用户名: '张三',
      city: '北京市',
    });
  });

  test('应该处理只有分号的字符串', () => {
    const result = parseCookie(';;;');
    assert.deepStrictEqual(result, {});
  });

  test('应该处理只有空格的字符串', () => {
    const result = parseCookie('   ');
    assert.deepStrictEqual(result, {});
  });

  test('应该处理不完整的引号', () => {
    const result = parseCookie('name="unclosed; complete="value"');
    assert.deepStrictEqual(result, {
      name: '"unclosed',
      complete: 'value',
    });
  });

  test('应该处理不完整的引号2', () => {
    const result = parseCookie('name="unclosed; complete="value"; aa="adsfw"');
    assert.deepStrictEqual(result, { name: '"unclosed', complete: 'value', aa: 'adsfw' });
  });

  test('应该处理嵌套引号', () => {
    const result = parseCookie('data="\\"nested\\" quotes"');
    assert.deepStrictEqual(result, {
      data: '\\"nested\\" quotes',
    });
  });
});

// 性能测试
describe('Performance Tests', () => {
  test('应该能处理大量数据', () => {
    const largeCookie = Array.from({ length: 1000 }, (_, i) => `key${i}=value${i}`).join(';');
    const start = process.hrtime.bigint();
    const result = parseCookie(largeCookie);
    const end = process.hrtime.bigint();

    assert.strictEqual(Object.keys(result).length, 1000);
    assert.strictEqual(result.key0, 'value0');
    assert.strictEqual(result.key999, 'value999');

    const executionTime = Number(end - start) / 1_000_000;
    assert(executionTime < 100, `Execution time ${executionTime}ms should be less than 100ms`);
  });
});
