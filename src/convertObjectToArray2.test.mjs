import assert from 'node:assert';
import { describe,test } from 'node:test';

import convertObjectToArray from './convertObjectToArray.mjs';

describe('convertObjectToArray 函数测试', () => {

  describe('边界情况测试', () => {
    test('null 输入应该返回空数组', () => {
      assert.deepStrictEqual(convertObjectToArray(null), []);
    });

    test('undefined 输入应该返回空数组', () => {
      assert.deepStrictEqual(convertObjectToArray(undefined), []);
    });

    test('数组输入应该返回空数组', () => {
      assert.deepStrictEqual(convertObjectToArray([1, 2, 3]), []);
      assert.deepStrictEqual(convertObjectToArray([]), []);
    });

    test('非对象类型应该返回空数组', () => {
      assert.deepStrictEqual(convertObjectToArray(42), []);
      assert.deepStrictEqual(convertObjectToArray('string'), []);
      assert.deepStrictEqual(convertObjectToArray(true), []);
      assert.deepStrictEqual(convertObjectToArray(Symbol('test')), []);
    });

    test('空对象应该返回空数组', () => {
      assert.deepStrictEqual(convertObjectToArray({}), []);
    });
  });

  describe('基本功能测试', () => {
    test('简单对象转换', () => {
      const input = { name: 'John', age: 30 };
      const expected = ['name', 'John', 'age', '30'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('字符串值保持不变', () => {
      const input = { key: 'value' };
      const expected = ['key', 'value'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('数字转换为字符串', () => {
      const input = { count: 42, price: 19.99 };
      const expected = ['count', '42', 'price', '19.99'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('布尔值转换', () => {
      const input = { active: true, completed: false };
      const expected = ['active', 'true', 'completed', 'false'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });
  });

  describe('数组值处理测试', () => {
    test('简单数组值', () => {
      const input = { tags: ['red', 'blue', 'green'] };
      const expected = ['tags', 'red', 'tags', 'blue', 'tags', 'green'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('混合类型数组', () => {
      const input = { mixed: [1, 'two', true] };
      const expected = ['mixed', '1', 'mixed', 'two', 'mixed', 'true'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('空数组', () => {
      const input = { empty: [] };
      const expected = [];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('嵌套数组', () => {
      const input = { nested: [[1, 2], [3, 4]] };
      const expected = ['nested', '1,2', 'nested', '3,4'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });
  });

  describe('null/undefined 值处理', () => {
    test('null 值被跳过', () => {
      const input = { valid: 'test', invalid: null };
      const expected = ['valid', 'test'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('undefined 值被跳过', () => {
      const input = { valid: 'test', invalid: undefined };
      const expected = ['valid', 'test'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('混合 null/undefined 值', () => {
      const input = {
        valid1: 'test1',
        invalid1: null,
        valid2: 'test2',
        invalid2: undefined,
      };
      const expected = ['valid1', 'test1', 'valid2', 'test2'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('数组中的 null/undefined 值不被跳过', () => {
      const input = { mixed: ['valid', null, undefined] };
      const expected = ['mixed', 'valid', 'mixed', 'null', 'mixed', 'undefined'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });
  });

  describe('复杂对象测试', () => {
    test('嵌套对象', () => {
      const input = { user: { name: 'John', age: 30 } };
      const expected = ['user', '[object Object]'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('混合类型复杂对象', () => {
      const input = {
        id: 1,
        name: 'Product',
        tags: ['electronics', 'mobile'],
        active: true,
        metadata: { brand: 'Apple', model: 'iPhone' },
      };
      const expected = [
        'id', '1',
        'name', 'Product',
        'tags', 'electronics',
        'tags', 'mobile',
        'active', 'true',
        'metadata', '[object Object]',
      ];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });
  });

  describe('特殊值处理测试', () => {
    test('Date 对象转换', () => {
      const date = new Date('2023-01-01');
      const input = { date };
      const expected = ['date', date.toString()];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('自定义 toString 方法', () => {
      const customObj = {
        toString() { return 'custom string'; },
      };
      const input = { custom: customObj };
      const expected = ['custom', 'custom string'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('没有 toString 方法的对象', () => {
      const obj = Object.create(null);
      obj.prop = 'value';
      const input = { noToString: obj };
      const expected = ['noToString', '{"prop":"value"}'];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });

    test('RegExp 对象', () => {
      const regex = /test/g;
      const input = { pattern: regex };
      const expected = ['pattern', regex.toString()];
      assert.deepStrictEqual(convertObjectToArray(input), expected);
    });
  });

  describe('性能和边界测试', () => {
    test('大对象处理', () => {
      const largeObj = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }

      const result = convertObjectToArray(largeObj);
      assert.strictEqual(result.length, 2000); // 1000 键值对 = 2000 元素
      assert.strictEqual(result[0], 'key0');
      assert.strictEqual(result[1], 'value0');
    });
  });
});
