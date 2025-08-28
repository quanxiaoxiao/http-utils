import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import { describe,test } from 'node:test';

import wrapContentChunk from './wrapContentChunk.mjs';

const CRLF = '\r\n';
const MAX_CHUNK_SIZE = 65535;

describe('Chunked Encoder', () => {

  describe('输入验证', () => {
    test('应该拒绝非Buffer输入', () => {
      assert.throws(() => wrapContentChunk('string'), {
        name: 'AssertionError',
        message: /Input must be a Buffer/,
      });

      assert.throws(() => wrapContentChunk(null), {
        name: 'AssertionError',
      });

      assert.throws(() => wrapContentChunk(undefined), {
        name: 'AssertionError',
      });

      assert.throws(() => wrapContentChunk(123), {
        name: 'AssertionError',
      });
    });
  });

  describe('小数据块编码 (≤ 65535 字节)', () => {
    test('应该正确编码空Buffer', () => {
      const input = Buffer.alloc(0);
      const result = wrapContentChunk(input);
      const expected = Buffer.from(`0${CRLF}${CRLF}`);

      assert.deepStrictEqual(result, expected);
    });

    test('应该正确编码小字符串', () => {
      const input = Buffer.from('Hello World');
      const result = wrapContentChunk(input);
      const expectedSize = input.length.toString(16); // 'b'
      const expected = Buffer.from(`${expectedSize}${CRLF}Hello World${CRLF}`);

      assert.deepStrictEqual(result, expected);
    });

    test('应该正确编码中等大小数据', () => {
      const input = Buffer.alloc(1024, 'A');
      const result = wrapContentChunk(input);
      const expectedSize = (1024).toString(16); // '400'
      const expected = Buffer.concat([
        Buffer.from(`${expectedSize}${CRLF}`),
        input,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });

    test('应该正确编码最大单chunk大小', () => {
      const input = Buffer.alloc(MAX_CHUNK_SIZE, 'X');
      const result = wrapContentChunk(input);
      const expectedSize = MAX_CHUNK_SIZE.toString(16); // 'ffff'
      const expected = Buffer.concat([
        Buffer.from(`${expectedSize}${CRLF}`),
        input,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });
  });

  describe('大数据块编码 (> 65535 字节)', () => {
    test('应该正确分割刚好超过最大大小的数据', () => {
      const input = Buffer.alloc(MAX_CHUNK_SIZE + 1, 'Y');
      const result = wrapContentChunk(input);

      const chunk1 = input.slice(0, MAX_CHUNK_SIZE);
      const chunk2 = input.slice(MAX_CHUNK_SIZE);

      const expected = Buffer.concat([
        Buffer.from(`${MAX_CHUNK_SIZE.toString(16)}${CRLF}`),
        chunk1,
        Buffer.from(CRLF),
        Buffer.from(`1${CRLF}`),
        chunk2,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });

    test('应该正确分割两倍最大大小的数据', () => {
      const input = Buffer.alloc(MAX_CHUNK_SIZE * 2, 'Z');
      const result = wrapContentChunk(input);

      const chunk1 = input.slice(0, MAX_CHUNK_SIZE);
      const chunk2 = input.slice(MAX_CHUNK_SIZE, MAX_CHUNK_SIZE * 2);

      const expected = Buffer.concat([
        Buffer.from(`${MAX_CHUNK_SIZE.toString(16)}${CRLF}`),
        chunk1,
        Buffer.from(CRLF),
        Buffer.from(`${MAX_CHUNK_SIZE.toString(16)}${CRLF}`),
        chunk2,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });

    test('应该正确分割有余数的大数据', () => {
      const totalSize = MAX_CHUNK_SIZE * 2 + 500;
      const input = Buffer.alloc(totalSize, 'M');
      const result = wrapContentChunk(input);

      const chunk1 = input.slice(0, MAX_CHUNK_SIZE);
      const chunk2 = input.slice(MAX_CHUNK_SIZE, MAX_CHUNK_SIZE * 2);
      const chunk3 = input.slice(MAX_CHUNK_SIZE * 2);

      const expected = Buffer.concat([
        Buffer.from(`${MAX_CHUNK_SIZE.toString(16)}${CRLF}`),
        chunk1,
        Buffer.from(CRLF),
        Buffer.from(`${MAX_CHUNK_SIZE.toString(16)}${CRLF}`),
        chunk2,
        Buffer.from(CRLF),
        Buffer.from(`${(500).toString(16)}${CRLF}`), // '1f4'
        chunk3,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });
  });

  describe('边界情况', () => {
    test('应该处理二进制数据', () => {
      const input = Buffer.from([0x00, 0xFF, 0x80, 0x7F, 0x01, 0xFE]);
      const result = wrapContentChunk(input);
      const expectedSize = (6).toString(16); // '6'
      const expected = Buffer.concat([
        Buffer.from(`${expectedSize}${CRLF}`),
        input,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });

    test('应该处理包含CRLF的数据', () => {
      const input = Buffer.from(`Hello${CRLF}World`);
      const result = wrapContentChunk(input);
      const expectedSize = input.length.toString(16);
      const expected = Buffer.concat([
        Buffer.from(`${expectedSize}${CRLF}`),
        input,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });

    test('应该处理UTF-8字符', () => {
      const input = Buffer.from('Hello 世界 🌍', 'utf8');
      const result = wrapContentChunk(input);
      const expectedSize = input.length.toString(16);
      const expected = Buffer.concat([
        Buffer.from(`${expectedSize}${CRLF}`),
        input,
        Buffer.from(CRLF),
      ]);

      assert.deepStrictEqual(result, expected);
    });
  });

  describe('性能测试', () => {
    test('应该能处理大数据而不超时', () => {
      const largeSize = MAX_CHUNK_SIZE * 10 + 1000;
      const input = Buffer.alloc(largeSize, 'P');

      const startTime = process.hrtime.bigint();
      const result = wrapContentChunk(input);
      const endTime = process.hrtime.bigint();

      // 验证结果不为空
      assert(result.length > 0);

      // 性能检查 - 应该在合理时间内完成（比如1秒）
      const durationMs = Number(endTime - startTime) / 1000000;
      assert(durationMs < 1000, `编码耗时过长: ${durationMs}ms`);
    });
  });

  describe('数据完整性验证', () => {
    test('编码后的数据应该包含所有原始数据', () => {
      const testCases = [
        Buffer.from('small'),
        Buffer.alloc(MAX_CHUNK_SIZE / 2, 'M'),
        Buffer.alloc(MAX_CHUNK_SIZE + 100, 'L'),
        Buffer.alloc(MAX_CHUNK_SIZE * 3 + 50, 'X'),
      ];

      testCases.forEach((input, index) => {
        const encoded = wrapContentChunk(input);

        // 简单验证：编码后的数据应该比原数据长（因为添加了size和CRLF）
        assert(encoded.length > input.length, `测试用例 ${index}: 编码后数据过短`);

        // 验证编码后的数据包含原始数据的某些片段
        // 这是一个基础检查，真正的解码器会更复杂
        const encodedStr = encoded.toString('hex');
        const inputStr = input.toString('hex');

        // 如果输入不为空，编码结果应该包含输入数据
        if (input.length > 0 && input.length <= MAX_CHUNK_SIZE) {
          assert(encodedStr.includes(inputStr), `测试用例 ${index}: 编码结果不包含原始数据`);
        }
      });
    });

    test('应该正确计算chunk数量', () => {
      const testCases = [
        { size: 0, expectedChunks: 1 },
        { size: 1, expectedChunks: 1 },
        { size: MAX_CHUNK_SIZE, expectedChunks: 1 },
        { size: MAX_CHUNK_SIZE + 1, expectedChunks: 2 },
        { size: MAX_CHUNK_SIZE * 2, expectedChunks: 2 },
        { size: MAX_CHUNK_SIZE * 2 + 1, expectedChunks: 3 },
      ];

      testCases.forEach(({ size, expectedChunks }) => {
        const input = Buffer.alloc(size, 'T');
        const encoded = wrapContentChunk(input);

        // 计算CRLF出现次数来估算chunk数量
        // 每个chunk有2个CRLF（size后面一个，data后面一个）
        const crlfCount = (encoded.toString().match(/\r\n/g) || []).length;
        const actualChunks = crlfCount / 2;

        assert.strictEqual(actualChunks, expectedChunks,
          `大小为 ${size} 的数据应该生成 ${expectedChunks} 个chunk，实际生成 ${actualChunks} 个`);
      });
    });
  });
});
