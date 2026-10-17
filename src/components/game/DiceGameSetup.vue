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

    <!-- 目标与道具 -->
    <div class="setup-section">
      <div class="section-title">
        <i class="ti ti-target-arrow section-icon"></i>
        <span>{{ t('dice.setup.tierTitle') }}</span>
        <span class="coin-badge">
          <i class="ti ti-coin"></i>
          {{ coins }}
        </span>
      </div>

      <div class="tier-list">
        <button
          v-for="tierOption in tierOptions"
          :key="tierOption.score"
          :class="['tier-card', { selected: targetTier === tierOption.score }]"
          @click="store.setTargetTier(tierOption.score)"
        >
          <span class="tier-score">{{ tierOption.score.toLocaleString() }}</span>
          <span class="tier-bet">{{ t('dice.setup.tierBetRatio', { ratio: tierOption.ratioText }) }}</span>
        </button>
      </div>

      <div class="item-shop-toggle">
        <button class="shop-btn" @click="showShop = !showShop">
          <i class="ti ti-backpack"></i>
          <span>{{ t('dice.setup.itemShop') }}</span>
          <span v-if="stockBadge" class="shop-badge">{{ stockBadge }}</span>
          <i :class="['toggle-icon ti', showShop ? 'ti-chevron-up' : 'ti-chevron-down']"></i>
        </button>
      </div>

      <Transition name="collapse">
        <div v-if="showShop" class="item-shop">
          <p class="shop-hint">
            <i class="ti ti-info-circle"></i>
            <span>{{ t('dice.setup.shopHint', { per: coinPerScore }) }}</span>
          </p>

          <!-- 永久 / 临时 分类切换 -->
          <div class="shop-tabs">
            <button :class="['shop-tab', { active: shopTab === 'permanent' }]" @click="shopTab = 'permanent'">
              <i class="ti ti-diamond"></i>
              <span>{{ t('dice.setup.itemPermanent') }}</span>
            </button>
            <button :class="['shop-tab', { active: shopTab === 'consumable' }]" @click="shopTab = 'consumable'">
              <i class="ti ti-potion"></i>
              <span>{{ t('dice.setup.itemConsumable') }}</span>
            </button>
          </div>

          <!-- 道具卡网格 -->
          <div class="shop-grid">
            <div
              v-for="item in visibleItems"
              :key="item.id"
              :class="['item-card', `rarity-${itemRarity(item)}`, { owned: itemStock(item.id) > 0 }]"
              :style="itemDiceColor(item)"
            >
              <div class="item-card-icon" :class="itemIconClass(item)">
                <i class="ti ti-dice"></i>
                <span v-if="itemStock(item.id) > 0" class="item-owned-flag">
                  <i class="ti ti-check"></i>
                </span>
              </div>
              <span class="item-card-name">{{ item.name }}</span>
              <span v-if="itemStock(item.id) > 0" class="item-card-stock"> ×{{ itemStock(item.id) }} </span>
              <p class="item-card-desc">{{ t(`dice.itemDesc${descKeyOf(item)}`) }}</p>
              <div class="item-card-foot">
                <span class="item-card-price">
                  <i class="ti ti-coin"></i>
                  {{ item.price }}
                </span>
                <button class="buy-btn" :disabled="coins < item.price" @click="handleBuy(item.id)">
                  {{ t('dice.setup.buy') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
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
            <div class="dice-slots">
              <button
                v-for="(die, index) in playerDiceSlots"
                :key="index"
                :class="['dice-slot', { 'is-lucky': die.type === DiceType.Lucky, 'is-blessed': die.type === DiceType.Blessed }]"
                :style="diceSlotColor(die.type)"
                @click="openSwapPanel(index)"
              >
                <i class="ti ti-dice"></i>
                <span class="slot-name">{{ die.info.name }}</span>
              </button>
            </div>
            <p class="dice-desc">{{ playerDiceSummary }}</p>
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

        <!-- 开局前手动替换骰子 -->
        <Transition name="slide-fade">
          <div v-if="swapIndex !== -1" class="dice-swap-panel">
            <div class="swap-header">
              <i class="ti ti-swap"></i>
              <span>{{ t('dice.setup.swapTitle', { index: swapIndex + 1 }) }}</span>
              <button class="swap-close" @click="swapIndex = -1">
                <i class="ti ti-x"></i>
              </button>
            </div>
            <div class="swap-options">
              <button
                v-for="opt in swapOptions"
                :key="opt.type"
                :class="['swap-option', { 'is-lucky': opt.type === DiceType.Lucky, 'is-blessed': opt.type === DiceType.Blessed }]"
                :style="diceSlotColor(opt.type)"
                :disabled="opt.disabled"
                @click="applySwap(opt.type)"
              >
                <i class="ti ti-dice"></i>
                <span class="swap-option-name">{{ opt.name }}</span>
                <span class="swap-option-desc">{{ opt.description }}</span>
                <span v-if="opt.stock > 0" class="swap-option-stock">{{
                  t('dice.setup.itemStock', { count: opt.stock })
                }}</span>
              </button>
            </div>
            <p v-if="swapHint" class="swap-hint">{{ swapHint }}</p>
          </div>
        </Transition>

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

        <!-- 押注内容：由上方选择自动决定，只读展示 -->
        <div class="bet-summary bet-fixed">
          <div class="bet-fixed-row">
            <span class="bet-fixed-label">
              <i class="ti ti-coins"></i>
              {{ playerCurrency.name }}
            </span>
            <span class="bet-fixed-value">{{ autoBets.currency }}</span>
          </div>
          <div class="bet-fixed-row">
            <span class="bet-fixed-label">
              <i class="ti ti-heart"></i>
              {{ t('dice.setup.favor') }}
            </span>
            <span class="bet-fixed-value">{{ t('dice.setup.betFavor', { amount: autoBets.favor }) }}</span>
          </div>
          <div class="bet-fixed-row">
            <span class="bet-fixed-label">
              <i class="ti ti-heart-handshake"></i>
              {{ t('dice.setup.trust') }}
            </span>
            <span class="bet-fixed-value">{{ t('dice.setup.betTrust', { amount: autoBets.trust }) }}</span>
          </div>
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
                <span>{{ t('dice.setup.rule.targetDesc', { score: targetScore }) }}</span>
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
import { computed, ref } from 'vue';
import {
  BetType,
  DICE_TYPE_INFO,
  DiceType,
  FARKLE_COIN_PER_SCORE,
  FarkleItemKind,
  TARGET_TIERS,
  TIER_BET_RATIOS,
  type NpcConfig,
} from '../../game/farkle/types';
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
const coins = computed(() => store.coins);
const targetTier = computed(() => store.targetTier);
const targetScore = computed(() => store.targetScore);
const itemCatalog = computed(() => store.itemCatalog);
const coinPerScore = FARKLE_COIN_PER_SCORE;

const showShop = ref(false);
const shopTab = ref<'permanent' | 'consumable'>('permanent');

// 当前分类下可见的道具卡
const visibleItems = computed(() =>
  itemCatalog.value.filter(item =>
    shopTab.value === 'permanent' ? item.kind === FarkleItemKind.Permanent : item.kind === FarkleItemKind.Consumable,
  ),
);

// 道具档次：只看种类，不看价格 ——
// 临时道具 = 普通（绿），永久道具 = 精良（金）
function itemRarity(item: { kind: FarkleItemKind }) {
  return item.kind === FarkleItemKind.Consumable ? 'common' : 'rare';
}

// 永久骰子道具：商店里用什么颜色，进游戏丢的就是什么颜色的骰子。
// 直接取骰子类型自己的颜色（幸运绿 / 祝福蓝），写进 --dice-color 供整卡描边与图标使用。
function itemDiceColor(item: { kind: FarkleItemKind; diceType?: DiceType }): Record<string, string> {
  if (item.kind !== FarkleItemKind.Permanent || !item.diceType) return {};
  const info = DICE_TYPE_INFO[item.diceType];
  return {
    '--dice-color': info.color,
    '--dice-color-soft': `${info.color}59`,
    '--dice-color-glow': `${info.color}26`,
  };
}

function itemIconClass(item: { diceType?: DiceType }) {
  if (item.diceType === DiceType.Lucky) return 'icon-lucky';
  if (item.diceType === DiceType.Blessed) return 'icon-blessed';
  return '';
}

// 骰子槽位配色：与商店同一套颜色（幸运绿 / 祝福蓝），普通骰子走默认灰
function diceSlotColor(type: DiceType): Record<string, string> {
  const info = DICE_TYPE_INFO[type];
  if (info.color === DICE_TYPE_INFO[DiceType.Normal].color) return {};
  return {
    '--dice-color': info.color,
    '--dice-color-soft': `${info.color}59`,
  };
}

// 首字母大写拼出 i18n key 后缀（luckyDice → LuckyDice）
function descKeyOf(item: { descKey: string }) {
  return item.descKey.charAt(0).toUpperCase() + item.descKey.slice(1);
}

// 档位选项：分数 + 押注上限比例（1/N 形式展示）
const tierOptions = computed(() =>
  TARGET_TIERS.map(score => {
    const ratio = TIER_BET_RATIOS[score];
    return { score, ratioText: `1/${Math.round(1 / ratio)}` };
  }),
);

// 已持有永久道具时在商店按钮上显示数量角标
const stockBadge = computed(() => store.permanentItems.length);

function itemStock(itemId: string) {
  return store.itemStock(itemId);
}

function handleBuy(itemId: string) {
  const ok = store.buyItem(itemId);
  if (!ok) {
    notificationStore.warning(t('dice.setup.buyFail'));
  }
}

// 押注内容由「目标档位 + 选中的 NPC」自动决定，不可手动输入：
// 货币 = 余额 × 该档押注上限比例（并 clamp 到 NPC 关系上限），好感固定 5、信任固定 3。
const betLimits = computed(() => {
  if (!selectedNpc.value) return { currency: { min: 0, max: 0 }, favor: { min: 0, max: 0 }, trust: { min: 0, max: 0 } };
  return store.getBetLimits(selectedNpc.value);
});

const FIXED_FAVOR_BET = 5;
const FIXED_TRUST_BET = 3;

const autoBets = computed(() => {
  const limits = betLimits.value;
  return {
    currency: limits.currency.max,
    favor: Math.min(FIXED_FAVOR_BET, limits.favor.max),
    trust: Math.min(FIXED_TRUST_BET, limits.trust.max),
  };
});

const canStart = computed(() => !!selectedNpc.value);

// 6 颗骰子的当前类型 + 元数据（开局前可手动替换）
const playerDiceSlots = computed(() => store.playerDiceTypes.map(type => ({ type, info: DICE_TYPE_INFO[type] })));

// 当前 6 颗骰子的构成摘要：普通骰子 ×4、幸运骰子 ×2
const playerDiceSummary = computed(() => {
  const counts = new Map<DiceType, number>();
  for (const type of store.playerDiceTypes) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([type, count]) => `${DICE_TYPE_INFO[type].name} ×${count}`)
    .join('、');
});

// 手动替换面板状态
const swapIndex = ref(-1);

function openSwapPanel(index: number) {
  swapIndex.value = index;
}

// 每种特殊骰子已装备几颗（含本局买的），用来判断还能不能换
const equippedCount = computed(() => {
  const counts: Partial<Record<DiceType, number>> = {};
  for (const type of store.playerDiceTypes) {
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
});

// 可替换的选项：普通骰子随时可用，特殊骰子需要「库存 - 已装备」还有余量
const swapOptions = computed(() => {
  const options: Array<{ type: DiceType; name: string; description: string; stock: number; disabled: boolean }> = [];
  const base: DiceType[] = [DiceType.Normal, DiceType.Lucky, DiceType.Blessed];

  for (const type of base) {
    const item = itemCatalog.value.find(i => i.diceType === type);
    const stock = item ? itemStock(item.id) : 0;
    const equipped = equippedCount.value[type] ?? 0;
    // 特殊骰子：手里买了 3 件，最多换 3 颗；把已装备的槽位改成普通骰子会释放份额
    const disabled = type === DiceType.Normal ? false : stock - equipped <= 0;
    options.push({
      type,
      name: DICE_TYPE_INFO[type].name,
      description: DICE_TYPE_INFO[type].description,
      stock,
      disabled,
    });
  }
  return options;
});

// 换完后的提示：已装备 / 可装备总数（按特殊骰子库存上限算）
const swapHint = computed(() => {
  const equipped = store.playerDiceTypes.filter(t => t !== DiceType.Normal).length;
  const total = swapOptions.value.filter(o => o.type !== DiceType.Normal).reduce((sum, o) => sum + o.stock, 0);
  return t('dice.setup.swapHint', { count: equipped, total });
});

function applySwap(diceType: DiceType) {
  if (swapIndex.value === -1) return;
  const ok = store.replacePlayerDice(swapIndex.value, diceType);
  if (!ok) {
    notificationStore.warning(t('dice.setup.swapNoStock', { name: DICE_TYPE_INFO[diceType].name }));
  }
  swapIndex.value = -1;
}

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
}

async function handleStart() {
  if (!canStart.value) return;

  const betItems = [];
  if (autoBets.value.currency > 0) betItems.push({ type: BetType.Currency as const, amount: autoBets.value.currency });
  if (autoBets.value.favor > 0) betItems.push({ type: BetType.Favor as const, amount: autoBets.value.favor });
  if (autoBets.value.trust > 0) betItems.push({ type: BetType.Trust as const, amount: autoBets.value.trust });

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
  border-bottom: 1px solid var(--card-border);
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
  border-radius: var(--ui-radius-sm);
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
  border-radius: var(--ui-radius-sm);
  border: 1px solid var(--card-border);
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
  border-radius: var(--ui-radius-md);
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
  background: var(--card-bg-strong);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-md);
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
  border-bottom: 1px solid var(--card-border);
}

.section-icon {
  font-size: var(--text-lg);
}

/* ===== 档位选择 ===== */
.coin-badge {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--ui-radius-sm);
  background: rgba(var(--accent-warning-rgb), 0.15);
  color: var(--accent-warning);
  font-size: var(--text-sm);
  font-weight: 700;
  font-family: var(--font-mono);
}

.tier-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tier-card {
  flex: 1;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
  background: var(--bg-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tier-card:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.4);
}

.tier-card.selected {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.tier-score {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.tier-card.selected .tier-score {
  color: var(--accent-primary);
}

.tier-bet {
  font-size: calc(var(--text-xs) - 1px);
  color: var(--text-tertiary);
}

/* ===== 道具店（分类 + 卡面网格） ===== */
.item-shop-toggle {
  margin-top: 10px;
  border-top: 1px solid var(--card-border);
  padding-top: 8px;
}

.shop-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.shop-btn:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.4);
  color: var(--accent-primary);
}

.shop-btn .toggle-icon {
  margin-left: auto;
}

.shop-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent-success);
  color: white;
  font-size: calc(var(--text-xs) - 2px);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-shop {
  padding-top: 8px;
}

.shop-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.shop-hint i {
  flex-shrink: 0;
  color: var(--accent-primary);
}

/* 分类页签 */
.shop-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  margin-bottom: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
}

.shop-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 8px;
  border: none;
  border-radius: calc(var(--ui-radius-sm) - 2px);
  background: transparent;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.shop-tab:hover {
  color: var(--text-secondary);
}

.shop-tab.active {
  background: var(--gradient-primary);
  color: white;
}

/* 卡面网格 */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.item-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-md);
  background: var(--bg-primary);
  transition: all var(--transition-normal);
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 已持有：只做「已持有」角标提示，不降透明度、不挡购买（道具可叠加买多个） */
.item-card.owned {
  border-color: rgba(var(--accent-success-rgb), 0.5);
}

.item-card.owned .item-card-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--ui-radius-sm);
  border: 2px solid var(--accent-success);
}

/* 档次描边（只看种类，不看价格） */
.item-card.rarity-common {
  border-color: rgba(var(--accent-success-rgb), 0.35);
  background: linear-gradient(160deg, rgba(var(--accent-success-rgb), 0.06), var(--bg-primary) 60%);
}

.item-card.rarity-rare {
  border-color: rgba(var(--accent-primary-rgb), 0.4);
  background: linear-gradient(160deg, rgba(var(--accent-primary-rgb), 0.08), var(--bg-primary) 60%);
}

/* 卡面骰子图标 */
.item-card-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--ui-radius-sm);
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-secondary);
  font-size: calc(var(--text-xl) + 4px);
}

.item-card.rarity-common .item-card-icon {
  color: var(--accent-success);
}

/* 永久骰子：图标与描边都用骰子类型自己的颜色（幸运绿 / 祝福蓝） */
.item-card:has(.icon-lucky) {
  border-color: var(--dice-color-soft);
  background: linear-gradient(160deg, var(--dice-color-glow), var(--bg-primary) 60%);
}
.item-card:has(.icon-blessed) {
  border-color: var(--dice-color-soft);
  background: linear-gradient(160deg, var(--dice-color-glow), var(--bg-primary) 60%);
}

.item-card .icon-lucky {
  color: var(--dice-color);
  text-shadow: 0 0 10px var(--dice-color-glow);
}
.item-card .icon-blessed {
  color: var(--dice-color);
  text-shadow: 0 0 10px var(--dice-color-glow);
}

.item-owned-flag {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--accent-success);
  color: white;
  font-size: calc(var(--text-xs) - 2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-card-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.item-card-stock {
  font-size: calc(var(--text-xs) - 2px);
  font-weight: 600;
  color: var(--accent-success);
  font-family: var(--font-mono);
}

.item-card-desc {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.4;
  color: var(--text-tertiary);
  text-align: center;
  flex: 1;
}

.item-card-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding-top: 4px;
  border-top: 1px solid var(--card-border);
}

.item-card-price {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--accent-warning);
  font-family: var(--font-mono);
}

.buy-btn {
  margin-left: auto;
  padding: 3px 10px;
  border: none;
  border-radius: var(--ui-radius-sm);
  background: var(--gradient-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.buy-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--accent-primary-rgb), 0.3);
}

.buy-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dice-buff-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: var(--ui-radius-sm);
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
  font-size: calc(var(--text-xs) - 2px);
  font-weight: 600;
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
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
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
  border-radius: var(--ui-radius-sm);
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
  border-radius: var(--ui-radius-sm);
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
  border-radius: var(--ui-radius-sm);
  border: 1px solid var(--dice-color, var(--card-border));
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

/* 玩家 6 颗骰子槽位（开局前可点击替换） */
.dice-slots {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.dice-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  border-radius: var(--ui-radius-sm);
  border: 1px solid var(--card-border);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.dice-slot:hover {
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}
.dice-slot i {
  font-size: var(--text-lg);
  color: #9ca3af;
}
.dice-slot .slot-name {
  font-size: calc(var(--text-xs) - 2px);
  color: var(--text-tertiary);
}
.dice-slot.is-lucky {
  border-color: var(--dice-color-soft);
}
.dice-slot.is-lucky i {
  color: var(--dice-color);
}
.dice-slot.is-blessed {
  border-color: var(--dice-color-soft);
}
.dice-slot.is-blessed i {
  color: var(--dice-color);
}

/* 开局前手动替换面板 */
.dice-swap-panel {
  margin-top: 8px;
  padding: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
}

.swap-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.swap-header i:first-child {
  color: var(--accent-primary);
}
.swap-close {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: var(--ui-radius-sm);
}
.swap-close:hover {
  color: var(--accent-danger);
  background: rgba(var(--accent-danger-rgb), 0.1);
}

.swap-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.swap-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: var(--ui-radius-sm);
  border: 1px solid var(--card-border);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.swap-option:hover:not(:disabled) {
  border-color: var(--accent-primary);
}
.swap-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.swap-option i {
  font-size: var(--text-lg);
  color: #9ca3af;
}
.swap-option.is-lucky i {
  color: var(--dice-color);
}
.swap-option.is-blessed i {
  color: var(--dice-color);
}
.swap-option-name {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
}
.swap-option-desc {
  font-size: calc(var(--text-xs) - 2px);
  color: var(--text-tertiary);
  line-height: 1.2;
}
.swap-option-stock {
  font-size: calc(var(--text-xs) - 2px);
  color: var(--accent-primary);
}

.swap-hint {
  margin: 6px 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-align: center;
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
  border-radius: var(--ui-radius-sm);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  border: 1px solid var(--card-border);
}

.trust-hint i {
  color: var(--accent-primary);
  font-size: var(--text-sm);
  flex-shrink: 0;
}

/* ===== 赌注 ===== */
/* 押注金额由档位与 NPC 自动决定，只读展示（无输入框） */
.bet-fixed {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(var(--accent-success-rgb), 0.06);
  border: 1px solid rgba(var(--accent-success-rgb), 0.15);
  border-radius: var(--ui-radius-sm);
}

.bet-fixed-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bet-fixed-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

.bet-fixed-label i {
  font-size: var(--text-base);
  color: var(--accent-primary);
}

.bet-fixed-value {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--accent-success);
  font-family: var(--font-mono);
}

/* ===== 开始按钮 ===== */
.setup-actions {
  padding: 4px 0;
}

.start-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--ui-radius-sm);
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
}
</style>
