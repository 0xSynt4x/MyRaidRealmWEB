<template>
  <div class="notebook-panel">
    <!-- 标签按钮栏 -->
    <div class="notebook-tabs">
      <button :class="{ active: currentTab === 'crisis' }" @click="currentTab = 'crisis'">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {{ t('notebook.tabCrisis') }} ({{ crisisCount }})
      </button>
      <button :class="{ active: currentTab === 'opportunity' }" @click="currentTab = 'opportunity'">
        <i class="fa-regular fa-lightbulb"></i>
        {{ t('notebook.tabOpportunity') }} ({{ opportunityCount }})
      </button>
      <button :class="{ active: currentTab === 'todo' }" @click="currentTab = 'todo'">
        <i class="fa-regular fa-square-check"></i>
        {{ t('notebook.tabTodo') }} ({{ todoCount }})
      </button>
    </div>

    <!-- 潜在危机内容 -->
    <div v-show="currentTab === 'crisis'" class="tab-content">
      <div v-if="hasCrisis" class="two-column-grid">
        <div
          v-for="[key, crisis] in sortedCrisis"
          :key="key"
          :class="[
            'compact-card',
            'crisis-card',
            `severity-level-${getSeverityLevel(crisis.严重程度)}`,
            { pulsing: isNotebookChanged('crisis', key) },
          ]"
          @mouseenter="dismissNotebookChanged('crisis', key)"
          @click="dismissNotebookChanged('crisis', key)"
        >
          <!-- 删除按钮 -->
          <button class="card-delete-btn" :title="t('common.delete')" @click.stop="openDeleteConfirm('crisis', key)">
            ×
          </button>
          <div class="card-title-row">
            <span :class="['icon', `severity-icon-level-${getSeverityLevel(crisis.严重程度)}`]">{{
              getSeverityIcon(crisis.严重程度)
            }}</span>
            <span class="title">{{ key }}</span>
          </div>
          <div class="card-badge-row">
            <span :class="['badge', 'severity', `severity-badge-level-${getSeverityLevel(crisis.严重程度)}`]">{{
              enumDisplay('risk.severity', crisis.严重程度, crisis.严重程度)
            }}</span>
          </div>
          <div class="card-field-block">
            <div class="field-label">{{ t('notebook.expectedImpact') }}</div>
            <div class="field-value">{{ crisis.预计影响时间 }}</div>
          </div>
          <div class="card-field-block">
            <div class="field-label">{{ t('notebook.responseMeasures') }}</div>
            <div class="field-value">{{ crisis.应对措施 || '-' }}</div>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">{{ t('notebook.noCrisis') }}</div>
    </div>

    <!-- 当前机遇内容 -->
    <div v-show="currentTab === 'opportunity'" class="tab-content">
      <div v-if="hasOpportunity" class="two-column-grid">
        <div
          v-for="[key, opportunity] in sortedOpportunity"
          :key="key"
          :class="['compact-card', 'opportunity-card', { pulsing: isNotebookChanged('opportunity', key) }]"
          @mouseenter="dismissNotebookChanged('opportunity', key)"
          @click="dismissNotebookChanged('opportunity', key)"
        >
          <!-- 删除按钮 -->
          <button
            class="card-delete-btn"
            :title="t('common.delete')"
            @click.stop="openDeleteConfirm('opportunity', key)"
          >
            ×
          </button>
          <div class="card-title-row">
            <span class="icon">💚</span>
            <span class="title">{{ key }}</span>
          </div>
          <div class="card-badge-row">
            <span class="badge timeliness">{{
              enumDisplay('opportunity.timeliness', opportunity.时效性, opportunity.时效性)
            }}</span>
          </div>
          <div class="card-field-block">
            <div class="field-label">{{ t('notebook.requiredResources') }}</div>
            <div class="field-value">{{ opportunity.所需资源 || '-' }}</div>
          </div>
          <div class="card-field-block">
            <div class="field-label">{{ t('notebook.actionPlan') }}</div>
            <div class="field-value">{{ opportunity.行动计划 || '-' }}</div>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">{{ t('notebook.noOpportunity') }}</div>
    </div>

    <!-- 待办事项内容 -->
    <div v-show="currentTab === 'todo'" class="tab-content">
      <div v-if="hasTodo" class="two-column-grid">
        <div
          v-for="[key, todo] in sortedTodo"
          :key="key"
          :class="[
            'compact-card',
            'todo-card',
            `priority-level-${getPriorityLevel(todo.优先级)}`,
            `todo-status-${getTodoStatusClass(todo.状态)}`,
            { pulsing: isNotebookChanged('todo', key) },
          ]"
          @mouseenter="dismissNotebookChanged('todo', key)"
          @click="dismissNotebookChanged('todo', key)"
        >
          <!-- 删除按钮 -->
          <button class="card-delete-btn" :title="t('common.delete')" @click.stop="openDeleteConfirm('todo', key)">
            ×
          </button>
          <div class="card-header">
            <span class="icon">{{ getStatusIcon(todo.状态) }}</span>
            <span class="title">{{ key }}</span>
            <span :class="['badge', 'priority', `priority-level-${getPriorityLevel(todo.优先级)}`]">{{
              enumDisplay('todo.priority', todo.优先级, todo.优先级)
            }}</span>
          </div>
          <div class="card-fields">
            <span class="field-pair">
              <span class="label">{{ t('notebook.deadline') }}</span>
              <span class="value">{{ todo.截止时间 || '-' }}</span>
            </span>
            <span class="divider">|</span>
            <span class="field-pair">
              <span class="label">{{ t('notebook.status') }}</span>
              <span :class="['value', 'status-value', `status-value-${getTodoStatusClass(todo.状态)}`]">{{
                enumDisplay('todo.status', todo.状态, todo.状态)
              }}</span>
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-hint">{{ t('notebook.noTodo') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import { useDelete } from '../../composables/useDelete';
import { useBadgeStore } from '../../stores/badge';
import { useLayoutStore } from '../../stores/layout';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { getSeverityIcon, getStatusIcon } from '../../utils/emoji';
import { getPriorityLevel, getSeverityLevel } from '../../utils/format';

const store = useStatDataStore();
const statDataActions = useStatDataActions();
const { data } = storeToRefs(store);
const { deleteItem } = useDelete();
const { t, enumDisplay } = useI18n();

const layoutStore = useLayoutStore();
const { pendingNotebookTab } = storeToRefs(layoutStore);
const badgeStore = useBadgeStore();

// 当前选中的标签页
const currentTab = ref<'crisis' | 'opportunity' | 'todo'>('crisis');

const sortedCrisis = computed(() => {
  return _(data.value.玩家?.记事本?.潜在危机 || {})
    .entries()
    .sortBy('[1].$time')
    .reverse()
    .value();
});

const sortedOpportunity = computed(() => {
  return _(data.value.玩家?.记事本?.当前机遇 || {})
    .entries()
    .sortBy('[1].$time')
    .reverse()
    .value();
});

const sortedTodo = computed(() => {
  return _(data.value.玩家?.记事本?.待办事项 || {})
    .entries()
    .sortBy('[1].$time')
    .reverse()
    .value();
});

const hasCrisis = computed(() => sortedCrisis.value.length > 0);
const hasOpportunity = computed(() => sortedOpportunity.value.length > 0);
const hasTodo = computed(() => sortedTodo.value.length > 0);

const crisisCount = computed(() => sortedCrisis.value.length);
const opportunityCount = computed(() => sortedOpportunity.value.length);
const todoCount = computed(() => sortedTodo.value.length);

// 删除（使用统一删除函数）
function openDeleteConfirm(type: 'crisis' | 'opportunity' | 'todo', key: string) {
  const typeNameMap = { crisis: '潜在危机', opportunity: '当前机遇', todo: '待办事项' } as const;
  const typePathMap = { crisis: '潜在危机', opportunity: '当前机遇', todo: '待办事项' } as const;

  deleteItem({
    typeName: typeNameMap[type],
    displayName: key,
    onDelete: () =>
      statDataActions.removeStatDataAtPath(`notebook.delete.${type}`, `玩家.记事本.${typePathMap[type]}.${key}`),
  });
}

function getTodoStatusClass(status: string): 'not-started' | 'in-progress' | 'done' {
  if (status === '进行中') return 'in-progress';
  if (status === '已完成') return 'done';
  return 'not-started';
}

function getNotebookChangedKey(type: 'crisis' | 'opportunity' | 'todo', key: string): string {
  if (type === 'crisis') return `危机:${key}`;
  if (type === 'opportunity') return `机遇:${key}`;
  return `待办:${key}`;
}

function isNotebookChanged(type: 'crisis' | 'opportunity' | 'todo', key: string): boolean {
  if (!key) return false;
  return badgeStore.isChangedKey('notebook', getNotebookChangedKey(type, key));
}

function dismissNotebookChanged(type: 'crisis' | 'opportunity' | 'todo', key: string) {
  if (!key) return;
  badgeStore.dismissChangedKey('notebook', getNotebookChangedKey(type, key));
}

watch(
  pendingNotebookTab,
  tab => {
    if (!tab) return;
    currentTab.value = tab;
    layoutStore.clearPendingNotebookTab();
  },
  { immediate: true },
);
</script>

<style scoped>
.notebook-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-primary);
  min-width: 0;
  overflow: hidden;
}

/* 标签按钮栏 */
.notebook-tabs {
  display: flex;
  gap: 8px;
  padding: 10px 6px;
  border-bottom: 2px solid var(--border-light);
  background: var(--bg-card);
  flex-shrink: 0;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.notebook-tabs::-webkit-scrollbar {
  display: none;
}

.notebook-tabs button {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--text-sm);
  font-family: var(--font-base);
  color: var(--text-secondary);
  transition: all 200ms ease;
  border-radius: 6px;
  overflow: hidden;
  white-space: nowrap;
}

.notebook-tabs button:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.notebook-tabs button.active {
  background: var(--accent-primary);
  color: white;
  font-weight: 600;
}

.notebook-tabs button i {
  font-size: 14px;
}

/* 内容区域 */
.tab-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 10px 6px;
}

/* 两列网格 */
.two-column-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 6px;
  overflow: hidden;
}

/* 响应式：窄屏单列 */
@media (max-width: 900px) {
  .notebook-tabs button {
    flex: 0 0 auto;
    padding: 9px 10px;
    font-size: var(--text-xs);
  }

  .two-column-grid {
    grid-template-columns: 1fr;
  }
}

/* 紧凑卡片 */
.compact-card {
  --note-accent: var(--accent-primary);
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--card-border);
  border-top: 3px solid var(--note-accent);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal),
    transform var(--motion-normal);
  position: relative;
  min-width: 0;
  box-shadow: var(--card-shadow);
}

.compact-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
}

.compact-card.pulsing {
  animation: cardHeartbeat 1.15s ease-in-out infinite;
  box-shadow:
    var(--card-shadow-hover),
    inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.2);
}

/* 卡片删除按钮 - 组件特有覆盖(使用全局 .card-delete-btn 基础样式) */
.card-delete-btn {
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  z-index: 3;
  transform: none;
}

.compact-card:hover .card-delete-btn {
  opacity: 1;
}

/* 卡片类型颜色 */
.compact-card.crisis-card {
  --note-accent: var(--accent-danger);
}

.compact-card.opportunity-card {
  --note-accent: var(--accent-success);
}

.compact-card.todo-card {
  --note-accent: var(--accent-primary);
}

/* 严重程度等级颜色 */
.compact-card.severity-level-1 {
  --note-accent: var(--text-secondary);
}

.compact-card.severity-level-2 {
  --note-accent: var(--accent-primary);
}

.compact-card.severity-level-3 {
  --note-accent: var(--accent-warning);
}

.compact-card.severity-level-4 {
  --note-accent: var(--accent-danger);
}

.card-badge-row .badge.severity-badge-level-1 {
  background: color-mix(in srgb, var(--text-secondary) 14%, transparent);
  color: var(--text-secondary);
}

.card-badge-row .badge.severity-badge-level-2 {
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.card-badge-row .badge.severity-badge-level-3 {
  background: rgba(var(--accent-warning-rgb), 0.14);
  color: var(--accent-warning);
}

.card-badge-row .badge.severity-badge-level-4 {
  background: rgba(var(--accent-danger-rgb), 0.14);
  color: var(--accent-danger);
  font-weight: 600;
}

.card-title-row .severity-icon-level-1 {
  color: var(--text-secondary);
}

.card-title-row .severity-icon-level-2 {
  color: var(--accent-primary);
}

.card-title-row .severity-icon-level-3 {
  color: var(--accent-warning);
}

.card-title-row .severity-icon-level-4 {
  color: var(--accent-danger);
}

/* 卡片标题行（仅标题+图标） - 用于危机和机遇卡片 */
.card-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.card-title-row .icon {
  font-size: 14px;
  flex-shrink: 0;
}

.card-title-row .title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  line-height: 1.3;
}

/* 卡片标签行（时效性/严重程度） - 用于危机和机遇卡片 */
.card-badge-row {
  margin-bottom: 8px;
}

.card-badge-row .badge {
  font-size: var(--text-xs);
  padding: 2px 8px;
  background: var(--bg-primary);
  border-radius: 10px;
  color: var(--text-secondary);
  display: inline-block;
}

.card-badge-row .badge.severity {
  background: rgba(var(--accent-danger-rgb), 0.1);
  color: var(--accent-danger);
}

.card-badge-row .badge.timeliness {
  background: rgba(var(--accent-success-rgb), 0.1);
  color: var(--accent-success);
}

/* 卡片字段块（标签名独占一行，内容独占一行） - 用于危机和机遇卡片 */
.card-field-block {
  margin-bottom: 6px;
}

.card-field-block:last-child {
  margin-bottom: 0;
}

.card-field-block .field-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 500;
  margin-bottom: 2px;
}

.card-field-block .field-value {
  font-size: var(--text-xs);
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-all;
  overflow-wrap: break-word;
}

/* 待办事项卡片头部 - 保持原样式 */
.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.card-header .icon {
  font-size: 14px;
  flex-shrink: 0;
}

.card-header .title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  line-height: 1.3;
}

.card-header .badge {
  font-size: var(--text-xs);
  padding: 2px 8px;
  background: var(--bg-primary);
  border-radius: 10px;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.card-header .badge.priority {
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
}

/* 待办事项优先级等级颜色 */
.card-header .badge.priority-level-1 {
  background: color-mix(in srgb, var(--text-secondary) 14%, transparent);
  color: var(--text-secondary);
}

.card-header .badge.priority-level-2 {
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.card-header .badge.priority-level-3 {
  background: rgba(var(--accent-warning-rgb), 0.14);
  color: var(--accent-warning);
}

.card-header .badge.priority-level-4 {
  background: rgba(var(--accent-danger-rgb), 0.14);
  color: var(--accent-danger);
  font-weight: 600;
}

.compact-card.todo-card.priority-level-1 {
  --note-accent: var(--text-secondary);
}

.compact-card.todo-card.priority-level-2 {
  --note-accent: var(--accent-primary);
}

.compact-card.todo-card.priority-level-3 {
  --note-accent: var(--accent-warning);
}

.compact-card.todo-card.priority-level-4 {
  --note-accent: var(--accent-danger);
}

.compact-card.todo-card.priority-level-1 .card-header .icon {
  color: var(--text-secondary);
}

.compact-card.todo-card.priority-level-2 .card-header .icon {
  color: var(--accent-primary);
}

.compact-card.todo-card.priority-level-3 .card-header .icon {
  color: var(--accent-warning);
}

.compact-card.todo-card.priority-level-4 .card-header .icon {
  color: var(--accent-danger);
}

/* 待办事项卡片字段区域 - 保持横向布局 */
.card-fields {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: var(--text-xs);
  line-height: 1.5;
  flex-wrap: wrap;
}

.field-pair {
  display: inline-flex;
  gap: 4px;
}

.field-pair .label {
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.field-pair .value {
  color: var(--text-primary);
}

.divider {
  color: var(--text-secondary);
  opacity: 0.5;
}

.status-value {
  display: inline-block;
  padding: 0 6px;
  border-radius: 4px;
}

.status-value-not-started {
  color: var(--text-secondary);
  background: transparent;
}

.status-value-in-progress {
  color: var(--accent-warning);
  background: transparent;
  font-weight: 500;
}

.status-value-done {
  color: var(--accent-success);
  background: repeating-linear-gradient(
    -45deg,
    rgba(var(--accent-success-rgb), 0.1) 0 4px,
    rgba(var(--accent-success-rgb), 0.02) 4px 8px
  );
  font-weight: 600;
}

.compact-card.todo-status-not-started,
.compact-card.todo-status-in-progress {
  background-image: none;
}

.compact-card.todo-status-done {
  background-image: repeating-linear-gradient(
    -45deg,
    rgba(var(--accent-success-rgb), 0.05) 0 6px,
    transparent 6px 12px
  );
}

.compact-card.todo-status-done .card-header .title {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  text-decoration-color: rgba(var(--accent-success-rgb), 0.6);
}

@keyframes cardHeartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.012);
  }
  60% {
    transform: scale(0.996);
  }
}

@media (prefers-reduced-motion: reduce) {
  .compact-card.pulsing {
    animation: none !important;
  }
}

/* 空状态提示 */
.empty-hint {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
}
</style>
