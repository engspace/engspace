module.exports = {
    extends: [
        '@engspace',
        '@engspace/eslint-config/ts_node',
    ],
    rules: {
        '@typescript-eslint/interface-name-prefix': ['error', {
            'prefixWithI': 'always',
        }],
    }
};