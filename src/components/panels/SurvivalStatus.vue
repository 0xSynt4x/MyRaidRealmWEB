<template>
  <section v-if="survivalMode !== '关闭'" class="info-card survival-card">
    <h3 class="card-title">
      <i class="fa-solid fa-heart-pulse"></i>
      {{ t('survival.title') }}
    </h3>
    <div class="survival-grid">
      <!-- 血量 - 始终显示 -->
      <div class="survival-item">
        <div class="survival-header">
          <span class="survival-icon health">❤️</span>
          <span class="survival-label">{{ t('survival.health') }}</span>
          <span class="survival-value">{{ data.玩家.生存状态.血量 }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill health" :style="{ width: `${data.玩家.生存状态.血量}%` }"></div>
        </div>
      </div>

      <!-- 体力 - 始终显示 -->
      <div class="survival-item">
        <div class="survival-header">
          <span class="survival-icon stamina">⚡</span>
          <span class="survival-label">{{ t('survival.stamina') }}</span>
          <span class="survival-value">{{ data.玩家.生存状态.体力值 }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill stamina" :style="{ width: `${data.玩家.生存状态.体力值}%` }"></div>
        </div>
      </div>

      <!-- 饥饿 - 仅生存模式显示 -->
      <div v-if="survivalMode === '生存模式'" class="survival-item">
        <div class="survival-header">
          <span class="survival-icon hunger">🍖</span>
          <span class="survival-label">{{ t('survival.hunger') }}</span>
          <span class="survival-value">{{ data.玩家.生存状态.饥饿值 }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill hunger" :style="{ width: `${data.玩家.生存状态.饥饿值}%` }"></div>
        </div>
      </div>

      <!-- 口渴 - 仅生存模式显示 -->
      <div v-if="survivalMode === '生存模式'" class="survival-item">
        <div class="survival-header">
          <span class="survival-icon thirst">💧</span>
          <span class="survival-label">{{ t('survival.thirst') }}</span>
          <span class="survival-value">{{ data.玩家.生存状态.口渴值 }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill thirst" :style="{ width: `${data.玩家.生存状态.口渴值}%` }"></div>
        </div>
      </div>
    </div>
  </section>
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
/* ===== SurvivalStatus - 发光进度条 + 低值脉冲 ===== */
.survival-card {
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal);
}

.survival-card:hover {
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.14);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: hsl(0, 84%, 60%);
}

.card-title i {
  font-size: 13px;
  animation: pulse-heart 2s ease-in-out infinite;
}

@keyframes pulse-heart {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

.survival-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.survival-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  transition: background var(--motion-fast);
}

.survival-item:hover {
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.survival-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
}

.survival-icon {
  font-size: 12px;
}

.survival-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.survival-value {
  margin-left: auto;
  font-weight: 700;
  font-size: 11px;
  font-family: var(--font-mono);
  transition: color var(--transition-normal);
}

/* 进度条 - 发光效果 */
.progress-bar {
  height: 6px;
  background: var(--border-light);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s var(--ease-out-expo);
  position: relative;
  will-change: width;
}

/* 进度条上的光点移动 */
.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4));
  border-radius: 6px;
}

/* 血量 - 红色渐变 + 发光 */
.progress-fill.health {
  background: linear-gradient(90deg, hsl(0, 75%, 55%), hsl(0, 84%, 50%));
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
}
.survival-item:has(.progress-fill.health) .survival-value {
  color: hsl(0, 84%, 60%);
}

/* 体力 - 绿色渐变 + 发光 */
.progress-fill.stamina {
  background: linear-gradient(90deg, hsl(145, 63%, 48%), hsl(142, 71%, 35%));
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.3);
}
.survival-item:has(.progress-fill.stamina) .survival-value {
  color: hsl(142, 71%, 45%);
}

/* 饥饿 - 琥珀渐变 + 发光 */
.progress-fill.hunger {
  background: linear-gradient(90deg, hsl(48, 96%, 53%), hsl(38, 92%, 50%));
  box-shadow: 0 0 8px rgba(234, 179, 8, 0.3);
}
.survival-item:has(.progress-fill.hunger) .survival-value {
  color: hsl(25, 95%, 53%);
}

/* 口渴 - 蓝色渐变 + 发光 */
.progress-fill.thirst {
  background: linear-gradient(90deg, hsl(217, 85%, 60%), hsl(225, 80%, 55%));
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}
.survival-item:has(.progress-fill.thirst) .survival-value {
  color: hsl(217, 91%, 60%);
}

/* 低值脉冲动画 - 当进度条宽度较小时通过 JS 或 CSS 触发 */
@keyframes low-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 低值时进度条闪烁 */
.progress-fill.health[style*='width: 1'],
.progress-fill.health[style*='width: 2'],
.progress-fill.stamina[style*='width: 1'],
.progress-fill.stamina[style*='width: 2'],
.progress-fill.hunger[style*='width: 1'],
.progress-fill.hunger[style*='width: 2'],
.progress-fill.thirst[style*='width: 1'],
.progress-fill.thirst[style*='width: 2'] {
  animation: low-pulse 1.5s ease-in-out infinite;
}
</style>
