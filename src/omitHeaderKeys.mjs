export default (headers, headerNameList) => {
  const excludeSet = new Set(headerNameList.map(name => name.toLowerCase()));
  const result = {};

  for (const [key, headerValue] of Object.entries(headers)) {
    const headerName = key.toLowerCase();
    if (!excludeSet.has(headerName)) {
      result[key] = headerValue;
    }
  }

  return result;
};
