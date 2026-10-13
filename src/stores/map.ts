import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { persistStandaloneMapState, resolveStandaloneMapState } from '../utils/standaloneRuntime';
import { buildMapTree, type MapNode } from '../utils/mapLocationTree';

/**
 * 地图地点树 Store。
 *
 * 地图数据完全由前端维护，不进 stat_data —— 主模型与变量更新模型都看不到它。
 * 它跟着会话与楼层快照走：读档、回退楼层时都能恢复。
 *
 * 「正文计数」用来实现「每 n 次正文后自动更新一次地图」：每写一轮正文加一，
 * 攒够间隔就跑一次地图请求并归零。
 */
export const useMapStore = defineStore('map', () => {
  /** 扁平的地点列表，靠「父级」串成树 */
  const nodes = ref<MapNode[]>([]);
  /** 上次更新成功的时间（ISO 串）；空串＝还没更新过 */
  const updatedAt = ref('');
  /** 距离上次地图更新已经过了多少轮正文 */
  const bodyTurnCount = ref(0);
  /** 最近一次「回忆解析」拿到的模型原始回复，只用于地图页上的日志展示 */
  const lastRawReply = ref('');
  /** 是否正在跑地图请求 */
  const isUpdating = ref(false);
  /** 最近一次失败原因；成功时为空串 */
  const lastError = ref('');

  /** 地点树：把扁平列表整理成可渲染的树，界面直接用它 */
  const tree = computed(() => buildMapTree(nodes.value));

  /** 地点总数 */
  const nodeCount = computed(() => nodes.value.length);

  /** 从当前会话读入地图数据（应用启动 / 读档后调用） */
  function initFromSession() {
    const state = resolveStandaloneMapState();
    nodes.value = state.地点;
    updatedAt.value = state.更新时间;
    bodyTurnCount.value = state.正文计数;
  }

  /** 写入地图数据：同时更新内存与会话（存档） */
  function applyState(state: { 地点: MapNode[]; 更新时间: string; 正文计数: number }) {
    nodes.value = state.地点;
    updatedAt.value = state.更新时间;
    bodyTurnCount.value = Math.max(0, Math.floor(state.正文计数));

    try {
      persistStandaloneMapState({
        地点: nodes.value,
        更新时间: updatedAt.value,
        正文计数: bodyTurnCount.value,
      });
    } catch (error) {
      // 还没开局（会话不存在）时写不进存档，只留内存值，不影响本次显示
      console.warn('[MapStore] 地图数据写入会话失败，已仅更新内存值:', error);
    }
  }

  /** 地图请求成功后落库：替换整棵地点树并把正文计数归零 */
  function applyNodes(nextNodes: MapNode[], rawReply = '') {
    applyState({
      地点: nextNodes,
      更新时间: new Date().toISOString(),
      正文计数: 0,
    });
    lastRawReply.value = rawReply;
    lastError.value = '';
  }

  /** 只刷新内存（回退楼层恢复快照时用，快照值已随会话一起写入） */
  function setStateInMemory(state: { 地点: MapNode[]; 更新时间: string; 正文计数: number }) {
    nodes.value = state.地点;
    updatedAt.value = state.更新时间;
    bodyTurnCount.value = Math.max(0, Math.floor(state.正文计数));
  }

  /**
   * 正文写了一轮：计数加一并落盘，返回加完之后的计数。
   *
   * 调用方据此判断是否到了自动更新的间隔；会话还没建立时只加内存值。
   */
  function countBodyTurn(): number {
    const next = bodyTurnCount.value + 1;
    bodyTurnCount.value = next;

    try {
      persistStandaloneMapState({
        地点: nodes.value,
        更新时间: updatedAt.value,
        正文计数: next,
      });
    } catch (error) {
      console.warn('[MapStore] 正文计数写入会话失败，已仅更新内存值:', error);
    }

    return next;
  }

  function setError(message: string) {
    lastError.value = message;
  }

  function setRawReply(text: string) {
    lastRawReply.value = text;
  }

  function setUpdating(value: boolean) {
    isUpdating.value = value;
  }

  function reset() {
    applyState({ 地点: [], 更新时间: '', 正文计数: 0 });
    lastRawReply.value = '';
    lastError.value = '';
  }

  return {
    nodes,
    updatedAt,
    bodyTurnCount,
    lastRawReply,
    isUpdating,
    lastError,
    tree,
    nodeCount,
    initFromSession,
    applyState,
    applyNodes,
    setStateInMemory,
    countBodyTurn,
    setError,
    setRawReply,
    setUpdating,
    reset,
  };
});
