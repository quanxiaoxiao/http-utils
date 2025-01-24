export default ({
  method,
  headers,
}) => {
  if (method !== 'GET') {
    return false;
  }
  if (!Object.hasOwnProperty.call(headers, 'connection')) {
    return false;
  }
  if (!Object.hasOwnProperty.call(headers, 'upgrade')) {
    return false;
  }
  return /^websocket$/i.test(headers.upgrade);
};
