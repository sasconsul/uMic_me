import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          include: [
            "unit/generatePaSourceToken.test.ts",
            "unit/getPaSourceToken.test.ts",
          ],
          environment: "node",
          globals: true,
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
