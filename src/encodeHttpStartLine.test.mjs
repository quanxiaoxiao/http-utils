import assert from 'node:assert';
import { describe, test } from 'node:test';

import encodeHttpStartLine from './encodeHttpStartLine.mjs';

describe('HTTP Line Generator', () => {

  describe('请求行生成 (Request Line)', () => {

    test('应该生成基本的 GET 请求行', () => {
      const result = encodeHttpStartLine({ method: 'GET', path: '/api/users' });
      assert.strictEqual(result.toString(), 'GET /api/users HTTP/1.1\r\n');
    });

    test('应该生成不同 HTTP 方法的请求行', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

      methods.forEach(method => {
        const result = encodeHttpStartLine({ method, path: '/test' });
        assert.strictEqual(result.toString(), `${method} /test HTTP/1.1\r\n`);
      });
    });

    test('应该将方法名转换为大写', () => {
      const result = encodeHttpStartLine({ method: 'get', path: '/test' });
      assert.strictEqual(result.toString(), 'GET /test HTTP/1.1\r\n');
    });

    test('应该使用默认路径 "/"', () => {
      const result = encodeHttpStartLine({ method: 'GET' });
      assert.strictEqual(result.toString(), 'GET / HTTP/1.1\r\n');
    });

    test('应该处理空路径', () => {
      const result = encodeHttpStartLine({ method: 'GET', path: '' });
      assert.strictEqual(result.toString(), 'GET  HTTP/1.1\r\n');
    });

    test('应该使用自定义 HTTP 版本', () => {
      const result = encodeHttpStartLine({ method: 'GET', path: '/test', httpVersion: '2.0' });
      assert.strictEqual(result.toString(), 'GET /test HTTP/2.0\r\n');
    });

    test('应该处理复杂路径', () => {
      const complexPath = '/api/v1/users?name=john&age=25#section';
      const result = encodeHttpStartLine({ method: 'GET', path: complexPath });
      assert.strictEqual(result.toString(), `GET ${complexPath} HTTP/1.1\r\n`);
    });

  });

  describe('响应状态行生成 (Status Line)', () => {

    test('应该生成默认状态行 (200 OK)', () => {
      const result = encodeHttpStartLine({});
      assert.strictEqual(result.toString(), 'HTTP/1.1 200 OK\r\n');
    });

    test('应该生成指定状态码的状态行', () => {
      const result = encodeHttpStartLine({ statusCode: 404 });
      assert.strictEqual(result.toString(), 'HTTP/1.1 404 Not Found\r\n');
    });

    test('应该处理常见状态码', () => {
      const statusCodes = [
        { code: 200, expected: 'HTTP/1.1 200 OK\r\n' },
        { code: 201, expected: 'HTTP/1.1 201 Created\r\n' },
        { code: 301, expected: 'HTTP/1.1 301 Moved Permanently\r\n' },
        { code: 400, expected: 'HTTP/1.1 400 Bad Request\r\n' },
        { code: 401, expected: 'HTTP/1.1 401 Unauthorized\r\n' },
        { code: 404, expected: 'HTTP/1.1 404 Not Found\r\n' },
        { code: 500, expected: 'HTTP/1.1 500 Internal Server Error\r\n' },
      ];

      statusCodes.forEach(({ code, expected }) => {
        const result = encodeHttpStartLine({ statusCode: code });
        assert.strictEqual(result.toString(), expected);
      });
    });

    test('应该使用自定义状态文本', () => {
      const result = encodeHttpStartLine({
        statusCode: 200,
        statusText: 'Everything is Awesome',
      });
      assert.strictEqual(result.toString(), 'HTTP/1.1 200 Everything is Awesome\r\n');
    });

    test('应该处理空状态文本', () => {
      const result = encodeHttpStartLine({ statusCode: 200, statusText: '' });
      assert.strictEqual(result.toString(), 'HTTP/1.1 200\r\n');
    });

    test('应该处理null状态文本', () => {
      const result = encodeHttpStartLine({ statusCode: 200, statusText: null });
      assert.strictEqual(result.toString(), 'HTTP/1.1 200\r\n');
    });

    test('应该处理只有空格的状态文本', () => {
      const result = encodeHttpStartLine({ statusCode: 200, statusText: '   ' });
      assert.strictEqual(result.toString(), 'HTTP/1.1 200\r\n');
    });

    test('应该处理未知状态码', () => {
      const result = encodeHttpStartLine({ statusCode: 999 });
      assert.strictEqual(result.toString(), 'HTTP/1.1 999\r\n');
    });

    test('应该使用自定义 HTTP 版本', () => {
      const result = encodeHttpStartLine({ statusCode: 200, httpVersion: '2.0' });
      assert.strictEqual(result.toString(), 'HTTP/2.0 200 OK\r\n');
    });

  });

  describe('边界情况和错误处理', () => {

    test('应该处理无参数调用', () => {
      const result = encodeHttpStartLine();
      assert.strictEqual(result.toString(), 'HTTP/1.1 200 OK\r\n');
    });

    test('应该处理空对象参数', () => {
      const result = encodeHttpStartLine({});
      assert.strictEqual(result.toString(), 'HTTP/1.1 200 OK\r\n');
    });

    test('应该拒绝无效的状态码 - 负数', () => {
      assert.throws(() => {
        encodeHttpStartLine({ statusCode: -1 });
      }, /Status code must be an integer between 0 and 999/);
    });

    test('应该拒绝无效的状态码 - 超出范围', () => {
      assert.throws(() => {
        encodeHttpStartLine({ statusCode: 1000 });
      }, /Status code must be an integer between 0 and 999/);
    });

    test('应该拒绝非整数状态码', () => {
      assert.throws(() => {
        encodeHttpStartLine({ statusCode: 200.5 });
      }, /Status code must be an integer between 0 and 999/);
    });

    test('应该拒绝非数字状态码', () => {
      assert.throws(() => {
        encodeHttpStartLine({ statusCode: 'invalid' });
      }, /Status code must be an integer between 0 and 999/);
    });

    test('应该处理边界状态码', () => {
      // 测试最小值
      const minResult = encodeHttpStartLine({ statusCode: 0 });
      assert.strictEqual(minResult.toString(), 'HTTP/1.1 0\r\n');

      // 测试最大值
      const maxResult = encodeHttpStartLine({ statusCode: 999 });
      assert.strictEqual(maxResult.toString(), 'HTTP/1.1 999\r\n');
    });

  });

  describe('返回值类型', () => {

    test('应该返回 Buffer 对象', () => {
      const result = encodeHttpStartLine({ method: 'GET' });
      assert.ok(Buffer.isBuffer(result));
    });

    test('返回的 Buffer 应该包含正确的字节', () => {
      const result = encodeHttpStartLine({ method: 'GET', path: '/test' });
      const expected = Buffer.from('GET /test HTTP/1.1\r\n');
      assert.deepStrictEqual(result, expected);
    });

  });

  describe('混合参数处理', () => {

    test('method 参数优先于 statusCode', () => {
      // 当同时提供 method 和 statusCode 时，应该生成请求行
      const result = encodeHttpStartLine({
        method: 'POST',
        path: '/api',
        statusCode: 404,
      });
      assert.strictEqual(result.toString(), 'POST /api HTTP/1.1\r\n');
    });

    test('应该忽略请求行中的状态相关参数', () => {
      const result = encodeHttpStartLine({
        method: 'GET',
        path: '/test',
        statusCode: 500,
        statusText: 'Error',
      });
      assert.strictEqual(result.toString(), 'GET /test HTTP/1.1\r\n');
    });

  });

  describe('性能测试', () => {

    test('应该能够快速处理大量请求', () => {
      const start = process.hrtime.bigint();

      for (let i = 0; i < 10000; i++) {
        encodeHttpStartLine({ method: 'GET', path: `/test${i}` });
      }

      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // 转换为毫秒

      // 10000次调用应该在合理时间内完成（比如100ms）
      assert.ok(duration < 100, `Performance test failed: ${duration}ms for 10000 calls`);
    });

  });

});
