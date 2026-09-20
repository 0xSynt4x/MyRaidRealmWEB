<template>
  <div class="home-page">
    <!-- 动态封面背景：写实概念图打底 + 分层动效（详见 useCoverBackground） -->
    <div ref="stageRef" class="bg-cover" :style="{ '--glow': glowVar }" aria-hidden="true">
      <!-- 世界层：底图 + 两层漂移极光 + 与底图锁定的发光层 -->
      <div class="bg-world">
        <img class="bg-plate" :src="plateSrc" alt="" @load="syncLayout" />
        <div class="bg-aurora a"><img class="bg-aurora-img" :src="auroraA" alt="" /></div>
        <div class="bg-aurora b"><img class="bg-aurora-img" :src="auroraB" alt="" /></div>
        <div class="bg-rays"></div>
        <div class="bg-core-glow"></div>
        <div class="bg-core-glow-fast"></div>
      </div>

      <!-- 独立视差层：碎石 / 余烬 / 雾带 -->
      <canvas ref="debrisRef" class="bg-fx"></canvas>
      <canvas ref="emberRef" class="bg-fx bg-fx-ember"></canvas>

      <div class="bg-mist m1"></div>
      <div class="bg-mist m2"></div>
      <div class="bg-mist m3"></div>

      <!-- 顶层氛围：闪电 / 颗粒 / 暗角 / 上下压暗 -->
      <div ref="flashRef" class="bg-flash"></div>
      <div class="bg-grain"></div>
      <div class="bg-vignette"></div>
      <div class="bg-scrim-top"></div>
      <div class="bg-scrim-bottom"></div>
    </div>

    <!-- 顶部控制按钮 -->
    <div class="top-controls">
      <div v-if="hasBgMusic" ref="musicCtlRef" class="music-ctl">
        <button
          class="control-btn"
          :title="isMusicPlaying ? t('setup.home.pauseMusic') : t('setup.home.playMusic')"
          :aria-label="isMusicPlaying ? t('setup.home.pauseMusic') : t('setup.home.playMusic')"
          @click="toggleMusic"
        >
          <i :class="isMusicPlaying ? 'ti ti-volume' : 'ti ti-volume-off'"></i>
        </button>
        <!-- 音量条：视觉只有 2px，可点区域靠 ::before 上下撑开，否则鼠标根本压不着 -->
        <div
          ref="volumeBarRef"
          class="volume-bar"
          role="slider"
          tabindex="0"
          :aria-label="t('setup.home.volume')"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(volume * 100)"
          @pointerdown="onVolumePointerDown"
          @pointermove="onVolumePointerMove"
          @pointerup="onVolumePointerUp"
          @pointercancel="onVolumePointerUp"
          @keydown="onVolumeKeydown"
        >
          <div class="volume-fill" :style="{ width: `${Math.round(volume * 100)}%` }"></div>
        </div>
      </div>
      <button
        class="control-btn"
        :title="isFullscreen ? t('setup.home.exitFullscreen') : t('setup.home.enterFullscreen')"
        :aria-label="isFullscreen ? t('setup.home.exitFullscreen') : t('setup.home.enterFullscreen')"
        @click="toggleFullscreen"
      >
        <i :class="isFullscreen ? 'ti ti-arrows-minimize' : 'ti ti-arrows-maximize'"></i>
      </button>
    </div>

    <!-- 标题区 -->
    <div class="title-section">
      <div class="title-decoration"></div>
      <h1 class="game-title">{{ t('setup.home.gameTitle') }}</h1>
      <p class="game-subtitle">{{ t('setup.home.gameSubtitle') }}</p>
    </div>

    <!-- 按钮区 -->
    <div class="action-section">
      <button class="action-btn btn-primary" @click="handleStart">
        <i class="ti ti-player-play"></i>
        <span class="btn-text">{{ t('setup.home.startGame') }}</span>
      </button>

      <button class="action-btn btn-secondary" @click="handleContinueClick">
        <i class="ti ti-folder-open"></i>
        <span class="btn-text">{{ t('setup.home.continueGame') }}</span>
      </button>

      <button class="action-btn btn-secondary" @click="handleImportArchiveClick">
        <i class="ti ti-file-import"></i>
        <span class="btn-text">{{ t('contentCenter.archive.importButton') }}</span>
      </button>

      <button class="action-btn btn-secondary" @click="handleOpenSettings">
        <i class="ti ti-settings"></i>
        <span class="btn-text">{{ t('setup.home.openSettings') }}</span>
      </button>
    </div>

    <!-- 封面背景音乐：外置音频文件，不进 HTML（详见 webpack 的 assetFilename） -->
    <audio ref="bgmRef" class="bgm-audio" :src="bgmUrl" loop preload="auto"></audio>

    <input ref="archiveInput" type="file" accept=".json,application/json" hidden @change="handleArchiveFileChange" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../../../i18n';
import { useFullscreen } from '../../../composables/useFullscreen';
import { useCoverBackground } from '../../../composables/useCoverBackground';
import bgmUrl from '../../../assets/audio/beyond-the-marble-gate.mp3?url';
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

// 封面动态背景（写实底图 + 分层动效）
const { stageRef, debrisRef, emberRef, flashRef, plateSrc, auroraA, auroraB, glowVar, syncLayout } =
  useCoverBackground();

// 背景音乐：外置音频文件（`src/assets/audio/`），打包时落到 dist/assets/audio/，不进 HTML
const hasBgMusic = ref(true);
const isMusicPlaying = ref(false);
/** 目标音量（0~1）。拖音量条改的就是它，暂停时也保留 */
const volume = ref(0.5);

const archiveInput = ref<HTMLInputElement | null>(null);
const bgmRef = ref<HTMLAudioElement | null>(null);
const musicCtlRef = ref<HTMLElement | null>(null);
const volumeBarRef = ref<HTMLElement | null>(null);

/** 起播 / 停播的淡入淡出时长（毫秒） */
const FADE_IN_MS = 1600;
const FADE_OUT_MS = 700;

let fadeTimer = 0;
let draggingVolume = false;
/** 自动播放被拦下后，挂一次性的「首次交互起播」监听 */
let gestureArmed = false;

/**
 * 音量渐变：<audio> 的 volume 不是 AudioParam，没法像 GainNode 那样定时值，
 * 只能自己按帧推。起播淡入、停播淡出都走这里，免得进出时"啪"一声。
 */
function fadeVolume(target: number, duration: number, onDone?: () => void) {
  const el = bgmRef.value;
  if (!el) return;
  window.clearInterval(fadeTimer);
  const from = el.volume;
  if (duration <= 0 || Math.abs(from - target) < 0.001) {
    el.volume = target;
    onDone?.();
    return;
  }
  const started = performance.now();
  fadeTimer = window.setInterval(() => {
    const t = Math.min(1, (performance.now() - started) / duration);
    el.volume = from + (target - from) * t;
    if (t >= 1) {
      window.clearInterval(fadeTimer);
      onDone?.();
    }
  }, 40);
}

/** 用户直接调音量时先掐掉正在跑的渐变，否则两边抢同一个值会抖 */
function commitVolume() {
  const el = bgmRef.value;
  if (!el) return;
  window.clearInterval(fadeTimer);
  if (isMusicPlaying.value) el.volume = volume.value;
}

/** 首次交互兜底：自动播放被拦时，用户点/按键盘任意处就把音乐带起来 */
function onFirstGesture(event: Event) {
  // 落在音乐控件自己身上就不抢 —— 按钮和音量条各有各的处理
  const target = event.target as Node | null;
  if (target && musicCtlRef.value?.contains(target)) return;
  disarmGesture();
  startMusic();
}

function armGesture() {
  if (gestureArmed) return;
  gestureArmed = true;
  window.addEventListener('pointerdown', onFirstGesture);
  window.addEventListener('keydown', onFirstGesture);
}

function disarmGesture() {
  if (!gestureArmed) return;
  gestureArmed = false;
  window.removeEventListener('pointerdown', onFirstGesture);
  window.removeEventListener('keydown', onFirstGesture);
}

/** 用户主动起播（点按钮 / 首次交互兜底）。这条路径不会被自动播放策略拦，无需 catch */
function startMusic() {
  const el = bgmRef.value;
  if (!el || isMusicPlaying.value) return;
  disarmGesture();
  el.volume = 0;
  void el.play();
  isMusicPlaying.value = true;
  fadeVolume(volume.value, FADE_IN_MS);
}

/** 停播：先淡到 0 再真暂停，别把音量停在中途 */
function stopMusic() {
  const el = bgmRef.value;
  if (!el || !isMusicPlaying.value) return;
  isMusicPlaying.value = false;
  fadeVolume(0, FADE_OUT_MS, () => {
    el.pause();
    el.volume = volume.value;
  });
}

function toggleMusic() {
  disarmGesture();
  if (isMusicPlaying.value) stopMusic();
  else startMusic();
}

/**
 * 挂载后先试自动播。浏览器只在「与该站点有过交互」时才放行，
 * 所以首次访问必定被拒 —— 被拒就退回静音待命，等用户第一次点击。
 */
function attemptAutoplay() {
  const el = bgmRef.value;
  if (!el) return;
  el.volume = 0;
  const played = el.play();
  if (!played || typeof played.then !== 'function') {
    isMusicPlaying.value = true;
    fadeVolume(volume.value, FADE_IN_MS);
    return;
  }
  played
    .then(() => {
      isMusicPlaying.value = true;
      fadeVolume(volume.value, FADE_IN_MS);
    })
    .catch(() => {
      isMusicPlaying.value = false;
      el.volume = volume.value;
      armGesture();
    });
}

/** 把音量条上的横坐标换算成 0~1 音量 */
function setVolumeFromClientX(clientX: number) {
  const bar = volumeBarRef.value;
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  if (rect.width <= 0) return;
  volume.value = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  commitVolume();
}

function onVolumePointerDown(event: PointerEvent) {
  draggingVolume = true;
  const bar = event.currentTarget as HTMLElement;
  bar.setPointerCapture(event.pointerId);
  setVolumeFromClientX(event.clientX);
}

function onVolumePointerMove(event: PointerEvent) {
  if (!draggingVolume) return;
  setVolumeFromClientX(event.clientX);
}

function onVolumePointerUp(event: PointerEvent) {
  if (!draggingVolume) return;
  draggingVolume = false;
  const bar = event.currentTarget as HTMLElement;
  if (bar.hasPointerCapture(event.pointerId)) bar.releasePointerCapture(event.pointerId);
}

/** 键盘调音量：方向键 ±5%，Home / End 到两端 */
function onVolumeKeydown(event: KeyboardEvent) {
  const step = 0.05;
  let next: number | null = null;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = volume.value - step;
  else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = volume.value + step;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = 1;
  if (next === null) return;
  event.preventDefault();
  volume.value = Math.min(1, Math.max(0, Number(next.toFixed(2))));
  commitVolume();
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
  attemptAutoplay();
});

onUnmounted(() => {
  disarmGesture();
  window.clearInterval(fadeTimer);
  const el = bgmRef.value;
  if (el) {
    el.pause();
    el.currentTime = 0;
  }
  isMusicPlaying.value = false;
});
</script>

<style scoped>
.home-page {
  /* 封面自带一套固定配色：背景恒为深色，故文字不再跟随主题令牌，
     否则浅色主题（金属/古卷）下强调色偏暗，会变成"深字压深底"看不清 */
  --cover-gold: #e6b455;
  --cover-gold-bright: #f4d190;
  --cover-gold-rgb: 230, 180, 85;
  --cover-ink: rgba(237, 231, 217, 0.82);

  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #05070c;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== 动态封面背景 ===== */
.bg-cover {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /* 传送门核心的位置由脚本按底图的真实铺法算好后写进来 */
  --core-x: 50%;
  --core-y: 45%;
  --core-r: 12vh;
}

/* --- 世界层：底图，以及与底图锁定的发光层 --- */
.bg-world {
  position: absolute;
  inset: 0;
}

/* 底图比舞台四周各大 5%，给呼吸缩放与视差留余量 */
.bg-plate {
  position: absolute;
  left: -5%;
  top: -5%;
  width: 110%;
  height: 110%;
  /* 必须清掉全局的 img{max-width:100%}：不清的话宽度被卡回 100%，
     而位置又左偏了 5%，底图右边缘就缩进来一截、露出一条深色竖缝 */
  max-width: none;
  display: block;
  object-fit: cover;
  object-position: center;
  transform-origin: var(--core-x) var(--core-y);
  animation: bg-breathe 30s ease-in-out infinite alternate;
  will-change: transform;
}

@keyframes bg-breathe {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.045);
  }
}

/* --- 极光：两张黑底极光图用「滤色」叠在底图上，反向漂移造出流动 --- */
/* 黑底 = 不发光，所以不需要透明通道；漂移只动 transform，交给合成器，不重绘 */
/* 周期别拉太长：之前 78s / 106s 一趟，慢到肉眼根本认不出在动 */
.bg-aurora {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
  pointer-events: none;
  will-change: transform;
}

.bg-aurora.a {
  animation: bg-aurora-drift-a 22s ease-in-out infinite alternate;
}

.bg-aurora.b {
  animation: bg-aurora-drift-b 32s ease-in-out infinite alternate;
}

/* 与底图完全相同的铺法，静止时和底图严丝合缝；漂移由外层负责 */
.bg-aurora-img {
  position: absolute;
  left: -5%;
  top: -5%;
  width: 110%;
  height: 110%;
  /* 同 .bg-plate：不清掉全局 img{max-width:100%} 就宽不出去、跟底图对不齐 */
  max-width: none;
  display: block;
  object-fit: cover;
  object-position: center;
  transform-origin: var(--core-x) var(--core-y);
  will-change: transform, opacity;
}

/* 跟着底图一起呼吸（否则极光会相对场景滑动），再各自加一层明灭 */
.bg-aurora.a .bg-aurora-img {
  animation:
    bg-breathe 30s ease-in-out infinite alternate,
    bg-aurora-glow-a 14s ease-in-out infinite;
}

.bg-aurora.b .bg-aurora-img {
  animation:
    bg-breathe 30s ease-in-out infinite alternate,
    bg-aurora-glow-b 22s ease-in-out infinite;
}

/* 横向为主、带一点纵向 —— 纯横移像「贴图平移」，掺上纵向才像在飘 */
@keyframes bg-aurora-drift-a {
  from {
    transform: translate3d(-5.2%, 1.4%, 0);
  }
  to {
    transform: translate3d(5.2%, -1.4%, 0);
  }
}

@keyframes bg-aurora-drift-b {
  from {
    transform: translate3d(4%, -1%, 0);
  }
  to {
    transform: translate3d(-4%, 1%, 0);
  }
}

@keyframes bg-aurora-glow-a {
  0%,
  100% {
    opacity: 0.38;
  }
  38% {
    opacity: 0.62;
  }
  70% {
    opacity: 0.46;
  }
}

@keyframes bg-aurora-glow-b {
  0%,
  100% {
    opacity: 0.24;
  }
  45% {
    opacity: 0.42;
  }
}

/* 从核心放射的光柱（极慢自转） */
.bg-rays {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
  opacity: 0.42;
  transform-origin: var(--core-x) var(--core-y);
  animation: bg-spin 140s linear infinite;
  background: conic-gradient(
    from 0deg at var(--core-x) var(--core-y),
    rgba(255, 214, 150, 0.3) 0deg,
    rgba(255, 214, 150, 0) 9deg,
    rgba(150, 230, 255, 0.22) 22deg,
    rgba(150, 230, 255, 0) 30deg,
    rgba(255, 190, 120, 0.26) 47deg,
    rgba(255, 190, 120, 0) 58deg,
    rgba(190, 170, 255, 0.2) 74deg,
    rgba(190, 170, 255, 0) 84deg,
    rgba(255, 214, 150, 0.28) 104deg,
    rgba(255, 214, 150, 0) 116deg,
    rgba(150, 230, 255, 0.18) 140deg,
    rgba(150, 230, 255, 0) 152deg,
    rgba(255, 200, 130, 0.24) 176deg,
    rgba(255, 200, 130, 0) 188deg,
    rgba(200, 180, 255, 0.18) 214deg,
    rgba(200, 180, 255, 0) 226deg,
    rgba(255, 214, 150, 0.26) 250deg,
    rgba(255, 214, 150, 0) 264deg,
    rgba(150, 230, 255, 0.2) 292deg,
    rgba(150, 230, 255, 0) 304deg,
    rgba(255, 190, 120, 0.22) 330deg,
    rgba(255, 190, 120, 0) 344deg,
    rgba(255, 214, 150, 0.3) 360deg
  );
  -webkit-mask-image: radial-gradient(
    circle at var(--core-x) var(--core-y),
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.6) 22%,
    rgba(0, 0, 0, 0.22) 46%,
    rgba(0, 0, 0, 0) 78%
  );
  mask-image: radial-gradient(
    circle at var(--core-x) var(--core-y),
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.6) 22%,
    rgba(0, 0, 0, 0.22) 46%,
    rgba(0, 0, 0, 0) 78%
  );
}

/* 核心辉光：用亮度遮罩塑形，让光只从传送门核心透出来 */
.bg-core-glow,
.bg-core-glow-fast {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
  transform-origin: var(--core-x) var(--core-y);
  -webkit-mask-image: var(--glow);
  mask-image: var(--glow);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  will-change: opacity, transform;
}

.bg-core-glow {
  background: radial-gradient(
    circle at var(--core-x) var(--core-y),
    rgba(255, 240, 212, 0.52) 0%,
    rgba(255, 190, 104, 0.34) 24%,
    rgba(206, 118, 46, 0.16) 52%,
    rgba(120, 70, 30, 0) 80%
  );
  animation:
    bg-core-pulse 5.4s ease-in-out infinite,
    bg-core-swell 13s ease-in-out infinite;
}

.bg-core-glow-fast {
  background: radial-gradient(
    circle at var(--core-x) var(--core-y),
    rgba(255, 252, 236, 0.42) 0%,
    rgba(255, 216, 146, 0.2) 20%,
    rgba(255, 170, 80, 0) 50%
  );
  animation: bg-core-flicker 2.3s ease-in-out infinite;
}

@keyframes bg-core-pulse {
  0%,
  100% {
    opacity: 0.42;
  }
  42% {
    opacity: 0.82;
  }
  70% {
    opacity: 0.58;
  }
}

@keyframes bg-core-swell {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.075);
  }
}

@keyframes bg-core-flicker {
  0%,
  100% {
    opacity: 0.16;
  }
  18% {
    opacity: 0.44;
  }
  30% {
    opacity: 0.22;
  }
  55% {
    opacity: 0.52;
  }
  72% {
    opacity: 0.18;
  }
}

/* 碎石与余烬（画布绘制） */
.bg-fx {
  position: absolute;
  inset: 0;
}

.bg-fx-ember {
  mix-blend-mode: screen;
}

/* 雾带：三层横向漂移，速度与方向各异 */
.bg-mist {
  position: absolute;
  mix-blend-mode: screen;
  filter: blur(46px);
  will-change: transform;
}

.bg-mist.m1 {
  left: -30%;
  bottom: 4%;
  width: 130%;
  height: 34%;
  background: radial-gradient(ellipse at 50% 50%, rgba(196, 218, 238, 0.2), rgba(196, 218, 238, 0) 68%);
  animation: bg-mist-a 74s linear infinite alternate;
}

.bg-mist.m2 {
  left: -40%;
  bottom: 18%;
  width: 150%;
  height: 28%;
  background: radial-gradient(ellipse at 50% 50%, rgba(150, 205, 235, 0.16), rgba(150, 205, 235, 0) 66%);
  animation: bg-mist-b 104s linear infinite alternate;
}

.bg-mist.m3 {
  left: -25%;
  bottom: -6%;
  width: 140%;
  height: 30%;
  background: radial-gradient(ellipse at 50% 50%, rgba(214, 226, 240, 0.14), rgba(214, 226, 240, 0) 70%);
  animation: bg-mist-a 132s linear infinite alternate-reverse;
}

@keyframes bg-mist-a {
  from {
    transform: translate3d(-6%, 0, 0);
  }
  to {
    transform: translate3d(7%, 0, 0);
  }
}

@keyframes bg-mist-b {
  from {
    transform: translate3d(6%, 0, 0);
  }
  to {
    transform: translate3d(-8%, 0, 0);
  }
}

@keyframes bg-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 随机闪电 */
.bg-flash {
  position: absolute;
  inset: 0;
  opacity: 0;
  mix-blend-mode: screen;
  background: radial-gradient(
    circle at var(--core-x) var(--core-y),
    rgba(214, 236, 255, 0.5),
    rgba(214, 236, 255, 0) 58%
  );
}

.bg-flash.on {
  animation: bg-flash-pop 480ms ease-out;
}

@keyframes bg-flash-pop {
  0% {
    opacity: 0;
  }
  8% {
    opacity: 0.9;
  }
  22% {
    opacity: 0.2;
  }
  36% {
    opacity: 0.7;
  }
  100% {
    opacity: 0;
  }
}

/* 胶片颗粒 */
.bg-grain {
  position: absolute;
  inset: -60px;
  opacity: 0.055;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: bg-grain-move 0.7s steps(5) infinite;
}

@keyframes bg-grain-move {
  0% {
    background-position: 0 0;
  }
  20% {
    background-position: -28px 16px;
  }
  40% {
    background-position: 18px -24px;
  }
  60% {
    background-position: -14px -12px;
  }
  80% {
    background-position: 26px 20px;
  }
  100% {
    background-position: 0 0;
  }
}

/* 暗角 */
.bg-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 78% 68% at var(--core-x) var(--core-y),
    rgba(0, 0, 0, 0) 34%,
    rgba(0, 0, 0, 0.34) 68%,
    rgba(0, 0, 0, 0.72) 100%
  );
}

/* 上下压暗：保证标题与按钮压在任何画面上都读得清 */
.bg-scrim-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 42%;
  background: linear-gradient(180deg, rgba(3, 5, 9, 0.72) 0%, rgba(3, 5, 9, 0.34) 42%, rgba(3, 5, 9, 0) 100%);
}

.bg-scrim-bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38%;
  background: linear-gradient(0deg, rgba(3, 5, 9, 0.78) 0%, rgba(3, 5, 9, 0.3) 48%, rgba(3, 5, 9, 0) 100%);
}

@media (max-width: 768px) {
  .bg-rays {
    opacity: 0.22;
  }

  /* 窄屏下核心离标题更近、画面裁得更狠，辉光压一档免得标题发白读不清 */
  .bg-core-glow,
  .bg-core-glow-fast {
    filter: brightness(0.72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bg-plate,
  .bg-aurora,
  .bg-aurora-img,
  .bg-rays,
  .bg-core-glow,
  .bg-core-glow-fast,
  .bg-mist,
  .bg-grain,
  .bg-flash {
    animation: none;
  }
}

/* 顶部控制按钮 */
.top-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  /* 音乐控件比按钮高一截（下面挂了音量条），顶部对齐，别把全屏按钮拉高 */
  align-items: flex-start;
  gap: 10px;
  z-index: 3;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 0;
  background: rgba(10, 10, 14, 0.55);
  border: 1px solid rgba(237, 231, 217, 0.16);
  color: var(--cover-ink);
  font-size: calc(15px * var(--ui-font-scale));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color var(--motion-fast),
    color var(--motion-fast),
    background var(--motion-fast);
}

.control-btn:hover {
  border-color: rgba(var(--cover-gold-rgb), 0.6);
  color: var(--cover-gold);
  background: rgba(var(--cover-gold-rgb), 0.1);
}

/* 音乐按钮 + 音量条：竖着叠，条子挂在按钮正下方 */
.music-ctl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

/*
 * 音量条本体只有 2px（按需求），命中区靠 ::before 上下各撑 7px 补到 16px，
 * 否则鼠标得瞄得像素级准才拖得动。::before 不带背景，视觉上仍是一条细线。
 */
.volume-bar {
  position: relative;
  width: 40px;
  height: 2px;
  background: rgba(237, 231, 217, 0.2);
  cursor: pointer;
  /* 触屏上把拖拽手势留给自己，别被页面滚动抢走 */
  touch-action: none;
}

.volume-bar::before {
  content: '';
  position: absolute;
  inset: -7px -6px;
}

.volume-bar:hover {
  background: rgba(237, 231, 217, 0.34);
}

.volume-bar:focus-visible {
  outline: 1px solid rgba(var(--cover-gold-rgb), 0.85);
  outline-offset: 3px;
}

.volume-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  background: var(--cover-gold);
  pointer-events: none;
  transition: width 90ms ease-out;
}

/* 音频元素只出声，不占位 */
.bgm-audio {
  display: none;
}

/* 标题区 */
.title-section {
  position: relative;
  z-index: 2;
  margin-top: clamp(12vh, 18vh, 22vh);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 20px;
  pointer-events: none;
}

.title-decoration {
  width: 56px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cover-gold), transparent);
  margin-bottom: 22px;
  opacity: 0.8;
}

.game-title {
  margin: 0;
  font-size: calc(46px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.2;
  background: linear-gradient(180deg, #ffffff 0%, #ede7d9 45%, var(--cover-gold) 130%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 36px rgba(var(--cover-gold-rgb), 0.25);
  max-width: 90vw;
}

.game-subtitle {
  margin: 16px 0 0;
  font-size: calc(15px * var(--ui-font-scale));
  letter-spacing: 0.32em;
  color: rgba(237, 231, 217, 0.72);
  text-transform: uppercase;
  /* 封面背景在标题下方是亮的传送门核心，副标题必须自带压暗才能读清 */
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 14px rgba(0, 0, 0, 0.85),
    0 0 30px rgba(0, 0, 0, 0.7);
}

/* 按钮区 */
.action-section {
  position: relative;
  z-index: 2;
  margin-top: auto;
  margin-bottom: clamp(40px, 7vh, 80px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 240px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 24px;
  font-size: calc(15px * var(--ui-font-scale));
  font-weight: 500;
  letter-spacing: 0.12em;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--cover-ink);
  transition:
    color var(--motion-fast),
    text-shadow var(--motion-fast),
    transform var(--motion-fast);
  animation: fadeInUp 0.6s ease-out;
}

.action-btn i {
  font-size: calc(14px * var(--ui-font-scale));
}

/* 主按钮：金色文字 */
.btn-primary {
  color: var(--cover-gold);
  font-weight: 600;
}

/* 次按钮：米白文字 */
.btn-secondary {
  color: var(--cover-ink);
}

/* 鼠标悬停：文字发光 */
.action-btn:hover {
  color: #ffffff;
  text-shadow:
    0 0 10px rgba(var(--cover-gold-rgb), 0.9),
    0 0 22px rgba(var(--cover-gold-rgb), 0.45);
  transform: translateY(-2px);
}

.action-btn:hover i {
  text-shadow:
    0 0 10px rgba(var(--cover-gold-rgb), 0.9),
    0 0 22px rgba(var(--cover-gold-rgb), 0.45);
}

/* 主按钮悬停时字色略偏亮金，仍保留发光 */
.btn-primary:hover {
  color: var(--cover-gold-bright);
}

/* 渐入动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .game-title {
    font-size: calc(34px * var(--ui-font-scale));
    letter-spacing: 0.14em;
  }

  .game-subtitle {
    font-size: calc(13px * var(--ui-font-scale));
    letter-spacing: 0.24em;
  }

  .control-btn {
    width: 38px;
    height: 38px;
    font-size: calc(14px * var(--ui-font-scale));
  }

  /* 音量条跟着按钮一起缩，保持同宽 */
  .volume-bar {
    width: 38px;
  }

  .top-controls {
    top: 12px;
    right: 12px;
  }
}

@media (max-width: 480px) {
  .game-title {
    font-size: calc(28px * var(--ui-font-scale));
  }

  .action-btn {
    padding: 6px 20px;
    font-size: calc(14px * var(--ui-font-scale));
  }
}
</style>
