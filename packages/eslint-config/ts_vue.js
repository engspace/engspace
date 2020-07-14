module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:vue/recommended',
        'plugin:@typescript-eslint/recommended',
        '@vue/typescript',
        '@vue/prettier',
        'prettier/@typescript-eslint',
        '@engspace',
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
    },
};
