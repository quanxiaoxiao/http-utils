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

const split = (str) => {
  if (!str) {
    return [''];
  }

  const parts = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      current += char;
    } else if (char === ';' && !insideQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (insideQuotes) {
    const semicolonIndex = current.indexOf(';');
    if (semicolonIndex !== -1) {
      parts.push(current.slice(0, semicolonIndex));
      return [...parts, ...split(current.slice(semicolonIndex + 1))];
    }
  }
  parts.push(current);
  return parts;
};

export default (str) => {
  if (!str) {
    return {};
  }

  const data = split(str)
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
