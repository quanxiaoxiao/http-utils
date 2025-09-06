const safeDecodeURIComponent = (str) => {
  if (!str) {
    return '';
  }
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

const removeQuotes = (value) => {
  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;
};

export default (str) => {
  if (!str) {
    return {};
  }

  const data = str
    .split(';')
    .reduce((acc, segment) => {
      const trimmed = segment.trim();
      if (!trimmed) {
        return acc;
      }

      const equalIndex = trimmed.indexOf('=');

      if (equalIndex === -1) {
        return {
          ...acc,
          [trimmed]: true,
        };
      }

      const key = trimmed.slice(0, equalIndex).trim();
      if (key === '') {
        return acc;
      }
      if (acc[key] != null) {
        return acc;
      }
      const rawValue = trimmed.slice(equalIndex + 1).trim();

      const unquotedValue = removeQuotes(rawValue);
      const decodedValue = safeDecodeURIComponent(unquotedValue);

      return {
        ...acc,
        [key]: decodedValue,
      };
    }, {});
  return data;
};
