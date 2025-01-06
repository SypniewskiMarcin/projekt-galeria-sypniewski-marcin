module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "max-len": ["error", {"code": 150}],
    "indent": "off",
    "object-curly-spacing": ["error", "never"],
    "comma-dangle": ["error", "always-multiline"],
    "no-trailing-spaces": "error",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
};
