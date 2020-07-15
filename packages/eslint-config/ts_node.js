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
        extraFileExtensions: ['.json'],
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier/@typescript-eslint',
        '@engspace',
    ],
    rules: {
        'no-prototype-builtins': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-use-before-define': [
            'error',
            {
                functions: false,
                classes: false,
                variables: true,
            },
        ],
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.ts'],
            },
        },
    },
};
