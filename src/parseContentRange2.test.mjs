import assert from 'node:assert';
import { describe,test } from 'node:test';

import parseContentRange from './parseContentRange.mjs';

describe('Range Parser', () => {
  describe('正常情况', () => {
    test('解析完整范围 "bytes=0-499"', () => {
      const result = parseContentRange('bytes=0-499', 1000);
      assert.deepStrictEqual(result, [0, 499]);
    });

    test('解析开始范围 "bytes=500-"', () => {
      const result = parseContentRange('bytes=500-', 1000);
      assert.deepStrictEqual(result, [500, 999]);
    });

    test('解析后缀范围 "bytes=-500"', () => {
      const result = parseContentRange('bytes=-500', 1000);
      assert.deepStrictEqual(result, [499, 999]);
    });

    test('解析单字节范围 "bytes=0-0"', () => {
      const result = parseContentRange('bytes=0-0', 1000);
      assert.deepStrictEqual(result, [0, 0]);
    });

    test('解析最后一个字节 "bytes=999-999"', () => {
      const result = parseContentRange('bytes=999-999', 1000);
      assert.deepStrictEqual(result, [999, 999]);
    });

    test('处理空格 " bytes = 200 - 300 "', () => {
      const result = parseContentRange(' bytes = 200 - 300 ', 1000);
      assert.deepStrictEqual(result, [200, 300]);
    });

    test('大小写不敏感 "BYTES=0-100"', () => {
      const result = parseContentRange('BYTES=0-100', 1000);
      assert.deepStrictEqual(result, [0, 100]);
    });
  });

  describe('边界情况', () => {
    test('内容大小为 0 时的有效请求 "bytes=0-0"', () => {
      const result = parseContentRange('bytes=0-0', 0);
      assert.deepStrictEqual(result, [0, 0]);
    });

    test('内容大小为 1 的文件 "bytes=0-0"', () => {
      const result = parseContentRange('bytes=0-0', 1);
      assert.deepStrictEqual(result, [0, 0]);
    });

    test('后缀范围大于内容大小 "bytes=-2000"', () => {
      assert.throws(() => {
        parseContentRange('bytes=-2000', 1000);
      });
    });

    test('结束位置超出内容大小 "bytes=500-2000"', () => {
      assert.throws(() => {
        parseContentRange('bytes=500-2000', 1000);
      });
    });

    test('大数值范围', () => {
      const contentSize = Number.MAX_SAFE_INTEGER;
      const result = parseContentRange('bytes=1000000-2000000', contentSize);
      assert.deepStrictEqual(result, [1000000, 2000000]);
    });
  });

  describe('400 错误 - 格式错误', () => {
    test('无效格式 - 缺少 bytes 前缀', () => {
      assert.throws(
        () => parseContentRange('0-499', 1000),
        { message: 'Invalid range format' },
      );
    });

    test('无效格式 - 缺少等号', () => {
      assert.throws(
        () => parseContentRange('bytes 0-499', 1000),
        { message: 'Invalid range format' },
      );
    });

    test('无效格式 - 缺少连字符', () => {
      assert.throws(
        () => parseContentRange('bytes=0499', 1000),
        { message: 'Invalid range format' },
      );
    });

    test('开始和结束都为空 "bytes=-"', () => {
      assert.throws(
        () => parseContentRange('bytes=-', 1000),
        { message: 'Invalid range: both start and end are empty' },
      );
    });

    test('开始位置大于结束位置 "bytes=500-200"', () => {
      assert.throws(
        () => parseContentRange('bytes=500-200', 1000),
        { message: 'Invalid range: start is greater than end' },
      );
    });

    test('负数开始位置 "bytes=-100-200"', () => {
      assert.throws(
        () => parseContentRange('bytes=-100-200', 1000),
      );
    });

    test('非数字字符 "bytes=abc-def"', () => {
      assert.throws(
        () => parseContentRange('bytes=abc-def', 1000),
      );
    });

    test('包含小数点 "bytes=10.5-20.5"', () => {
      assert.throws(
        () => parseContentRange('bytes=10.5-20.5', 1000),
      );
    });

    test('超出安全整数范围', () => {
      const largeNumber = (Number.MAX_SAFE_INTEGER + 1).toString();
      assert.throws(
        () => parseContentRange(`bytes=${largeNumber}-${largeNumber}`, Number.MAX_SAFE_INTEGER),
        { message: 'Invalid range: number too large' },
      );
    });

    test('非字符串输入', () => {
      assert.throws(
        () => parseContentRange(123, 1000),
        { message: 'Range header must be a string' },
      );
    });

    test('null 输入', () => {
      assert.throws(
        () => parseContentRange(null, 1000),
        { message: 'Range header must be a string' },
      );
    });

    test('undefined 输入', () => {
      assert.throws(
        () => parseContentRange(undefined, 1000),
        { message: 'Range header must be a string' },
      );
    });
  });

  describe('416 错误 - 范围不满足', () => {
    test('开始位置等于内容大小 "bytes=1000-1500"', () => {
      assert.throws(
        () => parseContentRange('bytes=1000-1500', 1000),
        {
          message: 'Range not satisfiable: start beyond content size',
          statusCode: 416,
        },
      );
    });

    test('开始位置大于内容大小 "bytes=1500-2000"', () => {
      assert.throws(
        () => parseContentRange('bytes=1500-2000', 1000),
        {
          message: 'Range not satisfiable: start beyond content size',
          statusCode: 416,
        },
      );
    });

    test('空内容但请求非零范围 "bytes=0-1"', () => {
      assert.throws(
        () => parseContentRange('bytes=0-1', 0),
        {
          message: 'Range not satisfiable for empty content',
          statusCode: 416,
        },
      );
    });

    test('空内容但请求后缀范围 "bytes=-1"', () => {
      assert.throws(
        () => parseContentRange('bytes=-1', 0),
      );
    });
  });

  describe('500 错误 - 服务器参数错误', () => {
    test('内容大小为负数', () => {
      assert.throws(
        () => parseContentRange('bytes=0-100', -1),
        { message: 'Content size must be a non-negative integer' },
      );
    });

    test('内容大小为小数', () => {
      assert.throws(
        () => parseContentRange('bytes=0-100', 100.5),
        { message: 'Content size must be a non-negative integer' },
      );
    });

    test('内容大小为字符串', () => {
      assert.throws(
        () => parseContentRange('bytes=0-100', '1000'),
        { message: 'Content size must be a non-negative integer' },
      );
    });

    test('内容大小为 null', () => {
      assert.throws(
        () => parseContentRange('bytes=0-100', null),
        { message: 'Content size must be a non-negative integer' },
      );
    });
  });

  describe('实际场景测试', () => {
    test('视频文件部分下载', () => {
      const fileSize = 10485760; // 10MB
      const result = parseContentRange('bytes=1048576-2097151', fileSize); // 1MB-2MB
      assert.deepStrictEqual(result, [1048576, 2097151]);
    });

    test('音频文件最后 1KB', () => {
      const fileSize = 5242880; // 5MB
      const result = parseContentRange('bytes=-1024', fileSize);
      assert.deepStrictEqual(result, [5241855, 5242879]);
    });

    test('图片文件从中间开始', () => {
      const fileSize = 2048000; // ~2MB
      const result = parseContentRange('bytes=1024000-', fileSize);
      assert.deepStrictEqual(result, [1024000, 2047999]);
    });

    test('小文件完整下载', () => {
      const fileSize = 1024; // 1KB
      const result = parseContentRange('bytes=0-1023', fileSize);
      assert.deepStrictEqual(result, [0, 1023]);
    });

    test('Chrome 浏览器典型请求', () => {
      const fileSize = 1000000;
      const result = parseContentRange('bytes=0-', fileSize);
      assert.deepStrictEqual(result, [0, 999999]);
    });
  });
});
