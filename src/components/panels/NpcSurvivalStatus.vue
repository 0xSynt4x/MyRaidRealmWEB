<template>
  <div v-if="followedNpcs.length > 0" class="npc-follow-container">
    <button
      v-for="npc in followedNpcs"
      :key="npc.id"
      class="npc-compact-card npc-compact-btn"
      type="button"
      @click="emit('npc-click', npc.id)"
    >
      <!-- 第1行：姓名 + 位置 -->
      <div class="npc-header">
        <span class="follow-star">⭐</span>
        <span class="npc-name">{{ npc.姓名 }}</span>
        <span class="npc-location" :title="npc.个人信息?.当前位置 || t('common.unknown')">
          · 📍{{ npc.个人信息?.当前位置 || t('common.unknown') }}
        </span>
      </div>

      <!-- 第2行：迷你生存状态条（根据模式显示） -->
      <div v-if="survivalMode !== '关闭'" class="survival-mini-row">
        <!-- 血量 - 始终显示 -->
        <div class="mini-bar" :title="`${t('survival.health')}: ${npc.生存状态?.血量 ?? 100}`">
          <span class="mini-icon">❤️</span>
          <div class="mini-progress">
            <div class="mini-fill health" :style="{ width: `${npc.生存状态?.血量 ?? 100}%` }"></div>
          </div>
        </div>

        <!-- 体力 - 始终显示 -->
        <div class="mini-bar" :title="`${t('survival.stamina')}: ${npc.生存状态?.体力值 ?? 100}`">
          <span class="mini-icon">⚡</span>
          <div class="mini-progress">
            <div class="mini-fill stamina" :style="{ width: `${npc.生存状态?.体力值 ?? 100}%` }"></div>
          </div>
        </div>

        <!-- 饥饿 - 仅生存模式显示 -->
        <div
          v-if="survivalMode === '生存模式'"
          class="mini-bar"
          :title="`${t('survival.hunger')}: ${npc.生存状态?.饥饿值 ?? 100}`"
        >
          <span class="mini-icon">🍖</span>
          <div class="mini-progress">
            <div class="mini-fill hunger" :style="{ width: `${npc.生存状态?.饥饿值 ?? 100}%` }"></div>
          </div>
        </div>

        <!-- 口渴 - 仅生存模式显示 -->
        <div
          v-if="survivalMode === '生存模式'"
          class="mini-bar"
          :title="`${t('survival.thirst')}: ${npc.生存状态?.口渴值 ?? 100}`"
        >
          <span class="mini-icon">💧</span>
          <div class="mini-progress">
            <div class="mini-fill thirst" :style="{ width: `${npc.生存状态?.口渴值 ?? 100}%` }"></div>
          </div>
        </div>
      </div>

      <!-- 第3行：好感/信任 + 状态（状态占用更多空间） -->
      <div class="npc-info-row">
        <span class="info-item" :class="getFavorClass(npc.关系数据?.好感度 || 0)">
          💕{{ npc.关系数据?.好感度 || 0 }}
        </span>
        <span class="info-item" :class="getTrustClass(npc.关系数据?.信任度 || 0)">
          🤝{{ npc.关系数据?.信任度 || 0 }}
        </span>
        <span class="info-item status" :title="npc.个人信息?.当前状态 || t('common.normal')">
          💬{{ npc.个人信息?.当前状态 || t('common.normal') }}
        </span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from '../../i18n';
import { useStatDataStore } from '../../stores/statData';
import { getFavorClass, getTrustClass } from '../../utils/npcMetrics';

const emit = defineEmits<{
  (event: 'npc-click', npcId: string): void;
}>();

const store = useStatDataStore();
const { data } = storeToRefs(store);
const { t } = useI18n();

const survivalMode = computed(() => data.value.设置?.生存系统模式 ?? '关闭');

const followedNpcs = computed(() => {
  return _(data.value.人物档案 || {})
    .entries()
    .filter(([, npc]) => npc._关注)
    .map(([id, npc]) => ({ id, ...npc }))
    .value();
});
</script>

<style scoped>
.npc-follow-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.npc-compact-card {
  background: var(--card-bg);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  box-shadow: var(--card-shadow);
  border: 1px solid var(--card-border);
  border-left: 2px solid #fbbf24;
  transition:
    box-shadow var(--motion-fast),
    border-color var(--motion-fast),
    transform var(--motion-fast);
}

.npc-compact-btn {
  width: 100%;
  border: none;
  text-align: left;
  cursor: pointer;
}

.npc-compact-btn:hover {
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
  transform: translateY(-1px);
}

/* 第1行：姓名 */
.npc-header {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  font-size: var(--text-xs);
  margin-bottom: 4px;
}

.follow-star {
  font-size: calc(var(--text-xs) - 1px);
  flex-shrink: 0;
}

.npc-name {
  font-weight: 600;
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.npc-location {
  color: var(--text-secondary);
  font-size: calc(var(--text-xs) - 1px);
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

/* 第2行：迷你生存状态条 */
.survival-mini-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 6px;
  margin-bottom: 4px;
}

.mini-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
}

.mini-icon {
  font-size: calc(var(--text-xs) - 2px);
}

.mini-progress {
  flex: 1;
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.mini-fill.health {
  background: linear-gradient(90deg, #eb5858, #dc2626);
}
.mini-fill.stamina {
  background: linear-gradient(90deg, #31c467, #16a34a);
}
.mini-fill.hunger {
  background: linear-gradient(90deg, #eab308, #ca8a04);
}
.mini-fill.thirst {
  background: linear-gradient(90deg, #5994f3, #306beb);
}

/* 第3行：信息行 */
.npc-info-row {
  display: flex;
  gap: 6px;
  font-size: calc(var(--text-xs) - 1px);
  align-items: center;
  min-width: 0;
  flex-wrap: nowrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 1px;
  white-space: nowrap;
  flex-shrink: 0;
}

.info-item.status {
  flex: 1 1 auto;
  color: var(--text-secondary);
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 好感度/信任度颜色 */
.info-item.favor-high,
.info-item.trust-high {
  color: var(--accent-success);
  font-weight: 600;
}

.info-item.favor-medium,
.info-item.trust-medium {
  color: var(--accent-primary);
}

.info-item.favor-neutral,
.info-item.trust-neutral {
  color: var(--text-secondary);
}

.info-item.favor-low,
.info-item.trust-low {
  color: var(--accent-danger);
  font-weight: 600;
}
@media (max-width: 768px) {
  .npc-follow-container {
    gap: 6px;
  }

  .npc-compact-card {
    padding: 7px 8px;
  }

  .npc-location {
    font-size: calc(var(--text-xs) - 2px);
  }
}

@media (max-width: 480px) {
  .survival-mini-row {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .npc-header,
  .npc-info-row {
    gap: 3px 6px;
  }

  .info-item {
    font-size: calc(var(--text-xs) - 1px);
  }
}
</style>
