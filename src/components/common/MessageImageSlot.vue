<template>
  <div class="image-slot" :class="`image-slot--${status}`">
    <template v-if="status === 'running'">
      <div class="image-slot-loading">
        <i class="ti ti-loader-2 ti-spin"></i>
        <span>{{ t('messageImage.generating') }}</span>
      </div>
    </template>

    <template v-else-if="status === 'done' && image?.url">
      <button class="image-slot-frame" :title="t('messageImage.viewOriginal')" @click="openViewer">
        <img :src="image.url" :alt="prompt" loading="lazy" />
      </button>
      <div class="image-slot-bar">
        <span class="image-slot-hint"><i class="ti ti-photo"></i>{{ t('messageImage.generated') }}</span>
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
    v-if="image?.url"
    :visible="viewerVisible"
    :src="image.url"
    :alt="prompt"
    @close="viewerVisible = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../../i18n';
import type { MessageGeneratedImage } from '../../stores/messages';
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
const viewerVisible = ref(false);

const status = computed(() => props.image?.status ?? 'idle');

function openViewer() {
  if (!props.image?.url) return;
  viewerVisible.value = true;
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
