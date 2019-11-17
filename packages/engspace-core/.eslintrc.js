module.exports = {
    extends: [
        '@engspace',
        '@engspace/eslint-config/ts',
    ],
    rules: {
        '@typescript-eslint/interface-name-prefix': ['error', {
            'prefixWithI': 'always',
        }],
    }
};