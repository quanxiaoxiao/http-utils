import assert from 'node:assert';

export default (arr, name) => {
  assert(Array.isArray(arr));
  assert(typeof name === 'string');
  assert(name !== '');
  const result = [];
  const regexp = new RegExp(name, 'i');
  for (let i = 0; i < arr.length;) {
    const key = arr[i];
    const value = arr[i + 1];
    if (regexp.test(key)) {
      result.push(decodeURIComponent(value));
    }
    i += 2;
  }
  if (result.length === 0) {
    return null;
  }
  if (result.length === 1) {
    return result[0];
  }
  return result;
};
