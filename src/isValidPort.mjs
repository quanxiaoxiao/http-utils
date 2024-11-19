export default (port) =>  {
  const value = parseInt(port, 10);
  return (
    value === Number(port)
    && value >= 0
    && value <= 65535
  );
}
