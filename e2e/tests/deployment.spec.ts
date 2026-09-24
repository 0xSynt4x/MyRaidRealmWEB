import { expect, test } from '@playwright/test';

/**
 * 部署冒烟测试。
 *
 * 验证的是「Docker 里的产物能不能正常跑起来」：
 * 页面渲染、无运行时错误、静态资源可达、本地存储可用。
 *
 * 不测业务玩法（开局、发消息、存档），那需要模型 API，不属于部署验证范围。
 */

test.describe('部署', () => {
  test('首页可访问且渲染出内容', async ({ page }) => {
    const response = await page.goto('/');

    expect(response, '首页应当有响应').not.toBeNull();
    expect(response!.status(), '首页状态码').toBe(200);

    // 挂载点必须有子节点 —— 只看 HTML 回来不够，Vue 挂载成功才算数。
    // 产物把 JS 内联进 index.html，挂载失败时 #app 会是空的。
    const app = page.locator('#app');
    await expect(app).not.toBeEmpty();

    // 标题来自 index.html 模板，能验证拿到的是本项目的产物而不是 nginx 默认页。
    await expect(page).toHaveTitle(/诸界穿越模拟器/);
  });

  test('页面加载过程没有运行时错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', error => {
      errors.push(`未捕获异常: ${error.message}`);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(`console.error: ${message.text()}`);
      }
    });

    await page.goto('/');
    // 首屏渲染是异步的（应用要初始化 store、读本地设置），给一点时间再收网。
    await page.waitForTimeout(2000);

    expect(errors, '不应出现 JS 运行时错误').toEqual([]);
  });

  test('关键静态资源全部可达', async ({ request }) => {
    // 产物不是单文件：图片、音频、预设包都是外部相对路径。
    // 少任何一个都会导致缺图或加载不到开局预设。
    const assets = [
      '/favicon.ico',
      '/preset-package/index.js',
      '/assets/banner/amb-01-mist.54c02957.webp',
      '/assets/home/hero-port.0a010cdc.webp',
    ];

    for (const asset of assets) {
      const response = await request.get(asset);
      expect(response.status(), `${asset} 应当可达`).toBe(200);
      // 顺带确认不是空文件 —— 200 加上零字节同样算部署失败。
      expect((await response.body()).byteLength, `${asset} 不应为空`).toBeGreaterThan(0);
    }
  });

  test('缓存策略按资源类型区分', async ({ request }) => {
    // index.html 带内容哈希的引用，必须不缓存，否则重新部署后浏览器拿旧页面。
    const html = await request.get('/');
    expect(html.headers()['cache-control']).toContain('no-store');

    // 带哈希的资源可以长缓存。
    const asset = await request.get('/assets/banner/amb-01-mist.54c02957.webp');
    expect(asset.headers()['cache-control']).toContain('immutable');
  });

  test('本地存储可写入且刷新后保留', async ({ page }) => {
    await page.goto('/');

    const marker = `e2e-probe-${Date.now()}`;
    await page.evaluate(value => {
      window.localStorage.setItem('__e2e_probe__', value);
    }, marker);

    await page.reload();

    const readBack = await page.evaluate(() => window.localStorage.getItem('__e2e_probe__'));
    expect(readBack, '刷新后应能读回写入的值').toBe(marker);

    // 清掉，别把探测数据留给后续用例。
    await page.evaluate(() => window.localStorage.removeItem('__e2e_probe__'));
  });
});
