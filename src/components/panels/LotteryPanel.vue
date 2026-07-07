<template>
  <div class="lottery-panel">
    <!-- 顶部：积分显示 + 抽奖次数 -->
    <section class="header-section">
      <div class="points-display">
        <span class="icon">🎫</span>
        <span class="label">{{ t('shop.points') }}</span>
        <span class="amount">{{ formatNumber(currentPoints) }}</span>
      </div>
      <div class="lottery-count">
        <span class="label">{{ t('lottery.drawn') }}</span>
        <span class="count">{{ totalLotteryCount }}</span>
        <span class="label">{{ t('lottery.times') }}</span>
      </div>
    </section>

    <!-- 保底进度 -->
    <section class="pity-section">
      <div class="pity-header">
        <span class="pity-label">{{ t('lottery.pityProgress') }}</span>
        <span class="pity-count"
          >{{ (data.设置?.积分系统?.$保底次数 || 0) % PITY_THRESHOLD }} / {{ PITY_THRESHOLD }}</span
        >
      </div>
      <div class="pity-bar">
        <div class="pity-fill" :style="{ width: pityProgress + '%' }"></div>
      </div>
      <p class="pity-hint">
        <i class="fa-solid fa-star"></i>
        {{ t('lottery.pityHint', { count: PITY_THRESHOLD }) }}
      </p>
    </section>

    <!-- 抽奖按钮区域 -->
    <section class="lottery-section">
      <div class="lottery-buttons">
        <button
          :class="['lottery-btn single', { disabled: !canSingleDraw }]"
          :disabled="!canSingleDraw"
          @click="handleSingleDraw"
        >
          <div class="btn-content">
            <i class="fa-solid fa-dice-one"></i>
            <span class="btn-label">{{ t('lottery.singleDraw') }}</span>
          </div>
          <span class="btn-price">
            <i class="fa-solid fa-ticket"></i>
            {{ SINGLE_PRICE }}
          </span>
        </button>

        <button :class="['lottery-btn ten', { disabled: !canTenDraw }]" :disabled="!canTenDraw" @click="handleTenDraw">
          <div class="btn-content">
            <i class="fa-solid fa-dice"></i>
            <span class="btn-label">{{ t('lottery.tenDraw') }}</span>
          </div>
          <span class="btn-price">
            <i class="fa-solid fa-ticket"></i>
            {{ TEN_PRICE }}
            <span class="discount">{{ t('lottery.saveDiscount', { amount: SINGLE_PRICE * 10 - TEN_PRICE }) }}</span>
          </span>
        </button>
      </div>
    </section>

    <!-- 概率条 -->
    <section class="odds-bar">
      <div class="odds-item">
        <span class="rarity-dot rarity-level-1"></span>
        <span class="odds-text">{{ t('lottery.odds.common') }}</span>
      </div>
      <div class="odds-item">
        <span class="rarity-dot rarity-level-2"></span>
        <span class="odds-text">{{ t('lottery.odds.fine') }}</span>
      </div>
      <div class="odds-item">
        <span class="rarity-dot rarity-level-3"></span>
        <span class="odds-text">{{ t('lottery.odds.rare') }}</span>
      </div>
      <div class="odds-item">
        <span class="rarity-dot rarity-level-4"></span>
        <span class="odds-text">{{ t('lottery.odds.epic') }}</span>
      </div>
      <div class="odds-item">
        <span class="rarity-dot rarity-level-5"></span>
        <span class="odds-text">{{ t('lottery.odds.legendary') }}</span>
      </div>
    </section>

    <!-- 规则摘要 -->
    <section class="rules-summary">
      <span>{{ t('lottery.singleSummary', { amount: SINGLE_PRICE }) }}</span>
      <span class="separator">•</span>
      <span>{{ t('lottery.tenSummary', { amount: TEN_PRICE }) }}</span>
      <span class="separator">•</span>
      <span>{{ t('lottery.pitySummary', { count: PITY_THRESHOLD }) }}</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useMessageActions } from '../../composables/useMessageActions';
import { useI18n } from '../../i18n';
import { useMessagesStore } from '../../stores/messages';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';

const statDataStore = useStatDataStore();
const messagesStore = useMessagesStore();
const statDataActions = useStatDataActions();
const messageActions = useMessageActions();
const { data } = storeToRefs(statDataStore);
const { isStandaloneGenerationLocked } = storeToRefs(messagesStore);
const { t } = useI18n();

// 常量
const SINGLE_PRICE = 100;
const TEN_PRICE = 900; // 十连优惠100积分
const PITY_THRESHOLD = 100;

// 获取当前积分
const currentPoints = computed(() => {
  return data.value.玩家?.货币资源?.次级货币?.['积分']?.数量 || 0;
});

// 获取累计抽奖次数（用于显示）
const totalLotteryCount = computed(() => {
  return data.value.设置?.积分系统?.$保底次数 || 0;
});

// 保底进度百分比（基于 $保底次数）
const pityProgress = computed(() => {
  const total = data.value.设置?.积分系统?.$保底次数 || 0;
  return ((total % PITY_THRESHOLD) / PITY_THRESHOLD) * 100;
});

// 是否可以单抽
const canSingleDraw = computed(() => {
  return currentPoints.value >= SINGLE_PRICE && !isStandaloneGenerationLocked.value;
});

// 是否可以十连抽
const canTenDraw = computed(() => {
  return currentPoints.value >= TEN_PRICE && !isStandaloneGenerationLocked.value;
});

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString();
}

function resolvePlayerName(): string {
  const playerName = data.value.玩家?.姓名;
  return typeof playerName === 'string' && playerName.trim() ? playerName.trim() : '玩家';
}

function ensurePointsCurrency(draft: typeof data.value) {
  if (!draft.玩家.货币资源.次级货币) {
    draft.玩家.货币资源.次级货币 = {};
  }

  if (!draft.玩家.货币资源.次级货币['积分']) {
    draft.玩家.货币资源.次级货币['积分'] = {
      数量: 0,
      兑换比例: '100主货币 = 100积分',
      用途说明: '用于商城购物和抽奖',
    };
  }

  return draft.玩家.货币资源.次级货币['积分'];
}

// 处理单抽
async function handleSingleDraw() {
  if (!canSingleDraw.value) return;

  const currentDrawCount = data.value.设置?.积分系统?.抽奖次数 || 0;
  const newDrawCount = currentDrawCount + 1;
  const promptText = `## 🎰 开始抽奖!${resolvePlayerName()}发起了${newDrawCount}次抽奖，请生成抽奖结果。`;

  let totalDraws = newDrawCount;
  let newPityCount = 0;
  let isPity = false;

  await statDataActions.mutateStatData('lottery.single', draft => {
    const points = ensurePointsCurrency(draft);
    points.数量 -= SINGLE_PRICE;

    const currentCount = draft.设置.积分系统.抽奖次数 || 0;
    draft.设置.积分系统.抽奖次数 = currentCount + 1;
    totalDraws = draft.设置.积分系统.抽奖次数;

    const oldPityCount = draft.设置.积分系统.$保底次数 || 0;
    draft.设置.积分系统.$保底次数 = oldPityCount + 1;
    newPityCount = draft.设置.积分系统.$保底次数;

    isPity = newPityCount % PITY_THRESHOLD === 0 && newPityCount > 0;
    draft.设置.积分系统.保底触发 = isPity;

    if (isPity) {
      draft.设置.积分系统.$保底次数 = 0;
    }

    draft.设置.积分系统.抽奖触发 = true;
  });

  if (isPity) {
    toastr.success(t('lottery.triggerPity', { totalDraws, pityCount: newPityCount }));
  } else {
    toastr.info(t('lottery.drawProgress', { totalDraws, pityCount: newPityCount }));
  }

  await messageActions.sendStandaloneUserMessage(promptText, 'lottery_single', {
    scriptedTurn: {
      kind: 'lottery',
      promptText,
    },
  });
}

// 处理十连抽
async function handleTenDraw() {
  if (!canTenDraw.value) return;

  const currentDrawCount = data.value.设置?.积分系统?.抽奖次数 || 0;
  const newDrawCount = currentDrawCount + 10;
  const promptText = `## 🎰 开始抽奖!${resolvePlayerName()}发起了${newDrawCount}次抽奖，请生成抽奖结果。`;

  let totalDraws = newDrawCount;
  let newPityCount = 0;
  let isPity = false;

  await statDataActions.mutateStatData('lottery.ten', draft => {
    const points = ensurePointsCurrency(draft);
    points.数量 -= TEN_PRICE;

    const currentCount = draft.设置.积分系统.抽奖次数 || 0;
    draft.设置.积分系统.抽奖次数 = currentCount + 10;
    totalDraws = draft.设置.积分系统.抽奖次数;

    const oldPityCount = draft.设置.积分系统.$保底次数 || 0;
    draft.设置.积分系统.$保底次数 = oldPityCount + 10;
    newPityCount = draft.设置.积分系统.$保底次数;

    const oldProgress = oldPityCount % PITY_THRESHOLD;
    isPity = oldProgress + 10 >= PITY_THRESHOLD;
    draft.设置.积分系统.保底触发 = isPity;

    if (isPity) {
      draft.设置.积分系统.$保底次数 = newPityCount % PITY_THRESHOLD;
    }

    draft.设置.积分系统.抽奖触发 = true;
  });

  if (isPity) {
    toastr.success(t('lottery.triggerPity', { totalDraws, pityCount: newPityCount }));
  } else {
    toastr.info(t('lottery.drawProgress', { totalDraws, pityCount: newPityCount }));
  }

  await messageActions.sendStandaloneUserMessage(promptText, 'lottery_ten', {
    scriptedTurn: {
      kind: 'lottery',
      promptText,
    },
  });
}
</script>

<style scoped>
.lottery-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部区域 - 渐变 + 微光 */
.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, hsl(38, 92%, 50%), hsl(28, 80%, 52%));
  border-radius: var(--radius-lg);
  color: white;
  box-shadow:
    var(--shadow-md),
    0 0 20px rgba(245, 158, 11, 0.2);
  position: relative;
  overflow: hidden;
}

/* 微光扫过动画 */
.header-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  animation: shimmer-lottery 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer-lottery {
  0% {
    left: -100%;
  }
  50%,
  100% {
    left: 150%;
  }
}

/* 背景装饰圆 */
.header-section::after {
  content: '';
  position: absolute;
  top: -30%;
  right: -10%;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.points-display {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.points-display .icon {
  font-size: 26px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.points-display .label {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.points-display .amount {
  font-family: var(--font-mono);
  font-size: var(--text-xl);
  font-weight: 700;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.lottery-count {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  font-size: var(--text-sm);
  position: relative;
  z-index: 1;
}

.lottery-count .count {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--text-base);
}

/* 保底进度 - 玻璃拟态 + 光效 */
.pity-section {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 14px;
  box-shadow: var(--shadow-glass);
}

.pity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pity-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.pity-count {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: hsl(38, 92%, 50%);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(245, 158, 11, 0.2);
}

.pity-bar {
  height: 10px;
  background: var(--bg-primary);
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.pity-fill {
  height: 100%;
  background: linear-gradient(90deg, hsl(38, 92%, 50%), hsl(45, 93%, 58%));
  border-radius: 5px;
  transition: width 500ms var(--ease-out-expo);
  position: relative;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}

/* 进度条光点 */
.pity-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5));
  border-radius: 0 5px 5px 0;
}

.pity-hint {
  margin: 10px 0 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.pity-hint i {
  color: hsl(38, 92%, 50%);
  filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.3));
}

/* 抽奖按钮区域 - 玻璃拟态 */
.lottery-section {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: var(--shadow-glass);
}

.lottery-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.lottery-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-normal) var(--ease-out-expo);
  position: relative;
  overflow: hidden;
}

/* 按钮微光扫过 */
.lottery-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
  transition: left 600ms ease;
}

.lottery-btn:hover:not(.disabled)::before {
  left: 150%;
}

.lottery-btn.single {
  background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(224, 76%, 48%));
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
}

.lottery-btn.ten {
  background: linear-gradient(135deg, hsl(271, 91%, 65%), hsl(263, 70%, 50%));
  color: white;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.25);
}

.lottery-btn:hover:not(.disabled) {
  transform: translateY(-3px) scale(1.02);
}

.lottery-btn.single:hover:not(.disabled) {
  box-shadow:
    0 8px 25px rgba(59, 130, 246, 0.4),
    0 0 20px rgba(59, 130, 246, 0.15);
}

.lottery-btn.ten:hover:not(.disabled) {
  box-shadow:
    0 8px 25px rgba(168, 85, 247, 0.4),
    0 0 20px rgba(168, 85, 247, 0.15);
}

.lottery-btn:active:not(.disabled) {
  transform: translateY(-1px) scale(0.98);
}

.lottery-btn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.6);
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.btn-content i {
  font-size: 26px;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
}

.btn-label {
  font-size: var(--text-lg);
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.btn-price {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  opacity: 0.9;
  position: relative;
  z-index: 1;
}

.discount {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

/* 概率条 - 玻璃拟态 */
.odds-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
}

.odds-item {
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all var(--transition-fast) ease;
}

.odds-item:hover {
  transform: scale(1.05);
}

.rarity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: all var(--transition-fast) ease;
}

.odds-item:hover .rarity-dot {
  transform: scale(1.3);
}

.rarity-dot.rarity-level-1 {
  background: hsl(220, 9%, 63%);
  box-shadow: 0 0 6px rgba(156, 163, 175, 0.4);
}
.rarity-dot.rarity-level-2 {
  background: hsl(142, 71%, 45%);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}
.rarity-dot.rarity-level-3 {
  background: hsl(217, 91%, 60%);
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.rarity-dot.rarity-level-4 {
  background: hsl(271, 91%, 65%);
  box-shadow: 0 0 6px rgba(168, 85, 247, 0.4);
}
.rarity-dot.rarity-level-5 {
  background: hsl(38, 92%, 50%);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
  animation: rarity-pulse 2s ease-in-out infinite;
}

@keyframes rarity-pulse {
  0%,
  100% {
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow:
      0 0 12px rgba(245, 158, 11, 0.7),
      0 0 20px rgba(245, 158, 11, 0.2);
  }
}

.odds-text {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

/* 规则摘要 - 玻璃拟态 */
.rules-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 500;
}

.rules-summary .separator {
  color: var(--text-tertiary);
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .header-section::before {
    animation: none;
  }
  .rarity-dot.rarity-level-5 {
    animation: none;
  }
  .lottery-btn:hover:not(.disabled) {
    transform: none;
  }
  .odds-item:hover {
    transform: none;
  }
}
</style>
