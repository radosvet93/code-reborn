import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Three test files truncate the same test database. Run files one at a
    // time, or one file wipes another's fixtures halfway through a test.
    fileParallelism: false,
  },
});
