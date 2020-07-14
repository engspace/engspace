module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:vue/recommended',
        '@vue/prettier',
        '@engspace',
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        parser: 'babel-eslint',
    },
    rules: {
        'no-unused-vars': 'warn',
    },
};
