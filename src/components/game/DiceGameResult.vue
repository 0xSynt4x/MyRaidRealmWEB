<template>
  <div class="result-container">
    <!-- 结果标题 -->
    <div class="result-header" :class="resultClass">
      <div class="result-icon">
        <i :class="resultIcon"></i>
      </div>
      <h2 class="result-title">{{ resultTitle }}</h2>
      <p class="result-subtitle">{{ resultSubtitle }}</p>
    </div>

    <!-- 分数对比 -->
    <div class="score-compare">
      <div class="compare-player" :class="{ winner: isPlayerWin }">
        <span class="compare-label">{{ t('dice.board.you') }}</span>
        <span class="compare-score">{{ result.playerScore }}</span>
        <span v-if="isPlayerWin" class="crown"><i class="ti ti-crown"></i></span>
      </div>
      <div class="compare-vs">VS</div>
      <div class="compare-npc" :class="{ winner: !isPlayerWin && !isDraw }">
        <span class="compare-label">{{ result.npcName }}</span>
        <span class="compare-score">{{ result.npcScore }}</span>
        <span v-if="!isPlayerWin && !isDraw" class="crown"><i class="ti ti-crown"></i></span>
      </div>
    </div>

    <!-- 赌注结果 -->
    <div v-if="hasChanges" class="settlement-section">
      <div class="section-title">
        <i class="ti ti-receipt section-icon"></i>
        <span>{{ t('dice.result.settlement') }}</span>
      </div>

      <div v-if="result.currencyChange !== 0" class="settle-row">
        <div class="settle-label">
          <i class="ti ti-coins"></i>
          <span>{{ currencyName }}</span>
        </div>
        <span :class="['settle-value', result.currencyChange > 0 ? 'positive' : 'negative']">
          {{ result.currencyChange > 0 ? '+' : '' }}{{ result.currencyChange }}
        </span>
      </div>

      <div v-if="result.favorChange !== 0" class="settle-row">
        <div class="settle-label">
          <i class="ti ti-heart"></i>
          <span>{{ t('dice.setup.favor') }}</span>
        </div>
        <span :class="['settle-value', result.favorChange > 0 ? 'positive' : 'negative']">
          {{ result.favorChange > 0 ? '+' : '' }}{{ result.favorChange }}
        </span>
      </div>

      <div v-if="result.trustChange !== 0" class="settle-row">
        <div class="settle-label">
          <i class="ti ti-heart-handshake"></i>
          <span>{{ t('dice.setup.trust') }}</span>
        </div>
        <span :class="['settle-value', result.trustChange > 0 ? 'positive' : 'negative']">
          {{ result.trustChange > 0 ? '+' : '' }}{{ result.trustChange }}
        </span>
      </div>
    </div>

    <div v-else class="no-bet-hint">
      <i class="ti ti-info-circle"></i>
      <span>{{ isDraw ? t('dice.result.drawRefund') : t('dice.result.noBets') }}</span>
    </div>

    <!-- 操作按钮 -->
    <div class="result-actions">
      <button class="action-btn again-btn" @click="store.playAgain()">
        <i class="ti ti-rotate-clockwise"></i>
        <span>{{ t('dice.result.playAgain') }}</span>
      </button>
      <button class="action-btn quit-btn" @click="handleQuit">
        <i class="ti ti-door-enter"></i>
        <span>{{ t('dice.result.leave') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { PlayerType } from '../../game/farkle/types';
import { useI18n } from '../../i18n';
import { useDiceGameStore } from '../../stores/diceGame';
import { useLayoutStore } from '../../stores/layout';

const store = useDiceGameStore();
const layoutStore = useLayoutStore();
const { t } = useI18n();

function handleQuit() {
  // 保护逻辑和游戏状态清理由 layout store 统一处理
  layoutStore.closeOverlayPanel();
}

const result = computed(() => store.gameResult!);
const currencyName = computed(() => store.playerCurrency.name);

const isPlayerWin = computed(() => result.value.winner === PlayerType.Human && !isDraw.value);
const isDraw = computed(() => result.value.playerScore === result.value.npcScore);

const hasChanges = computed(() => {
  return result.value.currencyChange !== 0 || result.value.favorChange !== 0 || result.value.trustChange !== 0;
});

const resultClass = computed(() => {
  if (isDraw.value) return 'draw';
  return isPlayerWin.value ? 'win' : 'lose';
});

const resultTitle = computed(() => {
  if (isDraw.value) return t('dice.result.draw');
  return isPlayerWin.value ? t('dice.result.win') : t('dice.result.lose');
});

const resultSubtitle = computed(() => {
  if (isDraw.value) return t('dice.result.drawSubtitle');
  if (isPlayerWin.value) return t('dice.result.winSubtitle');
  return t('dice.result.loseSubtitle', { name: result.value.npcName });
});

const resultIcon = computed(() => {
  if (isDraw.value) return 'ti ti-heart-handshake';
  return isPlayerWin.value ? 'ti ti-trophy' : 'ti ti-mood-sad';
});
</script>

<style scoped>
.result-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  overflow-y: auto;
  max-height: 100%;
}

/* ===== 结果标题 ===== */
.result-header {
  text-align: center;
  padding: 20px 16px;
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
}

.result-header::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.08;
  pointer-events: none;
}

.result-header.win {
  background: linear-gradient(135deg, rgba(var(--accent-success-rgb), 0.1), rgba(var(--accent-success-rgb), 0.04));
  border: 1px solid rgba(var(--accent-success-rgb), 0.2);
}

.result-header.lose {
  background: linear-gradient(135deg, rgba(var(--accent-danger-rgb), 0.1), rgba(var(--accent-danger-rgb), 0.04));
  border: 1px solid rgba(var(--accent-danger-rgb), 0.2);
}

.result-header.draw {
  background: linear-gradient(135deg, rgba(var(--accent-warning-rgb), 0.1), rgba(var(--accent-warning-rgb), 0.04));
  border: 1px solid rgba(var(--accent-warning-rgb), 0.2);
}

.result-icon {
  font-size: calc(var(--text-xl) + 20px);
  margin-bottom: 8px;
}

.result-header.win .result-icon {
  color: var(--accent-success);
}
.result-header.lose .result-icon {
  color: var(--accent-danger);
}
.result-header.draw .result-icon {
  color: var(--accent-warning);
}

.result-title {
  margin: 0;
  font-size: calc(var(--text-xl) + 6px);
  font-weight: 800;
}

.result-header.win .result-title {
  color: var(--accent-success);
}
.result-header.lose .result-title {
  color: var(--accent-danger);
}
.result-header.draw .result-title {
  color: var(--accent-warning);
}

.result-subtitle {
  margin: 4px 0 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* ===== 分数对比 ===== */
.score-compare {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}

.compare-player,
.compare-npc {
  position: relative;
  text-align: center;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
  transition: all var(--transition-normal);
}

.compare-player.winner,
.compare-npc.winner {
  border-color: var(--accent-success);
  background: rgba(var(--accent-success-rgb), 0.06);
  box-shadow: 0 0 16px rgba(var(--accent-success-rgb), 0.1);
}

.compare-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  display: block;
  margin-bottom: 4px;
}

.compare-score {
  font-size: calc(var(--text-xl) + 12px);
  font-weight: 800;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.compare-vs {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-tertiary);
}

.crown {
  position: absolute;
  top: -8px;
  right: -4px;
  color: var(--accent-warning);
  font-size: var(--text-xl);
  animation: float 2s ease-in-out infinite;
}

/* ===== 结算区 ===== */
.settlement-section {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

.section-icon {
  font-size: var(--text-lg);
}

.settle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.settle-row:last-child {
  border-bottom: none;
}

.settle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.settle-label i {
  font-size: var(--text-base);
  color: var(--accent-primary);
}

.settle-value {
  font-size: var(--text-xl);
  font-weight: 700;
  font-family: var(--font-mono);
}

.settle-value.positive {
  color: var(--accent-success);
}
.settle-value.negative {
  color: var(--accent-danger);
}

.no-bet-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px;
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
}

/* ===== 操作按钮 ===== */
.result-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all var(--transition-normal);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-btn:active {
  transform: scale(0.97);
}

.again-btn {
  background: var(--gradient-primary);
  color: white;
}

.quit-btn {
  background: var(--glass-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
}

.quit-btn:hover {
  border-color: var(--accent-danger);
  color: var(--accent-danger);
}

@media (max-width: 480px) {
  .result-container {
    padding: 12px;
  }
  .compare-score {
    font-size: calc(var(--text-xl) + 6px);
  }
  .result-title {
    font-size: calc(var(--text-xl) + 2px);
  }
}
</style>
