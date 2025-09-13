import assert from 'node:assert';
import { describe,test } from 'node:test';

import getHeaderValue from './getHeaderValue.mjs';

describe('getHeaderValue 函数测试', () => {

  describe('基本功能测试', () => {
    test('应该从对象中找到单个值', () => {
      const obj = { name: 'John', age: 30, city: 'New York' };
      const result = getHeaderValue(obj, 'name');
      assert.strictEqual(result, 'John');
    });

    test('应该从对象中找到数字值', () => {
      const obj = { name: 'John', age: 30, city: 'New York' };
      const result = getHeaderValue(obj, 'age');
      assert.strictEqual(result, '30');
    });

    test('应该从键值对数组中找到值', () => {
      const arr = ['name', 'John', 'age', '30', 'city', 'New York'];
      const result = getHeaderValue(arr, 'name');
      assert.strictEqual(result, 'John');
    });

    test('应该处理不存在的键', () => {
      const obj = { name: 'John', age: 30 };
      const result = getHeaderValue(obj, 'nonexistent');
      assert.strictEqual(result, null);
    });
  });

  describe('大小写不敏感测试', () => {
    test('应该忽略键名的大小写', () => {
      const obj = { Name: 'John', AGE: 30, CiTy: 'New York' };
      assert.strictEqual(getHeaderValue(obj, 'name'), 'John');
      assert.strictEqual(getHeaderValue(obj, 'age'), '30');
      assert.strictEqual(getHeaderValue(obj, 'CITY'), 'New York');
    });

    test('应该处理键值对数组的大小写', () => {
      const arr = ['Name', 'John', 'AGE', '30', 'CiTy', 'New York'];
      assert.strictEqual(getHeaderValue(arr, 'name'), 'John');
      assert.strictEqual(getHeaderValue(arr, 'age'), '30');
      assert.strictEqual(getHeaderValue(arr, 'city'), 'New York');
    });
  });

  describe('多值处理测试', () => {
    test('应该返回多个相同键的值组成的数组', () => {
      const arr = ['color', 'red', 'size', 'large', 'color', 'blue', 'color', 'green'];
      const result = getHeaderValue(arr, 'color');
      assert.deepStrictEqual(result, ['red', 'blue', 'green']);
    });

    test('应该处理对象中的数组值', () => {
      const obj = {
        name: 'John',
        hobbies: ['reading', 'swimming', 'coding'],
        age: 30,
      };
      const result = getHeaderValue(obj, 'hobbies');
      assert.deepStrictEqual(result, ['reading', 'swimming', 'coding']);
    });
  });

  describe('特殊值处理测试', () => {
    test('应该正确处理 null 值', () => {
      const obj = { name: 'John', address: null, age: 30 };
      const result = getHeaderValue(obj, 'address');
      assert.strictEqual(result, null); // null 值会被跳过
    });

    test('应该正确处理 undefined 值', () => {
      const obj = { name: 'John', address: undefined, age: 30 };
      const result = getHeaderValue(obj, 'address');
      assert.strictEqual(result, null); // undefined 值会被跳过
    });

    test('应该正确处理布尔值', () => {
      const obj = { name: 'John', isActive: true, isDeleted: false };
      assert.strictEqual(getHeaderValue(obj, 'isActive'), 'true');
      assert.strictEqual(getHeaderValue(obj, 'isDeleted'), 'false');
    });

    test('应该正确处理对象值', () => {
      const obj = {
        name: 'John',
        address: { street: '123 Main St', city: 'New York' },
      };
      const result = getHeaderValue(obj, 'address');
      assert.strictEqual(result, '[object Object]');
    });

    test('应该正确处理空字符串', () => {
      const obj = { name: 'John', middleName: '', age: 30 };
      const result = getHeaderValue(obj, 'middleName');
      assert.strictEqual(result, '');
    });
  });

  describe('URL 解码测试', () => {
    test('应该正确解码 URL 编码的值', () => {
      const obj = { name: 'John%20Doe', city: 'New%20York' };
      assert.strictEqual(getHeaderValue(obj, 'name'), 'John Doe');
      assert.strictEqual(getHeaderValue(obj, 'city'), 'New York');
    });

    test('应该处理无效的 URL 编码', () => {
      const obj = { name: 'John%ZZ', city: 'New York' };
      // 如果解码失败，应该返回原始值
      const result = getHeaderValue(obj, 'name');
      assert.strictEqual(result, 'John%ZZ');
    });

    test('应该处理中文 URL 编码', () => {
      const obj = { name: '%E5%BC%A0%E4%B8%89' }; // 张三
      const result = getHeaderValue(obj, 'name');
      assert.strictEqual(result, '张三');
    });
  });

  describe('边界条件测试', () => {
    test('应该处理空对象', () => {
      const result = getHeaderValue({}, 'name');
      assert.strictEqual(result, null);
    });

    test('应该处理空数组', () => {
      const result = getHeaderValue([], 'name');
      assert.strictEqual(result, null);
    });

    test('应该处理奇数长度的数组', () => {
      const arr = ['name', 'John', 'age']; // 缺少 age 的值
      const result = getHeaderValue(arr, 'name');
      assert.strictEqual(result, 'John');
    });

    test('应该处理空键名周围的空格', () => {
      const obj = { '  name  ': 'John', age: 30 };
      assert.strictEqual(getHeaderValue(obj, '  name  '), 'John');
      assert.strictEqual(getHeaderValue(obj, 'name'), 'John');
    });
  });

  describe('参数验证测试', () => {
    test('应该拒绝非对象/数组的第一个参数', () => {
      assert.throws(() => getHeaderValue('string', 'key'), {
        name: 'AssertionError',
      });
      assert.throws(() => getHeaderValue(123, 'key'), {
        name: 'AssertionError',
      });
      assert.throws(() => getHeaderValue(null, 'key'), {
        name: 'AssertionError',
      });
    });

    test('应该拒绝非字符串的第二个参数', () => {
      assert.throws(() => getHeaderValue({}, 123), {
        name: 'AssertionError',
      });
      assert.throws(() => getHeaderValue({}, null), {
        name: 'AssertionError',
      });
      assert.throws(() => getHeaderValue({}, undefined), {
        name: 'AssertionError',
      });
    });

    test('应该拒绝空字符串的键名', () => {
      assert.throws(() => getHeaderValue({}, ''), {
        name: 'AssertionError',
      });
      assert.throws(() => getHeaderValue({}, '   '), {
        name: 'AssertionError',
      });
    });
  });

  describe('复杂场景测试', () => {
    test('应该处理嵌套对象和数组的混合情况', () => {
      const obj = {
        config: { theme: 'dark', lang: 'en' },
        users: ['charlie', 'david'], // 重复键
        active: true,
      };

      // 注意：JavaScript 对象中重复的键会被覆盖
      const usersResult = getHeaderValue(obj, 'users');
      assert.deepStrictEqual(usersResult, ['charlie', 'david']);

      const configResult = getHeaderValue(obj, 'config');
      // assert.strictEqual(configResult, '{"theme":"dark","lang":"en"}');
    });

    test('应该处理包含特殊字符的键名', () => {
      const obj = {
        'content-type': 'application/json',
        'x-api-key': 'secret123',
        'user-agent': 'MyApp/1.0',
      };

      assert.strictEqual(getHeaderValue(obj, 'content-type'), 'application/json');
      assert.strictEqual(getHeaderValue(obj, 'X-API-KEY'), 'secret123');
    });

    test('应该处理数字键名', () => {
      const arr = ['0', 'zero', '1', 'one', '2', 'two'];
      assert.strictEqual(getHeaderValue(arr, '0'), 'zero');
      assert.strictEqual(getHeaderValue(arr, '1'), 'one');
    });
  });

  describe('性能相关测试', () => {
    test('应该处理大型对象', () => {
      const largeObj = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      largeObj.target = 'found';

      const result = getHeaderValue(largeObj, 'target');
      assert.strictEqual(result, 'found');
    });

    test('应该处理大型数组', () => {
      const largeArr = [];
      for (let i = 0; i < 1000; i++) {
        largeArr.push(`key${i}`, `value${i}`);
      }
      largeArr.push('target', 'found');

      const result = getHeaderValue(largeArr, 'target');
      assert.strictEqual(result, 'found');
    });
  });
});
