module.exports = {
preset: 'react-native',
setupFiles: ['./jest.setup.js'],
testEnvironment: 'node',
transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
},
transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|@react-navigation|@react-native-community|@expo/vector-icons)/)',
],
moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
moduleNameMapper: {
    '\\.svg': '<rootDir>/__mocks__/svgMock.js',
},
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
