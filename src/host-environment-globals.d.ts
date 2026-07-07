/// <reference types="jquery" />
/// <reference types="lodash" />
/// <reference types="toastr" />
/// <reference types="type-fest" />

/**
 * Frontend-local entrypoint for standalone runtime-provided globals.
 *
 * Do not reference Tavern/MVU/SillyTavern helper declaration files here. The
 * standalone app should only see the small browser globals it still uses.
 */

type StandaloneEventOnReturn = {
  stop: () => void;
};

/** 与 eventOn 返回值一致的事件句柄别名，供组件订阅时标注类型 */
type EventOnReturn = StandaloneEventOnReturn;

declare function eventOn(eventType: string, listener: (...args: any[]) => void): StandaloneEventOnReturn;
