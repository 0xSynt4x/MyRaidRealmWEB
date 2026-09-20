<template>
  <div class="workshop-page">
    <SetupBackButton :title="t('setup.workshop.backToPresetSelect')" @click="handleBack" />

    <div class="page-header">
      <h2 class="page-title">{{ t('setup.workshop.title') }}</h2>
      <p class="page-subtitle">{{ t('setup.workshop.subtitle') }}</p>
    </div>

    <section class="guide-section dash-card">
      <h3 class="guide-title">{{ t('setup.workshop.submissionTitle') }}</h3>
      <p class="guide-text">
        {{ t('setup.workshop.submissionText') }}
      </p>
    </section>

    <section class="list-section">
      <div class="list-header">
        <h3>{{ t('setup.workshop.listTitle') }}</h3>
        <span class="count">{{
          t('setup.workshop.count', { visible: sortedFilteredWorkshopPresets.length, total: workshopPresets.length })
        }}</span>
      </div>

      <div v-if="selectedTags.length > 0" class="filter-summary">
        <span class="filter-text">{{ t('setup.workshop.filtered', { tags: selectedTags.join(', ') }) }}</span>
        <button class="clear-filter-btn" @click="clearSelectedTags">{{ t('setup.workshop.clearFilter') }}</button>
      </div>

      <div v-if="sortedFilteredWorkshopPresets.length > 0" class="preset-grid">
        <PresetCard
          v-for="preset in sortedFilteredWorkshopPresets"
          :key="preset.id"
          :preset="preset"
          :active-tags="selectedTags"
          :show-author="true"
          :author-text="getAuthorName(preset)"
          :is-favorite="favoritePresetIds.has(preset.id)"
          @select="handleApplyPreset(preset)"
          @tag-click="toggleTag"
          @toggle-favorite="handleToggleFavorite(preset.id)"
        />
      </div>

      <div v-else class="empty-card dash-card">
        <div class="empty-title">
          {{ workshopPresets.length === 0 ? t('setup.workshop.noPresets') : t('setup.workshop.noResults') }}
        </div>
        <div class="empty-desc">
          {{
            workshopPresets.length === 0 ? t('setup.workshop.emptyMaintainerHint') : t('setup.workshop.emptyFilterHint')
          }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../../../i18n';
import type { PresetConfig } from '../../../presets/types';
import { workshopPresets } from '../../../presets/workshop';
import { useSetupStore } from '../../../stores/setup';
import { loadPresetFavorites, savePresetFavorites, togglePresetFavorite } from '../../../utils/preset-favorites';
import PresetCard from '../common/PresetCard.vue';
import SetupBackButton from './components/SetupBackButton.vue';

const setupStore = useSetupStore();
const { t } = useI18n();
const selectedTags = ref<string[]>([]);
const favoritePresetIds = ref<Set<string>>(loadPresetFavorites());

const normalizedWorkshopTags = computed(() =>
  workshopPresets.map(preset => ({
    preset,
    normalizedTags: Array.from(new Set((preset.tags || []).map(tag => tag.trim()).filter(Boolean))),
  })),
);

const filteredWorkshopPresets = computed(() => {
  if (selectedTags.value.length === 0) {
    return workshopPresets;
  }

  return normalizedWorkshopTags.value
    .filter(({ normalizedTags }) => normalizedTags.some(tag => selectedTags.value.includes(tag)))
    .map(item => item.preset);
});

const sortedFilteredWorkshopPresets = computed(() => {
  return [...filteredWorkshopPresets.value].sort((a, b) => {
    const aFavorite = favoritePresetIds.value.has(a.id);
    const bFavorite = favoritePresetIds.value.has(b.id);
    if (aFavorite === bFavorite) {
      return 0;
    }
    return aFavorite ? -1 : 1;
  });
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
  setupStore.goToPage('presets', 'back');
}

async function handleApplyPreset(preset: PresetConfig) {
  setupStore.selectPreset(preset);
}

function getAuthorName(preset: PresetConfig): string {
  return preset.author?.name || t('setup.workshop.anonymousAuthor');
}
</script>

<style scoped>
@import './styles/setup-shared.css';

.workshop-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
  padding: 14px;
}

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
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.guide-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 14px;
}

.guide-title {
  margin: 0 0 6px 0;
  font-size: calc(16px * var(--ui-font-scale));
  color: var(--text-primary);
}

.guide-text {
  margin: 0;
  font-size: calc(13px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-secondary);
}

.list-section {
  max-width: 1080px;
  margin: 10px auto 0;
  padding: 0 0 14px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
}

.list-header h3 {
  margin: 0;
  font-size: calc(16px * var(--ui-font-scale));
  color: var(--text-primary);
}

.count {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-tertiary);
}

.filter-summary {
  margin: 0 4px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-text {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.clear-filter-btn {
  cursor: pointer;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(236px, 1fr));
  gap: 14px;
}

.empty-card {
  min-height: 104px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.empty-title {
  font-size: calc(15px * var(--ui-font-scale));
  color: var(--text-primary);
  font-weight: 600;
}

.empty-desc {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-tertiary);
}

@media (max-width: 768px) {
  .workshop-page {
    padding: 12px;
  }

  .page-header {
    padding: 24px 14px 12px;
  }

  .page-title {
    font-size: calc(22px * var(--ui-font-scale));
  }

  .guide-section {
    padding: 12px;
  }

  .preset-grid {
    grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
    gap: 10px;
  }

  .list-header,
  .filter-summary {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .workshop-page {
    padding: 10px;
  }

  .page-header {
    padding: 20px 12px 10px;
  }

  .page-title {
    font-size: calc(19px * var(--ui-font-scale));
  }

  .preset-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .filter-summary {
    flex-wrap: wrap;
  }
}
</style>
