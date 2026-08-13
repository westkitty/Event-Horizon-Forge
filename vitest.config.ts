import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Physics tests integrate thousands of ticks; the default 5 s is too tight.
    testTimeout: 30_000,
  },
});
