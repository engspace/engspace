module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './packages/**/tsconfig.eslint.json',
        tsconfigRootDir: '../..',
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
};