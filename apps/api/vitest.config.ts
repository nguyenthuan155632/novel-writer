import { defineConfig } from 'vitest/config';

/** Route/integration tests share one Postgres URL and mutate global llm_* rows — run files sequentially. */
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
