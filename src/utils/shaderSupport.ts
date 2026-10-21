/**
 * WebGPU 可用性判断。
 *
 * 单独拎出来的原因只有一个：失败记录必须是**进程级**的，不能跟着组件实例走。
 * 首页每次回到大厅都会重新挂载，如果每次挂载都去试一次 WebGPU 初始化，
 * 在不支持的机器上就会反复卡一下、再反复打一条失败日志 —— 试一次记住就够了。
 */

/** 本进程内是否已经确认 WebGPU 起不来 */
let gpuBroken = false;

/** 浏览器是否暴露了 navigator.gpu（只是必要条件，不等于真能出图） */
export function hasWebGpuApi(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

/** 之前是否已经失败过 */
export function isGpuKnownBroken(): boolean {
  return gpuBroken;
}

/** 标记 WebGPU 在本进程内不可用 */
export function markGpuBroken(): void {
  gpuBroken = true;
}
