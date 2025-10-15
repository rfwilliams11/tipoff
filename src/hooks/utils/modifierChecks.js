const checkModifiers = (key, requiredModifiers = []) => {
  if (requiredModifiers.length === 0) return true;

  return requiredModifiers.every(modifier => {
    switch (modifier.toLowerCase()) {
      case 'ctrl':
      case 'control':
        return key.ctrl;
      case 'shift':
        return key.shift;
      case 'alt':
      case 'meta':
        return key.meta;
      default:
        return false;
    }
  });
};

module.exports = {
  checkModifiers
};
