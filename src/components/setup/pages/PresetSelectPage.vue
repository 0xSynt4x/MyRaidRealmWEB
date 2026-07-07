<template>
  <div class="preset-select-page">
    <!-- 返回按钮 -->
    <SetupBackButton :title="t('setup.presetSelect.backHome')" @click="handleBack" />

    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">{{ t('setup.presetSelect.title') }}</h2>
      <p class="page-subtitle">{{ t('setup.presetSelect.subtitle') }}</p>
    </div>

    <div v-if="selectedTags.length > 0" class="filter-summary">
      <span class="filter-text">{{ t('setup.presetSelect.filtered', { tags: selectedTags.join('、') }) }}</span>
      <button class="clear-filter-btn" @click="clearSelectedTags">{{ t('setup.presetSelect.clearFilters') }}</button>
    </div>

    <!-- 预设卡片网格 -->
    <div class="preset-grid">
      <section v-for="group in presetGroups" :key="group.key" class="preset-group-section">
        <header class="preset-group-header">
          <div>
            <span class="preset-group-kicker">{{ group.kicker }}</span>
            <h3>{{ group.title }}</h3>
          </div>
          <span class="preset-group-count">{{ t('setup.presetSelect.groupCount', { count: group.items.length }) }}</span>
        </header>

        <div class="preset-group-grid">
          <PresetCard
            v-for="preset in group.items"
            :key="preset.id"
            :preset="preset"
            :active-tags="selectedTags"
            :is-favorite="favoritePresetIds.has(preset.id)"
            @select="handleSelectPreset(preset)"
            @tag-click="toggleTag"
            @toggle-favorite="handleToggleFavorite(preset.id)"
          />
        </div>
      </section>

      <section class="preset-group-section special-group-section">
        <header class="preset-group-header">
          <div>
            <span class="preset-group-kicker">{{ t('setup.presetSelect.utilityGroupKicker') }}</span>
            <h3>{{ t('setup.presetSelect.utilityGroupTitle') }}</h3>
          </div>
        </header>

        <div class="preset-group-grid">
          <template v-for="item in sortedSpecialItems" :key="item.id">
            <SpecialCard
              :type="item.type"
              :is-favorite="favoritePresetIds.has(item.id)"
              @toggle-favorite="handleToggleFavorite(item.id)"
              @import="handleImport"
              @ai-generate="handleAiGenerate"
              @custom="handleCustom"
              @workshop="handleWorkshop"
            />
          </template>
        </div>
      </section>

      <!-- 无筛选结果提示 -->
      <div v-if="sortedFilteredPresets.length === 0" class="empty-filter-card dash-card">
        <div class="empty-title">{{ t('setup.presetSelect.noResultsTitle') }}</div>
        <div class="empty-desc">{{ t('setup.presetSelect.noResultsDesc') }}</div>
      </div>
    </div>

    <div
      v-if="isLoadingPresets || (presetLoadError && showErrorOverlay)"
      class="loading-overlay"
      :class="{ error: presetLoadError }"
      role="status"
      aria-live="polite"
      @click="handleOverlayClick"
    >
      <div class="status-card" :class="presetLoadError ? 'error' : 'loading'" @click.stop>
        <div v-if="isLoadingPresets" class="loading-spinner" />
        <div class="status-title">
          {{ presetLoadError ? t('setup.presetSelect.errorTitle') : t('setup.presetSelect.loadingTitle') }}
        </div>
        <div class="status-subtitle">
          {{ presetLoadError ? t('setup.presetSelect.errorSubtitle') : t('setup.presetSelect.loadingSubtitle') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '../../../i18n';
import type { PresetConfig } from '../../../presets/types';
import { useSetupStore } from '../../../stores/setup';
import { loadPresetFavorites, savePresetFavorites, togglePresetFavorite } from '../../../utils/preset-favorites';
import { getBuiltInPresets, getWorkshopPresets } from '../../../utils/preset-groups';
import { loadPresetsBundle } from '../../../utils/preset-loader';
import PresetCard from '../common/PresetCard.vue';
import SpecialCard from '../common/SpecialCard.vue';
import SetupBackButton from './components/SetupBackButton.vue';

const setupStore = useSetupStore();
const { t } = useI18n();
const presets = ref<PresetConfig[]>([]);

type SpecialCardType = 'import' | 'custom' | 'ai-generate' | 'workshop';
type PresetDisplayGroup = {
  key: 'builtin' | 'workshop';
  title: string;
  kicker: string;
  items: PresetConfig[];
};

const specialCardTypes: SpecialCardType[] = ['import', 'ai-generate', 'custom', 'workshop'];

const selectedTags = ref<string[]>([]);

const favoritePresetIds = ref<Set<string>>(loadPresetFavorites());

const normalizedPresetTags = computed(() =>
  presets.value.map(preset => ({
    preset,
    normalizedTags: Array.from(new Set((preset.tags || []).map(tag => tag.trim()).filter(Boolean))),
  })),
);

const filteredPresets = computed(() => {
  if (selectedTags.value.length === 0) {
    return presets.value;
  }

  return normalizedPresetTags.value
    .filter(({ normalizedTags }) => normalizedTags.some(tag => selectedTags.value.includes(tag)))
    .map(item => item.preset);
});

const sortedFilteredPresets = computed(() => {
  return [...filteredPresets.value].sort((a, b) => {
    const aFavorite = favoritePresetIds.value.has(a.id);
    const bFavorite = favoritePresetIds.value.has(b.id);
    if (aFavorite === bFavorite) {
      return 0;
    }
    return aFavorite ? -1 : 1;
  });
});

const sortedSpecialItems = computed(() => {
  const items = specialCardTypes.map(type => ({ id: type, type }));

  return items.sort((a, b) => {
    const aFavorite = favoritePresetIds.value.has(a.id);
    const bFavorite = favoritePresetIds.value.has(b.id);
    if (aFavorite === bFavorite) {
      return 0;
    }
    return aFavorite ? -1 : 1;
  });
});

const presetGroups = computed<PresetDisplayGroup[]>(() => {
  const builtInPresets = getBuiltInPresets(sortedFilteredPresets.value);
  const workshopItems = getWorkshopPresets(sortedFilteredPresets.value);

  return [
    {
      key: 'builtin',
      title: t('setup.presetSelect.builtInGroupTitle'),
      kicker: t('setup.presetSelect.builtInGroupKicker'),
      items: builtInPresets,
    },
    {
      key: 'workshop',
      title: t('setup.presetSelect.workshopGroupTitle'),
      kicker: t('setup.presetSelect.workshopGroupKicker'),
      items: workshopItems,
    },
  ].filter(group => group.items.length > 0);
});

const isLoadingPresets = ref(true);
const presetLoadError = ref(false);
const showErrorOverlay = ref(false);

onMounted(async () => {
  try {
    presets.value = await loadPresetsBundle();
    presetLoadError.value = false;
    showErrorOverlay.value = false;
  } catch (error) {
    console.error('[PresetSelectPage] 加载预设包失败:', error);
    presetLoadError.value = true;
    showErrorOverlay.value = true;
    toastr.error(t('setup.presetSelect.loadFailedToast'));
  } finally {
    isLoadingPresets.value = false;
  }
});

function toggleTag(tag: string) {
  const normalizedTag = tag.trim();
  if (!normalizedTag) {
    return;
  }

  if (selectedTags.value.includes(normalizedTag)) {
    selectedTags.value = selectedTags.value.filter(item => item !== normalizedTag);
    return;
  }
  selectedTags.value = [...selectedTags.value, normalizedTag];
}

function clearSelectedTags() {
  selectedTags.value = [];
}

function handleToggleFavorite(presetId: string) {
  favoritePresetIds.value = togglePresetFavorite(presetId, favoritePresetIds.value);
  savePresetFavorites(favoritePresetIds.value);
}

function handleBack() {
  setupStore.goToPage('home', 'back');
}

async function handleSelectPreset(preset: PresetConfig) {
  setupStore.selectPreset(preset);
}

async function handleImport(file: File) {
  await setupStore.importPreset(file);
}

function handleAiGenerate() {
  setupStore.startAiGenerate();
}

function handleCustom() {
  setupStore.startCustomMode();
}

function handleWorkshop() {
  setupStore.startWorkshop();
}

function handleOverlayClick() {
  if (presetLoadError.value) {
    showErrorOverlay.value = false;
  }
}
</script>

<style scoped>
@import './styles/setup-shared.css';

.preset-select-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
  position: relative;
}

/* 页面标题 */
.page-header {
  text-align: center;
  padding: 28px 16px 14px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: clamp(22px, 2vw, 26px);
  font-weight: 700;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 预设卡片网格 */
.preset-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
  max-width: 1080px;
  margin: 0 auto;
}

.preset-group-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preset-group-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px;
}

.preset-group-header h3 {
  margin: 2px 0 0;
  color: var(--text-primary);
  font-size: 17px;
}

.preset-group-kicker,
.preset-group-count {
  color: var(--text-tertiary);
  font-size: 12px;
}

.preset-group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
  gap: 14px;
}

.filter-summary {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.clear-filter-btn {
  cursor: pointer;
}

.empty-filter-card {
  min-height: 112px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border-style: dashed;
}

.empty-title {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.empty-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
  backdrop-filter: blur(2px);
  pointer-events: all;
}

.loading-overlay.error {
  background: color-mix(in srgb, var(--bg-primary) 78%, transparent);
}

.status-card {
  min-width: min(320px, 100%);
}

.status-card.loading {
  color: var(--text-secondary);
}

.status-card.error {
  color: var(--error-color);
}

.status-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.status-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.loading-spinner {
  animation: preset-loading-spin 0.8s linear infinite;
}

@keyframes preset-loading-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    padding: 24px 14px 12px;
  }

  .page-title {
    font-size: 22px;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .preset-grid {
    gap: 10px;
    padding: 12px;
  }

  .preset-group-grid {
    grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
    gap: 10px;
  }
  .filter-summary {
    padding: 0 12px;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 20px 12px 10px;
  }

  .page-title {
    font-size: 19px;
  }

  .page-subtitle {
    font-size: 12px;
  }

  .preset-grid {
    gap: 8px;
    padding: 10px;
  }

  .preset-group-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .filter-summary {
    padding: 0 10px;
  }
}
</style>
