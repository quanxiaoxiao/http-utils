const toString = (v) => {
  if (typeof v !== 'string') {
    return v.toString ? `${v.toString()}` : JSON.stringify(v);
  }
  return v;
};

export default (obj) => {
  if (Array.isArray(obj)) {
    return [];
  }
  if (obj == null) {
    return [];
  }
  if (typeof obj !== 'object') {
    return [];
  }
  const result = [];
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = obj[key];
    if (value != null) {
      if (Array.isArray(value)) {
        for (let j = 0; j < value.length; j++) {
          result.push(key);
          result.push(toString(value[j]));
        }
      } else {
        result.push(key);
        result.push(toString(value));
      }
    }
  }
  return result;
};
