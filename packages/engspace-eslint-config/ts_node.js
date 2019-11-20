module.exports = {
    env: {
        node: true,
    },
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
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier/@typescript-eslint',
        '@engspace',
    ],
    rules: {
        '@typescript-eslint/no-explicit-any': 'off',
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.ts'],
            },
        },
    },
};