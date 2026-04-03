import { defineConfig, devices } from "@playwright/test";
import { execSync } from "child_process";

const DOMAIN = process.env.REPLIT_DEV_DOMAIN;
const BASE_URL = DOMAIN ? `https://${DOMAIN}` : "http://localhost:80";

function findChromium(): string | undefined {
  try {
    const result = execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null", {
      encoding: "utf8",
    }).trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}

const systemChromium = findChromium();

export default defineConfig({
  testDir: "./specs",
  timeout: 30000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(systemChromium
          ? {
              executablePath: systemChromium,
              launchOptions: {
                executablePath: systemChromium,
                args: ["--no-sandbox", "--disable-setuid-sandbox"],
              },
            }
          : {}),
      },
    },
  ],
});
