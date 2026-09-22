<template>
  <Transition name="snapshot-fade">
    <div v-if="visible" class="snapshot-overlay" @click.self="handleClose">
      <div class="snapshot-dialog" role="dialog" aria-modal="true" :aria-label="t('setup.home.snapshotPickerTitle')">
        <div class="dialog-header">
          <div class="header-icon">
            <i class="ti ti-device-floppy"></i>
          </div>
          <span class="header-title">{{ t('setup.home.snapshotPickerTitle') }}</span>
          <button
            type="button"
            class="close-btn"
            :title="t('setup.home.snapshotPickerClose')"
            :aria-label="t('setup.home.snapshotPickerClose')"
            @click="handleClose"
          >
            <i class="ti ti-x"></i>
          </button>
        </div>

        <!-- 空态：没有存档时也只给一句提示，不再额外弹 toast -->
        <p v-if="visibleArchives.length === 0" class="dialog-empty">{{ t('setup.home.snapshotPickerEmpty') }}</p>

        <ul v-else class="snapshot-list">
          <li v-for="archive in visibleArchives" :key="archive.id">
            <button
              type="button"
              class="snapshot-item"
              :aria-label="t('setup.home.snapshotPickerItemAria', { summary: archive.summary })"
              @click="handleSelect(archive.id)"
            >
              <!-- 摘要直接用存档自带的 summary（与设置页存档区同一份格式）。
                   这里不走 formatArchiveSummaryForToast：那个是给 toast 的 HTML 转义用的，
                   在模板里会被 Vue 再转义一次，变成字面的 &amp; -->
              <span class="snapshot-summary">{{ archive.summary }}</span>
              <span class="snapshot-time">{{ formatCreatedAt(archive.createdAt) }}</span>
            </button>
          </li>
        </ul>

        <p v-if="hasMoreArchives" class="dialog-hint">
          {{ t('setup.home.snapshotPickerMoreHint', { count: MAX_VISIBLE_SNAPSHOTS }) }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue';
import { useI18n } from '../../../../i18n';
import type { StandaloneArchiveListItem } from '../../../../utils/archive';

/**
 * 浮层里最多列几个快照。
 * 取 5 的理由：5 行 + 头部的高度在 640px 高的视口里放得下、不出滚动条，
 * 再多就必须滚动，观感会开始接近设置页那套存档管理，与「只挑一个恢复」的定位不符。
 */
const MAX_VISIBLE_SNAPSHOTS = 5;

const props = defineProps<{
  visible: boolean;
  /** 完整快照列表（已按创建时间倒序），截取由本组件负责 */
  archives: StandaloneArchiveListItem[];
}>();

const emit = defineEmits<{
  close: [];
  select: [id: string];
}>();

const { t } = useI18n();

const visibleArchives = computed(() => props.archives.slice(0, MAX_VISIBLE_SNAPSHOTS));
const hasMoreArchives = computed(() => props.archives.length > MAX_VISIBLE_SNAPSHOTS);

/** 时间统一成 `YYYY-MM-DD HH:mm`：中英两版一致，不需要走 i18n */
function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number) => String(value).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function handleClose() {
  emit('close');
}

function handleSelect(id: string) {
  emit('select', id);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') handleClose();
}

/** Esc 只在浮层打开时监听，免得常驻监听抢走游戏内其它键盘操作 */
watch(
  () => props.visible,
  visible => {
    if (visible) {
      window.addEventListener('keydown', handleKeydown);
      return;
    }
    window.removeEventListener('keydown', handleKeydown);
  },
);

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/*
 * 直接盖在封面之上，不走 Teleport —— 封面自带的氛围层与黑幕是 z-index 55/60 的伪元素，
 * 这里取 70 才能压住它们（封面在静止态不产生新的层叠上下文，比较的是同一套 z-index）。
 */
.snapshot-overlay {
  position: absolute;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--overlay-gap);
  background: var(--overlay-backdrop);
  isolation: isolate;
  backdrop-filter: blur(10px);
}

.snapshot-dialog {
  width: min(100%, 420px);
  max-height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--card-border);
  background: var(--card-bg-strong);
  background-image: var(--card-sheen);
  box-shadow: var(--shadow-xl);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  animation: snapshotEnter 0.2s var(--ease-out-expo);
}

@keyframes snapshotEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
  background: var(--gradient-subtle);
}

.header-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.1);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.14);
}

.header-icon i {
  font-size: calc(14px * var(--ui-font-scale));
  color: var(--accent-primary);
}

.header-title {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: var(--radius-md);
  border: 1px solid var(--control-border);
  background: var(--control-surface-subtle);
  color: var(--control-text-strong);
  box-shadow: var(--control-shadow), var(--control-emboss);
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast);
}

.close-btn i {
  font-size: calc(12px * var(--ui-font-scale));
}

.close-btn:hover {
  border-color: rgba(var(--accent-danger-rgb), 0.3);
  color: var(--accent-danger);
}

.snapshot-list {
  margin: 0;
  padding: 6px;
  list-style: none;
  overflow-y: auto;
  /* flex 子项默认 min-height:auto 会把容器撑高，必须清掉才滚得动 */
  min-height: 0;
}

.snapshot-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast);
}

.snapshot-item:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.32);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.snapshot-item:focus-visible {
  outline: 1px solid rgba(var(--accent-primary-rgb), 0.6);
  outline-offset: -1px;
}

.snapshot-summary {
  /* 一行摘要：超出就省略，不换行堆叠 */
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.snapshot-time {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.dialog-empty {
  margin: 0;
  padding: 24px 14px;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.dialog-hint {
  margin: 0;
  padding: 8px 14px 10px;
  border-top: 1px solid var(--border-light);
  text-align: center;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.snapshot-fade-enter-active,
.snapshot-fade-leave-active {
  transition: opacity 0.2s ease;
}

.snapshot-fade-enter-from,
.snapshot-fade-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .snapshot-dialog {
    width: 100%;
  }

  .dialog-header {
    padding: 10px 12px;
    gap: 6px;
  }
}
</style>
