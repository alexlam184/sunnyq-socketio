module.exports = {
  '*.{ts,tsx}': () => 'npm run check-types',
  '*.{ts,js,html,scss,md,json}': ['npm run lint', 'npm run check-format'],
};
