import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@workspace/db": path.resolve(__dirname, "../lib/db/src/index.ts"),
    },
  },
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@workspace/db": path.resolve(__dirname, "../lib/db/src/index.ts"),
          },
        },
        test: {
          name: "node",
          include: [
            "unit/generatePaSourceToken.test.ts",
            "unit/getPaSourceToken.test.ts",
            "unit/pollSnapshot.test.ts",
            "unit/pollingQaFlow.test.ts",
          ],
          environment: "node",
          globals: true,
        },
      },
      {
        resolve: {
          alias: {
            "@workspace/db": path.resolve(__dirname, "../lib/db/src/index.ts"),
          },
        },
        test: {
          name: "ws-integration",
          include: ["unit/wsIntegration.test.ts"],
          environment: "node",
          globals: true,
          testTimeout: 15000,
          hookTimeout: 10000,
          teardownTimeout: 5000,
        },
      },
      {
        test: {
          name: "jsdom",
          include: ["unit/useAudioBroadcast.test.ts"],
          environment: "jsdom",
          globals: true,
        },
      },
    ],
  },
});
