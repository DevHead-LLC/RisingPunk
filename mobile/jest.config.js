module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: [
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-svg|@react-navigation)/)',
  ],
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
    '**/?(*.)+(spec|test).(ts|tsx|js|jsx)'
  ],
};
