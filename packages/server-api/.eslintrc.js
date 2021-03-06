module.exports = {
    root: true,
    extends: [
        '@engspace/eslint-config/ts_node',
    ],
    rules: {
        '@typescript-eslint/no-namespace': 'off',
        'no-inner-declarations': 'off',
        'require-atomic-updates': 'off',
    },
};
