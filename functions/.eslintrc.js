module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/dist/**/*", // Ignore built files.
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "quotes": "off",
    "import/no-unresolved": 0,
    "indent": "off",
    "max-len": "off",
    "require-jsdoc": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-constant-condition": "off",
    "object-curly-spacing": "off",
    "operator-linebreak": "off",
  },
};
