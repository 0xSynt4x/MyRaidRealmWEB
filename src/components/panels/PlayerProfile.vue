<template>
  <div class="player-dashboard">
    <!-- Hero Section: 玩家信息 -->
    <section class="hero-section">
      <!-- 玩家基本信息 -->
      <div class="player-info">
        <div class="avatar">
          <GenderIcon class="avatar-icon" :gender="data.玩家?.性别" />
        </div>
        <div class="info">
          <h3 class="name">{{ data.玩家?.姓名 || t('common.unnamed') }}</h3>
          <div class="meta">
            <span>{{ enumDisplay('player.gender', data.玩家?.性别, t('common.unknown')) }}</span>
            <span class="divider">·</span>
            <span>{{ formatAge(data.玩家?.年龄) }}</span>
          </div>
          <div class="tags">
            <span class="tag">{{ data.玩家?.身份信息?.职业 || '--' }}</span>
            <span class="tag class-tag">{{ data.玩家?.身份信息?.阶层 || '--' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 当前目标 -->
    <section v-if="data.玩家?.当前目标" class="goal-section">
      <div class="goal-item">
        <span class="label"><i class="ti ti-target"></i> {{ t('profile.currentGoal') }}</span>
        <span class="value">{{ data.玩家?.当前目标 }}</span>
      </div>
    </section>

    <!-- 货币资源区域 -->
    <section class="currency-section">
      <div class="main-currency">
        <i class="ti ti-coins icon"></i>
        <span class="currency-name">{{ data.玩家?.货币资源?.主货币?.名称 || t('common.currency') }}</span>
        <span class="currency-amount">{{ formatMoney(data.玩家?.货币资源?.主货币?.数量 || 0) }}</span>
      </div>
      <div v-if="hasSecondaryCurrency" class="secondary-currencies">
        <span
          v-for="(currency, name) in data.玩家?.货币资源?.次级货币"
          :key="name"
          class="currency-badge"
          :title="`${t('profile.exchange')}: ${currency.兑换比例}\n${t('profile.usage')}: ${currency.用途说明}`"
        >
          <span class="badge-name">{{ name }}</span>
          <span class="badge-amount">×{{ currency.数量 }}</span>
        </span>
      </div>
    </section>

    <!-- 身份信息 (紧凑键值对) -->
    <section class="identity-section">
      <div class="identity-item">
        <span class="label">{{ t('profile.affiliation') }}</span>
        <span class="value">{{ data.玩家?.身份信息?.所属组织 || t('common.nonePlaceholder') }}</span>
      </div>
      <div v-if="data.玩家?.身份信息?.特殊身份" class="identity-item special">
        <span class="label">{{ t('profile.specialIdentity') }}</span>
        <TruncateText :text="data.玩家?.身份信息?.特殊身份" :truncated="false" class="value" />
      </div>
      <div v-if="data.玩家?.身份信息?.背景信息" class="identity-item background">
        <span class="label">{{ t('profile.backstory') }}</span>
        <TruncateText :text="data.玩家?.身份信息?.背景信息" :truncated="false" class="value" />
      </div>
    </section>

    <!-- 技能系统 (多行显示，与物品相同) -->
    <section class="skills-section">
      <div class="section-header">
        <i class="ti ti-wand"></i>
        <span>{{ t('profile.skills') }}</span>
      </div>
      <div v-if="hasSkills" class="items-multiline">
        <div v-for="(skills, type) in skillsByType" :key="type" class="item-row">
          <span class="type-label">{{ enumDisplay('player.itemType', type, String(type)) }}:</span>
          <div class="item-list">
            <span
              v-for="(skill, name) in skills"
              :key="name"
              :class="[
                'skill-badge',
                `quality-level-${getQualityLevel(skill.品质)}`,
                { pulsing: isPlayerCardChanged('skill', name as string) },
              ]"
              @click.stop="handlePlayerCardInteract('skill', name as string, $event, skill.描述 || '')"
              @mouseenter="handlePlayerCardHover('skill', name as string, $event, skill.描述 || '')"
              @mouseleave="hideBadgeTooltip"
            >
              {{ name }}
              <button
                class="card-delete-btn"
                :title="t('profile.deleteSkill')"
                @click.stop="openDeleteConfirm('skill', name as string)"
              >
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">{{ t('profile.noSkills') }}</div>
    </section>

    <!-- 物品栏 (多行显示) -->
    <section class="items-section">
      <div class="section-header">
        <i class="ti ti-backpack"></i>
        <span>{{ t('profile.items') }}</span>
      </div>
      <div v-if="hasItems" class="items-multiline">
        <div v-for="(items, type) in itemsByType" :key="type" class="item-row">
          <span class="type-label">{{ enumDisplay('player.itemType', type, String(type)) }}:</span>
          <div class="item-list">
            <span
              v-for="(item, name) in items"
              :key="name"
              :class="[
                'item-badge',
                `quality-level-${getQualityLevel(item.品质)}`,
                { pulsing: isPlayerCardChanged('item', name as string) },
              ]"
              @click.stop="handlePlayerCardInteract('item', name as string, $event, buildItemTooltip(item))"
              @mouseenter="handlePlayerCardHover('item', name as string, $event, buildItemTooltip(item))"
              @mouseleave="hideBadgeTooltip"
            >
              <span class="item-name">{{ name }}</span>
              <span class="item-quantity">×{{ item.数量 }}</span>
              <span v-if="item.有效期 !== '永久'" class="item-expiry">⏰{{ item.有效期 }}</span>
              <button
                class="card-delete-btn"
                :title="t('profile.deleteItem')"
                @click.stop="openDeleteConfirm('item', name as string)"
              >
                ×
              </button>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">{{ t('profile.noItems') }}</div>
    </section>

    <!-- Badge Tooltip -->
    <Teleport to="body">
      <div v-if="badgeTooltipVisible && badgeTooltipText" class="badge-tooltip" :style="badgeTooltipStyle">
        {{ badgeTooltipText }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '../../i18n';
import { useDelete } from '../../composables/useDelete';
import { useBadgeStore } from '../../stores/badge';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { formatAge, formatMoney, getQualityLevel } from '../../utils/format';
import GenderIcon from '../common/GenderIcon.vue';
import TruncateText from '../common/TruncateText.vue';

const store = useStatDataStore();
const statDataActions = useStatDataActions();
const { data } = storeToRefs(store);
const { deleteItem } = useDelete();
const { t, enumDisplay } = useI18n();

const badgeStore = useBadgeStore();

// Badge Tooltip 状态
const badgeTooltipVisible = ref(false);
const badgeTooltipText = ref('');
const badgeTooltipPosition = ref({ x: 0, y: 0 });

const badgeTooltipStyle = computed(() => ({
  left: `${badgeTooltipPosition.value.x}px`,
  top: `${badgeTooltipPosition.value.y}px`,
}));

function showBadgeTooltip(e: MouseEvent, text: string) {
  if (!text.trim()) return;
  badgeTooltipPosition.value = { x: e.clientX + 10, y: e.clientY + 10 };
  badgeTooltipText.value = text;
  badgeTooltipVisible.value = true;
}

function hideBadgeTooltip() {
  badgeTooltipVisible.value = false;
}

function buildItemTooltip(item: { 特殊属性?: string; 备注?: string }): string {
  const parts: string[] = [];
  if (item.特殊属性) parts.push(`${t('profile.specialAttributes')}: ${item.特殊属性}`);
  if (item.备注) parts.push(`${t('profile.notes')}: ${item.备注}`);
  return parts.join('\n');
}

// 点击外部关闭 tooltip
function handleGlobalClick() {
  badgeTooltipVisible.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick);
});

// 技能按类型分组
const skillsByType = computed(() => {
  const skills = data.value.玩家?.技能系统 || {};
  return _(skills)
    .entries()
    .groupBy(([, skill]) => skill.类型)
    .mapValues(group => Object.fromEntries(group))
    .value();
});

const hasSkills = computed(() => {
  return Object.keys(data.value.玩家?.技能系统 || {}).length > 0;
});

// 物品按类型分组
const itemsByType = computed(() => {
  const items = data.value.玩家?.物品栏 || {};
  return _(items)
    .entries()
    .groupBy(([, item]) => item.类型)
    .mapValues(group => Object.fromEntries(group))
    .value();
});

const hasItems = computed(() => {
  return Object.keys(data.value.玩家?.物品栏 || {}).length > 0;
});

// 次级货币
const hasSecondaryCurrency = computed(() => {
  return Object.keys(data.value.玩家?.货币资源?.次级货币 || {}).length > 0;
});

function getPlayerChangedKey(type: 'skill' | 'item', name: string): string {
  return `${type === 'skill' ? '技能' : '物品'}:${name}`;
}

function isPlayerCardChanged(type: 'skill' | 'item', name: string): boolean {
  return badgeStore.isChangedKey('players', getPlayerChangedKey(type, name));
}

function dismissPlayerCardChanged(type: 'skill' | 'item', name: string) {
  badgeStore.dismissChangedKey('players', getPlayerChangedKey(type, name));
}

function handlePlayerCardHover(type: 'skill' | 'item', name: string, e: MouseEvent, text: string) {
  dismissPlayerCardChanged(type, name);
  showBadgeTooltip(e, text);
}

function handlePlayerCardInteract(type: 'skill' | 'item', name: string, e: MouseEvent, text: string) {
  dismissPlayerCardChanged(type, name);
  showBadgeTooltip(e, text);
}

// 删除技能/物品（使用统一删除函数）
function openDeleteConfirm(type: 'skill' | 'item', name: string) {
  const typeName = type === 'skill' ? '技能' : '物品';
  const path = type === 'skill' ? `玩家.技能系统.${name}` : `玩家.物品栏.${name}`;

  deleteItem({
    typeName,
    displayName: name,
    onDelete: () => statDataActions.removeStatDataAtPath(`player.delete.${type}`, path),
  });
}
</script>

<style scoped>
.player-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding-bottom: 2px;
}

/* Hero Section - 玩家信息 */
.hero-section {
  display: flex;
  background: var(--gradient-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  color: white;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

/* Hero 背景装饰 */
.hero-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.hero-section::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
  min-width: 0;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.18) 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.38);
  box-shadow:
    0 0 20px rgba(255, 255, 255, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.28);
}

.avatar-icon {
  font-size: calc(30px * var(--ui-font-scale));
  color: var(--text-primary);
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
  color: white;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.meta {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.96);
  display: flex;
  align-items: center;
  gap: 6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.divider {
  color: rgba(255, 255, 255, 0.74);
}

.tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
  min-width: 0;
}

.tag {
  padding: 3px 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.2) 100%);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 1px 2px rgba(24, 32, 58, 0.14);
  transition: all var(--transition-fast) ease;
  max-width: 100%;
  min-width: 0;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
}

.tag:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.tag.class-tag {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.24) 100%);
  border-color: rgba(255, 255, 255, 0.34);
}

.goal-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
}

.goal-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--text-sm);
  min-width: 0;
}

.goal-item .label {
  color: var(--text-secondary);
  font-weight: 500;
  flex: 0 0 auto;
  white-space: nowrap;
}

.goal-item .value {
  color: var(--accent-primary);
  font-weight: 600;
  flex: 1;
  min-width: 0;
  line-height: 1.45;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* 货币资源区域 */
.currency-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
}

.main-currency {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 12px;
  border-right: 1px solid var(--glass-border);
}

.icon {
  font-size: calc(20px * var(--ui-font-scale));
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
}

.currency-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.currency-amount {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: 700;
  color: hsl(142, 71%, 45%);
  margin-left: 4px;
  letter-spacing: 0.5px;
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.2);
}

.secondary-currencies {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.currency-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--glass-bg);
  border-radius: 12px;
  font-size: var(--text-xs);
  border: 1px solid var(--glass-border);
  cursor: help;
  transition: all var(--transition-fast) ease;
}

.currency-badge:hover {
  background: rgba(var(--accent-primary-rgb), 0.1);
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.badge-name {
  font-weight: 600;
  color: var(--text-primary);
}

.badge-amount {
  background: var(--gradient-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
  font-size: calc(10px * var(--ui-font-scale));
}

/* 身份信息 (紧凑键值对) */
.identity-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glass);
}

.identity-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--text-sm);
  min-width: 0;
}

.identity-item .label {
  color: var(--text-secondary);
  font-weight: 500;
  flex-shrink: 0;
}

.identity-item .value {
  color: var(--text-primary);
  font-weight: 600;
  flex: 1;
  min-width: 0;
  white-space: normal;
  line-height: 1.45;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.identity-item.special .value {
  color: hsl(38, 92%, 50%);
  font-style: italic;
}

.identity-item.background .value {
  color: var(--text-primary);
  font-style: normal;
}

/* 技能和物品公共样式 */
.skills-section,
.items-section {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  box-shadow: var(--shadow-glass);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent-primary);
}

.section-header i:first-child {
  font-size: calc(14px * var(--ui-font-scale));
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.scroll-hint {
  margin-left: auto;
  font-size: calc(12px * var(--ui-font-scale));
  opacity: 0.5;
}

/* 水平滚动容器 (用于技能) */
.scroll-container {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.scroll-container::-webkit-scrollbar {
  display: none;
}

/* 多行显示容器 (用于物品) */
.items-multiline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.item-list {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.type-label {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* 技能徽章和物品徽章使用统一样式 */
.skill-badge,
.item-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 14px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: white;
  white-space: normal;
  flex-shrink: 1;
  max-width: 100%;
  min-width: 0;
  cursor: help;
  transition: all var(--transition-fast) var(--ease-out-expo);
  border: none;
  position: relative;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.skill-badge:hover,
.item-badge:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--shadow-md);
  filter: brightness(1.1);
}

.skill-badge.pulsing,
.item-badge.pulsing {
  animation: badgeHeartbeat 1.15s ease-in-out infinite;
}

/* quality-level-* 样式已在 global.css 中定义 */

.item-name {
  font-weight: 600;
  color: white;
}

.item-quantity {
  background: rgba(255, 255, 255, 0.3);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  font-size: calc(10px * var(--ui-font-scale));
}

.item-expiry {
  color: rgba(255, 255, 255, 0.9);
  font-size: calc(10px * var(--ui-font-scale));
}

/* 空状态 */
.empty-hint {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  opacity: 0.6;
  font-style: italic;
}

/* 删除按钮 - 组件级覆盖 (基础样式来自 delete-button.css) */
.card-delete-btn {
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  font-size: calc(12px * var(--ui-font-scale));
}

.skill-badge:hover .card-delete-btn,
.item-badge:hover .card-delete-btn {
  opacity: 1;
}

@keyframes badgeHeartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.02);
  }
  60% {
    transform: scale(0.997);
  }
}

/* Badge Tooltip */
.badge-tooltip {
  position: fixed;
  z-index: 9999;
  max-width: 300px;
  padding: 10px 14px;
  background: var(--glass-bg-heavy);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-size: var(--text-xs);
  color: var(--text-primary);
  word-wrap: break-word;
  white-space: pre-line;
  pointer-events: none;
  animation: fadeIn 150ms ease-out;
}

@media (max-width: 900px) {
  .player-dashboard {
    gap: 10px;
  }

  .hero-section,
  .goal-section,
  .currency-section,
  .identity-section {
    padding-left: 12px;
    padding-right: 12px;
  }

  .badge-tooltip {
    max-width: min(280px, calc(100vw - 24px));
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 14px 12px;
  }

  .player-info {
    gap: 10px;
  }

  .avatar {
    width: 48px;
    height: 48px;
  }

  .avatar-icon {
    font-size: calc(25px * var(--ui-font-scale));
  }

  .tags {
    gap: 4px;
    margin-top: 6px;
  }

  .tag {
    padding: 3px 9px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .goal-item,
  .identity-item {
    font-size: var(--text-xs);
  }

  .currency-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .main-currency {
    width: 100%;
    border-right: none;
    padding-right: 0;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--glass-border);
  }

  .item-row {
    flex-direction: column;
    gap: 6px;
  }
}

@media (max-width: 600px) {
  .skills-section,
  .items-section {
    padding: 8px 10px;
  }

  .skill-badge,
  .item-badge {
    padding: 5px 10px;
  }

  .badge-tooltip {
    font-size: calc(11px * var(--ui-font-scale));
    padding: 8px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skill-badge:hover,
  .item-badge:hover {
    transform: none;
  }
  .tag:hover {
    transform: none;
  }
  .delete-confirm-dialog {
    animation: none;
  }
  .skill-badge.pulsing,
  .item-badge.pulsing {
    animation: none !important;
  }
}
</style>
