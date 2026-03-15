module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 95,
            branches: 84,
            functions: 99,
            lines: 97
        }
    },
    forceExit: true
};
