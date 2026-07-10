globalThis.fetch = async () => {
  throw new Error('network disabled for test');
};
