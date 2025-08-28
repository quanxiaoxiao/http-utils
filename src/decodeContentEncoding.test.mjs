import assert from 'node:assert';
import { Buffer } from 'node:buffer';
import test, {
  beforeEach,
  describe,
} from 'node:test';
import {
  brotliCompressSync,
  deflateSync,
  gzipSync,
} from 'node:zlib';

import decodeContentEncoding from './decodeContentEncoding.mjs';

test('decodeContentEncoding', () => {
  assert(Buffer.from([]).equals(decodeContentEncoding(Buffer.from([]))));
  assert.throws(() => {
    decodeContentEncoding();
  });
  assert.throws(() => {
    decodeContentEncoding('aaa');
  });
  assert(Buffer.from('aaa').equals(decodeContentEncoding(Buffer.from('aaa'))));

  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      gzipSync(Buffer.from('aaa')),
      'gzip',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      gzipSync(Buffer.from('aaa')),
      'GZIP',
    )));
  assert(!Buffer.from('aaa')
    .equals(decodeContentEncoding(
      gzipSync(Buffer.from('aaa')),
    )));
  assert.throws(() => {
    decodeContentEncoding(gzipSync(Buffer.from('aaa')), 'br');
  });
  assert.throws(() => {
    decodeContentEncoding(brotliCompressSync(Buffer.from('aaa')), 'gzip');
  });
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      brotliCompressSync(Buffer.from('aaa')),
      'br',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'br, gzip',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'gzip, br',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'xxxx',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'gzips',
    )));
  assert(Buffer.from('aaa')
    .equals(decodeContentEncoding(
      Buffer.from('aaa'),
      'brs',
    )));
});

describe('解压缩模块测试', () => {
  const testData = 'Hello, World! This is a test string for compression and decompression.';
  const testBuffer = Buffer.from(testData, 'utf8');

  describe('基础功能测试', () => {
    test('应该正确处理空Buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = decodeContentEncoding(emptyBuffer, 'gzip');

      assert.strictEqual(result.length, 0);
      assert(Buffer.isBuffer(result));
    });

    test('应该在无编码时返回原始数据', () => {
      const result = decodeContentEncoding(testBuffer);

      assert.deepStrictEqual(result, testBuffer);
    });

    test('应该在编码为空字符串时返回原始数据', () => {
      const result = decodeContentEncoding(testBuffer, '');

      assert.deepStrictEqual(result, testBuffer);
    });
  });

  describe('Gzip解压缩测试', () => {
    let compressedData;

    beforeEach(() => {
      compressedData = gzipSync(testBuffer);
    });

    test('应该正确解压缩gzip数据', () => {
      const result = decodeContentEncoding(compressedData, 'gzip');

      assert.strictEqual(result.toString('utf8'), testData);
    });

    test('应该处理大小写不敏感的gzip编码', () => {
      const result1 = decodeContentEncoding(compressedData, 'GZIP');
      const result2 = decodeContentEncoding(compressedData, 'GzIp');

      assert.strictEqual(result1.toString('utf8'), testData);
      assert.strictEqual(result2.toString('utf8'), testData);
    });

    test('应该处理带空格的编码名称', () => {
      const result = decodeContentEncoding(compressedData, ' gzip ');

      assert.strictEqual(result.toString('utf8'), testData);
    });
  });

  describe('Deflate解压缩测试', () => {
    let compressedData;

    beforeEach(() => {
      compressedData = deflateSync(testBuffer);
    });

    test('应该正确解压缩deflate数据', () => {
      const result = decodeContentEncoding(compressedData, 'deflate');

      assert.strictEqual(result.toString('utf8'), testData);
    });
  });

  describe('Brotli解压缩测试', () => {
    let compressedData;

    beforeEach(() => {
      compressedData = brotliCompressSync(testBuffer);
    });

    test('应该正确解压缩brotli数据', () => {
      const result = decodeContentEncoding(compressedData, 'br');

      assert.strictEqual(result.toString('utf8'), testData);
    });

    test('应该支持brotli别名', () => {
      const result = decodeContentEncoding(compressedData, 'brotli');

      assert.strictEqual(result.toString('utf8'), testData);
    });
  });

  describe('异步解压缩测试', () => {
    test('应该正确异步解压缩gzip数据', async () => {
      const compressedData = gzipSync(testBuffer);
      const result = await decodeContentEncoding(compressedData, 'gzip');

      assert.strictEqual(result.toString('utf8'), testData);
    });

    test('应该正确处理异步错误', async () => {
      const invalidData = Buffer.from('invalid compressed data');

      await assert.rejects(
        async () => {
          await decodeContentEncoding(invalidData, 'gzip');
        },
        {
          name: 'Error',
          message: /Failed to decompress data with encoding 'gzip'/,
        },
      );
    });
  });

  describe('错误处理测试', () => {
    test('应该在参数不是Buffer时抛出错误', () => {
      assert.throws(
        () => {
          decodeContentEncoding('not a buffer', 'gzip');
        },
        {
          name: 'AssertionError',
          message: /chunk must be a Buffer/,
        },
      );
    });

    test('应该在无效压缩数据时抛出有意义的错误', () => {
      const invalidData = Buffer.from('invalid compressed data');

      assert.throws(
        () => {
          decodeContentEncoding(invalidData, 'gzip');
        },
        {
          name: 'Error',
          message: /Failed to decompress data with encoding 'gzip'/,
        },
      );
    });

    test('应该处理未知编码类型', () => {
      const result = decodeContentEncoding(testBuffer, 'unknown-encoding');

      assert.deepStrictEqual(result, testBuffer);
    });
  });

  describe('边界条件测试', () => {
    test('应该处理单字节数据', () => {
      const singleByte = Buffer.from([65]); // 'A'
      const compressed = gzipSync(singleByte);
      const result = decodeContentEncoding(compressed, 'gzip');

      assert.strictEqual(result.toString(), 'A');
    });

    test('应该处理大数据块', () => {
      const largeData = Buffer.alloc(10000, 'x');
      const compressed = gzipSync(largeData);
      const result = decodeContentEncoding(compressed, 'gzip');

      assert.strictEqual(result.length, 10000);
      assert.strictEqual(result.toString().charAt(0), 'x');
    });

    test('应该处理二进制数据', () => {
      const binaryData = Buffer.from([0, 1, 2, 3, 255, 254, 253]);
      const compressed = gzipSync(binaryData);
      const result = decodeContentEncoding(compressed, 'gzip');

      assert.deepStrictEqual(result, binaryData);
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内处理中等大小数据', () => {
      const mediumData = Buffer.alloc(1000, 'test data');
      const compressed = gzipSync(mediumData);

      const startTime = process.hrtime.bigint();
      const result = decodeContentEncoding(compressed, 'gzip');
      const endTime = process.hrtime.bigint();

      const durationMs = Number(endTime - startTime) / 1000000;

      assert(durationMs < 100, `解压缩耗时过长: ${durationMs}ms`);
      assert.strictEqual(result.length, 1000);
    });
  });
});

// 集成测试
describe('集成测试', () => {
  const testCases = [
    { encoding: 'gzip', compress: gzipSync },
    { encoding: 'deflate', compress: deflateSync },
    { encoding: 'br', compress: brotliCompressSync },
  ];

  testCases.forEach(({ encoding, compress }) => {
    test(`端到端测试 - ${encoding}`, () => {
      const originalData = 'Integration test data for ' + encoding;
      const originalBuffer = Buffer.from(originalData, 'utf8');

      // 压缩
      const compressed = compress(originalBuffer);

      // 解压缩
      const decompressed = decodeContentEncoding(compressed, encoding);

      // 验证
      assert.strictEqual(decompressed.toString('utf8'), originalData);
    });
  });
});

// 回归测试
describe('回归测试', () => {
  test('修复：空编码参数应返回原数据', () => {
    const data = Buffer.from('test');
    assert.deepStrictEqual(decodeContentEncoding(data, null), data);
    assert.deepStrictEqual(decodeContentEncoding(data, undefined), data);
  });

  test('修复：编码名称应不区分大小写', () => {
    const data = Buffer.from('test');
    const compressed = gzipSync(data);

    assert.doesNotThrow(() => {
      decodeContentEncoding(compressed, 'GZIP');
      decodeContentEncoding(compressed, 'Gzip');
      decodeContentEncoding(compressed, 'gzip');
    });
  });
});
