const toString = (v) => {
  const type = typeof v;
  if (type === 'string') return v;
  if (type === 'undefined') {
    return 'undefined';
  }
  if (v === null) {
    return 'null';
  }
  if (v?.toString) return String(v);
  return JSON.stringify(v);
};

export default (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return [];
  }

  const result = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value == null) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        result.push(key, toString(item));
      });
    } else {
      result.push(key, toString(value));
    }
  }

  return result;
};
