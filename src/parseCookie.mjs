const getValue = (s) => {
  if (!s) {
    return '';
  }
  try {
    return decodeURIComponent(s);
  } catch (error) {
    return s;
  }
};

export default (str) => {
  const data = (str || '')
    .split(';')
    .reduce((acc, s) => {
      const index = s.indexOf('=');
      if (index === -1) {
        const key = s.trim();
        if (key) {
          return {
            ...acc,
            [key]: true,
          };
        }
        return acc;
      }
      const key = s.slice(0, index).trim();
      if (key === '') {
        return acc;
      }
      if (acc[key] != null) {
        return acc;
      }
      const value = s.slice(index + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        return {
          ...acc,
          [key]: getValue(value.slice(1, value.length - 1)),
        };
      }
      return {
        ...acc,
        [key]: getValue(value),
      };
    }, {});
  return data;
};
