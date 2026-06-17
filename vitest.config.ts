import { defineConfig } from "vitest/config";

// Pure-logic unit tests (schedule, format, migration). No DOM/React harness
// needed — keep the environment lightweight. Test files live next to source
// as *.test.ts and are excluded from the production build (see tsconfig.app.json).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
