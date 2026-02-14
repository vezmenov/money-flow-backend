/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/app.module.ts',
    '!<rootDir>/src/database/**',
    '!<rootDir>/src/migrations/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 75,
      functions: 90,
      lines: 90,
    },
  },
};
