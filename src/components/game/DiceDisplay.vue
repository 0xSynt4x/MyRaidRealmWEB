<template>
  <div class="dice-area">
    <div class="dice-grid">
      <button
        v-for="die in dice"
        :key="die.id"
        :class="[
          'die',
          {
            held: die.held,
            scoring: die.scoring && !die.held,
            selected: !die.held && die.scoring && !die.justRolled,
            'not-scoring': !die.scoring && !die.held,
            rolling: isAnimating,
          },
        ]"
        :disabled="!canSelect || die.held || !die.scoring"
        @click="$emit('toggle', die.id)"
      >
        <span class="die-face">{{ dieFaces[die.value] }}</span>
        <span v-if="die.held" class="die-badge held-badge">
          <i class="fa-solid fa-lock"></i>
        </span>
        <span v-else-if="!die.held && die.scoring && !die.justRolled" class="die-badge select-badge">
          <i class="fa-solid fa-check"></i>
        </span>
      </button>
    </div>

    <!-- 得分组合详情 -->
    <div v-if="comboDetailText" class="combo-detail">
      <span>{{ comboDetailText }}</span>
    </div>

    <!-- 操作提示 -->
    <div v-if="scoringHint" class="scoring-hint">
      <i class="fa-solid fa-hand-pointer"></i>
      <span>{{ scoringHint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { calculateSelectedScore, findScoringCombos } from '../../game/farkle/engine';
import type { Die, DieValue } from '../../game/farkle/types';
import { useI18n } from '../../i18n';

const props = defineProps<{
  dice: Die[];
  canSelect: boolean;
  isAnimating: boolean;
}>();

defineEmits<{
  toggle: [dieId: number];
}>();

const { t } = useI18n();

const dieFaces: Record<DieValue, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅',
};

/** 所有未保留骰子的得分组合 */
const allCombos = computed(() => {
  if (props.isAnimating) return [];
  const unheldValues = props.dice.filter(d => !d.held).map(d => d.value);
  return findScoringCombos(unheldValues);
});

/** 已选中骰子的得分组合 */
const selectedCombos = computed(() => {
  const selected = props.dice.filter(d => !d.held && d.scoring && !d.justRolled);
  if (selected.length === 0) return [];
  return findScoringCombos(selected.map(d => d.value));
});

/** 已选中骰子的总得分 */
const selectedTotalScore = computed(() => {
  const selected = props.dice.filter(d => !d.held && d.scoring && !d.justRolled);
  if (selected.length === 0) return 0;
  return calculateSelectedScore(selected.map(d => d.value));
});

const scoringHint = computed(() => {
  if (props.isAnimating) return '';
  const scoringCount = props.dice.filter(d => d.scoring && !d.held).length;
  const selectedCount = props.dice.filter(d => !d.held && d.scoring && !d.justRolled).length;
  if (scoringCount === 0) return '';
  if (selectedCount === 0) return t('dice.display.scoringDiceHint', { count: scoringCount });
  return t('dice.display.selectedDiceHint', { count: selectedCount });
});

/** 格式化组合列表为可读文本 */
const comboDetailText = computed(() => {
  if (props.isAnimating) return '';

  const selectedCount = props.dice.filter(d => !d.held && d.scoring && !d.justRolled).length;

  if (selectedCount > 0 && selectedCombos.value.length > 0) {
    const parts = selectedCombos.value.map(c => `${c.label}(${c.score})`);
    return t('dice.display.selectedCombo', { parts: parts.join(' + '), score: selectedTotalScore.value });
  }

  if (allCombos.value.length > 0) {
    const totalScore = allCombos.value.reduce((s, c) => s + c.score, 0);
    const parts = allCombos.value.map(c => `${c.label}(${c.score})`);
    return t('dice.display.availableCombo', { parts: parts.join(' + '), score: totalScore });
  }

  return '';
});
</script>

<style scoped>
.dice-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.dice-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.die {
  position: relative;
  width: 56px;
  height: 56px;
  border: 2px solid var(--border-light);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

.die:hover:not(:disabled):not(.held) {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.die:active:not(:disabled):not(.held) {
  transform: scale(0.95);
}

.die:disabled {
  cursor: default;
}

/* 得分骰子 - 可选 */
.die.scoring {
  border-color: rgba(var(--accent-success-rgb), 0.5);
  background: rgba(var(--accent-success-rgb), 0.06);
  animation: pulse-score 1.5s ease-in-out infinite;
}

/* 已选中 */
.die.selected {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
  box-shadow: 0 0 12px rgba(var(--accent-primary-rgb), 0.2);
  animation: none;
}

/* 已保留 */
.die.held {
  border-color: var(--text-tertiary);
  background: rgba(0, 0, 0, 0.04);
  opacity: 0.6;
}

/* 不得分 */
.die.not-scoring {
  opacity: 0.4;
}

/* 掷骰动画 */
.die.rolling {
  animation: diceRoll 600ms ease-out;
}

.die-face {
  font-size: calc(var(--text-xl) + 12px);
  line-height: 1;
  user-select: none;
}

.die-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--text-xs) - 3px);
}

.held-badge {
  background: var(--text-tertiary);
  color: white;
}

.select-badge {
  background: var(--accent-primary);
  color: white;
}

.combo-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  padding: 5px 12px;
  background: rgba(var(--accent-warning-rgb), 0.06);
  border: 1px solid rgba(var(--accent-warning-rgb), 0.15);
  border-radius: var(--radius-sm);
  color: var(--accent-warning);
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  word-break: break-all;
}

.scoring-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  padding: 4px 10px;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
}

.scoring-hint i {
  font-size: calc(var(--text-xs) - 1px);
  color: var(--accent-primary);
}

@keyframes pulse-score {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(var(--accent-success-rgb), 0);
  }
  50% {
    box-shadow: 0 0 8px 2px rgba(var(--accent-success-rgb), 0.15);
  }
}

@keyframes diceRoll {
  0% {
    transform: rotateX(0) rotateY(0) scale(0.8);
    opacity: 0.5;
  }
  25% {
    transform: rotateX(90deg) rotateY(45deg) scale(1.1);
  }
  50% {
    transform: rotateX(180deg) rotateY(90deg) scale(0.9);
  }
  75% {
    transform: rotateX(270deg) rotateY(135deg) scale(1.05);
  }
  100% {
    transform: rotateX(360deg) rotateY(180deg) scale(1);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .die {
    width: 46px;
    height: 46px;
  }
  .die-face {
    font-size: calc(var(--text-xl) + 8px);
  }
}
</style>
