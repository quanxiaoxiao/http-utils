import createError from './createError.mjs';

const parseNumber = (str) => {
  const trimmed = str.trim();
  if (trimmed === '') {
    throw createError(400, 'Invalid range: empty number');
  }
  if (!/^\d+$/.test(trimmed)) {
    throw createError(400, 'Invalid range: not a valid number');
  }

  const num = parseInt(trimmed, 10);

  if (trimmed !== `${num}` || num < 0) {
    throw createError(400, 'Invalid range: not a valid number');
  }
  if (num > Number.MAX_SAFE_INTEGER) {
    throw createError(400, 'Invalid range: number too large');
  }
  return num;
};

export default (str, contentSize) => {
  if (typeof str !== 'string') {
    throw createError(400, 'Range header must be a string');
  }
  if (!Number.isInteger(contentSize) || contentSize < 0) {
    throw createError(500, 'Content size must be a non-negative integer');
  }
  const rangeRegex = /^\s*bytes\s*=\s*([^-]*)-\s*(\d*)\s*$/i;
  const matches = str.match(rangeRegex);

  if (!matches) {
    throw createError(400, 'Invalid range format');
  }

  const [, startStr, endStr] = matches;
  const trimmedStart = startStr.trim();

  const range = {
    start: 0,
    end: Math.max(contentSize - 1, 0),
  };
  if (trimmedStart === '') {
    if (endStr === '') {
      throw createError(400, 'Invalid range: both start and end are empty');
    }
    const suffixLength = parseNumber(endStr);
    range.start = range.end - suffixLength;
    if (range.start < 0) {
      throw createError(416);
    }
  } else {
    range.start = parseNumber(trimmedStart);
    if (endStr !== '') {
      range.end = parseNumber(endStr);
    }
  }
  if (range.start > range.end) {
    throw createError(400, 'Invalid range: start is greater than end');
  }
  if (contentSize === 0) {
    if (range.start !== 0 || range.end !== 0) {
      throw createError(416, 'Range not satisfiable for empty content');
    }
    return [0, 0];
  }
  if (range.start >= contentSize || range.end >= contentSize) {
    throw createError(416, 'Range not satisfiable: start beyond content size');
  }
  return [range.start, range.end];
};
