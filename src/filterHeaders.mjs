import assert from 'node:assert';

export default (headers, keys) => {
  assert(Array.isArray(headers), 'headers must be an array');
  assert(Array.isArray(keys), 'keys must be an array');

  if (keys.length === 0) {
    return headers;
  }

  const result = [];
  const keySet = new Set(keys.map(key => key.toLowerCase()));
  for (let i = 0; i < headers.length; i += 2) {
    const key = headers[i];
    const value = headers[i + 1];

    if (!keySet.has(key.toLowerCase())) {
      result.push(key, value === undefined ? '' : value);
    }
  }
  return result;
};
