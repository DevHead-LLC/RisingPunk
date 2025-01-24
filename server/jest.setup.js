jest.setTimeout(10000);

// Global test setup
beforeAll(async () => {
  // Silence console logs during tests unless there's an error
  console.log = jest.fn();
  console.info = jest.fn();
  // Keep console.error for debugging
});

// Clean up after tests
afterAll(async () => {
  // Restore console
  jest.restoreAllMocks();
}); 