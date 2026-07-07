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
        <i class="fa-solid fa-heart"></i>
      </button>
      <!-- 设置按钮 -->
      <button
        :class="['nav-item', { active: overlayPanel === 'settings' }]"
        :title="t('nav.settings')"
        @click="handleNavClick('settings')"
      >
        <i class="fa-solid fa-gear"></i>
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
  { id: 'profile', label: t('nav.profile'), icon: 'fa-regular fa-id-card' },
  { id: 'faction', label: t('nav.faction'), icon: 'fa-solid fa-sitemap' },
  { id: 'business', label: t('nav.business'), icon: 'fa-solid fa-briefcase' },
  { id: 'notebook', label: t('nav.notebook'), icon: 'fa-regular fa-note-sticky' },
  { id: 'content', label: t('nav.contentCenter'), icon: 'fa-solid fa-book-open-reader' },
  { id: 'characters', label: t('nav.characters'), icon: 'fa-solid fa-users' },
  { id: 'shop', label: t('nav.shop'), icon: 'fa-solid fa-store' },
  { id: 'lottery', label: t('nav.lottery'), icon: 'fa-solid fa-gift' },
  { id: 'dicegame', label: t('nav.dicegame'), icon: 'fa-solid fa-dice' },
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
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-normal);
  color: var(--text-tertiary);
  background: transparent;
  width: 100%;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%) scaleY(0);
    width: 3px;
    height: 60%;
    border-radius: 0 3px 3px 0;
    background: var(--gradient-primary);
    transition: transform var(--transition-spring);
  }

  &:hover {
    background: rgba(var(--accent-primary-rgb), 0.06);
    color: var(--accent-primary);

    i {
      transform: scale(1.15);
    }
  }

  &.active {
    background: rgba(var(--accent-primary-rgb), 0.1);
    color: var(--accent-primary);
    box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.12);

    &::before {
      transform: translateY(-50%) scaleY(1);
    }

    i {
      filter: drop-shadow(0 0 6px rgba(var(--accent-primary-rgb), 0.3));
    }
  }

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  i {
    font-size: 18px;
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
    font-size: 10px;
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
      font-size: 16px;
    }
  }
}
</style>
