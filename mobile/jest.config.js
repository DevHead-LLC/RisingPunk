module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleDirectories: ['node_modules', 'src'],
  rootDir: '.'
};
