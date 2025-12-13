import { afterEach, beforeEach, jest } from "@jest/globals";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...originalEnv };
});
