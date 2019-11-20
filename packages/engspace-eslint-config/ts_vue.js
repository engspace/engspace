module.exports = {
    env: {
        browser: true,
        es6: true,
        node: true,
    },
    extends: [
        'plugin:vue/essential',
        '@vue/typescript',
        '@vue/prettier',
        'prettier/@typescript-eslint',
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.vue'],
        project: './packages/**/tsconfig.eslint.json',
        tsconfigRootDir: '../..',
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',

        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
};
