/* eslint-disable no-undef */
module.exports = {
    env: {
        'es6': true,
    },
    plugins: ['import'],
    ignorePatterns: ['dist/*'],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'import/order': [
            'error',
            {
                groups: [
                    'builtin',
                    'external',
                    'parent',
                    'sibling',
                    'index',
                ],
                pathGroups: [
                    {
                        pattern: '@engspace/**',
                        group: 'external',
                        position: 'after',
                    },
                    {
                        // common pattern for project source root
                        pattern: '@/**',
                        group: 'parent',
                        position: 'before',
                    },
                ],
                pathGroupsExcludedImportTypes: ['builtin'],
                alphabetize: {
                    order: 'asc',
                },
            },
        ],
    },
};
