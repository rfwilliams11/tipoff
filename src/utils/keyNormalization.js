const KEY_ALIASES = {
  'return': 'enter',
  'esc': 'escape'
};

const SPECIAL_KEYS = [
  'up', 'down', 'left', 'right',
  'enter', 'space', 'tab', 'escape',
  'backspace', 'delete', 'home', 'end',
  'pageup', 'pagedown'
];

const VIM_KEYS = ['k', 'j', 'h', 'l'];

const FUNCTION_KEYS = [
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6',
  'f7', 'f8', 'f9', 'f10', 'f11', 'f12'
];

const normalizeKeyName = (keyName) => {
  if (!keyName) return '';

  const lowerKey = keyName.toLowerCase();

  if (KEY_ALIASES[lowerKey]) {
    return KEY_ALIASES[lowerKey];
  }

  return lowerKey;
};

const isValidKey = (keyName) => {
  if (!keyName) return false;

  const normalized = normalizeKeyName(keyName);

  return SPECIAL_KEYS.includes(normalized) ||
         VIM_KEYS.includes(normalized) ||
         FUNCTION_KEYS.includes(normalized) ||
         /^[a-z0-9]$/.test(normalized);
};

module.exports = {
  normalizeKeyName,
  isValidKey,
  KEY_ALIASES,
  SPECIAL_KEYS,
  VIM_KEYS,
  FUNCTION_KEYS
};
