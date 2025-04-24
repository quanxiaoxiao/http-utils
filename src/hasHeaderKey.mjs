export default (obj) => {
  const keys = Object.keys(obj);
  const len = keys.length;
  return (headerName) => {
    if (len === 0) {
      return false;
    }
    const n = headerName.toLowerCase();
    for (let i = 0; i < len; i++) {
      const name = keys[i];
      if (name.toLowerCase() === n) {
        return true;
      }
    }
    return false;
  };
};
