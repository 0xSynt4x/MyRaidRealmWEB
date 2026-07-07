<template>
  <div class="right-panel">
    <div class="panel-content">
      <!-- 玩家生存状态 -->
      <SurvivalStatus v-if="survivalMode !== '关闭'" />

      <!-- 被关注 NPC 的生存状态 -->
      <NpcSurvivalStatus @npc-click="handleNpcClick" />

      <!-- 玩家当前目标 -->
      <section v-if="data.玩家?.当前目标" class="info-card info-card-group-target">
        <div class="info-grid">
          <div class="info-row">
            <span class="info-item">
              <span class="label target">{{ t('rightPanel.currentGoal') }}:</span>
              <span class="value full-text">{{ data.玩家?.当前目标 || '' }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 待办速览（默认折叠） -->
      <section class="info-card info-card-group-summary">
        <button
          :class="['card-title', 'card-title-button', { pulsing: isTabPulsing('todoSummary') }]"
          type="button"
          :aria-expanded="isTodoSummaryExpanded"
          @mouseenter="stopTabPulse('todoSummary')"
          @click="toggleTodoSummaryExpanded"
        >
          <span class="card-title-main">
            <i class="fa-regular fa-square-check"></i>
            {{ t('rightPanel.todoSummary') }}
            <span
              v-if="getBadgeDisplay('todoSummary')"
              :class="['right-badge', { pulsing: isTabPulsing('todoSummary') }]"
              >{{ getBadgeDisplay('todoSummary') }}</span
            >
          </span>
          <i class="fa-solid fa-chevron-down chevron" :class="{ expanded: isTodoSummaryExpanded }"></i>
        </button>
        <div v-show="isTodoSummaryExpanded" class="info-grid">
          <div v-if="todoTopThree.length === 0" class="info-row">
            <span class="value full-text">{{ t('rightPanel.noTodos') }}</span>
          </div>
          <button
            v-for="todo in todoTopThree"
            v-else
            :key="todo.title"
            type="button"
            :class="['info-row', 'info-action-row', { pulsing: isTodoChanged(todo.title) }]"
            @mouseenter="dismissTodoChanged(todo.title)"
            @click="openTodoItem(todo.title)"
          >
            <span class="todo-main-line">
              <span
                :class="[
                  'todo-title',
                  `todo-priority-title-${getPriorityLevel(todo.priority)}`,
                  `todo-status-title-${getTodoStatusClass(todo.status)}`,
                ]"
              >
                <span :class="['todo-status-box', `todo-status-box-${getTodoStatusClass(todo.status)}`]"></span>
                {{ todo.title }}
              </span>
              <span v-if="todo.deadline" class="todo-deadline"
                >{{ t('rightPanel.deadline') }}: {{ todo.deadline }}</span
              >
            </span>
          </button>
        </div>
      </section>

      <!-- 危机机遇提醒（默认折叠） -->
      <section class="info-card info-card-group-detail">
        <button
          :class="['card-title', 'card-title-button', { pulsing: isTabPulsing('riskOpportunity') }]"
          type="button"
          :aria-expanded="isRiskOpportunityExpanded"
          @mouseenter="stopTabPulse('riskOpportunity')"
          @click="toggleRiskOpportunityExpanded"
        >
          <span class="card-title-main">
            <i class="fa-solid fa-triangle-exclamation"></i>
            {{ t('rightPanel.riskOpportunity') }}
            <span
              v-if="getBadgeDisplay('riskOpportunity')"
              :class="['right-badge', { pulsing: isTabPulsing('riskOpportunity') }]"
              >{{ getBadgeDisplay('riskOpportunity') }}</span
            >
          </span>
          <i class="fa-solid fa-chevron-down chevron" :class="{ expanded: isRiskOpportunityExpanded }"></i>
        </button>
        <div v-show="isRiskOpportunityExpanded" class="info-grid">
          <button
            type="button"
            :class="[
              'info-row',
              'info-action-row',
              { pulsing: isRiskOpportunityChanged('危机', topCrisis?.title ?? '') },
            ]"
            @mouseenter="dismissRiskOpportunityChanged('危机', topCrisis?.title ?? '')"
            @click="openRiskOpportunityItem('crisis', topCrisis?.title ?? '')"
          >
            <span class="summary-title danger">
              {{ t('rightPanel.crisis') }} ({{ crisisCount }})
              <span
                v-if="topCrisisSeverity"
                :class="['summary-severity-tag', `summary-severity-${getSeverityLevel(topCrisisSeverity)}`]"
              >
                {{ getSeverityIcon(topCrisisSeverity) }}
                {{ enumDisplay('risk.severity', topCrisisSeverity, topCrisisSeverity) }}
              </span>
            </span>
            <span
              :class="[
                'value',
                'full-text',
                'summary-value',
                `summary-severity-value-${getSeverityLevel(topCrisisSeverity)}`,
              ]"
              >{{ topCrisisSummary }}</span
            >
          </button>
          <button
            type="button"
            :class="['info-row', 'info-action-row', { pulsing: isRiskOpportunityChanged('机遇', topOpportunityTitle) }]"
            @mouseenter="dismissRiskOpportunityChanged('机遇', topOpportunityTitle)"
            @click="openRiskOpportunityItem('opportunity', topOpportunityTitle)"
          >
            <span class="summary-title success">{{ t('rightPanel.opportunity') }} ({{ opportunityCount }})</span>
            <span class="value full-text summary-value summary-opportunity-value">{{ topOpportunitySummary }}</span>
          </button>
        </div>
      </section>

      <!-- 世界状态 -->
      <section class="info-card info-card-group-detail">
        <button
          :class="['card-title', 'card-title-button', { pulsing: isTabPulsing('world') }]"
          type="button"
          :aria-expanded="isWorldExpanded"
          @mouseenter="stopTabPulse('world')"
          @click="toggleWorldExpanded"
        >
          <span class="card-title-main">
            <i class="fa-solid fa-globe"></i>
            {{ t('rightPanel.worldState') }}
            <span v-if="getBadgeDisplay('world')" :class="['right-badge', { pulsing: isTabPulsing('world') }]">{{
              getBadgeDisplay('world')
            }}</span>
          </span>
          <i class="fa-solid fa-chevron-down chevron" :class="{ expanded: isWorldExpanded }"></i>
        </button>
        <div v-show="isWorldExpanded" class="info-grid">
          <div
            :class="['info-row', { pulsing: isWorldChanged('力量体系') }]"
            @mouseenter="dismissWorldChanged('力量体系')"
          >
            <span class="info-item">
              <span class="label power-system">{{ t('rightPanel.powerSystem') }}:</span>
              <span class="value full-text">{{ data.世界.力量体系 }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isWorldChanged('玩法侧重') }]"
            @mouseenter="dismissWorldChanged('玩法侧重')"
          >
            <span class="info-item">
              <span class="label gameplay">{{ t('rightPanel.gameplayFocus') }}:</span>
              <span class="value full-text">{{
                enumDisplay('world.gameplayFocus', data.世界.玩法侧重, data.世界.玩法侧重)
              }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isWorldChanged('权力结构') }]"
            @mouseenter="dismissWorldChanged('权力结构')"
          >
            <span class="info-item">
              <span class="label power-structure">{{ t('rightPanel.powerStructure') }}:</span>
              <span class="value full-text">{{ data.世界.社会环境.权力结构 }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isWorldChanged('社会氛围') }]"
            @mouseenter="dismissWorldChanged('社会氛围')"
          >
            <span class="info-item">
              <span class="label atmosphere">{{ t('rightPanel.socialAtmosphere') }}:</span>
              <span class="value full-text">{{ data.世界.社会环境.社会氛围 }}</span>
            </span>
          </div>
          <div
            v-if="data.世界.社会环境.主流价值观"
            :class="['info-row', { pulsing: isWorldChanged('主流价值观') }]"
            @mouseenter="dismissWorldChanged('主流价值观')"
          >
            <span class="info-item">
              <span class="label values">{{ t('rightPanel.mainstreamValues') }}:</span>
              <span class="value full-text">{{ data.世界.社会环境.主流价值观 }}</span>
            </span>
          </div>
          <div
            v-if="data.世界.运行规则?.length"
            :class="['info-row', { pulsing: isWorldChanged('运行规则') }]"
            @mouseenter="dismissWorldChanged('运行规则')"
          >
            <span class="info-item">
              <span class="label system">{{ t('rightPanel.worldRules') }}:</span>
              <span class="value full-text world-rules-list">
                <span v-for="(rule, index) in data.世界.运行规则" :key="`world-rule-${index}`" class="world-rule-item"
                  >• {{ rule }}</span
                >
              </span>
            </span>
          </div>
          <div
            v-if="data.世界.叙事玩法"
            :class="['info-row', { pulsing: isWorldChanged('叙事玩法') }]"
            @mouseenter="dismissWorldChanged('叙事玩法')"
          >
            <span class="info-item">
              <span class="label focus">{{ t('rightPanel.narrativeFocus') }}:</span>
              <span class="value full-text">{{ data.世界.叙事玩法 }}</span>
            </span>
          </div>
          <div
            v-if="data.世界.空间定位.区域特征"
            :class="['info-row', { pulsing: isWorldChanged('区域特征') }]"
            @mouseenter="dismissWorldChanged('区域特征')"
          >
            <span class="info-item">
              <span class="label area">{{ t('rightPanel.areaTraits') }}:</span>
              <span class="value full-text">{{ data.世界.空间定位.区域特征 }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- 舆情信息 -->
      <section class="info-card info-card-group-detail">
        <button
          :class="['card-title', 'card-title-button', { pulsing: isTabPulsing('publicOpinion') }]"
          type="button"
          :aria-expanded="isPublicOpinionExpanded"
          @mouseenter="stopTabPulse('publicOpinion')"
          @click="togglePublicOpinionExpanded"
        >
          <span class="card-title-main">
            <i class="fa-solid fa-layer-group"></i>
            {{ t('rightPanel.publicOpinion') }}
            <span
              v-if="getBadgeDisplay('publicOpinion')"
              :class="['right-badge', { pulsing: isTabPulsing('publicOpinion') }]"
              >{{ getBadgeDisplay('publicOpinion') }}</span
            >
          </span>
          <i class="fa-solid fa-chevron-down chevron" :class="{ expanded: isPublicOpinionExpanded }"></i>
        </button>
        <div v-show="isPublicOpinionExpanded" class="info-grid">
          <div
            :class="['info-row', { pulsing: isPublicOpinionChanged('全局重大事件') }]"
            @mouseenter="dismissPublicOpinionChanged('全局重大事件')"
          >
            <span class="info-item">
              <span class="label global">{{ t('rightPanel.globalEvents') }}:</span>
              <span class="value full-text">{{ data.世界.信息层级.全局重大事件 }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isPublicOpinionChanged('势力动态') }]"
            @mouseenter="dismissPublicOpinionChanged('势力动态')"
          >
            <span class="info-item">
              <span class="label faction">{{ t('rightPanel.factionMovements') }}:</span>
              <span class="value full-text">{{ data.世界.信息层级.势力动态 }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isPublicOpinionChanged('区域事件') }]"
            @mouseenter="dismissPublicOpinionChanged('区域事件')"
          >
            <span class="info-item">
              <span class="label regional">{{ t('rightPanel.regionalEvents') }}:</span>
              <span class="value full-text">{{ data.世界.信息层级.区域事件 }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isPublicOpinionChanged('本地消息') }]"
            @mouseenter="dismissPublicOpinionChanged('本地消息')"
          >
            <span class="info-item">
              <span class="label local">{{ t('rightPanel.localNews') }}:</span>
              <span class="value full-text">{{ data.世界.信息层级.本地消息 }}</span>
            </span>
          </div>
          <div
            :class="['info-row', { pulsing: isPublicOpinionChanged('圈内传闻') }]"
            @mouseenter="dismissPublicOpinionChanged('圈内传闻')"
          >
            <span class="info-item">
              <span class="label rumor">{{ t('rightPanel.rumors') }}:</span>
              <span class="value full-text">{{ data.世界.信息层级.圈内传闻 }}</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from '../../i18n';
import { useBadgeStore, type BadgeTab } from '../../stores/badge';
import { useLayoutStore } from '../../stores/layout';
import { useStatDataStore } from '../../stores/statData';
import { getSeverityIcon } from '../../utils/emoji';
import { getPriorityLevel, getSeverityLevel } from '../../utils/format';
import NpcSurvivalStatus from '../panels/NpcSurvivalStatus.vue';
import SurvivalStatus from '../panels/SurvivalStatus.vue';

const store = useStatDataStore();
const { data } = storeToRefs(store);
const { t, enumDisplay } = useI18n();

const survivalMode = computed(() => data.value.设置?.生存系统模式 ?? '关闭');
const layoutStore = useLayoutStore();

const badgeStore = useBadgeStore();

// 默认折叠：待办速览、危机机遇、世界状态、舆情信息
const isTodoSummaryExpanded = ref(false);
const isRiskOpportunityExpanded = ref(false);
const isWorldExpanded = ref(false);
const isPublicOpinionExpanded = ref(false);

const todoPriorityWeight: Record<string, number> = {
  紧急: 4,
  高: 3,
  普通: 2,
  低: 1,
};

const todoStatusWeight: Record<string, number> = {
  进行中: 2,
  未开始: 1,
  已完成: 0,
  已取消: 0,
};

const crisisSeverityWeight: Record<string, number> = {
  紧急: 4,
  高: 3,
  中等: 2,
  低: 1,
};

const opportunityTimelinessWeight: Record<string, number> = {
  即时: 5,
  紧急: 4,
  短期有效: 3,
  中期有效: 2,
  长期有效: 1,
};

function parseDeadline(deadline?: string): number {
  if (!deadline) return Number.MAX_SAFE_INTEGER;
  const timestamp = Date.parse(deadline);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

const todoTopThree = computed(() => {
  const todoRecord = (data.value.玩家?.记事本?.待办事项 ?? {}) as Record<string, any>;

  return Object.entries(todoRecord)
    .map(([title, todo]) => ({
      title,
      status: todo?.状态 ?? '未开始',
      priority: todo?.优先级 ?? '普通',
      deadline: todo?.截止时间 ?? '',
      time: Number(todo?.$time ?? 0),
    }))
    .filter(todo => todo.status !== '已完成')
    .sort((a, b) => {
      const priorityDiff = (todoPriorityWeight[b.priority] ?? 0) - (todoPriorityWeight[a.priority] ?? 0);
      if (priorityDiff !== 0) return priorityDiff;

      const statusDiff = (todoStatusWeight[b.status] ?? 0) - (todoStatusWeight[a.status] ?? 0);
      if (statusDiff !== 0) return statusDiff;

      const deadlineDiff = parseDeadline(a.deadline) - parseDeadline(b.deadline);
      if (deadlineDiff !== 0) return deadlineDiff;

      return b.time - a.time;
    })
    .slice(0, 3);
});

const crisisEntries = computed(() => {
  const crisisRecord = (data.value.玩家?.记事本?.潜在危机 ?? {}) as Record<string, any>;
  return Object.entries(crisisRecord).map(([title, crisis]) => ({
    title,
    severity: crisis?.严重程度 ?? '中等',
    impactTime: crisis?.预计影响时间 ?? '',
    measure: crisis?.应对措施 ?? '',
    time: Number(crisis?.$time ?? 0),
  }));
});

const opportunityEntries = computed(() => {
  const opportunityRecord = (data.value.玩家?.记事本?.当前机遇 ?? {}) as Record<string, any>;
  return Object.entries(opportunityRecord).map(([title, opportunity]) => ({
    title,
    timeliness: opportunity?.时效性 ?? '',
    requiredResource: opportunity?.所需资源 ?? '',
    plan: opportunity?.行动计划 ?? '',
    time: Number(opportunity?.$time ?? 0),
  }));
});

const crisisCount = computed(() => crisisEntries.value.length);
const opportunityCount = computed(() => opportunityEntries.value.length);

const topCrisis = computed(() => {
  if (crisisEntries.value.length === 0) return null;
  return [...crisisEntries.value].sort((a, b) => {
    const severityDiff = (crisisSeverityWeight[b.severity] ?? 0) - (crisisSeverityWeight[a.severity] ?? 0);
    if (severityDiff !== 0) return severityDiff;
    return b.time - a.time;
  })[0];
});

const topCrisisSeverity = computed(() => topCrisis.value?.severity ?? '');

const topCrisisSummary = computed(() => {
  if (!topCrisis.value) return t('rightPanel.noCrisis');
  return `${topCrisis.value.title}${topCrisis.value.impactTime ? ` · ${topCrisis.value.impactTime}` : ''}`;
});

const topOpportunity = computed(() => {
  if (opportunityEntries.value.length === 0) return null;
  return [...opportunityEntries.value].sort((a, b) => {
    const timelinessDiff =
      (opportunityTimelinessWeight[b.timeliness] ?? 0) - (opportunityTimelinessWeight[a.timeliness] ?? 0);
    if (timelinessDiff !== 0) return timelinessDiff;
    return b.time - a.time;
  })[0];
});

const topOpportunityTitle = computed(() => topOpportunity.value?.title ?? '');

const topOpportunitySummary = computed(() => {
  if (!topOpportunity.value) return t('rightPanel.noOpportunity');
  return `${topOpportunity.value.title}${topOpportunity.value.timeliness ? `（${enumDisplay('opportunity.timeliness', topOpportunity.value.timeliness, topOpportunity.value.timeliness)}）` : ''}`;
});

function getBadgeDisplay(tab: BadgeTab): string {
  const count = badgeStore.getBadgeCount(tab);
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}

function isTabPulsing(tab: BadgeTab): boolean {
  return badgeStore.isPulsing(tab);
}

function stopTabPulse(tab: BadgeTab) {
  badgeStore.clearPulse(tab);
}

function isTodoChanged(title: string): boolean {
  return badgeStore.isChangedKey('todoSummary', title);
}

function dismissTodoChanged(title: string) {
  if (!title) return;
  badgeStore.dismissChangedKey('todoSummary', title);
}

function isRiskOpportunityChanged(type: '危机' | '机遇', title: string): boolean {
  if (!title) return false;
  return badgeStore.isChangedKey('riskOpportunity', `${type}:${title}`);
}

function dismissRiskOpportunityChanged(type: '危机' | '机遇', title: string) {
  if (!title) return;
  badgeStore.dismissChangedKey('riskOpportunity', `${type}:${title}`);
}

function isWorldChanged(key: string): boolean {
  return badgeStore.isChangedKey('world', key);
}

function dismissWorldChanged(key: string) {
  badgeStore.dismissChangedKey('world', key);
}

function isPublicOpinionChanged(key: string): boolean {
  return badgeStore.isChangedKey('publicOpinion', key);
}

function dismissPublicOpinionChanged(key: string) {
  badgeStore.dismissChangedKey('publicOpinion', key);
}

function toggleTodoSummaryExpanded() {
  const nextExpanded = !isTodoSummaryExpanded.value;
  isTodoSummaryExpanded.value = nextExpanded;
  badgeStore.setTabMuted('todoSummary', nextExpanded);
  if (nextExpanded) {
    badgeStore.markAsRead('todoSummary');
  }
}

function toggleRiskOpportunityExpanded() {
  const nextExpanded = !isRiskOpportunityExpanded.value;
  isRiskOpportunityExpanded.value = nextExpanded;
  badgeStore.setTabMuted('riskOpportunity', nextExpanded);
  if (nextExpanded) {
    badgeStore.markAsRead('riskOpportunity');
  }
}

function toggleWorldExpanded() {
  const nextExpanded = !isWorldExpanded.value;
  isWorldExpanded.value = nextExpanded;
  badgeStore.setTabMuted('world', nextExpanded);
  if (nextExpanded) {
    badgeStore.markAsRead('world');
  }
}

function togglePublicOpinionExpanded() {
  const nextExpanded = !isPublicOpinionExpanded.value;
  isPublicOpinionExpanded.value = nextExpanded;
  badgeStore.setTabMuted('publicOpinion', nextExpanded);
  if (nextExpanded) {
    badgeStore.markAsRead('publicOpinion');
  }
}

function openNotebookPanel(tab: 'crisis' | 'opportunity' | 'todo') {
  void layoutStore.openNotebookPanelWithTab(tab);
}

function openTodoItem(title: string) {
  dismissTodoChanged(title);
  openNotebookPanel('todo');
}

function openRiskOpportunityItem(tab: 'crisis' | 'opportunity', title: string) {
  dismissRiskOpportunityChanged(tab === 'crisis' ? '危机' : '机遇', title);
  openNotebookPanel(tab);
}

function getTodoStatusClass(status: string): 'not-started' | 'in-progress' | 'done' {
  if (status === '进行中') return 'in-progress';
  if (status === '已完成') return 'done';
  return 'not-started';
}

function handleNpcClick(npcId: string) {
  layoutStore.openCharacterPanelWithNpc(npcId);
}
</script>

<style scoped>
/* ===== RightPanel - 玻璃拟态信息面板 ===== */
.right-panel {
  width: 100%;
  height: 100%;
  background: transparent;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.panel-content::-webkit-scrollbar {
  width: 4px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.15);
  border-radius: 10px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--accent-primary-rgb), 0.3);
}

/* 卡片通用样式 - 玻璃拟态 */
.info-card {
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal),
    transform var(--motion-normal);
}

.info-card:hover {
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.14);
  transform: translateY(-1px);
}

.info-card-group-target {
  border-color: color-mix(in srgb, var(--accent-success) 42%, var(--card-border));
}

.info-card-group-summary {
  border-color: color-mix(in srgb, var(--accent-primary) 46%, var(--card-border));
}

.info-card-group-detail {
  border-color: color-mix(in srgb, var(--accent-secondary) 44%, var(--card-border));
}

.info-card-group-target:hover {
  border-color: color-mix(in srgb, var(--accent-success) 64%, var(--card-border));
}

.info-card-group-summary:hover {
  border-color: color-mix(in srgb, var(--accent-primary) 66%, var(--card-border));
}

.info-card-group-detail:hover {
  border-color: color-mix(in srgb, var(--accent-secondary) 64%, var(--card-border));
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent-primary);
}

.card-title-main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.right-badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(var(--accent-danger-rgb), 0.92);
  color: var(--bg-card-solid);
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--card-bg);
  pointer-events: none;
}

.right-badge.pulsing {
  animation: badgePulse 1.15s ease-in-out infinite;
}

.card-title-button {
  width: 100%;
  min-height: var(--touch-target-min);
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  justify-content: space-between;
  color: inherit;
  transition: color var(--motion-fast);
}

.card-title-button:hover {
  color: var(--text-primary);
}

.card-title-button.pulsing {
  animation: titleHeartbeat 1.15s ease-in-out infinite;
}

.card-title i {
  font-size: 13px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.chevron {
  font-size: 11px;
  color: var(--text-secondary);
  transition: transform var(--motion-fast);
}

.chevron.expanded {
  transform: rotate(180deg);
}

/* 信息网格 */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  padding: 5px 6px;
  font-size: var(--text-xs);
  line-height: 1.5;
  border-radius: var(--radius-sm);
  transition: background var(--motion-fast);
}

.info-row:hover {
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.info-row.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.info-item {
  display: block;
  width: 100%;
  min-width: 0;
  line-height: 1.5;
}

.info-item.truncate-item {
  cursor: pointer;
}

.label {
  display: inline;
  font-weight: 600;
  transition: opacity var(--motion-fast);
  white-space: nowrap;
  text-align: right;
  line-height: inherit;
  vertical-align: baseline;
  position: relative;
  top: 1px;
}

.value {
  color: var(--text-primary);
  min-width: 0;
  line-height: inherit;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.value.full-text {
  display: inline;
  line-clamp: none;
  -webkit-line-clamp: initial;
  -webkit-box-orient: initial;
  overflow: visible;
  text-overflow: initial;
  white-space: normal;
  word-break: break-word;
  vertical-align: baseline;
}

.world-rules-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.world-rule-item {
  display: block;
  line-height: 1.45;
}

/* 世界状态颜色 - HSL 精调 */
.label.power-system {
  color: hsl(271, 91%, 65%);
}
.label.gameplay {
  color: hsl(187, 92%, 41%);
}
.label.power-structure {
  color: hsl(25, 95%, 53%);
}
.label.atmosphere {
  color: hsl(330, 80%, 60%);
}
.label.values {
  color: var(--text-secondary);
}
.label.system {
  color: hsl(217, 91%, 60%);
}
.label.focus {
  color: hsl(48, 96%, 53%);
}
.label.area {
  color: hsl(140, 50%, 30%);
}

.label.target {
  color: hsl(150, 65%, 45%);
}

/* 舆情信息颜色 - 渐变层级 */
.label.global {
  color: hsl(0, 84%, 60%);
}
.label.faction {
  color: hsl(25, 95%, 53%);
}
.label.regional {
  color: hsl(48, 96%, 53%);
}
.label.local {
  color: hsl(142, 71%, 45%);
}
.label.rumor {
  color: hsl(217, 91%, 60%);
}

/* 待办与危机机遇摘要 */
.info-action-row {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.info-action-row:hover {
  background: rgba(var(--accent-primary-rgb), 0.06);
}

.info-row.pulsing {
  animation: rowHeartbeat 1.15s ease-in-out infinite;
}

.todo-main-line {
  width: 100%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.todo-title {
  min-width: 0;
  flex: 1 1 120px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-primary);
  word-break: break-word;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.todo-status-box {
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-radius: 2px;
  border: 1.5px solid currentColor;
  margin-top: 1px;
}

.todo-status-box-not-started {
  background: transparent;
}

.todo-status-box-in-progress {
  background: currentColor;
}

.todo-status-box-done {
  background: currentColor;
}

.todo-status-title-not-started {
  opacity: 0.88;
}

.todo-status-title-in-progress {
  opacity: 1;
}

.todo-status-title-done {
  opacity: 0.78;
}

.todo-meta,
.todo-deadline {
  font-size: 11px;
  color: var(--text-secondary);
}

.todo-meta {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

.todo-deadline {
  flex: 0 1 auto;
  white-space: nowrap;
  margin-left: auto;
}

.todo-status-tag,
.todo-priority-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 6px;
  border-radius: 999px;
}

.todo-status-not-started {
  color: var(--text-secondary);
  background: transparent;
}

.todo-status-in-progress {
  color: var(--accent-warning);
  background: transparent;
  font-weight: 600;
}

.todo-status-done {
  color: var(--accent-success);
  background: transparent;
}

.todo-priority-1 {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--text-secondary) 14%, transparent);
}

.todo-priority-2 {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
}

.todo-priority-3 {
  color: var(--accent-warning);
  background: rgba(var(--accent-warning-rgb), 0.14);
}

.todo-priority-4 {
  color: var(--accent-danger);
  background: rgba(var(--accent-danger-rgb), 0.14);
  font-weight: 600;
}

.todo-priority-title-1 {
  color: var(--text-secondary);
}

.todo-priority-title-2 {
  color: var(--accent-primary);
}

.todo-priority-title-3 {
  color: var(--accent-warning);
}

.todo-priority-title-4 {
  color: var(--accent-danger);
}

.summary-title {
  font-size: var(--text-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.summary-severity-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
}

.summary-severity-1 {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--text-secondary) 14%, transparent);
}

.summary-severity-2 {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
}

.summary-severity-3 {
  color: var(--accent-warning);
  background: rgba(var(--accent-warning-rgb), 0.14);
}

.summary-severity-4 {
  color: var(--accent-danger);
  background: rgba(var(--accent-danger-rgb), 0.14);
  font-weight: 600;
}

.summary-value {
  border-radius: 6px;
  padding: 2px 6px;
}

.summary-severity-value-1 {
  background: color-mix(in srgb, var(--text-secondary) 8%, transparent);
}

.summary-severity-value-2 {
  background: rgba(var(--accent-primary-rgb), 0.06);
}

.summary-severity-value-3 {
  background: rgba(var(--accent-warning-rgb), 0.08);
}

.summary-severity-value-4 {
  background: rgba(var(--accent-danger-rgb), 0.08);
}

.summary-opportunity-value {
  background: rgba(var(--accent-success-rgb), 0.08);
}

.summary-title.danger {
  color: var(--accent-danger);
}

.summary-title.success {
  color: var(--accent-success);
}

@keyframes badgePulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 2px var(--card-bg);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 2px var(--card-bg);
  }
}

@keyframes titleHeartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.01);
  }
  60% {
    transform: scale(0.995);
  }
}

@keyframes rowHeartbeat {
  0%,
  100% {
    transform: scale(1);
    box-shadow: none;
  }
  50% {
    transform: scale(1.01);
    box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-title-button.pulsing,
  .right-badge.pulsing,
  .info-row.pulsing {
    animation: none !important;
  }
}

@media (max-width: 768px) {
  .panel-content {
    padding: 8px;
    gap: 8px;
  }

  .info-card {
    padding: 10px;
  }

  .info-row.two-col {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .info-item {
    gap: 8px;
  }

  .label {
    width: 62px;
    min-width: 62px;
  }

  .value {
    line-clamp: 3;
    -webkit-line-clamp: 3;
  }

  .value.full-text {
    line-clamp: none;
    -webkit-line-clamp: initial;
  }
}

@media (max-width: 480px) {
  .card-title {
    margin-bottom: 6px;
  }

  .card-title-main {
    gap: 4px;
  }

  .right-badge {
    min-width: 14px;
    height: 14px;
    line-height: 14px;
    font-size: 9px;
    padding: 0 3px;
  }

  .info-row {
    padding: 6px;
  }

  .info-item {
    gap: 5px;
  }

  .label {
    width: 58px;
    min-width: 58px;
    font-size: 10px;
  }

  .value {
    font-size: 11px;
    line-height: 1.45;
  }
}
</style>
