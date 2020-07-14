module.exports = {
    env: {
        node: true,
        mocha: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:prettier/recommended',
        '@engspace',
    ],
    rules: { },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.ts'],
            },
        },
    },
};

