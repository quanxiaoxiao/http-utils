import { parse } from 'node:url';
import { HttpUrlParseError } from './errors.mjs';

export default (href) => {
  if (!/^https?:\/\/\w+/.test(href)) {
    throw new HttpUrlParseError(`href \`${href}\` invalid`);
  }
  const {
    protocol,
    path,
    port,
    hostname,
  } = parse(href);
  if (!hostname) {
    throw new HttpUrlParseError(`href \`${href}\` invalid`);
  }
  if (protocol !== 'https:' && protocol !== 'http:') {
    throw new HttpUrlParseError(`protocol \`${protocol}\` unspport`);
  }

  let p = port ? Number(port) : null;
  if (p == null) {
    p = protocol === 'https:' ? 443 : 80;
  }
  if (p <= 0 || p > 65535 || Number.isNaN(p)) {
    throw new HttpUrlParseError(`port \`${p}\` invalid`);
  }
  return {
    protocol,
    hostname,
    port: p,
    path: path || '/',
  };
};
