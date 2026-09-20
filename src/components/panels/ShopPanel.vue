<template>
  <div class="shop-panel">
    <!-- 顶部工具栏：积分显示 + 操作按钮 -->
    <section class="header-section">
      <!-- 左侧：积分显示 -->
      <div class="points-display">
        <i class="ti ti-ticket icon"></i>
        <span class="label">{{ t('shop.points') }}</span>
        <span class="amount">{{ formatNumber(currentPoints) }}</span>
      </div>

      <!-- 右侧：操作按钮组 -->
      <div class="action-buttons">
        <button :class="['sign-in-btn', { disabled: hasSignedToday }]" :disabled="hasSignedToday" @click="handleSignIn">
          <i class="ti ti-calendar-check"></i>
          <span>{{ hasSignedToday ? t('shop.signedIn') : t('shop.signInReward') }}</span>
        </button>
        <button class="refresh-btn" :title="t('shop.refresh')" @click="handleRefresh">
          <i class="ti ti-rotate"></i>
        </button>
      </div>
    </section>

    <!-- 兑换区域 -->
    <section v-if="exchangeRate > 0" class="exchange-section">
      <div class="exchange-controls">
        <button class="adjust-btn" @click="adjustExchangeAmount(-100)">-</button>
        <span class="exchange-amount">{{ exchangeAmount }}</span>
        <button class="adjust-btn" @click="adjustExchangeAmount(100)">+</button>
      </div>
      <span class="exchange-preview">{{
        t('shop.consumeCurrency', { amount: requiredCurrency, currency: currencyName })
      }}</span>
      <button :class="['exchange-btn', { disabled: !canExchange }]" :disabled="!canExchange" @click="handleExchange">
        {{ t('shop.exchange') }}
      </button>
    </section>
    <section v-else class="exchange-section disabled">
      <i class="ti ti-ban"></i>
      <span>{{ t('shop.noCurrencySystem') }}</span>
    </section>

    <!-- 商品列表 -->
    <section class="shop-section">
      <div v-if="hasItems" class="items-grid">
        <div
          v-for="(item, index) in shopItems"
          :key="index"
          :class="[
            'shop-item',
            `rarity-border-${getQualityLevel(item.品质)}`,
            { pulsing: isShopItemChanged(item.商品类型, item.名称) },
          ]"
          @mouseenter="dismissShopItemChanged(item.商品类型, item.名称)"
          @click="dismissShopItemChanged(item.商品类型, item.名称)"
        >
          <div class="item-header">
            <span :class="['item-name', `rarity-text-${getQualityLevel(item.品质)}`]">{{ item.名称 }}</span>
            <span :class="['rarity-badge', `rarity-level-${getQualityLevel(item.品质)}`]">
              {{ enumDisplay('player.itemQuality', item.品质, item.品质) }}
            </span>
          </div>
          <p class="item-desc">{{ item.描述 || t('shop.noDescription') }}</p>
          <p v-if="item.效果" class="item-effect">
            <i class="ti ti-sparkles"></i>
            {{ item.效果 }}
          </p>
          <div class="item-footer">
            <span class="price">
              <i class="ti ti-ticket"></i>
              {{ item.价格 }}
            </span>
            <span v-if="item.库存 !== -1" class="stock"> {{ t('shop.stock', { count: item.库存 }) }} </span>
            <button
              :class="['buy-btn', { disabled: !canBuy(item) }]"
              :disabled="!canBuy(item)"
              @click="handleBuy(item)"
            >
              {{ getBuyButtonText(item) }}
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">
        <i class="ti ti-package"></i>
        <p>{{ t('shop.noItems') }}</p>
        <p class="hint-sub">{{ t('shop.refreshHint') }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from '../../i18n';
import { useBadgeStore } from '../../stores/badge';
import { useNotificationStore } from '../../stores/notification';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { extractGameDate, getQualityLevel } from '../../utils/format';

const statDataStore = useStatDataStore();
const statDataActions = useStatDataActions();
const notificationStore = useNotificationStore();
const { data } = storeToRefs(statDataStore);
const { t, enumDisplay } = useI18n();

const badgeStore = useBadgeStore();

// 常量
const SIGN_IN_REWARD = 100;

// 兑换相关
const exchangeAmount = ref(100); // 默认兑换100积分

// 获取兑换比例
const exchangeRate = computed(() => {
  return data.value.设置?.积分系统?._兑换比例 || 100;
});

// 获取主货币名称
const currencyName = computed(() => {
  return data.value.玩家?.货币资源?.主货币?.名称 || t('shop.mainCurrency');
});

// 获取主货币数量
const currentCurrency = computed(() => {
  return data.value.玩家?.货币资源?.主货币?.数量 || 0;
});

// 计算兑换所需主货币
const requiredCurrency = computed(() => {
  return (exchangeAmount.value / 100) * exchangeRate.value;
});

// 是否可以兑换
const canExchange = computed(() => {
  if (exchangeRate.value <= 0) return false; // 无货币系统
  if (exchangeAmount.value <= 0) return false;
  return currentCurrency.value >= requiredCurrency.value;
});

// 获取当前积分（次级货币中的"积分"）
const currentPoints = computed(() => {
  return data.value.玩家?.货币资源?.次级货币?.['积分']?.数量 || 0;
});

// 获取商品列表
const shopItems = computed(() => {
  const itemShops = Object.entries(data.value.商城?.物品 || {}).map(([名称, item]) => ({
    名称,
    价格: item.价格,
    库存: item.库存,
    品质: item.品质,
    描述: item.备注,
    效果: item.特殊属性,
    商品类型: 'item' as const,
    原始数据: { 名称, ...item },
  }));

  const skillShops = Object.entries(data.value.商城?.技能 || {}).map(([名称, skill]) => ({
    名称,
    价格: skill.价格,
    库存: skill.库存,
    品质: skill.品质,
    描述: skill.描述,
    效果: t('shop.learnSkillEffect', { type: skill.类型 }),
    商品类型: 'skill' as const,
    原始数据: { 名称, ...skill },
  }));

  return [...itemShops, ...skillShops];
});

// 是否有商品
const hasItems = computed(() => {
  return shopItems.value.length > 0;
});

// 检查今天是否已签到
const hasSignedToday = computed(() => {
  const lastSignDate = data.value.设置?.积分系统?.上次签到日期 || '';
  const gameTime = data.value.世界?.时间系统?.当前时间 || '';
  const gameDate = extractGameDate(gameTime);
  // 游戏时间未初始化时，无法判定"今日"，视为未签到
  if (!gameDate) return false;
  return lastSignDate === gameDate;
});

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// 检查是否可以购买
function canBuy(item: { 价格: number; 库存: number }): boolean {
  if (currentPoints.value < item.价格) return false;
  if (item.库存 === 0) return false;
  return true;
}

// 获取购买按钮文本
function getBuyButtonText(item: { 价格: number; 库存: number }): string {
  if (item.库存 === 0) return t('shop.soldOut');
  if (currentPoints.value < item.价格) return t('shop.insufficientPoints');
  return t('shop.buy');
}

function getShopChangedKey(type: 'item' | 'skill', name: string): string {
  return `${type === 'item' ? '物品' : '技能'}:${name}`;
}

function isShopItemChanged(type: 'item' | 'skill', name: string): boolean {
  return badgeStore.isChangedKey('shop', getShopChangedKey(type, name));
}

function dismissShopItemChanged(type: 'item' | 'skill', name: string) {
  badgeStore.dismissChangedKey('shop', getShopChangedKey(type, name));
}

function ensurePointsCurrency(draft: typeof data.value) {
  if (!draft.玩家.货币资源.次级货币) {
    draft.玩家.货币资源.次级货币 = {};
  }

  if (!draft.玩家.货币资源.次级货币['积分']) {
    draft.玩家.货币资源.次级货币['积分'] = {
      数量: 0,
      兑换比例: t('shop.pointsCurrencyRate', { rate: exchangeRate.value, currency: currencyName.value }),
      用途说明: t('shop.pointsCurrencyUsage'),
    };
  }

  return draft.玩家.货币资源.次级货币['积分'];
}

// 处理签到
async function handleSignIn() {
  if (hasSignedToday.value) return;

  const gameTime = data.value.世界?.时间系统?.当前时间 || '';
  const gameDate = extractGameDate(gameTime);

  await statDataActions.mutateStatData('shop.signin', draft => {
    draft.设置.积分系统.上次签到日期 = gameDate;
    const points = ensurePointsCurrency(draft);
    points.数量 += SIGN_IN_REWARD;
  });

  notificationStore.success(t('shop.signInSuccess', { amount: SIGN_IN_REWARD }));
}

// 调整兑换数量
function adjustExchangeAmount(delta: number) {
  const newAmount = exchangeAmount.value + delta;
  if (newAmount >= 100) {
    exchangeAmount.value = newAmount;
  }
}

// 处理兑换
async function handleExchange() {
  if (!canExchange.value) return;

  await statDataActions.mutateStatData('shop.exchange', draft => {
    draft.玩家.货币资源.主货币.数量 -= requiredCurrency.value;
    const points = ensurePointsCurrency(draft);
    points.数量 += exchangeAmount.value;
  });

  notificationStore.success(
    t('shop.exchangeSuccess', {
      points: exchangeAmount.value,
      currencyCost: requiredCurrency.value,
      currencyName: currencyName.value,
    }),
  );
}

// 处理刷新商城
async function handleRefresh() {
  await statDataActions.updateStatDataAtPath('shop.refresh', '设置.积分系统.商城刷新', true);
  notificationStore.info(t('shop.refreshRequested'));
  // 触发变量将在 AI 回复完成后自动重置
}

// 处理购买
async function handleBuy(shopItem: (typeof shopItems.value)[0]) {
  if (!canBuy(shopItem)) return;

  await statDataActions.mutateStatData(`shop.buy.${shopItem.商品类型}`, draft => {
    const points = ensurePointsCurrency(draft);
    points.数量 -= shopItem.价格;

    if (shopItem.商品类型 === 'item') {
      const item = shopItem.原始数据;
      draft.商城.物品 ??= {};
      draft.玩家.物品栏 ??= {};

      if (draft.商城.物品[item.名称] && draft.商城.物品[item.名称].库存 !== -1) {
        draft.商城.物品[item.名称].库存 -= 1;
      }

      if (draft.玩家.物品栏[item.名称]) {
        draft.玩家.物品栏[item.名称].数量 += item.数量;
      } else {
        const { 价格, 库存, 名称, ...物品数据 } = item;
        draft.玩家.物品栏[item.名称] = { ...物品数据 };
      }

      console.info(`已购买物品: ${item.名称}`);
      return;
    }

    const skill = shopItem.原始数据;
    draft.商城.技能 ??= {};
    draft.玩家.技能系统 ??= {};

    if (draft.商城.技能[skill.名称] && draft.商城.技能[skill.名称].库存 !== -1) {
      draft.商城.技能[skill.名称].库存 -= 1;
    }

    const { 价格, 库存, 名称, ...技能数据 } = skill;
    draft.玩家.技能系统[skill.名称] = { ...技能数据 };

    console.info(`已学习技能: ${skill.名称}`);
  });

  if (shopItem.商品类型 === 'item') {
    notificationStore.success(t('shop.itemReceived', { name: shopItem.名称, count: shopItem.原始数据.数量 }));
  } else {
    notificationStore.success(t('shop.skillLearned', { name: shopItem.名称 }));
  }
}
</script>

<style scoped>
.shop-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部工具栏 */
.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary, #7c3aed));
  border-radius: 12px;
  color: white;
  box-shadow: var(--shadow-md);
}

.points-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.points-display .icon {
  font-size: calc(24px * var(--ui-font-scale));
}

.points-display .label {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.points-display .amount {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: 700;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sign-in-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.sign-in-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.sign-in-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-section .refresh-btn {
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 200ms ease;
}

.header-section .refresh-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 兑换区域 */
.exchange-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--bg-card);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
}

.exchange-section.disabled {
  color: var(--text-tertiary);
  gap: 8px;
}

.exchange-section.disabled i {
  color: var(--text-tertiary);
}

.exchange-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-primary);
  border-radius: 16px;
  padding: 4px 8px;
}

.adjust-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--accent-primary);
  border-radius: 50%;
  color: white;
  font-size: calc(14px * var(--ui-font-scale));
  font-weight: bold;
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.adjust-btn:hover {
  opacity: 0.8;
  transform: scale(1.1);
}

.exchange-amount {
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.exchange-preview {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.exchange-btn {
  padding: 6px 16px;
  background: var(--accent-primary);
  border: none;
  border-radius: 16px;
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.exchange-btn:hover:not(.disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.exchange-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 商城区域 */
.shop-section {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

/* 商品网格 */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.shop-item {
  --shop-accent: var(--accent-primary);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
  border-top: 3px solid var(--shop-accent);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal),
    transform var(--motion-normal);
}

.shop-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
}

.shop-item.pulsing {
  animation: cardHeartbeat 1.15s ease-in-out infinite;
  box-shadow:
    var(--card-shadow-hover),
    inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.16);
}

/* 品质边框颜色：保留颜色能力，映射到顶部强调边框 */
.rarity-border-1 {
  --shop-accent: #9ca3af;
}
.rarity-border-2 {
  --shop-accent: #22c55e;
}
.rarity-border-3 {
  --shop-accent: #3b82f6;
}
.rarity-border-4 {
  --shop-accent: #a855f7;
}
.rarity-border-5 {
  --shop-accent: #f59e0b;
}

/* 品质文字 */
.rarity-text-1 {
  color: var(--text-primary);
}
.rarity-text-2 {
  color: #22c55e;
}
.rarity-text-3 {
  color: #3b82f6;
}
.rarity-text-4 {
  color: #a855f7;
}
.rarity-text-5 {
  color: #f59e0b;
}

/* 品质徽章（在本组件内显式定义，避免全局样式优先级/映射漂移） */
.rarity-level-1 {
  background: linear-gradient(135deg, hsl(220, 9%, 60%), hsl(220, 9%, 68%));
}
.rarity-level-2 {
  background: linear-gradient(135deg, hsl(142, 71%, 45%), hsl(152, 60%, 52%));
}
.rarity-level-3 {
  background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(230, 80%, 65%));
}
.rarity-level-4 {
  background: linear-gradient(135deg, hsl(271, 91%, 65%), hsl(285, 80%, 60%));
}
.rarity-level-5 {
  background: linear-gradient(135deg, hsl(38, 92%, 50%), hsl(45, 95%, 55%));
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-name {
  font-weight: 600;
  font-size: var(--text-base);
}

.rarity-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: calc(10px * var(--ui-font-scale));
  font-weight: 500;
  color: white;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  flex-shrink: 0;
  line-height: 1.2;
}

.item-desc {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.4;
}

.item-effect {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--accent-success);
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--border-light);
}

.price {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: var(--accent-warning);
}

.stock {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.buy-btn {
  margin-left: auto;
  padding: 6px 12px;
  background: var(--accent-primary);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
}

.buy-btn:hover:not(.disabled) {
  background: var(--accent-secondary, #7c3aed);
  transform: translateY(-1px);
}

.buy-btn.disabled {
  background: var(--text-secondary);
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes cardHeartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.01);
  }
  60% {
    transform: scale(0.996);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shop-item.pulsing {
    animation: none !important;
  }
}

/* 空状态 */
.empty-hint {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
}

.empty-hint i {
  font-size: calc(48px * var(--ui-font-scale));
  opacity: 0.3;
  margin-bottom: 12px;
}

.empty-hint p {
  margin: 4px 0;
}

.hint-sub {
  font-size: var(--text-xs);
  opacity: 0.7;
}
</style>
