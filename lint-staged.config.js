export default {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{scss,css}': ['prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
