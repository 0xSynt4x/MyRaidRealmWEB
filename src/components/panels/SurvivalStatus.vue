<template>
  <div class="survival-mini-row">
    <!-- 血量 - 始终显示 -->
    <div class="mini-bar" :title="`${t('survival.health')}: ${data.玩家.生存状态.血量}`">
      <i class="ti ti-heart mini-icon"></i>
      <div class="mini-progress">
        <div class="mini-fill health" :style="{ width: `${data.玩家.生存状态.血量}%` }"></div>
      </div>
    </div>

    <!-- 体力 - 始终显示 -->
    <div class="mini-bar" :title="`${t('survival.stamina')}: ${data.玩家.生存状态.体力值}`">
      <i class="ti ti-bolt mini-icon"></i>
      <div class="mini-progress">
        <div class="mini-fill stamina" :style="{ width: `${data.玩家.生存状态.体力值}%` }"></div>
      </div>
    </div>

    <!-- 饥饿 - 仅生存模式显示 -->
    <div
      v-if="survivalMode === '生存模式'"
      class="mini-bar"
      :title="`${t('survival.hunger')}: ${data.玩家.生存状态.饥饿值}`"
    >
      <i class="ti ti-meat mini-icon"></i>
      <div class="mini-progress">
        <div class="mini-fill hunger" :style="{ width: `${data.玩家.生存状态.饥饿值}%` }"></div>
      </div>
    </div>

    <!-- 口渴 - 仅生存模式显示 -->
    <div
      v-if="survivalMode === '生存模式'"
      class="mini-bar"
      :title="`${t('survival.thirst')}: ${data.玩家.生存状态.口渴值}`"
    >
      <i class="ti ti-droplet mini-icon"></i>
      <div class="mini-progress">
        <div class="mini-fill thirst" :style="{ width: `${data.玩家.生存状态.口渴值}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useI18n } from '../../i18n';
import { useStatDataStore } from '../../stores/statData';

const store = useStatDataStore();
const { data } = storeToRefs(store);
const { t } = useI18n();

const survivalMode = computed(() => data.value.设置?.生存系统模式 ?? '关闭');
</script>

<style scoped>
/* ===== SurvivalStatus - 迷你生存状态条 =====
   与关注角色（NpcSurvivalStatus）的迷你条同款：图标 + 4px 细条，无文字标签/数值。
   外层卡片壳与标题由 RightPanel 统一提供，这里只负责四条迷你条内容。 */
.survival-mini-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 6px;
}

.mini-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.mini-icon {
  font-size: calc(var(--text-xs) - 2px);
  flex-shrink: 0;
  line-height: 1;
}

.mini-progress {
  flex: 1;
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
  min-width: 0;
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
</style>
