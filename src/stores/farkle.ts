import { defineStore } from 'pinia';
import { ref } from 'vue';
import { persistStandaloneFarkleState, resolveStandaloneFarkleState } from '../utils/standaloneRuntime';

/**
 * Farkle 账本 Store。
 *
 * Farkle 币与道具完全由前端维护，不进 stat_data（AI 看不到也改不到），
 * 与主货币、积分系统的积分三家互不相通。跟着会话存，读档一起回来。
 */
export const useFarkleStore = defineStore('farkle', () => {
  /** Farkle 币余额 */
  const coins = ref(0);
  /** 已购买的永久道具 id（始终生效） */
  const permanentItems = ref<string[]>([]);
  /** 临时道具库存：id → 剩余数量 */
  const consumableItems = ref<Record<string, number>>({});

  /** 从当前会话读入账本（应用启动 / 读档后调用） */
  function initFromSession() {
    const state = resolveStandaloneFarkleState();
    coins.value = state.币;
    permanentItems.value = state.永久道具;
    consumableItems.value = state.临时道具;
  }

  /** 写入账本：同时更新内存与会话（存档） */
  function applyState() {
    try {
      persistStandaloneFarkleState({
        币: coins.value,
        永久道具: permanentItems.value,
        临时道具: consumableItems.value,
      });
    } catch (error) {
      // 还没开局（会话不存在）时写不进存档，只留内存值，不影响本次显示
      console.warn('[FarkleStore] 账本写入会话失败，已仅更新内存值:', error);
    }
  }

  /** 结算时入账：把超出目标分数折算的币加进来 */
  function addCoins(amount: number) {
    coins.value = Math.max(0, coins.value + Math.floor(amount));
    applyState();
  }

  /** 买永久道具：扣币 + 记入永久列表（可买多个，每件独立计数） */
  function buyPermanent(itemId: string, price: number): boolean {
    if (coins.value < price) return false;
    coins.value -= price;
    permanentItems.value = [...permanentItems.value, itemId];
    applyState();
    return true;
  }

  /** 买临时道具：扣币 + 库存 +1 */
  function buyConsumable(itemId: string, price: number): boolean {
    if (coins.value < price) return false;
    coins.value -= price;
    const next = { ...consumableItems.value };
    next[itemId] = (next[itemId] ?? 0) + 1;
    consumableItems.value = next;
    applyState();
    return true;
  }

  /** 消耗一件临时道具（每局限一次，用完扣库存） */
  function consumeItem(itemId: string): boolean {
    const count = consumableItems.value[itemId] ?? 0;
    if (count <= 0) return false;
    const next = { ...consumableItems.value };
    next[itemId] = count - 1;
    if (next[itemId] === 0) delete next[itemId];
    consumableItems.value = next;
    applyState();
    return true;
  }

  /** 一件临时道具当前还能不能用（有库存且本局没被消耗过） */
  function hasStock(itemId: string): boolean {
    return (consumableItems.value[itemId] ?? 0) > 0;
  }

  return {
    coins,
    permanentItems,
    consumableItems,
    initFromSession,
    addCoins,
    buyPermanent,
    buyConsumable,
    consumeItem,
    hasStock,
  };
});
