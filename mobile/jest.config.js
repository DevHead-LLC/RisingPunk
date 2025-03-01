module.exports = {
preset: 'react-native',
setupFiles: ['<rootDir>/src/__tests__/setup.js'],
testEnvironment: 'jsdom',
transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
},
transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-reanimated)/)',
],
moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.svg': '<rootDir>/__mocks__/svgMock.js',
},
testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)'
],
collectCoverage: true,
collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
],
coverageReporters: ['json', 'lcov', 'text', 'clover'],
globals: {
    'ts-jest': {
    isolatedModules: true,
    },
},
};
