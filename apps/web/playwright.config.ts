import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apiPort = process.env.RAYWATCH_API_PORT ?? "18080";
const webPort = process.env.RAYWATCH_WEB_PORT ?? "4173";
const fixture = (name: string) => path.join(rootDir, "tests", "fixtures", "ray", name);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `uv run raywatch-api`,
      cwd: rootDir,
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PYTHONPATH:
          "packages/model/src:packages/engine/src:packages/adapter-ray/src:services/api/src:services/collector/src",
        API_PORT: apiPort,
        RAYWATCH_FIXTURE_JOBS: fixture("jobs_list.json"),
        RAYWATCH_FIXTURE_TASKS: fixture("tasks_list_2_59.json"),
        RAYWATCH_FIXTURE_NODES: fixture("nodes.json"),
        RAYWATCH_FIXTURE_ACTORS: fixture("actors.json"),
      },
    },
    {
      command: `npm run build && RAYWATCH_API_PROXY=http://127.0.0.1:${apiPort} npm run preview -- --host 127.0.0.1 --port ${webPort}`,
      cwd: path.join(rootDir, "apps/web"),
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
