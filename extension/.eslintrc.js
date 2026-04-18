module.exports = {
    root: true,
    env: {
        node: true,
        browser: false,
        es6: true
    },
    extends: [
        'eslint:recommended'
    ],
    plugins: ['@typescript-eslint'],
    parserOptions: {
        project: './tsconfig.json'
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json'
    },
    plugins: ['@typescript-eslint'],
    rules: {
        // TypeScript rules
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-interface': 'off',

        // General rules
        'no-console': 'off', // Allow console.log for debugging
        'no-debugger': 'warn',
        'prefer-const': 'error',
        'no-var': 'error',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'max-lines-per-function': ['error', 200]
    },
    ignorePatterns: [
        'node_modules/',
        'out/',
        'dist/',
        '**/*.js'
    ]
};