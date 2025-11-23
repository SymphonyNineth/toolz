import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// 1. Mock the Tauri Invoke function
// This creates a spy we can track in our tests
export const mockInvoke = vi.fn();

// 2. Mock the specific Tauri module
// Adjust the path if you are using v1: '@tauri-apps/api/tauri'
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// 3. (Optional) Mock Dialogs if your app uses them to pick files
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
}));

// 4. Reset mocks between tests so state doesn't leak
afterEach(() => {
  vi.clearAllMocks();
});

// 5. Mock browser APIs that JSDOM misses (common in drag-and-drop apps)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 6. Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
