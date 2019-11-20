module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './packages/**/tsconfig.eslint.json',
        tsconfigRootDir: '../..',
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'essential',
        'plugin:prettier/recommended',
        'prettier/@typescript-eslint',
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
    },
};