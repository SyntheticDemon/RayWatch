import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const live = process.env.RAYWATCH_E2E_LIVE === "1";
const apiPort = process.env.RAYWATCH_API_PORT ?? (live ? "18080" : "18080");
const webPort = process.env.RAYWATCH_WEB_PORT ?? "4173";
const fixture = (name: string) => path.join(rootDir, "tests", "fixtures", "ray", name);
const pythonPath =
  "packages/model/src:packages/engine/src:packages/adapter-ray/src:services/api/src:services/collector/src";

const liveApiEnv = {
  PYTHONPATH: pythonPath,
  API_PORT: apiPort,
  RAYWATCH_USE_LIVE: "1",
  RAYWATCH_FIXTURE_JOBS: "",
  RAY_DASHBOARD_URL: process.env.RAY_DASHBOARD_URL ?? "http://127.0.0.1:8265",
};

const fixtureApiEnv = {
  PYTHONPATH: pythonPath,
  API_PORT: apiPort,
  RAYWATCH_FIXTURE_JOBS: fixture("jobs_list.json"),
  RAYWATCH_FIXTURE_TASKS: fixture("tasks_list_2_59.json"),
  RAYWATCH_FIXTURE_NODES: fixture("nodes.json"),
  RAYWATCH_FIXTURE_ACTORS: fixture("actors.json"),
  RAYWATCH_FIXTURE_OBJECTS: fixture("objects.json"),
  RAYWATCH_FIXTURE_CLUSTER_STATUS: fixture("cluster_status.json"),
};

const reuseApi =
  process.env.RAYWATCH_E2E_HARNESS === "1" || (!process.env.CI && !live);

export default defineConfig({
  testDir: live ? "./e2e/live" : "./e2e/fixture",
  timeout: live ? 120_000 : 60_000,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
  },
  workers: live ? 1 : undefined,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `uv run raywatch-api`,
      cwd: rootDir,
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: reuseApi,
      timeout: 120_000,
      env: live ? liveApiEnv : fixtureApiEnv,
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
