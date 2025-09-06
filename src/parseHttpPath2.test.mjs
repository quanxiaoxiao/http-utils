import assert from 'node:assert';
import { describe,test } from 'node:test';

import parseHttpPath from './parseHttpPath.mjs';

describe('parseHttpPath', () => {

  describe('基本功能测试', () => {
    test('解析空字符串', () => {
      const result = parseHttpPath('');
      assert.deepEqual(result, ['/', '', {}]);
    });

    test('解析根路径', () => {
      const result = parseHttpPath('/');
      assert.deepEqual(result, ['/', '', {}]);
    });

    test('解析不带查询参数的路径', () => {
      const result = parseHttpPath('/users');
      assert.deepEqual(result, ['/users', '', {}]);
    });

    test('解析不以斜杠开头的路径', () => {
      const result = parseHttpPath('users');
      assert.deepEqual(result, ['/users', '', {}]);
    });
  });

  describe('查询参数测试', () => {
    test('解析单个查询参数', () => {
      const result = parseHttpPath('/search?q=test');
      assert.deepEqual(result, ['/search', 'q=test', { q: 'test' }]);
    });

    test('解析多个查询参数', () => {
      const result = parseHttpPath('/api/users?page=1&limit=10&sort=name');
      assert.deepEqual(result, [
        '/api/users',
        'page=1&limit=10&sort=name',
        { page: '1', limit: '10', sort: 'name' },
      ]);
    });

    test('解析空查询参数值', () => {
      const result = parseHttpPath('/search?q=&filter=');
      assert.deepEqual(result, [
        '/search',
        'q=&filter=',
        { q: '', filter: '' },
      ]);
    });

    test('解析没有值的查询参数', () => {
      const result = parseHttpPath('/api?debug&verbose');
      assert.deepEqual(result, [
        '/api',
        'debug&verbose',
        { debug: '', verbose: '' },
      ]);
    });

    test('解析只有问号没有查询参数的路径', () => {
      const result = parseHttpPath('/path?');
      assert.deepEqual(result, ['/path', '', {}]);
    });
  });

  describe('特殊字符处理', () => {
    test('解析包含加号的查询参数', () => {
      const result = parseHttpPath('/search?q=hello+world');
      // 加号应该被保留，不被解析为空格
      assert.deepEqual(result, [
        '/search',
        'q=hello+world',
        { q: 'hello+world' },
      ]);
    });

    test('解析URL编码的查询参数', () => {
      const result = parseHttpPath('/search?q=hello%20world&name=张三');
      assert.deepEqual(result, [
        '/search',
        'q=hello%20world&name=张三',
        { q: 'hello world', name: '张三' },
      ]);
    });

    test('解析包含特殊字符的路径', () => {
      const result = parseHttpPath('/users/123?callback=jQuery123_456&_=1234567890');
      assert.deepEqual(result, [
        '/users/123',
        'callback=jQuery123_456&_=1234567890',
        { callback: 'jQuery123_456', _: '1234567890' },
      ]);
    });

    test('解析包含数组参数的查询字符串', () => {
      const result = parseHttpPath('/api?tags=js&tags=node&tags=test');
      assert.deepEqual(result, [
        '/api',
        'tags=js&tags=node&tags=test',
        { tags: ['js', 'node', 'test'] },
      ]);
    });
  });

  describe('边界情况测试', () => {
    test('解析复杂的路径', () => {
      const result = parseHttpPath('/api/v1/users/search?q=john+doe&age=25&active=true&tags=developer&tags=javascript');
      assert.deepEqual(result, [
        '/api/v1/users/search',
        'q=john+doe&age=25&active=true&tags=developer&tags=javascript',
        {
          q: 'john+doe',
          age: '25',
          active: 'true',
          tags: ['developer', 'javascript'],
        },
      ]);
    });

    test('解析包含等号的参数值', () => {
      const result = parseHttpPath('/api?equation=x=y+1&formula=a=b*c');
      assert.deepEqual(result, [
        '/api',
        'equation=x=y+1&formula=a=b*c',
        { equation: 'x=y+1', formula: 'a=b*c' },
      ]);
    });

    test('解析包含问号的参数值', () => {
      const result = parseHttpPath('/search?q=what?&who=me?');
      assert.deepEqual(result, [
        '/search',
        'q=what?&who=me?',
        { q: 'what?', who: 'me?' },
      ]);
    });

    test('解析非常长的路径', () => {
      const longPath = '/api/v1/users/' + 'a'.repeat(100);
      const longQuery = 'param=' + 'b'.repeat(100);
      const result = parseHttpPath(`${longPath}?${longQuery}`);
      assert.deepEqual(result, [
        longPath,
        longQuery,
        { param: 'b'.repeat(100) },
      ]);
    });
  });

  describe('错误处理测试', () => {
    test('传入非字符串参数应该抛出错误', () => {
      assert.throws(() => parseHttpPath(null), {
        name: 'AssertionError',
        message: 'Path must be a string',
      });
    });

    test('传入数字应该抛出错误', () => {
      assert.throws(() => parseHttpPath(123), {
        name: 'AssertionError',
      });
    });

    test('传入对象应该抛出错误', () => {
      assert.throws(() => parseHttpPath({}), {
        name: 'AssertionError',
      });
    });

    test('传入undefined应该抛出错误', () => {
      assert.throws(() => parseHttpPath(undefined), {
        name: 'AssertionError',
      });
    });
  });

  describe('实际场景测试', () => {
    test('解析典型的搜索页面URL', () => {
      const result = parseHttpPath('/search?q=nodejs+test&category=tutorial&sort=date&page=2');
      assert.deepEqual(result, [
        '/search',
        'q=nodejs+test&category=tutorial&sort=date&page=2',
        {
          q: 'nodejs+test',
          category: 'tutorial',
          sort: 'date',
          page: '2',
        },
      ]);
    });

    test('解析API端点URL', () => {
      const result = parseHttpPath('/api/v2/posts?include=author,comments&fields[posts]=title,body&filter[status]=published');
      assert.deepEqual(result, [
        '/api/v2/posts',
        'include=author,comments&fields[posts]=title,body&filter[status]=published',
        {
          include: 'author,comments',
          'fields[posts]': 'title,body',
          'filter[status]': 'published',
        },
      ]);
    });

    test('解析带hash的URL（hash会被忽略，只处理pathname和query）', () => {
      const result = parseHttpPath('/users/profile?tab=settings');
      assert.deepEqual(result, [
        '/users/profile',
        'tab=settings',
        { tab: 'settings' },
      ]);
    });
  });
});
