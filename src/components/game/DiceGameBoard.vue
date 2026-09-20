<template>
  <div class="game-board">
    <!-- 分数面板 -->
    <div class="score-panel">
      <div class="score-card player-score" :class="{ active: !isNpcTurn }">
        <span class="score-label">{{ t('dice.board.you') }}</span>
        <span class="score-value">{{ player.totalScore }}</span>
        <div v-if="!isNpcTurn" class="turn-indicator">
          <i class="ti ti-caret-down"></i>
        </div>
      </div>

      <div class="score-center">
        <div class="target-info">
          <span class="target-label">{{ t('dice.board.target') }}</span>
          <span class="target-value">{{ GAME_CONSTANTS.TARGET_SCORE }}</span>
        </div>
        <div class="round-info">
          <span>{{ t('dice.board.round', { turn: turnNumber }) }}</span>
        </div>
        <div v-if="isLastRound" class="last-round-badge">
          <i class="ti ti-alert-triangle"></i>
          <span>{{ t('dice.board.lastRound') }}</span>
        </div>
        <!-- 帮助按钮 -->
        <button
          class="help-btn-inline"
          :title="t('dice.board.viewScoringTable')"
          @click="showScoringRef = !showScoringRef"
        >
          <i class="ti ti-help-circle"></i>
        </button>
      </div>

      <div class="score-card npc-score" :class="{ active: isNpcTurn }">
        <span class="score-label">{{ npc.name }}</span>
        <span class="score-value">{{ npc.totalScore }}</span>
        <div v-if="isNpcTurn" class="turn-indicator">
          <i class="ti ti-caret-down"></i>
        </div>
      </div>
    </div>

    <!-- 内联计分表浮层 -->
    <Transition name="slide-fade">
      <div v-if="showScoringRef" class="inline-scoring-panel">
        <div class="inline-scoring-header">
          <i class="ti ti-star"></i>
          <span>{{ t('dice.scoringTable.title') }}</span>
          <button class="inline-close" @click="showScoringRef = false">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <ScoringTable />
      </div>
    </Transition>

    <!-- 回合分数 -->
    <div class="turn-score-bar">
      <span class="turn-label">{{ t('dice.board.turnScore') }}</span>
      <span class="turn-value" :class="{ farkled: isFarkled }">{{ turnScore }}</span>
    </div>

    <!-- 上下文提示栏 -->
    <div v-if="contextHint" class="context-hint" :class="contextHintClass">
      <span>{{ contextHint }}</span>
    </div>

    <!-- 骰子区域 -->
    <div class="dice-section">
      <DiceDisplay :dice="dice" :can-select="canSelectDice" :is-animating="isAnimating" @toggle="handleToggle" />
    </div>

    <!-- NPC 状态提示 -->
    <div v-if="isNpcTurn && npcActionText" class="npc-status-bar">
      <div class="npc-thinking">
        <i class="ti ti-brain"></i>
        <span>{{ npcActionText }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <template v-if="!isNpcTurn">
        <!-- Farkle 状态 -->
        <template v-if="isFarkled">
          <button class="action-btn farkle-btn" @click="store.endFarkledTurn()">
            <i class="ti ti-player-skip-forward"></i>
            <span>{{ t('dice.board.farkleEndTurn') }}</span>
          </button>
        </template>

        <!-- 可掷骰 -->
        <template v-else-if="canRoll">
          <button class="action-btn roll-btn" @click="store.playerRoll()">
            <i class="ti ti-dice"></i>
            <span>{{ t('dice.board.roll') }}</span>
          </button>
        </template>

        <!-- 选择中 -->
        <template v-else-if="canSelectDice">
          <button class="action-btn continue-btn" :disabled="!hasNewSelection" @click="store.playerContinue()">
            <i class="ti ti-player-skip-forward"></i>
            <span>{{ t('dice.board.rollAgain') }}</span>
          </button>
          <button class="action-btn bank-btn" @click="store.playerBank()">
            <i class="ti ti-pig"></i>
            <span>{{ t('dice.board.bank') }}</span>
          </button>
        </template>
      </template>

      <!-- NPC 回合 -->
      <template v-else>
        <div class="npc-turn-hint">
          <i class="ti ti-hourglass ti-spin"></i>
          <span>{{ t('dice.board.npcTurn') }}</span>
        </div>
      </template>
    </div>

    <!-- 游戏日志 -->
    <div class="game-log">
      <div class="log-header">
        <i class="ti ti-certificate"></i>
        <span>{{ t('dice.board.battleLog') }}</span>
      </div>
      <div ref="logListRef" class="log-list">
        <div
          v-for="(entry, index) in recentLogs"
          :key="index"
          :class="['log-entry', entry.player === 'human' ? 'log-player' : 'log-npc']"
        >
          <span class="log-turn">R{{ entry.turn }}</span>
          <span class="log-action">{{ entry.action }}</span>
          <span v-if="entry.totalAfter !== undefined" class="log-total">({{ entry.totalAfter }})</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { GAME_CONSTANTS, TurnPhase } from '../../game/farkle/types';
import { useI18n } from '../../i18n';
import { useDiceGameStore } from '../../stores/diceGame';
import DiceDisplay from './DiceDisplay.vue';
import ScoringTable from './ScoringTable.vue';

const store = useDiceGameStore();
const { t } = useI18n();

const showScoringRef = ref(false);

const player = computed(() => store.player);
const npc = computed(() => store.npc);
const dice = computed(() => store.dice);
const turnScore = computed(() => store.turnScore);
const turnNumber = computed(() => store.turnNumber);
const isLastRound = computed(() => store.isLastRound);
const isNpcTurn = computed(() => store.isNpcTurn);
const npcActionText = computed(() => store.npcActionText);
const contextHint = computed(() => store.contextHint);

const isFarkled = computed(() => store.turnPhase === TurnPhase.Farkled);
const isAnimating = computed(() => store.turnPhase === TurnPhase.Animating);
const canRoll = computed(() => store.turnPhase === TurnPhase.Rolling);
const canSelectDice = computed(() => store.turnPhase === TurnPhase.Selecting && !isNpcTurn.value);

const hasNewSelection = computed(() => {
  return store.dice.some(d => !d.held && d.scoring && !d.justRolled);
});

const contextHintClass = computed(() => {
  if (isFarkled.value) return 'hint-danger';
  if (isNpcTurn.value) return 'hint-neutral';
  if (canSelectDice.value) return 'hint-action';
  return 'hint-info';
});

const recentLogs = computed(() => {
  return store.gameLog.slice(-8);
});

const logListRef = ref<HTMLDivElement>();

watch(
  () => store.gameLog.length,
  async () => {
    await nextTick();
    if (logListRef.value) {
      logListRef.value.scrollTop = logListRef.value.scrollHeight;
    }
  },
);

function handleToggle(dieId: number) {
  store.toggleDieHold(dieId);
}
</script>

<style scoped>
.game-board {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  height: 100%;
  overflow-y: auto;
}

/* ===== 上下文提示栏 ===== */
.context-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  line-height: 1.4;
  text-align: center;
  transition: all var(--transition-normal);
}

.context-hint.hint-info {
  background: rgba(var(--accent-primary-rgb), 0.06);
  color: var(--accent-primary);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
}

.context-hint.hint-action {
  background: rgba(var(--accent-success-rgb), 0.06);
  color: var(--accent-success);
  border: 1px solid rgba(var(--accent-success-rgb), 0.12);
}

.context-hint.hint-danger {
  background: rgba(var(--accent-danger-rgb), 0.1);
  color: var(--accent-danger);
  border: 1px solid rgba(var(--accent-danger-rgb), 0.15);
  font-weight: 600;
}

.context-hint.hint-neutral {
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

/* ===== 帮助按钮 ===== */
.help-btn-inline {
  margin-top: 2px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--accent-primary);
  font-size: var(--text-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.help-btn-inline:hover {
  background: rgba(var(--accent-primary-rgb), 0.18);
  transform: scale(1.1);
}

/* ===== 内联计分表 ===== */
.inline-scoring-panel {
  background: var(--bg-card-solid);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  box-shadow: var(--shadow-md);
}

.inline-scoring-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--accent-warning);
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-light);
}

.inline-scoring-header .inline-close {
  margin-left: auto;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-tertiary);
  font-size: calc(var(--text-xs) - 2px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.inline-scoring-header .inline-close:hover {
  background: var(--accent-danger);
  color: white;
}

.slide-fade-enter-active {
  transition: all 250ms ease;
}

.slide-fade-leave-active {
  transition: all 150ms ease;
}

.slide-fade-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-8px);
}

.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ===== 分数面板 ===== */
.score-panel {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: stretch;
}

.score-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  transition: all var(--transition-normal);
}

.score-card.active {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.06);
  box-shadow: 0 0 12px rgba(var(--accent-primary-rgb), 0.1);
}

.score-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 500;
}

.score-value {
  font-size: calc(var(--text-xl) + 6px);
  font-weight: 800;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.turn-indicator {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--accent-primary);
  font-size: var(--text-sm);
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }
  50% {
    transform: translateX(-50%) translateY(3px);
  }
}

.score-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
}

.target-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.target-label {
  font-size: calc(var(--text-xs) - 2px);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.target-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--accent-warning);
  font-family: var(--font-mono);
}

.round-info {
  font-size: calc(var(--text-xs) - 1px);
  color: var(--text-secondary);
}

.last-round-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(var(--accent-danger-rgb), 0.1);
  color: var(--accent-danger);
  font-size: calc(var(--text-xs) - 2px);
  font-weight: 600;
  animation: pulse-glow 2s infinite;
}

/* ===== 回合分数 ===== */
.turn-score-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--gradient-subtle);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
}

.turn-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.turn-value {
  font-size: calc(var(--text-xl) + 2px);
  font-weight: 800;
  color: var(--accent-success);
  font-family: var(--font-mono);
  transition: color var(--transition-fast);
}

.turn-value.farkled {
  color: var(--accent-danger);
  text-decoration: line-through;
}

/* ===== 骰子区域 ===== */
.dice-section {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}

/* ===== NPC 状态 ===== */
.npc-status-bar {
  padding: 6px 10px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
}

.npc-thinking {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  color: var(--accent-primary);
}

.npc-thinking i {
  font-size: var(--text-lg);
}

/* ===== 操作按钮 ===== */
.action-bar {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.action-btn {
  flex: 1;
  max-width: 180px;
  padding: 10px 16px;
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
  position: relative;
  overflow: hidden;
}

.action-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.action-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.roll-btn {
  background: var(--gradient-primary);
  color: white;
}

.continue-btn {
  background: rgba(var(--accent-success-rgb), 0.12);
  color: var(--accent-success);
  border: 1px solid rgba(var(--accent-success-rgb), 0.2);
}

.bank-btn {
  background: var(--gradient-warning);
  color: white;
}

.farkle-btn {
  background: var(--gradient-danger);
  color: white;
  max-width: 240px;
}

.npc-turn-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-base);
  color: var(--text-secondary);
  padding: 10px 20px;
  background: var(--bg-primary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

/* ===== 游戏日志 ===== */
.game-log {
  margin-top: auto;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-light);
}

.log-header i {
  font-size: var(--text-sm);
  color: var(--accent-primary);
}

.log-list {
  max-height: 100px;
  overflow-y: auto;
  padding: 4px 8px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.log-player .log-turn {
  color: var(--accent-primary);
}

.log-entry.log-npc .log-turn {
  color: var(--accent-danger);
}

.log-turn {
  font-size: calc(var(--text-xs) - 1px);
  font-weight: 700;
  font-family: var(--font-mono);
  min-width: 24px;
}

.log-action {
  flex: 1;
}

.log-total {
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--text-primary);
  font-size: calc(var(--text-xs) - 1px);
}

/* 滚动条 */
.log-list::-webkit-scrollbar {
  width: 3px;
}
.log-list::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.15);
  border-radius: 2px;
}
.game-board::-webkit-scrollbar {
  width: 4px;
}
.game-board::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.2);
  border-radius: 2px;
}

@media (max-width: 480px) {
  .game-board {
    padding: 8px;
    gap: 8px;
  }
  .score-value {
    font-size: calc(var(--text-xl) + 2px);
  }
  .action-btn {
    font-size: var(--text-sm);
    padding: 8px 12px;
  }
}
</style>
