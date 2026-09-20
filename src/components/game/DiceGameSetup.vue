<template>
  <div class="setup-container">
    <!-- 标题区 -->
    <div class="setup-header">
      <div class="header-icon">
        <i class="ti ti-dice"></i>
      </div>
      <h2 class="header-title">{{ t('dice.setup.title') }}</h2>
      <p class="header-subtitle">FARKLE</p>
    </div>

    <!-- 第一步: 选择对手 -->
    <div class="setup-section">
      <div class="section-title">
        <i class="ti ti-users section-icon"></i>
        <span>{{ t('dice.setup.selectOpponent') }}</span>
      </div>

      <div v-if="availableNpcs.length === 0" class="empty-state">
        <i class="ti ti-user-off"></i>
        <p>{{ t('dice.setup.noOpponent') }}</p>
      </div>

      <div v-else class="npc-list">
        <button
          v-for="npcItem in availableNpcs"
          :key="npcItem.id"
          :class="['npc-card', { selected: selectedNpc?.id === npcItem.id, disabled: !canGamble(npcItem).canGamble }]"
          @click="handleSelectNpc(npcItem)"
        >
          <div class="npc-avatar">
            <span>{{ npcItem.name.charAt(0) }}</span>
          </div>
          <div class="npc-info">
            <span class="npc-name">{{ npcItem.name }}</span>
            <div class="npc-stats">
              <span class="stat favor" :class="favorClass(npcItem.favor)">
                <i class="ti ti-heart"></i> {{ npcItem.favor }}
              </span>
              <span class="stat trust" :class="trustClass(npcItem.trust)">
                <i class="ti ti-heart-handshake"></i> {{ npcItem.trust }}
              </span>
            </div>
          </div>
          <div class="npc-status">
            <span v-if="!canGamble(npcItem).canGamble" class="status-badge rejected">
              <i class="ti ti-ban"></i>
            </span>
            <span v-else-if="selectedNpc?.id === npcItem.id" class="status-badge checked">
              <i class="ti ti-check"></i>
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- 第二步: 骰子情报 -->
    <Transition name="slide-fade">
      <div v-if="selectedNpc && diceAssignment" class="setup-section dice-intel">
        <div class="section-title">
          <i class="ti ti-search section-icon"></i>
          <span>{{ t('dice.setup.diceIntel') }}</span>
          <span class="intel-badge" :class="intelLevel">{{ intelLevelText }}</span>
        </div>

        <div class="dice-intel-grid">
          <div class="dice-party">
            <span class="party-label">{{ t('dice.setup.yourDice') }}</span>
            <div class="dice-type-display" :style="{ '--dice-color': playerDiceInfo.color }">
              <span class="dice-emoji">{{ playerDiceInfo.emoji }}</span>
              <span class="dice-name">{{ playerDiceInfo.name }}</span>
            </div>
            <p class="dice-desc">{{ playerDiceInfo.description }}</p>
          </div>

          <div class="vs-divider">
            <span>VS</span>
          </div>

          <div class="dice-party">
            <span class="party-label">{{ t('dice.setup.npcDice', { name: selectedNpc.name }) }}</span>
            <div class="dice-type-display" :style="{ '--dice-color': npcDiceInfo.color }">
              <span class="dice-emoji">{{ npcDiceInfo.emoji }}</span>
              <span class="dice-name">{{ npcDiceInfo.name }}</span>
            </div>
            <p class="dice-desc">{{ npcDiceInfo.description }}</p>
          </div>
        </div>

        <div class="trust-hint">
          <i class="ti ti-info-circle"></i>
          <span>{{ t('dice.setup.trustHint', { trust: selectedNpc.trust, description: trustDescription }) }}</span>
        </div>
      </div>
    </Transition>

    <!-- 第三步: 设置赌注 -->
    <Transition name="slide-fade">
      <div v-if="selectedNpc" class="setup-section">
        <div class="section-title">
          <i class="ti ti-coins section-icon"></i>
          <span>{{ t('dice.setup.placeBets') }}</span>
        </div>

        <!-- 货币赌注 -->
        <div class="bet-row">
          <div class="bet-label">
            <i class="ti ti-coins"></i>
            <span>{{ playerCurrency.name }}</span>
          </div>
          <div class="bet-control">
            <button class="adj-btn" :disabled="bets.currency === 0" @click="adjustBet('currency', -10)">
              <i class="ti ti-minus"></i>
            </button>
            <input
              v-model.number="bets.currency"
              type="number"
              :min="0"
              :max="betLimits.currency.max"
              class="bet-input"
            />
            <button
              class="adj-btn"
              :disabled="bets.currency >= betLimits.currency.max"
              @click="adjustBet('currency', 10)"
            >
              <i class="ti ti-plus"></i>
            </button>
          </div>
          <span class="bet-range">0 ~ {{ betLimits.currency.max }}</span>
        </div>

        <!-- 好感度赌注 -->
        <div class="bet-row">
          <div class="bet-label">
            <i class="ti ti-heart"></i>
            <span>{{ t('dice.setup.favor') }}</span>
          </div>
          <div class="bet-control">
            <button class="adj-btn" :disabled="bets.favor === 0" @click="adjustBet('favor', -1)">
              <i class="ti ti-minus"></i>
            </button>
            <input v-model.number="bets.favor" type="number" :min="0" :max="betLimits.favor.max" class="bet-input" />
            <button class="adj-btn" :disabled="bets.favor >= betLimits.favor.max" @click="adjustBet('favor', 1)">
              <i class="ti ti-plus"></i>
            </button>
          </div>
          <span class="bet-range">0 ~ {{ betLimits.favor.max }}</span>
        </div>

        <!-- 信任度赌注 -->
        <div class="bet-row">
          <div class="bet-label">
            <i class="ti ti-heart-handshake"></i>
            <span>{{ t('dice.setup.trust') }}</span>
          </div>
          <div class="bet-control">
            <button class="adj-btn" :disabled="bets.trust === 0" @click="adjustBet('trust', -1)">
              <i class="ti ti-minus"></i>
            </button>
            <input v-model.number="bets.trust" type="number" :min="0" :max="betLimits.trust.max" class="bet-input" />
            <button class="adj-btn" :disabled="bets.trust >= betLimits.trust.max" @click="adjustBet('trust', 1)">
              <i class="ti ti-plus"></i>
            </button>
          </div>
          <span class="bet-range">0 ~ {{ betLimits.trust.max }}</span>
        </div>

        <div v-if="hasBets" class="bet-summary">
          <i class="ti ti-scale"></i>
          <span
            >{{ t('dice.setup.betSummary') }}
            <template v-if="bets.currency > 0"> {{ bets.currency }} {{ playerCurrency.name }}</template>
            <template v-if="bets.favor > 0"> {{ t('dice.setup.betFavor', { amount: bets.favor }) }}</template>
            <template v-if="bets.trust > 0"> {{ t('dice.setup.betTrust', { amount: bets.trust }) }}</template>
          </span>
        </div>
      </div>
    </Transition>

    <!-- 开始按钮 -->
    <Transition name="slide-fade">
      <div v-if="selectedNpc" class="setup-actions">
        <button class="start-btn" :disabled="!canStart" @click="handleStart">
          <i class="ti ti-player-play"></i>
          <span>{{ t('dice.setup.startGame') }}</span>
        </button>
      </div>
    </Transition>

    <!-- 游戏规则说明 -->
    <div class="setup-section rules-section">
      <button class="section-title rules-toggle" @click="showRules = !showRules">
        <i class="ti ti-book section-icon"></i>
        <span>{{ t('dice.setup.rules') }}</span>
        <i :class="['toggle-icon ti', showRules ? 'ti-chevron-up' : 'ti-chevron-down']"></i>
      </button>

      <Transition name="collapse">
        <div v-if="showRules" class="rules-content">
          <div class="rules-summary">
            <div class="rule-item">
              <i class="ti ti-target rule-icon"></i>
              <div>
                <strong>{{ t('dice.setup.rule.targetTitle') }}</strong>
                <span>{{ t('dice.setup.rule.targetDesc', { score: GAME_CONSTANTS.TARGET_SCORE }) }}</span>
              </div>
            </div>
            <div class="rule-item">
              <i class="ti ti-dice rule-icon"></i>
              <div>
                <strong>{{ t('dice.setup.rule.rollTitle') }}</strong>
                <span>{{ t('dice.setup.rule.rollDesc') }}</span>
              </div>
            </div>
            <div class="rule-item">
              <i class="ti ti-arrows-split rule-icon"></i>
              <div>
                <strong>{{ t('dice.setup.rule.chooseTitle') }}</strong>
                <span>{{ t('dice.setup.rule.chooseDesc') }}</span>
              </div>
            </div>
            <div class="rule-item rule-danger">
              <i class="ti ti-skull rule-icon"></i>
              <div>
                <strong>{{ t('dice.setup.rule.farkleTitle') }}</strong>
                <span>{{ t('dice.setup.rule.farkleDesc') }}</span>
              </div>
            </div>
            <div class="rule-item rule-special">
              <i class="ti ti-flame rule-icon"></i>
              <div>
                <strong>{{ t('dice.setup.rule.hotDiceTitle') }}</strong>
                <span>{{ t('dice.setup.rule.hotDiceDesc') }}</span>
              </div>
            </div>
          </div>

          <div class="scoring-table-wrapper">
            <div class="scoring-table-title">
              <i class="ti ti-star"></i>
              <span>{{ t('dice.scoringTable.title') }}</span>
            </div>
            <ScoringTable />
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { BetType, DICE_TYPE_INFO, DiceType, GAME_CONSTANTS, type NpcConfig } from '../../game/farkle/types';
import { useI18n } from '../../i18n';
import { useDiceGameStore } from '../../stores/diceGame';
import { useNotificationStore } from '../../stores/notification';
import ScoringTable from './ScoringTable.vue';

const store = useDiceGameStore();
const notificationStore = useNotificationStore();
const { t } = useI18n();

const showRules = ref(false);

const availableNpcs = computed(() => store.availableNpcs);
const selectedNpc = computed(() => store.selectedNpc);
const diceAssignment = computed(() => store.diceAssignment);
const playerCurrency = computed(() => store.playerCurrency);

const bets = reactive({ currency: 0, favor: 0, trust: 0 });

const betLimits = computed(() => {
  if (!selectedNpc.value) return { currency: { min: 0, max: 0 }, favor: { min: 0, max: 0 }, trust: { min: 0, max: 0 } };
  return store.getBetLimits(selectedNpc.value);
});

// 监听赌注变化，自动 clamp 到合法范围（防止用户直接输入超限值）
watch(bets, () => {
  for (const key of ['currency', 'favor', 'trust'] as const) {
    const val = bets[key];
    const max = betLimits.value[key].max;
    // 处理 NaN（用户清空输入框）、负数、超限值
    bets[key] = Number.isFinite(val) ? Math.max(0, Math.min(max, Math.floor(val))) : 0;
  }
});

const hasBets = computed(() => bets.currency > 0 || bets.favor > 0 || bets.trust > 0);
const canStart = computed(() => !!selectedNpc.value);

const playerDiceInfo = computed(() => {
  if (!diceAssignment.value) return DICE_TYPE_INFO[DiceType.Normal];
  return DICE_TYPE_INFO[diceAssignment.value.playerDice];
});

const npcDiceInfo = computed(() => {
  if (!diceAssignment.value) return DICE_TYPE_INFO[DiceType.Normal];
  return DICE_TYPE_INFO[diceAssignment.value.npcDice];
});

const intelLevel = computed(() => {
  if (!selectedNpc.value) return '';
  const trust = selectedNpc.value.trust;
  if (trust >= 50) return 'level-high';
  if (trust >= 0) return 'level-mid';
  return 'level-low';
});

const intelLevelText = computed(() => {
  if (!selectedNpc.value) return '';
  const trust = selectedNpc.value.trust;
  if (trust >= 50) return t('dice.setup.trustLevel.friend');
  if (trust >= 0) return t('dice.setup.trustLevel.neutral');
  return t('dice.setup.trustLevel.wary');
});

const trustDescription = computed(() => {
  if (!selectedNpc.value || !diceAssignment.value) return '';
  const playerDiceName = DICE_TYPE_INFO[diceAssignment.value.playerDice].name;
  const npcDiceName = DICE_TYPE_INFO[diceAssignment.value.npcDice].name;
  return t('dice.setup.trustDescription', {
    playerDice: playerDiceName,
    npcName: selectedNpc.value.name,
    npcDice: npcDiceName,
  });
});

function canGamble(npcItem: NpcConfig) {
  return store.canNpcGamble(npcItem);
}

function favorClass(favor: number) {
  if (favor >= 50) return 'high';
  if (favor >= 0) return 'mid';
  return 'low';
}

function trustClass(trust: number) {
  if (trust >= 50) return 'high';
  if (trust >= 0) return 'mid';
  return 'low';
}

function handleSelectNpc(npcItem: NpcConfig) {
  const check = canGamble(npcItem);
  if (!check.canGamble) return;
  store.selectNpc(npcItem);
  bets.currency = 0;
  bets.favor = 0;
  bets.trust = 0;
}

function adjustBet(type: 'currency' | 'favor' | 'trust', delta: number) {
  const newVal = bets[type] + delta;
  const limits = betLimits.value[type];
  bets[type] = Math.max(0, Math.min(limits.max, newVal));
}

async function handleStart() {
  if (!canStart.value) return;

  const betItems = [];
  if (bets.currency > 0) betItems.push({ type: BetType.Currency as const, amount: bets.currency });
  if (bets.favor > 0) betItems.push({ type: BetType.Favor as const, amount: bets.favor });
  if (bets.trust > 0) betItems.push({ type: BetType.Trust as const, amount: bets.trust });

  store.setBets(betItems);

  // 0赌注 → 弹窗确认练习模式
  if (betItems.length === 0) {
    const confirmed = await notificationStore.confirm({
      title: t('dice.setup.practiceTitle'),
      message: t('dice.setup.practiceMessage'),
      type: 'info',
    });
    if (!confirmed) return;
  }

  store.startGame();
}
</script>

<style scoped>
.setup-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0px;
  overflow-y: auto;
  max-height: 100%;
}

/* ===== 规则区域 ===== */
.rules-toggle {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-bottom: 1px solid var(--border-light);
}

.toggle-icon {
  margin-left: auto;
  font-size: calc(var(--text-xs) - 1px);
  color: var(--text-tertiary);
  transition: transform var(--transition-normal);
}

.collapse-enter-active,
.collapse-leave-active {
  transition: all 300ms ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 600px;
}

.rules-content {
  padding-top: 8px;
}

.rules-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  font-size: var(--text-xs);
  line-height: 1.4;
}

.rule-item div {
  display: flex;
  flex-direction: column;
}

.rule-item strong {
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-primary);
}

.rule-item span {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.rule-icon {
  font-size: var(--text-sm);
  color: var(--accent-primary);
  margin-top: 2px;
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.rule-danger .rule-icon {
  color: var(--accent-danger);
}

.rule-special .rule-icon {
  color: var(--accent-warning);
}

.scoring-table-wrapper {
  padding: 8px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-light);
}

.scoring-table-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--accent-warning);
  margin-bottom: 6px;
}

.scoring-table-title i {
  font-size: calc(var(--text-xs) - 1px);
}

.slide-fade-enter-active {
  transition: all 350ms var(--ease-out-expo);
}
.slide-fade-leave-active {
  transition: all 200ms ease-in;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===== 标题 ===== */
.setup-header {
  text-align: center;
  padding: 0 0 4px;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--gradient-primary);
  color: white;
  font-size: calc(var(--text-xl) + 6px);
  margin-bottom: 8px;
  box-shadow: 0 8px 24px rgba(var(--accent-primary-rgb), 0.3);
}

.header-title {
  margin: 0;
  font-size: calc(var(--text-xl) + 2px);
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  letter-spacing: 6px;
  font-weight: 300;
}

/* ===== 区块 ===== */
.setup-section {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

.section-icon {
  font-size: var(--text-lg);
}

/* ===== NPC 列表 ===== */
.npc-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 2px 4px;
  margin: -2px -4px;
}

.npc-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-normal);
  width: 100%;
  text-align: left;
}

.npc-card:hover:not(.disabled) {
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  background: rgba(var(--accent-primary-rgb), 0.04);
  transform: translateX(2px);
}

.npc-card.selected {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.1);
}

.npc-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.npc-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--text-base);
  font-weight: 700;
  flex-shrink: 0;
}

.npc-info {
  flex: 1;
  min-width: 0;
}

.npc-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  display: block;
}

.npc-stats {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}

.stat {
  font-size: var(--text-xs);
  display: flex;
  align-items: center;
  gap: 3px;
}

.stat.favor.high {
  color: var(--accent-success);
}
.stat.favor.mid {
  color: var(--text-secondary);
}
.stat.favor.low {
  color: var(--accent-danger);
}
.stat.trust.high {
  color: var(--accent-primary);
}
.stat.trust.mid {
  color: var(--text-secondary);
}
.stat.trust.low {
  color: var(--accent-warning);
}

.stat i {
  font-size: calc(var(--text-xs) - 1px);
}

.npc-status {
  flex-shrink: 0;
}

.status-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
}

.status-badge.checked {
  background: var(--accent-success);
  color: white;
}
.status-badge.rejected {
  background: var(--accent-danger);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
}
.empty-state i {
  font-size: calc(var(--text-xl) + 12px);
  margin-bottom: 8px;
  display: block;
}

/* ===== 骰子情报 ===== */
.intel-badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: calc(var(--text-xs) - 1px);
  font-weight: 600;
}

.intel-badge.level-high {
  background: rgba(var(--accent-success-rgb), 0.15);
  color: var(--accent-success);
}
.intel-badge.level-mid {
  background: rgba(var(--accent-primary-rgb), 0.15);
  color: var(--accent-primary);
}
.intel-badge.level-low {
  background: rgba(var(--accent-danger-rgb), 0.15);
  color: var(--accent-danger);
}

.dice-intel-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
}

.dice-party {
  text-align: center;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
}

.party-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  display: block;
  margin-bottom: 6px;
}

.dice-type-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--dice-color, var(--border-light));
  background: rgba(0, 0, 0, 0.02);
}

.dice-emoji {
  font-size: calc(var(--text-xl) + 4px);
}
.dice-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dice-color, var(--text-primary));
}
.dice-desc {
  font-size: calc(var(--text-xs) - 1px);
  color: var(--text-tertiary);
  margin: 4px 0 0;
  line-height: 1.3;
}

.vs-divider {
  display: flex;
  align-items: center;
  justify-content: center;
}
.vs-divider span {
  font-size: var(--text-lg);
  font-weight: 800;
  color: var(--text-tertiary);
  letter-spacing: 1px;
}

.trust-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  background: var(--gradient-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.trust-hint i {
  color: var(--accent-primary);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

/* ===== 赌注 ===== */
.bet-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-light);
}

.bet-row:last-of-type {
  border-bottom: none;
}

.bet-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 80px;
}

.bet-label i {
  font-size: var(--text-base);
  color: var(--accent-primary);
}

.bet-control {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.adj-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--text-xs) - 1px);
  transition: all var(--transition-fast);
}

.adj-btn:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}
.adj-btn:disabled {
  opacity: 0.3;
}

.bet-input {
  width: 60px;
  text-align: center;
  padding: 4px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
  appearance: textfield;
  -moz-appearance: textfield;
}

.bet-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}
.bet-input::-webkit-inner-spin-button,
.bet-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.bet-range {
  font-size: calc(var(--text-xs) - 1px);
  color: var(--text-tertiary);
  white-space: nowrap;
}

.bet-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 10px;
  background: rgba(var(--accent-success-rgb), 0.06);
  border: 1px solid rgba(var(--accent-success-rgb), 0.15);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--accent-success);
}

.bet-summary i {
  font-size: var(--text-lg);
}

/* ===== 开始按钮 ===== */
.setup-actions {
  padding: 4px 0;
}

.start-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-primary);
  color: white;
  font-size: var(--text-lg);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.start-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 50%);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.start-btn:hover:not(:disabled)::after {
  opacity: 1;
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(var(--accent-primary-rgb), 0.3);
}

.start-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.start-btn i {
  font-size: var(--text-xl);
}

/* ===== 滚动条 ===== */
.setup-container::-webkit-scrollbar {
  width: 4px;
}
.setup-container::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.2);
  border-radius: 2px;
}
.npc-list::-webkit-scrollbar {
  width: 3px;
}
.npc-list::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.15);
  border-radius: 2px;
}

/* ===== 移动端 ===== */
@media (max-width: 480px) {
  .setup-container {
    padding: 12px;
    gap: 10px;
  }
  .dice-intel-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .vs-divider {
    padding: 4px 0;
  }
  .bet-row {
    flex-wrap: wrap;
  }
  .bet-range {
    width: 100%;
    text-align: right;
  }
}
</style>
