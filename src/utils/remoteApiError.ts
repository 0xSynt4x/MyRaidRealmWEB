import { tCurrent } from '../i18n';
import { STANDALONE_FIRST_TOKEN_TIMEOUT_CODE } from '../../runtime/standaloneProviderCore';

const BROWSER_FETCH_ERROR_PATTERN = /Failed to fetch|Load failed|NetworkError|network request failed/i;
const FIRST_TOKEN_TIMEOUT_PATTERN = new RegExp(`^${STANDALONE_FIRST_TOKEN_TIMEOUT_CODE}:(\\d+)$`);

export function normalizeRemoteApiErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (BROWSER_FETCH_ERROR_PATTERN.test(rawMessage)) {
    return tCurrent('apiErrors.browserFetchBlocked');
  }

  // 首字超时由运行时抛机器码（见 standaloneProviderCore），这里换成对应语言的界面文案
  const firstTokenTimeout = FIRST_TOKEN_TIMEOUT_PATTERN.exec(rawMessage);
  if (firstTokenTimeout) {
    return tCurrent('apiErrors.firstTokenTimeout', { seconds: firstTokenTimeout[1] });
  }

  return rawMessage;
}
