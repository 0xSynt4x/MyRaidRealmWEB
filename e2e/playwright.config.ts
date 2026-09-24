import { defineConfig, devices } from '@playwright/test';

/**
 * e2e 配置。
 *
 * 测的是 Docker 里的部署产物（nginx 托管的 dist），不是开发服务器。
 * 默认指向 compose 暴露出来的 8080，与 `docker-compose.yml` 的端口保持一致。
 * 要测别的地址（例如换端口或指向远端）时用 PLAYWRIGHT_BASE_URL 覆盖。
 */
export default defineConfig({
  testDir: './tests',

  // 部署冒烟测试之间没有共享状态，可以并行。
  fullyParallel: true,

  // CI 里不留 .only，避免漏跑用例。
  forbidOnly: Boolean(process.env.CI),

  // 部署问题通常是确定性的，重试一次就够，多了会掩盖真实故障。
  retries: process.env.CI ? 1 : 0,

  // 输出里要能看到通过条数，list reporter 最直白。
  reporter: [['list']],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8080',
    // 失败时留证据：截图 + 追踪，方便判断是部署问题还是用例问题。
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    // 部署冒烟不关心视口差异，固定一个常见尺寸即可。
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
