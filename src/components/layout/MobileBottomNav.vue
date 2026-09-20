<template>
  <nav ref="navRef" class="mobile-bottom-nav" :aria-label="t('nav.mobileAriaLabel')">
    <button
      v-for="item in navItems"
      :key="item.id"
      :class="['nav-item', { active: overlayPanel === item.id }]"
      :title="item.label"
      @click="handleNavClick(item.id)"
    >
      <i :class="item.icon"></i>
      <span>{{ item.label }}</span>
    </button>

    <div v-if="showRightHint" class="right-scroll-hint" aria-hidden="true">
      <i class="ti ti-chevron-right"></i>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '../../i18n';
import { useLayoutStore, type TabType } from '../../stores/layout';

interface NavItem {
  id: TabType;
  label: string;
  icon: string;
}

const layoutStore = useLayoutStore();
const { t } = useI18n();

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
  { id: 'settings', label: t('nav.settings'), icon: 'ti ti-settings' },
  { id: 'donate', label: t('nav.donate'), icon: 'ti ti-heart' },
]);

const overlayPanel = computed(() => layoutStore.overlayPanel);
const navRef = ref<HTMLElement | null>(null);
const showRightHint = ref(false);

function updateRightHintVisibility() {
  const navEl = navRef.value;
  if (!navEl) {
    showRightHint.value = false;
    return;
  }

  const remainingScroll = navEl.scrollWidth - navEl.clientWidth - navEl.scrollLeft;
  showRightHint.value = remainingScroll > 1;
}

function handleNavScroll() {
  updateRightHintVisibility();
}

function handleResize() {
  updateRightHintVisibility();
}

onMounted(() => {
  const navEl = navRef.value;
  navEl?.addEventListener('scroll', handleNavScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  void nextTick(() => {
    updateRightHintVisibility();
  });
});

onBeforeUnmount(() => {
  navRef.value?.removeEventListener('scroll', handleNavScroll);
  window.removeEventListener('resize', handleResize);
});

function handleNavClick(tabId: TabType) {
  layoutStore.toggleOverlayPanel(tabId);
}
</script>

<style scoped>
.mobile-bottom-nav {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 4px;
  background: var(--card-bg-strong);
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
}

.mobile-bottom-nav::-webkit-scrollbar {
  height: 0;
}

.nav-item {
  min-width: 52px;
  height: 44px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
}

.nav-item i {
  font-size: calc(14px * var(--ui-font-scale));
}

.nav-item span {
  font-size: calc(10px * var(--ui-font-scale));
  line-height: 1;
}

.nav-item.active {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.2);
}

.right-scroll-hint {
  position: sticky;
  right: 0;
  top: 0;
  bottom: 0;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -24px;
  pointer-events: none;
  background: linear-gradient(to right, transparent, var(--card-bg-strong) 58%);
  z-index: 2;
}

.right-scroll-hint i {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-tertiary);
  opacity: 0.9;
}
</style>
