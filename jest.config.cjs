module.exports = {
    collectCoverageFrom: [
        'extension/lib/**/*.js'
    ],
    coveragePathIgnorePatterns: [
        '/node_modules/'
    ],
    coverageThreshold: {
        global: {
            statements: 80,
            lines: 80
        }
    }
};
