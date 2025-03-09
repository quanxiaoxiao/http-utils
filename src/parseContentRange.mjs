import assert from 'node:assert';

import createError from './createError.mjs';

const calcNumber = (str) => {
  const s = str.trim();
  const n = parseInt(s, 10);
  if (Number.isNaN(n) || s !== `${n}` || n < 0 || !Number.isInteger(n)) {
    throw createError(400);
  }
  return n;
};

export default (str, contentSize) => {
  assert(contentSize >= 0 && Number.isInteger(contentSize));
  const reg = /^\s*bytes\s*=\s*([^-]*)-\s*(\d*)\s*$/i;
  const matches = str.match(reg);
  if (!matches) {
    throw createError(400);
  }
  const ranges = {
    start: 0,
    end: Math.max(contentSize - 1, 0),
  };
  if (matches[1].trim() === '') {
    if (matches[2] === '') {
      throw createError(400);
    }
    ranges.start = ranges.end - calcNumber(matches[2]);
    if (ranges.start < 0) {
      throw createError(416);
    }
  } else {
    ranges.start = calcNumber(matches[1].trim());
    if (matches[2] !== '') {
      ranges.end = calcNumber(matches[2]);
    }
  }
  if (ranges.start > ranges.end) {
    throw createError(400);
  }
  if (contentSize === 0) {
    if (ranges.start !== 0 || ranges.end !== 0) {
      throw createError(416);
    }
    return [0, 0];
  }
  if (ranges.start >= contentSize || ranges.end >= contentSize) {
    throw createError(416);
  }
  return [ranges.start, ranges.end];
};
