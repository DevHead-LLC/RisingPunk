/**
 * @file jest.setup.js
 * @description Jest setup to suppress console.log during tests but allow errors
 */

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console.log during tests (but keep errors and warnings)
beforeEach(() => {
  console.log = jest.fn();
});

// Restore console methods after tests
afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global teardown to ensure console is restored
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
}); 