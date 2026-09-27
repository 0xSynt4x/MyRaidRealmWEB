<template>
  <div class="setup-wizard" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- 页面切换容器 -->
    <Transition :name="setupStore.slideDirection" mode="out-in">
      <HomePage
        v-if="setupStore.currentPage === 'home'"
        key="home"
        @start="handleStart"
        @continue="handleContinue"
        @open-settings="handleOpenSettings"
        @open-changelog="handleOpenChangelog"
      />
      <PresetSelectPage v-else-if="setupStore.currentPage === 'presets'" key="presets" />
      <PlayerInfoPage v-else-if="setupStore.currentPage === 'playerInfo'" key="playerInfo" @next="handleGoToSettings" />
      <AiGeneratePage
        v-else-if="setupStore.currentPage === 'aiGenerate'"
        key="aiGenerate"
        @apply="handleAiGenerateApply"
      />
      <SettingsPage v-else-if="setupStore.currentPage === 'settings'" key="settings" @complete="handleComplete" />
      <WorkshopPage v-else-if="setupStore.currentPage === 'workshop'" key="workshop" />
    </Transition>

    <!--
      更新日志弹窗：版本变化后首次进首页自动弹（关掉才算看过）；
      点右下角版本号也能随时翻出来重看。
      挂在 Transition 之外，避免切页时跟着做过渡动画。
    -->
    <ChangelogModal :visible="showChangelog" @close="handleCloseChangelog" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from '../../i18n';
import { notify } from '../../utils/notify';
import { useFullscreen } from '../../composables/useFullscreen';
import { useLayoutStore } from '../../stores/layout';
import { useSetupStore } from '../../stores/setup';
import ChangelogModal from '../panels/ChangelogModal.vue';
import AiGeneratePage from './pages/AiGeneratePage.vue';
import HomePage from './pages/HomePage.vue';
import PlayerInfoPage from './pages/PlayerInfoPage.vue';
import PresetSelectPage from './pages/PresetSelectPage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import WorkshopPage from './pages/WorkshopPage.vue';

import { getStandaloneArchiveFeedbackMessageKey, importArchiveFile } from '../../utils/archive';
import { markChangelogSeen, shouldShowChangelog } from '../../utils/changelog';

const emit = defineEmits<{ complete: [] }>();

/**
 * 更新日志弹窗：版本变化后首次进首页自动拦一道；
 * 之后玩家想重看，点右下角版本号即可（走 handleOpenChangelog）。
 */
const showChangelog = ref(shouldShowChangelog());

const setupStore = useSetupStore();
const layoutStore = useLayoutStore();
const { isFullscreen } = useFullscreen();
const { t } = useI18n();

function handleStart() {
  setupStore.goToPage('presets', 'forward');
}

function handleGoToSettings() {
  setupStore.goToPage('settings', 'forward');
}

function handleOpenSettings() {
  void layoutStore.toggleOverlayPanel('settings');
}

/** 点右下角版本号：随时把更新日志翻出来重看 */
function handleOpenChangelog() {
  showChangelog.value = true;
}

function handleCloseChangelog() {
  showChangelog.value = false;
  // 关掉即视为看过，之后只在版本变化后才自动弹
  markChangelogSeen();
}

async function handleAiGenerateApply() {
  // 标记从AI生成页面进入，以便返回时能正确导航
  setupStore.cameFromAiGenerate = true;
  setupStore.goToPage('playerInfo', 'forward');
}

async function handleContinue(file: File) {
  try {
    const outcome = await importArchiveFile(file);
    notify.success(
      t(
        getStandaloneArchiveFeedbackMessageKey({
          scope: 'setup',
          mode: 'import',
          outcome,
        }),
      ),
    );
  } catch (error) {
    console.error('[SetupWizard] 读档失败:', error);
    notify.error(t('setup.archiveImport.failed', { error: error instanceof Error ? error.message : String(error) }));
  }
}

function handleComplete() {
  emit('complete');
}
</script>

<style scoped>
.setup-wizard {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: var(--bg-primary);
}

.setup-wizard.is-fullscreen {
  height: 100vh;
}

/* 页面滑动切换动画 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
  position: absolute;
  width: 100%;
  height: 100%;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-100%);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
