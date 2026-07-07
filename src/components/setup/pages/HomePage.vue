<template>
  <div class="home-page">
    <!-- 背景层 -->
    <div class="background-layer">
      <!-- 背景图片 -->
      <div class="background-image" :style="backgroundStyle"></div>
    </div>

    <!-- 内容层 -->
    <div class="content-layer">
      <!-- 全屏按钮 -->
      <button
        class="fullscreen-btn"
        :title="isFullscreen ? t('setup.home.exitFullscreen') : t('setup.home.enterFullscreen')"
        :aria-label="isFullscreen ? t('setup.home.exitFullscreen') : t('setup.home.enterFullscreen')"
        @click="toggleFullscreen"
      >
        <i :class="isFullscreen ? 'fa-solid fa-compress' : 'fa-solid fa-expand'"></i>
      </button>

      <!-- 音乐控制按钮（预留） -->
      <button
        v-if="hasBgMusic"
        class="music-btn"
        :title="isMusicPlaying ? t('setup.home.pauseMusic') : t('setup.home.playMusic')"
        :aria-label="isMusicPlaying ? t('setup.home.pauseMusic') : t('setup.home.playMusic')"
        @click="toggleMusic"
      >
        <i :class="isMusicPlaying ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"></i>
      </button>

      <!-- 开始按钮 -->
      <button class="start-btn fade-in-up" @click="handleStart">
        <span class="btn-text">{{ t('setup.home.startGame') }}</span>
        <i class="fa-solid fa-play"></i>
      </button>

      <!-- 继续游戏按钮（开局页） -->
      <button class="continue-btn fade-in-up" @click="handleContinueClick">
        <span class="btn-text">{{ t('setup.home.continueGame') }}</span>
        <i class="fa-solid fa-folder-open"></i>
      </button>

      <button class="continue-btn fade-in-up" @click="handleImportArchiveClick">
        <span class="btn-text">{{ t('contentCenter.archive.importButton') }}</span>
        <i class="fa-solid fa-file-import"></i>
      </button>

      <button class="continue-btn fade-in-up" @click="handleOpenSettings">
        <span class="btn-text">{{ t('setup.home.openSettings') }}</span>
        <i class="fa-solid fa-gear"></i>
      </button>

      <input ref="archiveInput" type="file" accept=".json,application/json" hidden @change="handleArchiveFileChange" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../../../i18n';
import { useFullscreen } from '../../../composables/useFullscreen';
import {
  formatArchiveSummaryForToast,
  getStandaloneArchiveFeedbackMessageKey,
  listStandaloneArchives,
  restoreStandaloneArchiveById,
} from '../../../utils/archive';

const emit = defineEmits<{
  start: [];
  continue: [file: File];
  openSettings: [];
}>();

const { isFullscreen, toggleFullscreen } = useFullscreen();
const { t } = useI18n();

// 背景图片
const backgroundImageUrl = ref('https://files.catbox.moe/hpv2fp.jpg');

// 背景音乐状态（预留）
const hasBgMusic = ref(false);
const isMusicPlaying = ref(false);
const audioElement = ref<HTMLAudioElement | null>(null);

const archiveInput = ref<HTMLInputElement | null>(null);

// 背景样式
const backgroundStyle = computed(() => {
  if (backgroundImageUrl.value) {
    return {
      backgroundImage: `url(${backgroundImageUrl.value})`,
    };
  }
  return {};
});

// 音乐控制
function toggleMusic() {
  if (!audioElement.value) return;

  if (isMusicPlaying.value) {
    audioElement.value.pause();
    isMusicPlaying.value = false;
  } else {
    audioElement.value.play().catch(() => {
      console.warn('音乐播放被阻止');
    });
    isMusicPlaying.value = true;
  }
}

// 开始游戏
function handleStart() {
  emit('start');
}

function handleContinueClick() {
  const latestArchive = listStandaloneArchives()[0];
  if (!latestArchive) {
    toastr.info(t('setup.standalone.archiveEmpty'));
    return;
  }

  try {
    const outcome = restoreStandaloneArchiveById(latestArchive.id);
    toastr.success(
      t(
        getStandaloneArchiveFeedbackMessageKey({
          scope: 'setup',
          mode: 'restore',
          outcome,
        }),
        { summary: formatArchiveSummaryForToast(latestArchive.summary) },
      ),
    );
  } catch (error) {
    console.error('[HomePage] 恢复独立模式存档失败:', error);
    toastr.error(
      t('setup.standalone.archiveRestoreFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  }
}

function handleImportArchiveClick() {
  archiveInput.value?.click();
}

function handleOpenSettings() {
  emit('openSettings');
}

function handleArchiveFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  emit('continue', file);
  input.value = '';
}

// 生命周期
onMounted(() => {
  // 预留：加载背景音乐
  // if (bgMusicUrl) {
  //   audioElement.value = new Audio(bgMusicUrl);
  //   audioElement.value.loop = true;
  //   hasBgMusic.value = true;
  // }
});

onUnmounted(() => {
  if (audioElement.value) {
    audioElement.value.pause();
    audioElement.value = null;
  }
});
</script>

<style scoped>
.home-page {
  --home-overlay-top: color-mix(in srgb, var(--bg-primary) 18%, transparent);
  --home-overlay-bottom: color-mix(in srgb, var(--overlay-backdrop) 82%, transparent);
  --home-hero-glow: radial-gradient(circle at 50% 78%, rgba(var(--accent-primary-rgb), 0.16) 0%, transparent 48%);
}

.home-page {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* 背景层 */
.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.background-image {
  width: 100%;
  height: 100%;
  background:
    linear-gradient(180deg, var(--home-overlay-top) 0%, var(--home-overlay-bottom) 100%),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--bg-primary) 88%, #0f172a) 0%,
      color-mix(in srgb, var(--accent-primary) 18%, #0f172a) 55%,
      color-mix(in srgb, var(--accent-secondary) 14%, #020617) 100%
    );
  background-size: cover;
  background-position: center;
  filter: saturate(1.04) contrast(1.02);
}

/* 内容层 */
.content-layer {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  justify-content: flex-end;
  padding-bottom: 56px;
}

.content-layer::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    var(--home-hero-glow),
    linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.12) 42%, rgba(15, 23, 42, 0.52) 100%);
  pointer-events: none;
}

/* 全屏按钮 */
.fullscreen-btn,
.music-btn {
  position: absolute;
  top: 16px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--card-bg-strong) 74%, transparent);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid color-mix(in srgb, var(--card-border) 88%, rgba(255, 255, 255, 0.18));
  color: white;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--card-shadow);
  transition:
    transform var(--motion-normal),
    box-shadow var(--motion-normal),
    border-color var(--motion-fast),
    background var(--motion-fast);
  z-index: 1;
}

.fullscreen-btn {
  right: 16px;
}

.music-btn {
  right: 66px;
}

.fullscreen-btn:hover,
.music-btn:hover {
  background: color-mix(in srgb, var(--card-bg-strong) 88%, transparent);
  border-color: rgba(var(--accent-primary-rgb), 0.34);
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-1px);
}

/* 开始按钮 */
.start-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 40px;
  min-height: 52px;
  background: var(--gradient-primary);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.38);
  border-radius: 999px;
  color: white;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 18px 40px rgba(var(--accent-primary-rgb), 0.24);
  transition:
    transform var(--motion-normal),
    box-shadow var(--motion-normal),
    border-color var(--motion-fast);
  overflow: hidden;
}

.start-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 24px 48px rgba(var(--accent-primary-rgb), 0.3);
}

.start-btn:active {
  transform: translateY(-2px);
}

.start-btn .btn-text {
  letter-spacing: 1px;
}

.start-btn i {
  font-size: 15px;
}

/* 脉冲动画 */
.start-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, transparent 50%);
  animation: pulse 2s infinite;
}

.start-btn::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 0 15px rgba(59, 130, 246, 0);
  }
}

.continue-btn {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 10px;
  padding: 10px 30px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--card-border) 88%, rgba(255, 255, 255, 0.28));
  border-radius: 999px;
  background: color-mix(in srgb, var(--card-bg-strong) 72%, transparent);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow:
    var(--card-shadow),
    0 10px 24px rgba(15, 23, 42, 0.12);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--motion-normal),
    border-color var(--motion-fast),
    box-shadow var(--motion-normal),
    background var(--motion-fast);
}

.continue-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  background: color-mix(in srgb, var(--card-bg-strong) 84%, transparent);
  box-shadow:
    var(--card-shadow-hover),
    0 14px 30px rgba(15, 23, 42, 0.14);
}

/* 渐入动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in-up {
  animation: fadeInUp 1s ease-out backwards;
}

/* 响应式 */
@media (max-width: 768px) {
  .start-btn {
    padding: 13px 30px;
    min-height: 48px;
    font-size: 17px;
  }

  .fullscreen-btn,
  .music-btn {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }

  .fullscreen-btn {
    right: 12px;
  }

  .music-btn {
    right: 56px;
  }

  .continue-btn {
    padding: 9px 24px;
    min-height: 42px;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .content-layer {
    padding: 22px 14px;
    padding-bottom: 44px;
  }

  .start-btn {
    padding: 11px 24px;
    min-height: 44px;
    font-size: 15px;
    gap: 8px;
  }

  .continue-btn {
    padding: 9px 20px;
    min-height: 40px;
    font-size: 13px;
  }

  .fullscreen-btn,
  .music-btn {
    top: 10px;
    width: 36px;
    height: 36px;
    font-size: 14px;
  }

  .fullscreen-btn {
    right: 12px;
  }

  .music-btn {
    right: 56px;
  }
}
</style>
