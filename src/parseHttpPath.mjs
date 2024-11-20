import qs from 'node:querystring';
import assert from 'node:assert';

const generatePathname = (s) => {
  if (s[0] !== '/') {
    return `/${s}`;
  }
  return s;
};

const codeWithPlus = encodeURIComponent('+');

export default (path) => {
  assert(typeof path === 'string');
  if (!path) {
    return ['/', '', {}];
  }
  const index = path.indexOf('?');
  if (index === -1) {
    return [generatePathname(path), '', {}];
  }
  const pathname = path.slice(0, index);
  const querystring = path.slice(index + 1);
  if (!querystring) {
    return [generatePathname(pathname), '', {}];
  }
  const query = qs.parse(querystring.replace(/\+/g, () => codeWithPlus));
  return [
    generatePathname(pathname),
    querystring,
    query,
  ];
};
