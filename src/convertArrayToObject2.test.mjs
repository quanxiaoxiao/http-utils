import assert from 'node:assert';
import { describe,test } from 'node:test';

import convertArrayToObject from './convertArrayToObject.mjs';

describe('convertArrayToObject', () => {

  test('should parse basic headers correctly', () => {
    const input = ['Content-Type', 'application/json', 'User-Agent', 'Mozilla/5.0'];
    const expected = {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0',
    };

    assert.deepStrictEqual(convertArrayToObject(input), expected);
  });

  test('should handle content-length specially by parsing as integer', () => {
    const input = ['Content-Length', '1024', 'Host', 'example.com'];
    const result = convertArrayToObject(input);

    assert.strictEqual(result['content-length'], 1024);
    assert.strictEqual(typeof result['content-length'], 'number');
    assert.strictEqual(result.host, 'example.com');
  });

  test('should skip duplicate content-length headers', () => {
    const input = [
      'Content-Length', '1024',
      'Host', 'example.com',
      'Content-Length', '2048',
    ];
    const result = convertArrayToObject(input);

    // 应该保留第一个 content-length 值
    assert.strictEqual(result['content-length'], 1024);
    assert.strictEqual(result.host, 'example.com');
  });

  test('should handle duplicate headers as arrays', () => {
    const input = [
      'Set-Cookie', 'session=abc123',
      'Cache-Control', 'no-cache',
      'Set-Cookie', 'user=john',
    ];
    const result = convertArrayToObject(input);

    assert.deepStrictEqual(result['set-cookie'], ['session=abc123', 'user=john']);
    assert.strictEqual(result['cache-control'], 'no-cache');
  });

  test('should handle multiple duplicate headers', () => {
    const input = [
      'Accept', 'text/html',
      'Accept', 'application/json',
      'Accept', 'text/plain',
    ];
    const result = convertArrayToObject(input);

    assert.deepStrictEqual(result.accept, ['text/html', 'application/json', 'text/plain']);
  });

  test('should decode URI components', () => {
    const input = [
      'X-Custom-Header', 'hello%20world',
      'Authorization', 'Bearer%20token123',
    ];
    const result = convertArrayToObject(input);

    assert.strictEqual(result['x-custom-header'], 'hello world');
    assert.strictEqual(result.authorization, 'Bearer token123');
  });

  test('should handle empty array', () => {
    const result = convertArrayToObject([]);
    assert.deepStrictEqual(result, {});
  });

  test('should handle case-insensitive headers', () => {
    const input = [
      'Content-TYPE', 'text/html',
      'USER-agent', 'Chrome',
      'content-length', '500',
    ];
    const result = convertArrayToObject(input);

    assert.strictEqual(result['content-type'], 'text/html');
    assert.strictEqual(result['user-agent'], 'Chrome');
    assert.strictEqual(result['content-length'], 500);
  });

  test('should handle special characters in values', () => {
    const input = [
      'X-Special', 'value with spaces & symbols!',
      'X-Unicode', 'café',
    ];
    const result = convertArrayToObject(input);

    assert.strictEqual(result['x-special'], 'value with spaces & symbols!');
    assert.strictEqual(result['x-unicode'], 'café');
  });

  // 错误情况测试
  describe('error cases', () => {

    test('should throw error for non-array input', () => {
      assert.throws(() => {
        convertArrayToObject('not an array');
      }, {
        name: 'AssertionError',
        message: 'Expected an array',
      });
    });

    test('should throw error for odd-length array', () => {
      assert.throws(() => {
        convertArrayToObject(['key1', 'value1', 'key2']);
      }, {
        name: 'AssertionError',
        message: 'Array length must be even',
      });
    });

    test('should throw error for null input', () => {
      assert.throws(() => {
        convertArrayToObject(null);
      }, {
        name: 'AssertionError',
      });
    });

    test('should throw error for undefined input', () => {
      assert.throws(() => {
        convertArrayToObject(undefined);
      }, {
        name: 'AssertionError',
      });
    });
  });

  // 边界情况测试
  describe('edge cases', () => {

    test('should handle numeric string content-length', () => {
      const input = ['Content-Length', '0'];
      const result = convertArrayToObject(input);

      assert.strictEqual(result['content-length'], 0);
      assert.strictEqual(typeof result['content-length'], 'number');
    });

    test('should handle invalid content-length gracefully', () => {
      const input = ['Content-Length', 'invalid'];
      const result = convertArrayToObject(input);

      // 依赖于 parseInteger 的行为，可能返回 NaN 或其他值
      assert(typeof result['content-length'] === 'number' || result['content-length'] === null);
    });

    test('should handle empty string values', () => {
      const input = ['X-Empty', '', 'X-Normal', 'value'];
      const result = convertArrayToObject(input);

      assert.strictEqual(result['x-empty'], '');
      assert.strictEqual(result['x-normal'], 'value');
    });

    test('should handle already decoded values', () => {
      const input = ['X-Plain', 'already decoded value'];
      const result = convertArrayToObject(input);

      assert.strictEqual(result['x-plain'], 'already decoded value');
    });
  });

  // 性能测试
  describe('performance', () => {

    test('should handle large number of headers efficiently', () => {
      const largeInput = [];
      const expectedSize = 1000;

      for (let i = 0; i < expectedSize; i++) {
        largeInput.push(`header-${i}`, `value-${i}`);
      }

      const start = process.hrtime.bigint();
      const result = convertArrayToObject(largeInput);
      const end = process.hrtime.bigint();

      assert.strictEqual(Object.keys(result).length, expectedSize);

      // 确保执行时间合理（小于10ms）
      const executionTimeMs = Number(end - start) / 1_000_000;
      assert(executionTimeMs < 10, `Execution took too long: ${executionTimeMs}ms`);
    });
  });
});

// 测试安全版本函数
// 真实场景测试
describe('real-world scenarios', () => {

  test('should parse typical HTTP request headers', () => {
    const input = [
      'Host', 'api.example.com',
      'User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept', 'application/json',
      'Accept-Language', 'en-US,en;q=0.9',
      'Accept-Encoding', 'gzip, deflate, br',
      'Connection', 'keep-alive',
      'Content-Type', 'application/json',
      'Content-Length', '256',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    ];

    const result = convertArrayToObject(input);

    assert.strictEqual(result.host, 'api.example.com');
    assert.strictEqual(result['content-type'], 'application/json');
    assert.strictEqual(result['content-length'], 256);
    assert.strictEqual(typeof result['content-length'], 'number');
    assert.strictEqual(result.authorization, 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  test('should parse HTTP response headers with multiple Set-Cookie', () => {
    const input = [
      'Content-Type', 'text/html; charset=utf-8',
      'Content-Length', '2048',
      'Set-Cookie', 'sessionId=abc123; Path=/; HttpOnly',
      'Set-Cookie', 'userId=user456; Path=/; Secure',
      'Set-Cookie', 'theme=dark; Path=/; Max-Age=31536000',
      'Cache-Control', 'no-cache, no-store, must-revalidate',
      'X-Frame-Options', 'DENY',
    ];

    const result = convertArrayToObject(input);

    assert.strictEqual(result['content-type'], 'text/html; charset=utf-8');
    assert.strictEqual(result['content-length'], 2048);
    assert.strictEqual(Array.isArray(result['set-cookie']), true);
    assert.strictEqual(result['set-cookie'].length, 3);
    assert(result['set-cookie'].includes('sessionId=abc123; Path=/; HttpOnly'));
    assert(result['set-cookie'].includes('userId=user456; Path=/; Secure'));
    assert(result['set-cookie'].includes('theme=dark; Path=/; Max-Age=31536000'));
  });
});
