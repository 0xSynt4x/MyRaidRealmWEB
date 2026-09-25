<template>
  <div class="image-slot" :class="`image-slot--${status}`">
    <template v-if="status === 'running'">
      <div class="image-slot-loading">
        <i class="ti ti-loader-2 ti-spin"></i>
        <span>{{ t('messageImage.generating') }}<template v-if="elapsedSeconds > 0"> · {{ elapsedSeconds }}s</template></span>
      </div>
    </template>

    <template v-else-if="status === 'done' && imageMissing">
      <div class="image-slot-fallback">
        <i class="ti ti-photo-off image-slot-fallback-icon"></i>
        <div class="image-slot-fallback-body">
          <p class="image-slot-fallback-title">{{ t('messageImage.missing') }}</p>
          <p class="image-slot-fallback-hint">{{ t('messageImage.missingHint') }}</p>
        </div>
        <button class="image-slot-btn" :disabled="disabled" @click="emit('generate')">
          <i class="ti ti-sparkles"></i>{{ t('messageImage.regenerate') }}
        </button>
      </div>
    </template>

    <template v-else-if="status === 'done' && displayUrl">
      <div v-if="loadFailed" class="image-slot-fallback">
        <i class="ti ti-alert-triangle image-slot-fallback-icon"></i>
        <div class="image-slot-fallback-body">
          <p class="image-slot-fallback-title">{{ t('messageImage.loadFailed') }}</p>
          <p class="image-slot-fallback-hint">{{ t('messageImage.loadFailedHint') }}</p>
        </div>
        <button class="image-slot-btn" @click="retryLoad">
          <i class="ti ti-refresh"></i>{{ t('messageImage.reload') }}
        </button>
      </div>
      <button
        v-else-if="!imageCollapsed"
        class="image-slot-frame"
        :title="t('messageImage.viewOriginal')"
        @click="openViewer"
      >
        <img :key="reloadKey" :src="displayUrl" :alt="prompt" loading="lazy" @error="loadFailed = true" />
      </button>
      <div class="image-slot-bar">
        <!-- 已生成的插图可以收起来：图占地方时点一下收掉，只留这一行 -->
        <button v-if="!loadFailed" class="image-slot-toggle" @click="imageCollapsed = !imageCollapsed">
          <i class="ti" :class="imageCollapsed ? 'ti-photo' : 'ti-photo-off'"></i>
          {{ imageCollapsed ? t('messageImage.expandImage') : t('messageImage.collapseImage') }}
        </button>
        <button class="image-slot-btn" :disabled="disabled" @click="emit('generate')">
          <i class="ti ti-refresh"></i>{{ t('messageImage.regenerate') }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="image-slot-prompt">
        <div class="image-slot-prompt-head">
          <span class="image-slot-prompt-label"><i class="ti ti-wand"></i>{{ t('messageImage.promptLabel') }}</span>
          <button class="image-slot-toggle" @click="promptExpanded = !promptExpanded">
            {{ promptExpanded ? t('messageImage.collapsePrompt') : t('messageImage.expandPrompt') }}
          </button>
        </div>
        <p v-if="promptExpanded" class="image-slot-prompt-text">{{ prompt }}</p>
      </div>
      <p v-if="status === 'error'" class="image-slot-error">
        <i class="ti ti-alert-triangle"></i>
        <span>{{ image?.error || t('messageImage.failed') }}</span>
      </p>
      <div class="image-slot-bar">
        <span class="image-slot-hint"><i class="ti ti-wand"></i>{{ t('messageImage.pending') }}</span>
        <button class="image-slot-btn primary" :disabled="disabled" @click="emit('generate')">
          <i class="ti ti-sparkles"></i>
          {{ status === 'error' ? t('messageImage.retry') : t('messageImage.generate') }}
        </button>
      </div>
    </template>
  </div>

  <ImageLightbox
    v-if="displayUrl && !loadFailed"
    :visible="viewerVisible"
    :src="displayUrl"
    :alt="prompt"
    @close="viewerVisible = false"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import type { MessageGeneratedImage } from '../../stores/messages';
import { loadGeneratedImage } from '../../utils/imageStorage';
import ImageLightbox from './ImageLightbox.vue';

const props = defineProps<{
  prompt: string;
  image?: MessageGeneratedImage;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'generate'): void;
}>();

const { t } = useI18n();
const promptExpanded = ref(false);
const imageCollapsed = ref(false);
const viewerVisible = ref(false);
const loadFailed = ref(false);
const reloadKey = ref(0);

const status = computed(() => props.image?.status ?? 'idle');

/**
 * 两条取图路径：
 * - 老消息 / 本地 ComfyUI：记录里直接有地址，拿来就用
 * - 云端出图：记录里只有编号，图在本机 IndexedDB 里，按编号取
 */
const storedImageUrl = ref('');
const imageMissing = ref(false);

const displayUrl = computed(() => props.image?.url || storedImageUrl.value);

async function resolveStoredImage() {
  const imageId = props.image?.imageId;
  storedImageUrl.value = '';
  imageMissing.value = false;

  if (!imageId || props.image?.url) return;

  try {
    const stored = await loadGeneratedImage(imageId);
    if (stored?.dataUrl) {
      storedImageUrl.value = stored.dataUrl;
    } else {
      // 图被清理过、或换了台机器打开存档 —— 给兜底提示，不要报错
      imageMissing.value = true;
    }
  } catch (error) {
    console.warn('[Image] 读取本机图片失败:', error);
    imageMissing.value = true;
  }
}

watch(displayUrl, () => {
  loadFailed.value = false;
  reloadKey.value += 1;
  // 新图来了就自动展开，别让重画出来的图一开始是收着的
  imageCollapsed.value = false;
});

watch(() => props.image?.imageId, resolveStoredImage, { immediate: true });

/** 出图时的计时，让「生成中」不是一句干等的空话 */
const elapsedSeconds = ref(0);
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

function stopElapsedTimer() {
  if (elapsedTimer !== null) {
    clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

watch(
  status,
  value => {
    stopElapsedTimer();
    if (value !== 'running') {
      elapsedSeconds.value = 0;
      return;
    }

    elapsedSeconds.value = 0;
    const startedAt = Date.now();
    elapsedTimer = setInterval(() => {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
    }, 1000);
  },
  { immediate: true },
);

onBeforeUnmount(stopElapsedTimer);

function openViewer() {
  if (!displayUrl.value) return;
  viewerVisible.value = true;
}

function retryLoad() {
  loadFailed.value = false;
  reloadKey.value += 1;
}
</script>

<style scoped>
.image-slot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--glass-border);
  background: color-mix(in srgb, var(--card-bg) 70%, transparent);
}

.image-slot--running,
.image-slot--done {
  border-style: solid;
}

.image-slot-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 0;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.image-slot-frame {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: zoom-in;
}

.image-slot-frame img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-md);
}

.image-slot-fallback {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0 4px;
}

.image-slot-fallback-icon {
  flex: none;
  margin-top: 1px;
  font-size: calc(18px * var(--ui-font-scale));
  color: var(--accent-danger);
}

.image-slot-fallback-body {
  flex: 1;
  min-width: 0;
}

.image-slot-fallback-title {
  margin: 0;
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 500;
  color: var(--text-primary);
}

.image-slot-fallback-hint {
  margin: 4px 0 0;
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
}

.image-slot-fallback .image-slot-btn {
  flex: none;
}

.image-slot-prompt {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.image-slot-prompt-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-slot-prompt-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.image-slot-prompt-text {
  margin: 0;
  padding: 8px 10px;
  border-radius: var(--radius-sm, 8px);
  background: var(--bg-primary);
  font-family: var(--font-mono, monospace);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-secondary);
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
}

.image-slot-toggle {
  margin-left: auto;
  padding: 0;
  border: none;
  background: transparent;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--accent-primary);
  cursor: pointer;
}

/* 图片底栏里的折叠按钮要挨着左边排（上面那条 margin-left:auto 是给提示词头部把开关推到右端用的） */
.image-slot-bar .image-slot-toggle {
  margin-left: 0;
}

.image-slot-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.5;
  color: var(--accent-danger);
  word-break: break-word;
}

.image-slot-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-slot-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.image-slot-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--motion-fast);
}

.image-slot-btn:hover:not(:disabled) {
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.4);
}

.image-slot-btn.primary {
  color: var(--ui-on-accent, #fff);
  background: var(--accent-primary);
  border-color: transparent;
}

.image-slot-btn.primary:hover:not(:disabled) {
  filter: brightness(1.08);
}

.image-slot-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .image-slot {
    padding: 8px 10px;
  }
}
</style>
