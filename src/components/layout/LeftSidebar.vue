<template>
  <div class="left-sidebar">
    <!-- 导航列表 -->
    <nav class="nav-list">
      <button
        v-for="item in navItems"
        :key="item.id"
        :class="['nav-item', { active: overlayPanel === item.id, pulsing: isNavPulsing(item.id) }]"
        :title="item.label"
        @mouseenter="stopNavPulse(item.id)"
        @click="handleNavClick(item.id)"
      >
        <i :class="item.icon"></i>
        <span v-if="getBadgeDisplay(item.id)" :class="['nav-badge', { pulsing: isNavPulsing(item.id) }]">{{
          getBadgeDisplay(item.id)
        }}</span>
      </button>
    </nav>

    <!-- 分隔线 -->
    <div class="nav-divider"></div>

    <!-- 底部固定项 -->
    <div class="nav-bottom">
      <!-- 赞赏按钮 -->
      <button
        :class="['nav-item', { active: overlayPanel === 'donate' }]"
        :title="t('nav.donate')"
        @click="handleNavClick('donate')"
      >
        <i class="ti ti-heart"></i>
      </button>
      <!-- 设置按钮 -->
      <button
        :class="['nav-item', { active: overlayPanel === 'settings' }]"
        :title="t('nav.settings')"
        @click="handleNavClick('settings')"
      >
        <i class="ti ti-settings"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';
import { useBadgeStore, type BadgeTab } from '../../stores/badge';
import { useLayoutStore, type TabType } from '../../stores/layout';

interface NavItem {
  id: TabType;
  label: string;
  icon: string;
}

const layoutStore = useLayoutStore();

const badgeStore = useBadgeStore();
const { t } = useI18n();

// 导航项定义
const navItems = computed<NavItem[]>(() => [
  { id: 'profile', label: t('nav.profile'), icon: 'ti ti-id' },
  { id: 'faction', label: t('nav.faction'), icon: 'ti ti-sitemap' },
  { id: 'business', label: t('nav.business'), icon: 'ti ti-briefcase' },
  { id: 'notebook', label: t('nav.notebook'), icon: 'ti ti-note' },
  { id: 'content', label: t('nav.contentCenter'), icon: 'ti ti-book-2' },
  { id: 'characters', label: t('nav.characters'), icon: 'ti ti-users' },
  { id: 'shop', label: t('nav.shop'), icon: 'ti ti-building-store' },
  { id: 'lottery', label: t('nav.lottery'), icon: 'ti ti-gift' },
  { id: 'dicegame', label: t('nav.dicegame'), icon: 'ti ti-dice' },
]);

// 当前展开的 overlay 面板
const overlayPanel = computed(() => layoutStore.overlayPanel);

// 处理导航点击 - 统一走 overlay 面板
function handleNavClick(tabId: TabType) {
  const badgeTab = getBadgeTabByNavId(tabId);
  if (badgeTab && badgeStore.getBadgeCount(badgeTab) > 0) {
    badgeStore.markAsRead(badgeTab);
  }
  layoutStore.toggleOverlayPanel(tabId);
}

function getBadgeTabByNavId(tabId: TabType): BadgeTab | null {
  if (tabId === 'shop' || tabId === 'business' || tabId === 'notebook' || tabId === 'characters') {
    return tabId;
  }

  if (tabId === 'profile') {
    return 'players';
  }

  return null;
}

function isNavPulsing(tabId: TabType): boolean {
  const badgeTab = getBadgeTabByNavId(tabId);
  if (!badgeTab) return false;
  return badgeStore.isPulsing(badgeTab);
}

function stopNavPulse(tabId: TabType) {
  const badgeTab = getBadgeTabByNavId(tabId);
  if (!badgeTab) return;
  badgeStore.clearPulse(badgeTab);
}
function getBadgeCount(tabId: TabType): number {
  if (tabId === 'shop' || tabId === 'business' || tabId === 'notebook' || tabId === 'characters') {
    return badgeStore.getBadgeCount(tabId);
  }

  if (tabId === 'profile') {
    return badgeStore.getBadgeCount('players');
  }

  return 0;
}

function getBadgeDisplay(tabId: TabType): string {
  const count = getBadgeCount(tabId);
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}
</script>

<style lang="scss" scoped>
.left-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 6px 0;
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
}

.nav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1px 0;
  min-height: 42px;
  border: none;
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
  transition: all var(--transition-normal);
  color: var(--ui-dim);
  background: transparent;
  width: 100%;
  position: relative;
  overflow: hidden;

  /* 选中标记：方向 A 收成一个 3px 小圆点（原来是 3px 宽 × 60% 高的长条） */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%) scaleY(0);
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--ui-accent);
    transition: transform var(--transition-spring);
  }

  /* 悬停走中性色：选中态已经不带底色了，
     悬停再染强调色的话，看起来会比真正选中的那一项更「选中」 */
  &:hover {
    background: var(--ui-surface-2);
    color: var(--ui-text);

    i {
      transform: scale(1.15);
    }
  }

  &.active {
    background: transparent;
    color: var(--ui-accent);

    &::before {
      transform: translateY(-50%) scaleY(1);
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  i {
    font-size: calc(18px * var(--ui-font-scale));
    width: auto;
    text-align: center;
    flex-shrink: 0;
    transition:
      transform var(--transition-spring),
      filter var(--transition-normal);
  }
  .nav-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: #ff3b30;
    color: #fff;
    font-size: calc(10px * var(--ui-font-scale));
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-shadow: 0 0 0 2px var(--glass-bg);
    pointer-events: none;

    &.pulsing {
      animation: badgePulse 1.15s ease-in-out infinite;
    }
  }

  &.pulsing {
    box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.14);

    i {
      animation: iconPulse 1.4s ease-in-out infinite;
    }
  }
}

@keyframes badgePulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 2px var(--glass-bg);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 2px var(--glass-bg);
  }
}

@keyframes iconPulse {
  0%,
  100% {
    transform: scale(1);
    filter: none;
  }
  50% {
    transform: scale(1.015);
    filter: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-item.pulsing i,
  .nav-item .nav-badge.pulsing {
    animation: none !important;
  }
}

/* 渐变分隔线 */
.nav-divider {
  height: 1px;
  background: var(--gradient-primary);
  margin: 6px 10px;
  opacity: 0.2;
  border-radius: 1px;
}

.nav-bottom {
  padding: 0 4px;
  padding-bottom: 4px;

  .nav-item {
    &.active i {
      animation: float 3s ease-in-out infinite;
    }
  }
}

/* 响应式：手机端 */
@media (max-width: 767px) {
  .nav-item {
    min-height: 38px;
    padding: 10px 0;

    i {
      font-size: calc(16px * var(--ui-font-scale));
    }
  }
}
</style>
