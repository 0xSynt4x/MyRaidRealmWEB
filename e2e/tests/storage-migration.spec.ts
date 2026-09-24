import { expect, test } from '@playwright/test';

/**
 * 本地存储迁移测试。
 *
 * 验证的是「老用户的数据从 localStorage 搬进 IndexedDB」这条链路：
 * 迁移是否发生、旧副本是否清掉、数据是否还在、刷新后是否仍然读得到。
 *
 * 这些用例通过注入 localStorage 老数据来模拟「迁移前的用户」，
 * 然后重新加载页面，让启动流程自己走一遍迁移。
 */

/** 存储层挂在 window 上的排障入口，见 src/utils/standaloneStorage.ts。 */
const STORAGE_BRIDGE = '__MYRAIDREALM_STORAGE__';

type StorageReport = {
  mode: string;
  migratedKeys: string[];
  failedKeys: string[];
  clearedLocalCopies: boolean;
};

test.describe('本地存储迁移', () => {
  test('老用户的 localStorage 数据会被搬进 IndexedDB 并清掉旧副本', async ({ page }) => {
    // 先打开一次，确保源同源，才能写 localStorage。
    await page.goto('/');

    const legacySessionKey = 'th1980s:standalone-runtime-session';
    const legacyMessagesKey = 'th1980s:standalone-runtime-messages';

    // 塞一份「迁移前」的数据。字段要能过 Schema 校验，否则会被当成脏数据丢掉。
    const legacySession = {
      id: 'legacy-session-for-e2e',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      browser_owner: 'standalone-app',
      stat_data: {},
      initial_stat_data: {},
      worldbook_context: [],
      custom_worldbook_entries: [],
      prompt_assets: null,
      preset_meta: null,
    };
    const legacyMessages = {
      session_id: 'legacy-session-for-e2e',
      next_message_id: 1,
      records: [],
    };

    await page.evaluate(
      ([sessionKey, messagesKey, session, messages]) => {
        window.localStorage.setItem(sessionKey, JSON.stringify(session));
        window.localStorage.setItem(messagesKey, JSON.stringify(messages));
      },
      [legacySessionKey, legacyMessagesKey, legacySession, legacyMessages] as const,
    );

    // 重新加载 —— 启动流程会跑迁移。
    await page.reload();
    await page.waitForFunction(
      bridge => Boolean((window as unknown as Record<string, unknown>)[bridge]),
      STORAGE_BRIDGE,
    );

    const report = await page.evaluate<StorageReport>(
      bridge => (window as unknown as Record<string, { report: () => StorageReport }>)[bridge].report(),
      STORAGE_BRIDGE,
    );

    expect(report.mode, '应当跑在 IndexedDB 模式下').toBe('indexeddb');
    expect(report.migratedKeys, '两个 key 都应当被迁移').toContain(legacySessionKey);
    expect(report.migratedKeys).toContain(legacyMessagesKey);
    expect(report.failedKeys, '不应有迁移失败的 key').toEqual([]);
    expect(report.clearedLocalCopies, '迁移完成后应当清掉旧副本').toBe(true);

    // 旧副本必须真的从 localStorage 消失了，否则 5MB 配额还是被占着。
    const leftover = await page.evaluate(
      ([sessionKey, messagesKey]) => ({
        session: window.localStorage.getItem(sessionKey),
        messages: window.localStorage.getItem(messagesKey),
      }),
      [legacySessionKey, legacyMessagesKey] as const,
    );
    expect(leftover.session, 'localStorage 里的会话旧副本应已清除').toBeNull();
    expect(leftover.messages, 'localStorage 里的消息旧副本应已清除').toBeNull();
  });

  test('迁移过来的数据在刷新后仍然读得到', async ({ page }) => {
    await page.goto('/');

    const legacySessionKey = 'th1980s:standalone-runtime-session';
    const legacyMessagesKey = 'th1980s:standalone-runtime-messages';
    const sessionId = `persist-check-${Date.now()}`;
    const legacySession = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      browser_owner: 'standalone-app',
      stat_data: {},
      initial_stat_data: {},
      worldbook_context: [],
      custom_worldbook_entries: [],
      prompt_assets: null,
      preset_meta: null,
    };
    const legacyMessages = { session_id: sessionId, next_message_id: 3, records: [] };

    await page.evaluate(
      ([sessionKey, messagesKey, session, messages]) => {
        window.localStorage.setItem(sessionKey, JSON.stringify(session));
        window.localStorage.setItem(messagesKey, JSON.stringify(messages));
      },
      [legacySessionKey, legacyMessagesKey, legacySession, legacyMessages] as const,
    );

    await page.reload();
    await page.waitForFunction(
      bridge => Boolean((window as unknown as Record<string, unknown>)[bridge]),
      STORAGE_BRIDGE,
    );

    // 再刷一次：这次数据已经在 IndexedDB 里了，走的是正常读取路径而不是迁移路径。
    await page.reload();
    await page.waitForFunction(
      bridge => Boolean((window as unknown as Record<string, unknown>)[bridge]),
      STORAGE_BRIDGE,
    );

    const storedSession = await page.evaluate(
      bridge =>
        (
          (window as unknown as Record<string, unknown>)[bridge] as {
            readSync: (key: string) => { id?: string } | null;
          }
        ).readSync('th1980s:standalone-runtime-session'),
      STORAGE_BRIDGE,
    );

    expect(storedSession?.id, '刷新后应当仍能读到迁移过来的会话').toBe(sessionId);
  });

  test('存档载荷能写进 IndexedDB 并读回来', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(
      bridge => Boolean((window as unknown as Record<string, unknown>)[bridge]),
      STORAGE_BRIDGE,
    );

    const archiveKey = 'th1980s:standalone-archive:e2e-large-payload';

    // 造一块超过 localStorage 5MB 上限的数据。
    // 用可打印 ASCII，JSON 序列化不会膨胀，体积可预期。
    const sizeBytes = 6 * 1024 * 1024;
    const result = await page.evaluate(
      async ([key, bytes]) => {
        const unit = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const payload = unit.repeat(Math.ceil(bytes / unit.length)).slice(0, bytes);

        const bridge = (window as unknown as Record<string, unknown>)['__MYRAIDREALM_STORAGE__'] as {
          readLarge: (key: string) => Promise<string | null>;
        };

        // 直接走底层 IndexedDB 封装写入 —— 存储桥没有暴露写接口，
        // 用 indexedDB 原生 API 验证「这块数据确实放得下」。
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('myraidrealm-standalone', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('kv', 'readwrite');
          transaction.objectStore('kv').put(payload, key);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });

        const readBack = await bridge.readLarge(key);
        return { written: payload.length, readBack: readBack?.length ?? 0, matches: readBack === payload };
      },
      [archiveKey, sizeBytes] as const,
    );

    expect(result.written, '写入体积应当超过 5MB').toBeGreaterThan(5 * 1024 * 1024);
    expect(result.readBack, '读回长度应当与写入一致').toBe(result.written);
    expect(result.matches, '读回内容应当与写入完全一致').toBe(true);

    // 清理，别把 6MB 留给后续用例。
    await page.evaluate(
      key =>
        new Promise<void>(resolve => {
          const request = indexedDB.open('myraidrealm-standalone', 1);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction('kv', 'readwrite');
            transaction.objectStore('kv').delete(key);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
          };
          request.onerror = () => resolve();
        }),
      archiveKey,
    );
  });

  test('酒馆预设库会被搬到 IndexedDB，且迁移后仍能同步读到', async ({ page }) => {
    await page.goto('/');

    const libraryKey = 'th1980s:standalone-tavern-preset-library';
    const legacyLibrary = {
      activePresetId: 'imported:e2e-legacy',
      importedPresets: [
        {
          id: 'imported:e2e-legacy',
          sourceName: 'e2e 老预设',
          importedAt: new Date().toISOString(),
          document: {
            prompts: [{ identifier: 'main', name: '主提示', content: '老用户的预设内容' }],
            prompt_order: [{ character_id: 100000, order: [{ identifier: 'main', enabled: true }] }],
          },
        },
      ],
    };

    await page.evaluate(
      ([key, library]) => {
        window.localStorage.setItem(key, JSON.stringify(library));
      },
      [libraryKey, legacyLibrary] as const,
    );

    await page.reload();
    await page.waitForFunction(
      bridge => Boolean((window as unknown as Record<string, unknown>)[bridge]),
      STORAGE_BRIDGE,
    );

    const migrated = await page.evaluate(
      bridge =>
        (
          (window as unknown as Record<string, unknown>)[bridge] as {
            report: () => StorageReport;
          }
        )
          .report()
          .migratedKeys.includes('th1980s:standalone-tavern-preset-library'),
      STORAGE_BRIDGE,
    );
    expect(migrated, '酒馆预设库应当出现在迁移清单里').toBe(true);

    // 旧副本要清掉 —— 它正是会随导入数量持续增长、能撑爆 5MB 的那块数据。
    const leftover = await page.evaluate(key => window.localStorage.getItem(key), libraryKey);
    expect(leftover, 'localStorage 里的预设库旧副本应已清除').toBeNull();

    // 关键：迁移后仍然是同步可读的（调用方里有一批 computed 和回合逻辑）。
    const readBack = await page.evaluate(
      bridge =>
        (
          (window as unknown as Record<string, unknown>)[bridge] as {
            readSync: (key: string) => { activePresetId?: string } | null;
          }
        ).readSync('th1980s:standalone-tavern-preset-library'),
      STORAGE_BRIDGE,
    );
    expect(readBack?.activePresetId, '迁移过来的预设库应当仍能同步读到').toBe('imported:e2e-legacy');
  });
});
