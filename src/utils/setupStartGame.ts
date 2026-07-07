import { klona } from 'klona';
import { Schema } from '../../schema/schema';
import { createStandaloneRuntimeBaselineFromStores } from './standaloneRuntime';

type StatData = ReturnType<typeof Schema.parse>;

export async function writeSetupConfigToCurrentMessage(nextStatData: unknown, reason: string): Promise<StatData> {
  const parsedStatData = Schema.parse(klona(nextStatData ?? {}));
  createStandaloneRuntimeBaselineFromStores(parsedStatData);
  console.info(`[SetupStartGame] 开局配置已建立完整运行时底稿 reason=${reason}`);

  return parsedStatData;
}
