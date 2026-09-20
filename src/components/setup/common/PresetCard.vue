<template>
  <div
    class="preset-card dash-card"
    tabindex="0"
    role="button"
    @click="$emit('select')"
    @keydown.enter.prevent="$emit('select')"
    @keydown.space.prevent="$emit('select')"
  >
    <button
      type="button"
      class="favorite-btn"
      :class="{ active: isFavorite }"
      :aria-label="isFavorite ? t('setup.favorite.removePreset') : t('setup.favorite.addPreset')"
      @click.stop="$emit('toggleFavorite')"
    >
      {{ isFavorite ? t('setup.favorite.on') : t('setup.favorite.off') }}
    </button>

    <div class="card-body">
      <div class="card-icon">{{ preset.icon }}</div>
      <h3 class="card-title">{{ preset.name }}</h3>
      <p class="card-desc">{{ preset.description }}</p>
      <div class="card-tags">
        <button
          v-for="tag in preset.tags"
          :key="tag"
          type="button"
          class="tag"
          :class="{ active: activeTags.includes(tag.trim()) }"
          @click.stop="$emit('tagClick', tag.trim())"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <div v-if="showAuthor" class="card-footer">
      <span class="author-link">@{{ authorText || '匿名作者' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../../i18n';
import type { PresetConfig } from '../../../presets/types';

const { t } = useI18n();

withDefaults(
  defineProps<{
    preset: PresetConfig;
    activeTags?: string[];
    showAuthor?: boolean;
    authorText?: string;
    isFavorite?: boolean;
  }>(),
  {
    activeTags: () => [],
    showAuthor: false,
    authorText: '',
    isFavorite: false,
  },
);

defineEmits<{
  select: [];
  tagClick: [tag: string];
  toggleFavorite: [];
}>();
</script>

<style scoped>
.preset-card {
  cursor: pointer;
  transition: all var(--motion-normal);
  text-align: center;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  min-height: 208px;
  position: relative;
}

.favorite-btn {
  position: absolute;
  right: 8px;
  top: 8px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.preset-card:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.22);
}

.preset-card:focus-visible {
  outline: 2px solid rgba(var(--accent-primary-rgb), 0.56);
  outline-offset: 2px;
  border-color: rgba(var(--accent-primary-rgb), 0.32);
}

.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 8px;
}

.card-icon {
  font-size: calc(40px * var(--ui-font-scale));
  line-height: 1;
}

.card-title {
  margin: 0;
  font-size: calc(15px * var(--ui-font-scale));
  font-weight: 600;
  color: var(--text-primary);
}

.card-desc {
  margin: 0 0 6px 0;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  line-height: 1.4;
}

.card-tags {
  display: flex;
  gap: 5px;
  justify-content: center;
  flex-wrap: wrap;
}

.card-tags .tag {
  border: 1px solid var(--control-border);
  background: var(--control-bg);
  color: var(--text-secondary);
  min-height: 32px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: calc(11px * var(--ui-font-scale));
  cursor: pointer;
  box-shadow: var(--control-shadow);
  transition: all var(--motion-fast);
}

.card-tags .tag:hover {
  border-color: var(--control-border-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.card-tags .tag.active {
  border-color: rgba(var(--accent-primary-rgb), 0.34);
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--control-bg));
  color: var(--accent-primary);
}

.card-footer {
  margin-top: auto;
  padding-top: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.author-link {
  color: var(--accent-primary);
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 600;
}

/* 响应式 */
@media (max-width: 768px) {
  .preset-card {
    padding: 14px 12px;
    min-height: 192px;
  }

  .favorite-btn {
    min-width: 64px;
    height: 30px;
    padding: 0 9px;
  }

  .card-icon {
    font-size: calc(36px * var(--ui-font-scale));
  }

  .card-title {
    font-size: calc(14px * var(--ui-font-scale));
  }

  .card-desc {
    font-size: calc(11px * var(--ui-font-scale));
  }
}

@media (max-width: 480px) {
  .preset-card {
    padding: 13px 10px;
    min-height: 180px;
  }

  .favorite-btn {
    min-width: 60px;
    padding: 0 8px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .card-icon {
    font-size: calc(32px * var(--ui-font-scale));
  }

  .card-title {
    font-size: calc(13px * var(--ui-font-scale));
  }

  .card-desc {
    font-size: calc(11px * var(--ui-font-scale));
    margin-bottom: 4px;
  }

  .card-tags .tag {
    font-size: calc(10px * var(--ui-font-scale));
    min-height: 30px;
    padding: 4px 9px;
  }
}
</style>
