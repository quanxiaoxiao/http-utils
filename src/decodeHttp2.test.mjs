import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { describe, test } from 'node:test';

import { decodeHttpRequest, decodeHttpResponse } from './decodeHttp.mjs';

describe('HTTP解码器测试', () => {
  describe('HTTP请求解码测试', () => {
    test('解析简单的GET请求', async () => {
      const requestData = Buffer.from(
        'GET /path HTTP/1.1\r\n' +
        'Host: example.com\r\n' +
        'User-Agent: test-agent\r\n' +
        '\r\n',
      );

      let startLineCallCount = 0;
      let headerCallCount = 0;
      let endCallCount = 0;

      const decoder = decodeHttpRequest({
        onStartLine: async (state) => {
          startLineCallCount++;
          assert.strictEqual(state.method, 'GET');
          assert.strictEqual(state.path, '/path');
          assert.strictEqual(state.httpVersion, '1.1');
        },
        onHeader: async (state) => {
          headerCallCount++;
          assert.strictEqual(state.headers.host, 'example.com');
          assert.strictEqual(state.headers['user-agent'], 'test-agent');
        },
        onEnd: async (state) => {
          endCallCount++;
          assert.strictEqual(state.complete, true);
        },
      });

      const result = await decoder(requestData);

      assert.strictEqual(result.method, 'GET');
      assert.strictEqual(result.path, '/path');
      assert.strictEqual(result.httpVersion, '1.1');
      assert.strictEqual(result.headers.host, 'example.com');
      assert.strictEqual(result.complete, true);
      assert.strictEqual(startLineCallCount, 1);
      assert.strictEqual(headerCallCount, 1);
      assert.strictEqual(endCallCount, 1);
    });

    test('解析POST请求与Content-Length', async () => {
      const requestBody = 'Hello, World!';
      const requestData = Buffer.from(
        'POST /api/data HTTP/1.1\r\n' +
        'Content-Type: text/plain\r\n' +
        `Content-Length: ${requestBody.length}\r\n` +
        '\r\n' +
        requestBody,
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.method, 'POST');
      assert.strictEqual(result.path, '/api/data');
      assert.strictEqual(result.headers['content-type'], 'text/plain');
      assert.strictEqual(result.headers['content-length'], requestBody.length);
      assert.strictEqual(result.body.toString(), requestBody);
      assert.strictEqual(result.complete, true);
    });

    test('解析分块传输编码请求', async () => {
      const chunk1 = 'Hello, ';
      const chunk2 = 'World!';
      const requestData = Buffer.from(
        'POST /upload HTTP/1.1\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        `${chunk1.length.toString(16)}\r\n${chunk1}\r\n` +
        `${chunk2.length.toString(16)}\r\n${chunk2}\r\n` +
        '0\r\n\r\n',
      );

      const bodyChunks = [];
      const decoder = decodeHttpRequest({
        onBody: async (chunk) => {
          bodyChunks.push(chunk);
        },
      });

      const result = await decoder(requestData);

      assert.strictEqual(result.method, 'POST');
      assert.strictEqual(result.headers['transfer-encoding'], 'chunked');
      assert.strictEqual(result.complete, true);

      const totalBody = Buffer.concat(bodyChunks).toString();
      assert.strictEqual(totalBody, 'Hello, World!');
    });

    test('分步骤解析HTTP请求', async () => {
      const requestData = Buffer.from(
        'GET /test HTTP/1.1\r\n' +
        'Host: test.com\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});

      // 分多次传入数据
      const chunk1 = requestData.slice(0, 10);
      const chunk2 = requestData.slice(10, 25);
      const chunk3 = requestData.slice(25);

      const result1 = await decoder(chunk1);
      assert.strictEqual(result1.complete, false);

      const result2 = await decoder(chunk2);
      assert.strictEqual(result2.complete, false);

      const result3 = await decoder(chunk3);
      assert.strictEqual(result3.complete, true);
      assert.strictEqual(result3.method, 'GET');
      assert.strictEqual(result3.headers.host, 'test.com');
    });

    test('处理重复头部字段', async () => {
      const requestData = Buffer.from(
        'GET /test HTTP/1.1\r\n' +
        'Accept: text/html\r\n' +
        'Accept: application/json\r\n' +
        'Host: example.com\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(Array.isArray(result.headers.accept), true);
      assert.strictEqual(result.headers.accept.length, 2);
      assert.strictEqual(result.headers.accept[0], 'text/html');
      assert.strictEqual(result.headers.accept[1], 'application/json');
    });
  });

  describe('HTTP响应解码测试', () => {
    test('解析简单的200响应', async () => {
      const responseBody = '{"message": "success"}';
      const responseData = Buffer.from(
        'HTTP/1.1 200 OK\r\n' +
        'Content-Type: application/json\r\n' +
        `Content-Length: ${responseBody.length}\r\n` +
        '\r\n' +
        responseBody,
      );

      const decoder = decodeHttpResponse({});
      const result = await decoder(responseData);

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.statusText, 'OK');
      assert.strictEqual(result.httpVersion, '1.1');
      assert.strictEqual(result.headers['content-type'], 'application/json');
      assert.strictEqual(result.body.toString(), responseBody);
      assert.strictEqual(result.complete, true);
    });

    test('解析404响应', async () => {
      const responseData = Buffer.from(
        'HTTP/1.1 404 Not Found\r\n' +
        'Content-Length: 0\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpResponse({});
      const result = await decoder(responseData);

      assert.strictEqual(result.statusCode, 404);
      assert.strictEqual(result.statusText, 'Not Found');
      assert.strictEqual(result.headers['content-length'], 0);
      assert.strictEqual(result.complete, true);
    });

    test('解析无状态文本的响应', async () => {
      const responseData = Buffer.from(
        'HTTP/1.1 204\r\n' +
        'Content-Length: 0\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpResponse({});
      const result = await decoder(responseData);

      assert.strictEqual(result.statusCode, 204);
      assert.strictEqual(result.statusText, null);
    });

    test('解析分块传输响应', async () => {
      const chunk1 = 'First chunk';
      const chunk2 = 'Second chunk';
      const responseData = Buffer.from(
        'HTTP/1.1 200 OK\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        `${chunk1.length.toString(16)}\r\n${chunk1}\r\n` +
        `${chunk2.length.toString(16)}\r\n${chunk2}\r\n` +
        '0\r\n\r\n',
      );

      const bodyChunks = [];
      const decoder = decodeHttpResponse({
        onBody: async (chunk) => {
          bodyChunks.push(chunk);
        },
      });

      const result = await decoder(responseData);

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.complete, true);

      const totalBody = Buffer.concat(bodyChunks).toString();
      assert.strictEqual(totalBody, 'First chunkSecond chunk');
    });
  });

  describe('错误处理测试', () => {
    test('无效的起始行格式应该抛出错误', async () => {
      const invalidData = Buffer.from('INVALID REQUEST LINE\r\n\r\n');
      const decoder = decodeHttpRequest({});

      await assert.rejects(
        async () => await decoder(invalidData),
      );
    });

    test('无效的状态码应该抛出错误', async () => {
      const invalidData = Buffer.from('HTTP/1.1 ABC OK\r\n\r\n');
      const decoder = decodeHttpResponse({});

      await assert.rejects(
        async () => await decoder(invalidData),
      );
    });

    test('缺少冒号的头部应该抛出错误', async () => {
      const invalidData = Buffer.from(
        'GET /test HTTP/1.1\r\n' +
        'Invalid-Header-Without-Colon\r\n' +
        '\r\n',
      );
      const decoder = decodeHttpRequest({});

      await assert.rejects(
        async () => await decoder(invalidData),
      );
    });

    test('重复的Content-Length头部应该抛出错误', async () => {
      const invalidData = Buffer.from(
        'POST /test HTTP/1.1\r\n' +
        'Content-Length: 10\r\n' +
        'Content-Length: 20\r\n' +
        '\r\n',
      );
      const decoder = decodeHttpRequest({});

      await assert.rejects(
        async () => await decoder(invalidData),
      );
    });

    test('无效的Content-Length值应该抛出错误', async () => {
      const invalidData = Buffer.from(
        'POST /test HTTP/1.1\r\n' +
        'Content-Length: -5\r\n' +
        '\r\n',
      );
      const decoder = decodeHttpRequest({});

      await assert.rejects(
        async () => await decoder(invalidData),
      );
    });

    test('无效的分块大小应该抛出错误', async () => {
      const invalidData = Buffer.from(
        'POST /test HTTP/1.1\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        'INVALID_HEX\r\n',
      );
      const decoder = decodeHttpRequest({});

      await assert.rejects(
        async () => await decoder(invalidData),
      );
    });

    test('非Buffer输入应该抛出错误', async () => {
      const decoder = decodeHttpRequest({});

      await assert.rejects(
        async () => await decoder('not a buffer'),
        {
          message: /Input must be a Buffer/,
        },
      );
    });

    test('解析完成后继续调用应该抛出错误', async () => {
      const requestData = Buffer.from('GET / HTTP/1.1\r\n\r\n');
      const decoder = decodeHttpRequest({});

      await decoder(requestData);

      await assert.rejects(
        async () => await decoder(Buffer.from('more data')),
        {
          message: /Parser already completed/,
        },
      );
    });
  });

  describe('边界情况测试', () => {
    test('空主体的请求', async () => {
      const requestData = Buffer.from(
        'GET /empty HTTP/1.1\r\n' +
        'Content-Length: 0\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.headers['content-length'], 0);
      assert.strictEqual(result.body.length, 0);
      assert.strictEqual(result.complete, true);
    });

    test('大的Content-Length值', async () => {
      const bodySize = 1000;
      const body = 'x'.repeat(bodySize);
      const requestData = Buffer.from(
        'POST /large HTTP/1.1\r\n' +
        `Content-Length: ${bodySize}\r\n` +
        '\r\n' +
        body,
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.headers['content-length'], bodySize);
      assert.strictEqual(result.body.toString(), body);
      assert.strictEqual(result.complete, true);
    });

    test('HTTP/1.0版本', async () => {
      const requestData = Buffer.from(
        'GET /old HTTP/1.0\r\n' +
        'Host: example.com\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.httpVersion, '1.0');
      assert.strictEqual(result.complete, true);
    });

    test('方法名转换为大写', async () => {
      const requestData = Buffer.from(
        'post /test HTTP/1.1\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.method, 'POST');
    });

    test('头部字段名转换为小写', async () => {
      const requestData = Buffer.from(
        'GET /test HTTP/1.1\r\n' +
        'Content-TYPE: application/json\r\n' +
        'HOST: example.com\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.headers['content-type'], 'application/json');
      assert.strictEqual(result.headers.host, 'example.com');
    });

    test('头部值的空格修剪', async () => {
      const requestData = Buffer.from(
        'GET /test HTTP/1.1\r\n' +
        'Host:   example.com   \r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.headers.host, 'example.com');
    });

    test('空的头部值会被忽略', async () => {
      const requestData = Buffer.from(
        'GET /test HTTP/1.1\r\n' +
        'Empty-Header: \r\n' +
        'Valid-Header: value\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(result.headers['empty-header'], undefined);
      assert.strictEqual(result.headers['valid-header'], 'value');
    });
  });

  describe('分块传输详细测试', () => {
    test('单个分块', async () => {
      const chunk = 'Single chunk data';
      const requestData = Buffer.from(
        'POST /chunk HTTP/1.1\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        `${chunk.length.toString(16)}\r\n${chunk}\r\n` +
        '0\r\n\r\n',
      );

      let bodyData = Buffer.from([]);
      const decoder = decodeHttpRequest({
        onBody: async (chunkData) => {
          bodyData = Buffer.concat([bodyData, chunkData]);
        },
      });

      const result = await decoder(requestData);

      assert.strictEqual(result.complete, true);
      assert.strictEqual(bodyData.toString(), chunk);
    });

    test('多个小分块', async () => {
      const chunks = ['a', 'bb', 'ccc', 'dddd'];
      let chunkedData = '';

      chunks.forEach(chunk => {
        chunkedData += `${chunk.length.toString(16)}\r\n${chunk}\r\n`;
      });
      chunkedData += '0\r\n\r\n';

      const requestData = Buffer.from(
        'POST /chunks HTTP/1.1\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        chunkedData,
      );

      const receivedChunks = [];
      const decoder = decodeHttpRequest({
        onBody: async (chunk) => {
          receivedChunks.push(chunk.toString());
        },
      });

      const result = await decoder(requestData);

      assert.strictEqual(result.complete, true);
      assert.deepStrictEqual(receivedChunks, chunks);
    });

    test('十六进制分块大小解析', async () => {
      const chunk = 'X'.repeat(255); // FF in hex
      const requestData = Buffer.from(
        'POST /hex HTTP/1.1\r\n' +
        'Transfer-Encoding: chunked\r\n' +
        '\r\n' +
        `ff\r\n${chunk}\r\n` +
        '0\r\n\r\n',
      );

      let bodyData = Buffer.from([]);
      const decoder = decodeHttpRequest({
        onBody: async (chunkData) => {
          bodyData = Buffer.concat([bodyData, chunkData]);
        },
      });

      const result = await decoder(requestData);

      assert.strictEqual(result.complete, true);
      assert.strictEqual(bodyData.length, 255);
    });
  });

  describe('时间测量测试', () => {
    test('验证时间测量字段存在', async () => {
      const requestData = Buffer.from(
        'GET /timing HTTP/1.1\r\n' +
        'Host: example.com\r\n' +
        'Content-Length: 5\r\n' +
        '\r\n' +
        'Hello',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      // 验证时间字段存在且为数字
      assert.strictEqual(typeof result.timeOnStartlineStart, 'number');
      assert.strictEqual(typeof result.timeOnStartlineEnd, 'number');
      assert.strictEqual(typeof result.timeOnStartline, 'number');
      assert.strictEqual(typeof result.timeOnHeadersStart, 'number');
      assert.strictEqual(typeof result.timeOnHeadersEnd, 'number');
      assert.strictEqual(typeof result.timeOnHeaders, 'number');
      assert.strictEqual(typeof result.timeOnBodyStart, 'number');
      assert.strictEqual(typeof result.timeOnBodyEnd, 'number');
      assert.strictEqual(typeof result.timeOnBody, 'number');

      // 验证时间逻辑合理性
      assert(result.timeOnStartline >= 0);
      assert(result.timeOnHeaders >= 0);
      assert(result.timeOnBody >= 0);
    });
  });

  describe('流式处理测试', () => {
    test('Server-Sent Events流', async () => {
      const responseData = Buffer.from(
        'HTTP/1.1 200 OK\r\n' +
        'Content-Type: text/event-stream\r\n' +
        'Cache-Control: no-cache\r\n' +
        '\r\n' +
        'data: Hello\r\n\r\n' +
        'data: World\r\n\r\n',
      );

      const streamChunks = [];
      const decoder = decodeHttpResponse({
        onBody: async (chunk) => {
          streamChunks.push(chunk.toString());
        },
      });

      const result = await decoder(responseData);

      assert.strictEqual(result.statusCode, 200);
      assert.strictEqual(result.headers['content-type'], 'text/event-stream');
      assert.strictEqual(streamChunks.length, 1);
      assert.strictEqual(streamChunks[0], 'data: Hello\r\n\r\ndata: World\r\n\r\n');
    });
  });

  describe('统计信息测试', () => {
    test('验证字节计数和调用计数', async () => {
      const requestData = Buffer.from('GET / HTTP/1.1\r\n\r\n');
      const decoder = decodeHttpRequest({});

      const result = await decoder(requestData);

      assert.strictEqual(result.bytes, requestData.length);
      assert.strictEqual(result.count, 1);
    });

    test('多次调用的计数', async () => {
      const decoder = decodeHttpRequest({});

      const chunk1 = Buffer.from('GET /test');
      const chunk2 = Buffer.from(' HTTP/1.1\r\n\r\n');

      await decoder(chunk1);
      const result = await decoder(chunk2);

      assert.strictEqual(result.count, 2);
      assert.strictEqual(result.bytes, chunk1.length + chunk2.length);
    });
  });

  describe('回调函数测试', () => {
    test('所有回调函数都被正确调用', async () => {
      const requestData = Buffer.from(
        'POST /callback HTTP/1.1\r\n' +
        'Content-Length: 4\r\n' +
        '\r\n' +
        'test',
      );

      const callOrder = [];

      const decoder = decodeHttpRequest({
        onStartLine: async (state) => {
          callOrder.push('startLine');
          assert.strictEqual(state.method, 'POST');
        },
        onHeader: async (state) => {
          callOrder.push('header');
          assert.strictEqual(state.headers['content-length'], 4);
        },
        onBody: async (chunk) => {
          callOrder.push('body');
          assert.strictEqual(chunk.toString(), 'test');
        },
        onEnd: async (state) => {
          callOrder.push('end');
          assert.strictEqual(state.complete, true);
        },
      });

      await decoder(requestData);

      assert.deepStrictEqual(callOrder, ['startLine', 'header', 'body', 'end']);
    });

    test('回调函数中的异步操作', async () => {
      const requestData = Buffer.from('GET /async HTTP/1.1\r\n\r\n');

      let asyncOperationCompleted = false;

      const decoder = decodeHttpRequest({
        onStartLine: async () => {
          // 模拟异步操作
          await new Promise(resolve => setTimeout(resolve, 10));
          asyncOperationCompleted = true;
        },
      });

      await decoder(requestData);

      assert.strictEqual(asyncOperationCompleted, true);
    });
  });

  describe('headersRaw测试', () => {
    test('验证原始头部数组', async () => {
      const requestData = Buffer.from(
        'GET /raw HTTP/1.1\r\n' +
        'Host: example.com\r\n' +
        'User-Agent: test\r\n' +
        '\r\n',
      );

      const decoder = decodeHttpRequest({});
      const result = await decoder(requestData);

      assert.strictEqual(Array.isArray(result.headersRaw), true);
      assert.strictEqual(result.headersRaw.length, 4); // 2 headers * 2 (key + value)
      assert.strictEqual(result.headersRaw[0], 'Host');
      assert.strictEqual(result.headersRaw[1], 'example.com');
      assert.strictEqual(result.headersRaw[2], 'User-Agent');
      assert.strictEqual(result.headersRaw[3], 'test');
    });
  });
});
