<template>
  <div
    class="special-card dash-card"
    :class="type"
    tabindex="0"
    role="button"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <button
      type="button"
      class="favorite-btn"
      :class="{ active: isFavorite }"
      :aria-label="isFavorite ? t('setup.favorite.removeCard') : t('setup.favorite.addCard')"
      @click.stop="emit('toggleFavorite')"
    >
      {{ isFavorite ? t('setup.favorite.on') : t('setup.favorite.off') }}
    </button>

    <div class="card-icon"><i class="ti" :class="icon"></i></div>
    <h3 class="card-title">{{ title }}</h3>
    <p class="card-desc">{{ description }}</p>

    <!-- 隐藏的文件输入 -->
    <input
      v-if="type === 'import'"
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      hidden
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../../../i18n';

const props = defineProps<{
  type: 'import' | 'ai-generate' | 'workshop';
  isFavorite?: boolean;
}>();
const { t } = useI18n();

const emit = defineEmits<{
  import: [file: File];
  'ai-generate': [];
  workshop: [];
  toggleFavorite: [];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const icon = computed(() => {
  switch (props.type) {
    case 'import':
      return 'ti-download';
    case 'ai-generate':
      return 'ti-robot';
    default:
      return 'ti-tools';
  }
});

const title = computed(() => {
  switch (props.type) {
    case 'import':
      return t('setup.special.import.title');
    case 'ai-generate':
      return t('setup.special.aiGenerate.title');
    default:
      return t('setup.special.workshop.title');
  }
});

const description = computed(() => {
  switch (props.type) {
    case 'import':
      return t('setup.special.import.description');
    case 'ai-generate':
      return t('setup.special.aiGenerate.description');
    default:
      return t('setup.special.workshop.description');
  }
});

function handleClick() {
  if (props.type === 'import') {
    const input = fileInput.value;
    if (!input) {
      console.warn('[SpecialCard] 导入文件选择器未挂载');
      return;
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  } else if (props.type === 'ai-generate') {
    emit('ai-generate');
  } else {
    emit('workshop');
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit('import', file);
    // 重置 input 以便可以再次选择同一文件
    input.value = '';
  }
}
</script>

<style scoped>
.special-card {
  cursor: pointer;
  transition: all var(--motion-normal);
  text-align: center;
  padding: 16px 14px;
  border-style: dashed;
  border-width: 1px;
  position: relative;
  min-height: 208px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
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

.special-card:hover {
  transform: translateY(-1px);
}

.special-card:focus-visible {
  outline: 2px solid rgba(var(--accent-primary-rgb), 0.56);
  outline-offset: 2px;
  border-color: rgba(var(--accent-primary-rgb), 0.34);
}

.special-card.import {
  border-color: var(--accent-success);
}

.special-card.import:hover {
  background: color-mix(in srgb, var(--accent-success) 7%, var(--card-bg-strong));
}

.special-card.ai-generate {
  border-color: #9333ea;
}

.special-card.ai-generate:hover {
  background: color-mix(in srgb, #9333ea 7%, var(--card-bg-strong));
}

.special-card.workshop {
  border-color: #f59e0b;
}

.special-card.workshop:hover {
  background: color-mix(in srgb, #f59e0b 8%, var(--card-bg-strong));
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
  margin: 0;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  line-height: 1.4;
}

/* 响应式 */
@media (max-width: 768px) {
  .special-card {
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
  .special-card {
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
  }
}
</style>
