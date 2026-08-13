import { defineConfig, devices } from '@playwright/test';

/**
 * Browser E2E configuration (BUILD_SPEC 41.3).
 *
 * WebGPU in headless Chromium needs to be enabled explicitly and, on machines
 * without a usable hardware adapter under headless, falls back to SwiftShader.
 * That is fine for correctness assertions (does it boot, is the chrome count
 * zero, does rewind restore) but it is NOT a performance measurement — frame
 * timings from this suite must never be reported as the performance evidence
 * required by 32.1. Those come from a real browser on real hardware.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-webgpu',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          args: [
            '--enable-unsafe-webgpu',
            '--enable-features=Vulkan,WebGPU',
            '--use-angle=metal',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'bunx vite --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
