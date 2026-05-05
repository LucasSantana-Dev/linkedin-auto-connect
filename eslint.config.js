module.exports = [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'coverage/**',
            'linkedin_session/**',
            'extension/vendor/**'
        ]
    },
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script'
        },
        rules: { "no-console": "error" }
    }
];
