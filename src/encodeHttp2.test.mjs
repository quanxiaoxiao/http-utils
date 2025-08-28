import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import test from 'node:test';

import encodeHttp from './encodeHttp.mjs'; // 替换为实际的文件路径

test('HTTP Encoder Tests', async (t) => {
  // 基础测试：带有字符串body的简单响应
  await t.test('should encode simple HTTP response with string body', () => {
    const options = {
      method: 'GET',
      path: '/',
      httpVersion: '1.1',
      statusCode: 200,
      statusText: 'OK',
      headers: ['Content-Type', 'text/plain'],
      body: 'Hello World',
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(result));
    const resultString = result.toString();
    assert(resultString.includes('GET / HTTP/1.1'));
    assert(resultString.includes('Content-Type: text/plain'));
    assert(resultString.includes('Content-Length: 11'));
    assert(resultString.includes('Hello World'));
  });

  // 测试：带有Buffer body
  await t.test('should encode HTTP response with Buffer body', () => {
    const bodyBuffer = Buffer.from('Binary data', 'utf8');
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Type', 'application/octet-stream'],
      body: bodyBuffer,
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(result));
    assert(result.includes(bodyBuffer));
  });

  // 测试：空body
  await t.test('should encode HTTP response with empty body', () => {
    const options = {
      statusCode: 204,
      statusText: 'No Content',
      httpVersion: '1.1',
      headers: ['Content-Type', 'text/plain'],
      body: '',
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(result));
    const resultString = result.toString();
    assert(resultString.includes('Content-Length: 0'));
    assert(!resultString.includes('undefined'));
  });

  // 测试：null body
  await t.test('should encode HTTP response with null body', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: [],
      body: null,
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(result));
    const resultString = result.toString();
    assert(resultString.includes('Content-Length: 0'));
  });

  // 测试：对象形式的headers
  await t.test('should handle headers as object', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom': 'value',
      },
      body: '{"test": true}',
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(result));
    const resultString = result.toString();
    assert(resultString.includes('Content-Type: application/json'));
    assert(resultString.includes('X-Custom: value'));
  });

  // 测试：onHeader回调
  await t.test('should call onHeader callback when provided', () => {
    let headerBuffer = null;
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Type', 'text/plain'],
      body: 'test',
      onHeader: (buffer) => {
        headerBuffer = buffer;
      },
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(headerBuffer));
    assert(Buffer.isBuffer(result));
    // 当使用onHeader时，结果应该只包含body
    assert.strictEqual(result.toString(), 'test');
  });

  // 测试：onStartLine回调
  await t.test('should call onStartLine callback when provided', () => {
    let startLineBuffer = null;
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: [],
      body: 'test',
      onStartLine: (buffer) => {
        startLineBuffer = buffer;
      },
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(startLineBuffer));
    assert(Buffer.isBuffer(result));
  });

  await t.test('should handle Content-Length stream', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Length', '5'],
    };

    const encoder = encodeHttp(options);
    assert.strictEqual(typeof encoder, 'function');

    const result1 = encoder('Hello');
    assert(Buffer.isBuffer(result1));
    assert(result1.toString().includes('Hello'));

    assert.throws(() => {
      encoder('More');
    });
  });

  // 测试：零长度Content-Length流
  await t.test('should handle zero Content-Length stream', () => {
    const options = {
      statusCode: 204,
      statusText: 'No Content',
      httpVersion: '1.1',
      headers: ['Content-Length', '0'],
    };

    const encoder = encodeHttp(options);
    assert.strictEqual(typeof encoder, 'function');

    // 发送空数据应该正常
    const result = encoder('');
    assert(Buffer.isBuffer(result));

    // 发送非空数据应该抛出错误
    assert.throws(() => {
      encoder('data');
    }, /Content-Length exceed/);
  });

  // 测试：分块传输编码
  await t.test('should handle chunked transfer encoding', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Type', 'text/plain'],
    };

    const encoder = encodeHttp(options);
    assert.strictEqual(typeof encoder, 'function');

    // 发送第一个块
    const chunk1 = encoder('Hello');
    assert(Buffer.isBuffer(chunk1));
    assert(chunk1.toString().includes('Transfer-Encoding: chunked'));

    // 发送第二个块
    const chunk2 = encoder(' World');
    assert(Buffer.isBuffer(chunk2));

    // 结束流
    const endChunk = encoder(null);
    assert(Buffer.isBuffer(endChunk));
    assert.strictEqual(endChunk.toString(), '0\r\n\r\n');
  });

  // 测试：Readable流作为body
  await t.test('should handle Readable stream as body with Content-Length', () => {
    const stream = new Readable({
      read() {
        this.push('test data');
        this.push(null);
      },
    });

    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Length', '9'],
      body: stream,
    };

    const encoder = encodeHttp(options);
    assert.strictEqual(typeof encoder, 'function');
  });

  // 测试：Readable流作为body，无Content-Length（分块编码）
  await t.test('should handle Readable stream as body without Content-Length', () => {
    const stream = new Readable({
      read() {
        this.push('chunk1');
        this.push('chunk2');
        this.push(null);
      },
    });

    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      body: stream,
    };

    const encoder = encodeHttp(options);
    assert.strictEqual(typeof encoder, 'function');
  });

  // 错误测试：无效的Content-Length
  await t.test('should throw error for invalid Content-Length', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Length', '-1'],
    };

    assert.throws(() => {
      encodeHttp(options);
    }, /Content-Length.*invalid/);
  });

  // 错误测试：非整数Content-Length
  await t.test('should throw error for non-integer Content-Length', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Length', '1.5'],
    };

    assert.throws(() => {
      encodeHttp(options);
    }, /Content-Length.*invalid/);
  });

  // 测试：headers过滤
  await t.test('should filter out content-length and transfer-encoding headers', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: [
        'Content-Type', 'text/plain',
        'Content-Length', '10', // 应该被过滤
        'Transfer-Encoding', 'chunked', // 应该被过滤
        'X-Custom', 'value',
      ],
      body: 'test',
    };

    const result = encodeHttp(options);
    const resultString = result.toString();

    // 应该包含新的Content-Length
    assert(resultString.includes('Content-Length: 4'));
    // 不应该包含原来的Content-Length
    assert(!resultString.includes('Content-Length: 10'));
    // 不应该包含Transfer-Encoding
    assert(!resultString.includes('Transfer-Encoding: chunked'));
    // 应该包含自定义头部
    assert(resultString.includes('X-Custom: value'));
  });

  // 边界测试：大body
  await t.test('should handle large body', () => {
    const largeBody = 'x'.repeat(10000);
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: [],
      body: largeBody,
    };

    const result = encodeHttp(options);

    assert(Buffer.isBuffer(result));
    assert(result.includes(Buffer.from(largeBody)));
    assert(result.toString().includes('Content-Length: 10000'));
  });

  // 测试：UTF-8 body
  await t.test('should handle UTF-8 body correctly', () => {
    const unicodeBody = '你好世界🌍';
    const expectedLength = Buffer.byteLength(unicodeBody, 'utf8');

    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Type', 'text/plain; charset=utf-8'],
      body: unicodeBody,
    };

    const result = encodeHttp(options);
    const resultString = result.toString();

    assert(resultString.includes(`Content-Length: ${expectedLength}`));
    assert(resultString.includes(unicodeBody));
  });

  // 集成测试：完整的HTTP响应流程
  await t.test('should create complete HTTP response', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: {
        'Content-Type': 'application/json',
        Server: 'TestServer/1.0',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({ message: 'Hello, World!', timestamp: Date.now() }),
    };

    const result = encodeHttp(options);
    const resultString = result.toString();

    // 验证状态行
    assert(resultString.startsWith('HTTP/1.1 200 OK\r\n'));

    // 验证头部
    assert(resultString.includes('Content-Type: application/json'));
    assert(resultString.includes('Server: TestServer/1.0'));
    assert(resultString.includes('Cache-Control: no-cache'));
    assert(resultString.includes('Content-Length:'));

    // 验证头部和body的分隔
    assert(resultString.includes('\r\n\r\n'));

    // 验证body
    assert(resultString.includes('Hello, World!'));
  });
});

// 性能测试
test('HTTP Encoder Performance Tests', async (t) => {
  await t.test('should handle multiple small requests efficiently', () => {
    const startTime = process.hrtime.bigint();

    for (let i = 0; i < 1000; i++) {
      const options = {
        statusCode: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers: ['Content-Type', 'text/plain'],
        body: `Request ${i}`,
      };

      const result = encodeHttp(options);
      assert(Buffer.isBuffer(result));
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒

    console.log(`1000 requests processed in ${duration.toFixed(2)}ms`);
    assert(duration < 1000, 'Should process 1000 requests in less than 1 second');
  });

  await t.test('should handle streaming efficiently', () => {
    const options = {
      statusCode: 200,
      statusText: 'OK',
      httpVersion: '1.1',
      headers: ['Content-Length', '5000'],
    };

    const encoder = encodeHttp(options);
    const startTime = process.hrtime.bigint();

    const chunk = 'x'.repeat(100);
    for (let i = 0; i < 50; i++) {
      const result = encoder(chunk);
      assert(Buffer.isBuffer(result));
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000;

    console.log(`50 chunks (5KB total) processed in ${duration.toFixed(2)}ms`);
    assert(duration < 100, 'Should process streaming data efficiently');
  });
});
