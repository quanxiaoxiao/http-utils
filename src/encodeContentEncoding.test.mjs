import assert from 'node:assert';
import test, { beforeEach,describe } from 'node:test';
import zlib, {
  brotliCompressSync,
  brotliDecompressSync,
  gunzipSync,
  gzipSync,
} from 'node:zlib';

import encodeContentEncoding from './encodeContentEncoding.mjs';

test('encodeContentEncoding', () => {
  assert(
    encodeContentEncoding(Buffer.from('xxx')).buf.equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzz')
      .buf
      .equals(Buffer.from('xxx')),
  );
  const buf = Buffer.alloc(1028).fill('xxx');
  assert(
    encodeContentEncoding(buf, 'gzip')
      .buf
      .equals(gzipSync(buf)),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'gzip')
      .buf
      .equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(Buffer.from('xxx'), 'br')
      .buf
      .equals(Buffer.from('xxx')),
  );
  assert(
    encodeContentEncoding(buf, 'br, gzip', 4)
      .buf
      .equals(brotliCompressSync(buf, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      })),
  );
  assert(
    encodeContentEncoding(buf, 'br,gzip', 5)
      .buf
      .equals(brotliCompressSync(buf, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
        },
      })),
  );
  assert(
    encodeContentEncoding(buf, 'gzip, br', 6)
      .buf
      .equals(brotliCompressSync(buf, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
        },
      })),
  );
  assert(
    encodeContentEncoding(buf, 'gzipp, brr')
      .buf
      .equals(buf),
  );
  assert(
    encodeContentEncoding(buf, 'brs, gzip')
      .buf
      .equals(gzipSync(buf)),
  );
});

describe('压缩中间件测试', () => {
  let smallBuffer, largeBuffer, emptyBuffer;

  beforeEach(() => {
    // 准备测试数据
    emptyBuffer = Buffer.alloc(0);
    smallBuffer = Buffer.from('小内容测试'); // 小于1KB
    largeBuffer = Buffer.from('大内容测试'.repeat(200)); // 大于1KB
  });

  describe('基本功能测试', () => {
    test('应该接受Buffer类型的chunk参数', () => {
      const result = encodeContentEncoding(smallBuffer, 'gzip');
      assert.strictEqual(typeof result, 'object');
      assert.ok('name' in result);
      assert.ok('buf' in result);
      assert.ok(Buffer.isBuffer(result.buf));
    });

    test('当chunk不是Buffer时应该抛出错误', () => {
      assert.throws(() => {
        encodeContentEncoding('not a buffer', 'gzip');
      }, {
        name: 'AssertionError',
      });
    });

    test('当acceptEncoding不是字符串时应该抛出错误', () => {
      assert.throws(() => {
        encodeContentEncoding(smallBuffer, 123);
      }, {
        name: 'AssertionError',
      });
    });
  });

  describe('空内容和无编码头处理', () => {
    test('没有Accept-Encoding头时应该返回原内容', () => {
      const result = encodeContentEncoding(largeBuffer);
      assert.strictEqual(result.name, null);
      assert.ok(result.buf.equals(largeBuffer));
    });

    test('Accept-Encoding为空字符串时应该返回原内容', () => {
      const result = encodeContentEncoding(largeBuffer, '');
      assert.strictEqual(result.name, null);
      assert.ok(result.buf.equals(largeBuffer));
    });

    test('空缓冲区应该返回空缓冲区', () => {
      const result = encodeContentEncoding(emptyBuffer, 'gzip');
      assert.strictEqual(result.name, null);
      assert.strictEqual(result.buf.length, 0);
      assert.ok(Buffer.isBuffer(result.buf));
    });
  });

  describe('最小压缩阈值测试', () => {
    test('小于1KB的内容不应该被压缩', () => {
      const result = encodeContentEncoding(smallBuffer, 'gzip');
      assert.strictEqual(result.name, null);
      assert.ok(result.buf.equals(smallBuffer));
    });

    test('大于1KB的内容应该被压缩', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip');
      assert.strictEqual(result.name, 'gzip');
      assert.ok(result.buf.length < largeBuffer.length);
    });
  });

  describe('Gzip压缩测试', () => {
    test('应该正确执行gzip压缩', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip');
      assert.strictEqual(result.name, 'gzip');

      // 验证可以解压缩
      const decompressed = gunzipSync(result.buf);
      assert.ok(decompressed.equals(largeBuffer));
    });

    test('应该识别不同大小写的gzip', () => {
      const result1 = encodeContentEncoding(largeBuffer, 'GZIP');
      const result2 = encodeContentEncoding(largeBuffer, 'GzIp');

      assert.strictEqual(result1.name, 'gzip');
      assert.strictEqual(result2.name, 'gzip');
    });
  });

  describe('Brotli压缩测试', () => {
    test('应该正确执行brotli压缩', () => {
      const result = encodeContentEncoding(largeBuffer, 'br');
      assert.strictEqual(result.name, 'br');

      // 验证可以解压缩
      const decompressed = brotliDecompressSync(result.buf);
      assert.ok(decompressed.equals(largeBuffer));
    });

    test('应该识别不同大小写的br', () => {
      const result1 = encodeContentEncoding(largeBuffer, 'BR');
      const result2 = encodeContentEncoding(largeBuffer, 'Br');

      assert.strictEqual(result1.name, 'br');
      assert.strictEqual(result2.name, 'br');
    });
  });

  describe('多编码格式支持测试', () => {
    test('多个编码格式，应该选择第一个支持的', () => {
      const result = encodeContentEncoding(largeBuffer, 'deflate, gzip, br');
      assert.strictEqual(result.name, 'br');
    });

    test('Brotli优先级应该高于Gzip（相同质量值时）', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip, br');
      assert.strictEqual(result.name, 'br');
    });

    test('不支持的编码格式应该返回原内容', () => {
      const result = encodeContentEncoding(largeBuffer, 'deflate, encodeContentEncoding');
      assert.strictEqual(result.name, null);
      assert.ok(result.buf.equals(largeBuffer));
    });
  });

  describe('质量值(q值)解析测试', () => {
    test('应该根据质量值选择编码格式', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip;q=0.9, br;q=0.8');
      assert.strictEqual(result.name, 'gzip');
    });

    test('质量值为0的编码应该被忽略', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip;q=0, br;q=1.0');
      assert.strictEqual(result.name, 'br');
    });

    test('相同质量值时，Brotli应该优先', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip;q=1.0, br;q=1.0');
      assert.strictEqual(result.name, 'br');
    });

    test('没有质量值时默认为1.0', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip;q=0.5, br');
      assert.strictEqual(result.name, 'br');
    });

    test('应该正确解析复杂的Accept-Encoding头', () => {
      const result = encodeContentEncoding(largeBuffer, 'deflate;q=0.6, gzip;q=0.8, br;q=1.0, *;q=0.1');
      assert.strictEqual(result.name, 'br');
    });
  });

  describe('边界情况测试', () => {
    test('Accept-Encoding包含空格应该被正确处理', () => {
      const result = encodeContentEncoding(largeBuffer, ' gzip , br ');
      assert.strictEqual(result.name, 'br');
    });

    test('Accept-Encoding包含多余分号应该被正确处理', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip;q=0.8;, br;q=1.0;');
      assert.strictEqual(result.name, 'br');
    });

    test('无效的质量值应该被忽略', () => {
      const result = encodeContentEncoding(largeBuffer, 'gzip;q=invalid, br');
      assert.strictEqual(result.name, 'br');
    });

    test('只包含不支持编码的请求应该返回原内容', () => {
      const result = encodeContentEncoding(largeBuffer, 'deflate, encodeContentEncoding, identity');
      assert.strictEqual(result.name, null);
      assert.ok(result.buf.equals(largeBuffer));
    });
  });

  describe('性能测试', () => {
    test('大内容压缩应该有明显的压缩效果', () => {
      const veryLargeBuffer = Buffer.from('测试内容'.repeat(10000));

      const gzipResult = encodeContentEncoding(veryLargeBuffer, 'gzip');
      const brResult = encodeContentEncoding(veryLargeBuffer, 'br');

      // Gzip压缩率应该大于50%
      assert.ok(gzipResult.buf.length < veryLargeBuffer.length * 0.5);

      // Brotli压缩率通常比Gzip更好
      assert.ok(brResult.buf.length <= gzipResult.buf.length);
    });

    test('重复内容应该有很好的压缩效果', () => {
      const repeatBuffer = Buffer.from('A'.repeat(5000));

      const result = encodeContentEncoding(repeatBuffer, 'gzip');

      // 重复内容压缩率应该非常高
      assert.ok(result.buf.length < repeatBuffer.length * 0.01);
    });
  });

  describe('实际HTTP场景测试', () => {
    test('模拟Chrome浏览器的Accept-Encoding', () => {
      const chromeHeader = 'gzip, deflate, br';
      const result = encodeContentEncoding(largeBuffer, chromeHeader);
      assert.strictEqual(result.name, 'br');
    });

    test('模拟Firefox浏览器的Accept-Encoding', () => {
      const firefoxHeader = 'gzip, deflate, br;q=1.0, *;q=0.1';
      const result = encodeContentEncoding(largeBuffer, firefoxHeader);
      assert.strictEqual(result.name, 'br');
    });

    test('模拟旧浏览器只支持gzip', () => {
      const oldBrowserHeader = 'gzip, deflate';
      const result = encodeContentEncoding(largeBuffer, oldBrowserHeader);
      assert.strictEqual(result.name, 'gzip');
    });

    test('模拟代理服务器的Accept-Encoding', () => {
      const proxyHeader = 'gzip;q=1.0, identity; q=0.1, *;q=0';
      const result = encodeContentEncoding(largeBuffer, proxyHeader);
      assert.strictEqual(result.name, 'gzip');
    });
  });
});
