import { tCurrent } from '../i18n';

const BROWSER_FETCH_ERROR_PATTERN = /Failed to fetch|Load failed|NetworkError|network request failed/i;

export function normalizeRemoteApiErrorMessage(error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (BROWSER_FETCH_ERROR_PATTERN.test(rawMessage)) {
    return tCurrent('apiErrors.browserFetchBlocked');
  }

  return rawMessage;
}
