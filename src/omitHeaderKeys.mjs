export default (headers, headerNameList) => {
  const result = {};
  const keys = Object.keys(headers);
  const arr = headerNameList.map((s) => s.toLowerCase());
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!arr.includes(key.toLowerCase())) {
      result[key] = headers[key];
    }
  }

  return result;
};
