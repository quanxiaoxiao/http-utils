import assert from 'node:assert';
import qs from 'node:querystring';

const normalizePath = (path) => {
  return path.startsWith('/') ? path : `/${path}`;
};

export default (path) => {
  assert(typeof path === 'string', 'Path must be a string');

  if (!path) {
    return ['/', '', {}];
  }

  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) {
    return [normalizePath(path), '', {}];
  }

  const pathname = path.slice(0, queryIndex);
  const querystring = path.slice(queryIndex + 1);

  if (!querystring) {
    return [normalizePath(pathname), '', {}];
  }
  const encodedPlusQuery = querystring.replace(/\+/g, encodeURIComponent('+'));
  const query = qs.parse(encodedPlusQuery);

  return [
    normalizePath(pathname),
    querystring,
    query,
  ];
};
