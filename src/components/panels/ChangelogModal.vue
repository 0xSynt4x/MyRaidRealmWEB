<template>
  <Teleport to="#modal-container">
    <Transition name="changelog-fade">
      <div
        v-if="visible"
        class="changelog-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('changelog.title')"
        @click.self="$emit('close')"
      >
        <div class="changelog-modal">
          <!-- 顶部渐变装饰线 -->
          <div class="modal-accent-bar"></div>

          <button
            class="close-btn"
            :title="t('changelog.close')"
            :aria-label="t('changelog.close')"
            @click="$emit('close')"
          >
            <i class="ti ti-x"></i>
          </button>

          <header class="modal-header">
            <div class="header-icon">
              <i class="ti ti-sparkles"></i>
            </div>
            <h2 class="header-title">{{ t('changelog.title') }}</h2>
            <p class="header-version">
              {{ t('changelog.currentVersion') }}
              <span class="version-value">v{{ currentVersion }}</span>
            </p>
          </header>

          <div class="modal-body">
            <section v-for="entry in entries" :key="entry.date" class="entry">
              <div class="entry-head">
                <span class="entry-dot" aria-hidden="true"></span>
                <span class="entry-date">{{ entry.date }}</span>
              </div>
              <ul class="entry-items">
                <li v-for="(item, index) in entry.items" :key="index" class="entry-item">
                  <span class="item-dash" aria-hidden="true">-</span>
                  <span class="item-text">{{ item }}</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../../i18n';
import { getChangelogEntries, getCurrentVersion } from '../../utils/changelog';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

// 最新在最前，由数据模块负责排序
const entries = computed(() => getChangelogEntries());
const currentVersion = getCurrentVersion();

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* ===== 遮罩层 ===== */
.changelog-overlay {
  position: absolute;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
}

/* ===== 弹窗主体 ===== */
.changelog-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  max-height: 84%;
  overflow: hidden;
  border-radius: 16px;
  background: var(--glass-bg-heavy);
  border: 1px solid var(--glass-border);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* ===== 顶部渐变装饰线 ===== */
.modal-accent-bar {
  height: 3px;
  flex: 0 0 auto;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-primary) 80%, transparent),
    var(--accent-primary),
    color-mix(in srgb, var(--accent-primary) 60%, transparent)
  );
  background-size: 200% 100%;
  animation: changelogAccentShift 4s ease infinite;
}

@keyframes changelogAccentShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* ===== 关闭按钮 ===== */
.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-secondary);
  font-size: calc(14px * var(--ui-font-scale));
  cursor: pointer;
  transition:
    background var(--motion-fast, 200ms ease),
    color var(--motion-fast, 200ms ease),
    transform var(--motion-fast, 200ms ease);
}

.close-btn:hover {
  background: color-mix(in srgb, var(--text-primary) 16%, transparent);
  color: var(--text-primary);
  transform: rotate(90deg) scale(1.1);
}

.close-btn:active {
  transform: rotate(90deg) scale(0.95);
}

/* ===== 标题区 ===== */
.modal-header {
  flex: 0 0 auto;
  padding: 22px 24px 14px;
  text-align: center;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 10px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent-primary) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 34%, transparent);
  color: var(--accent-primary);
  font-size: calc(20px * var(--ui-font-scale));
}

.header-title {
  margin: 0;
  font-size: calc(19px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-primary);
}

.header-version {
  margin: 6px 0 0;
  font-size: calc(12px * var(--ui-font-scale));
  letter-spacing: 1px;
  color: var(--text-secondary);
}

.version-value {
  margin-left: 4px;
  font-weight: 600;
  color: var(--accent-primary);
}

/* ===== 内容区 ===== */
.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 24px 22px;
}

.modal-body::-webkit-scrollbar {
  width: 4px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-primary) 14%, transparent);
  border-radius: 2px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--text-primary) 24%, transparent);
}

/* ===== 时间轴条目 ===== */
.entry {
  position: relative;
  padding-left: 18px;
}

/* 竖线：连到下一个条目，最后一条不画 */
.entry:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 14px;
  bottom: 0;
  left: 3px;
  width: 1px;
  background: var(--glass-border);
}

.entry-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

/* 圆点：压在竖线上 */
.entry-dot {
  position: absolute;
  left: -18px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

.entry-date {
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--accent-primary);
}

.entry-items {
  margin: 6px 0 16px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-item {
  display: flex;
  gap: 8px;
  font-size: calc(13px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-primary);
}

.item-dash {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.item-text {
  flex: 1 1 auto;
}

/* ===== 过渡 ===== */
.changelog-fade-enter-active,
.changelog-fade-leave-active {
  transition: opacity 220ms ease;
}

.changelog-fade-enter-active .changelog-modal,
.changelog-fade-leave-active .changelog-modal {
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
}

.changelog-fade-enter-from,
.changelog-fade-leave-to {
  opacity: 0;
}

.changelog-fade-enter-from .changelog-modal,
.changelog-fade-leave-to .changelog-modal {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 480px) {
  .changelog-modal {
    max-height: 88%;
  }

  .modal-header {
    padding: 20px 18px 12px;
  }

  .modal-body {
    padding: 4px 18px 18px;
  }
}
</style>
