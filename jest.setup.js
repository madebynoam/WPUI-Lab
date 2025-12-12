// Add custom jest matchers from jest-dom
require('@testing-library/jest-dom');

// Mock environment variables for tests
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console errors in tests (optional - remove if you want to see them)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
