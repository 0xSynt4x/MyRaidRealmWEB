/// <reference types="lodash" />
/// <reference types="type-fest" />

/**
 * Frontend-local entrypoint for standalone runtime-provided globals.
 *
 * Do not reference Tavern/MVU/SillyTavern helper declaration files here. The
 * standalone app should only see the small browser globals it still uses.
 *
 * 已移除 jquery / toastr 的类型引用：全项目没有一处使用它们
 * （提示统一走 src/utils/notify.ts）。留着这两行会让「再写一次裸 toastr」
 * 通过类型检查、却在运行时炸掉 —— 删掉后这类回归会直接编译报错。
 */

type StandaloneEventOnReturn = {
  stop: () => void;
};

/** 与 eventOn 返回值一致的事件句柄别名，供组件订阅时标注类型 */
type EventOnReturn = StandaloneEventOnReturn;

declare function eventOn(eventType: string, listener: (...args: any[]) => void): StandaloneEventOnReturn;
