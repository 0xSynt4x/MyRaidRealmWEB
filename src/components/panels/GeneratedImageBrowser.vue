<template>
  <Teleport to="#modal-container">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
        <div class="modal-content browser-content">
          <div class="dashboard-header">
            <div class="header-left">
              <div class="browser-avatar">
                <i class="ti ti-photo"></i>
              </div>
              <div class="browser-heading">
                <h3 class="browser-title">{{ t('imageBrowser.title') }}</h3>
                <div class="browser-meta">{{ metaText }}</div>
              </div>
            </div>
            <button class="dialog-close" :title="t('imageBrowser.close')" @click="emit('close')">
              <i class="ti ti-x"></i>
            </button>
          </div>

          <div class="modal-body browser-body">
            <p v-if="isLoading" class="browser-state">
              <i class="ti ti-loader-2 ti-spin"></i>
              <span>{{ t('imageBrowser.loading') }}</span>
            </p>

            <p v-else-if="images.length === 0" class="browser-state">
              <i class="ti ti-photo-off"></i>
              <span>{{ t('imageBrowser.empty') }}</span>
            </p>

            <div v-else class="browser-grid">
              <figure v-for="image in images" :key="image.id" class="browser-item">
                <button class="browser-thumb" :title="t('imageBrowser.view')" @click="openViewer(image)">
                  <img :src="image.dataUrl" :alt="image.prompt" loading="lazy" draggable="false" />
                </button>

                <figcaption class="browser-caption">
                  <span class="browser-caption-time">{{ formatTime(image.createdAt) }}</span>
                  <span class="browser-caption-size">{{ formatByteSize(estimateDataUrlByteSize(image.dataUrl)) }}</span>
                </figcaption>

                <p class="browser-prompt" :title="image.prompt">{{ image.prompt }}</p>

                <button class="chip chip--danger" :disabled="deletingId === image.id" @click="handleDelete(image)">
                  <i class="ti" :class="deletingId === image.id ? 'ti-loader-2 ti-spin' : 'ti-trash'"></i>
                  {{ t('imageBrowser.delete') }}
                </button>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ImageLightbox :visible="Boolean(viewerImage)" :src="viewerImage?.dataUrl ?? ''" :alt="viewerImage?.prompt" @close="viewerImage = null" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import {
  deleteGeneratedImage,
  estimateDataUrlByteSize,
  formatByteSize,
  listGeneratedImages,
  type StoredGeneratedImage,
} from '../../utils/imageStorage';
import ImageLightbox from '../common/ImageLightbox.vue';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  /** 有图被删掉 —— 让外面重新统计一次占用 */
  (e: 'changed'): void;
}>();

const { t } = useI18n();

const images = ref<StoredGeneratedImage[]>([]);
const isLoading = ref(false);
const deletingId = ref('');
const viewerImage = ref<StoredGeneratedImage | null>(null);

const totalBytes = computed(() =>
  images.value.reduce((sum, image) => sum + estimateDataUrlByteSize(image.dataUrl), 0),
);

const metaText = computed(() =>
  t('imageBrowser.count', { count: images.value.length, size: formatByteSize(totalBytes.value) }),
);

/** ISO 字符串转「年月日 时:分」；转不动就原样显示，别把整块列表搞崩 */
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function refresh() {
  isLoading.value = true;
  try {
    images.value = await listGeneratedImages();
  } catch (error) {
    console.warn('[Image] 读取图片列表失败:', error);
    images.value = [];
  } finally {
    isLoading.value = false;
  }
}

function openViewer(image: StoredGeneratedImage) {
  viewerImage.value = image;
}

async function handleDelete(image: StoredGeneratedImage) {
  if (deletingId.value) return;

  const confirmed = window.confirm(t('imageBrowser.deleteConfirm'));
  if (!confirmed) return;

  deletingId.value = image.id;
  try {
    await deleteGeneratedImage(image.id);
    images.value = images.value.filter(item => item.id !== image.id);
    if (viewerImage.value?.id === image.id) {
      viewerImage.value = null;
    }
    emit('changed');
  } catch (error) {
    console.warn('[Image] 删除单张图片失败:', error);
  } finally {
    deletingId.value = '';
  }
}

// 每次打开都重新读一遍 —— 出图是随时发生的，缓存里的列表不会自己刷新
watch(
  () => props.visible,
  visible => {
    if (visible) {
      void refresh();
      return;
    }
    viewerImage.value = null;
  },
);
</script>

<style scoped>
.browser-content {
  width: min(100%, 860px);
  max-width: 860px;
  max-height: min(var(--dialog-max-height), 86vh);
}

.browser-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  font-size: calc(16px * var(--ui-font-scale));
}

.browser-heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.browser-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.browser-meta {
  font-size: calc(11px * var(--ui-font-scale));
  color: rgba(255, 255, 255, 0.86);
}

.browser-body {
  padding: 12px;
}

.browser-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 32px 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.browser-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 10px;
}

.browser-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 8px;
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-sm);
  min-width: 0;
}

.browser-thumb {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm, 8px);
  background: var(--bg-primary);
  cursor: zoom-in;
  transition: border-color var(--motion-fast);
}

.browser-thumb:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.5);
}

.browser-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-drag: none;
}

.browser-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: calc(10px * var(--ui-font-scale));
  color: var(--text-secondary);
  white-space: nowrap;
}

.browser-caption-size {
  flex-shrink: 0;
}

.browser-prompt {
  margin: 0;
  font-size: calc(10px * var(--ui-font-scale));
  line-height: 1.5;
  color: var(--text-secondary);
  /* 提示词只露两行，详情看 title 提示 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--motion-fast);
  flex-shrink: 0;
}

.chip--danger:hover:not(:disabled) {
  color: var(--accent-danger);
  border-color: color-mix(in srgb, var(--accent-danger) 45%, transparent);
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
