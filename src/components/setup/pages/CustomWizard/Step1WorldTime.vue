<template>
  <div class="step-content-inner">
    <h3 class="step-title">{{ t('setup.customWizard.worldTime.title') }}</h3>
    <p class="step-desc">{{ t('setup.customWizard.worldTime.description') }}</p>

    <div class="form-section">
      <!-- 时间系统 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.worldTime.timeSystem') }}</h4>
        <div class="input-row">
          <label>{{ eraNameField.label }}</label>
          <input
            v-model="setupStore.config.世界.时间系统.纪元名称"
            type="text"
            class="underline-input"
            :placeholder="eraNameField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ currentTimeField.label }}</label>
          <input
            v-model="setupStore.config.世界.时间系统.当前时间"
            type="text"
            class="underline-input"
            :placeholder="currentTimeField.placeholder"
          />
        </div>
      </div>

      <!-- 空间定位 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.worldTime.location') }}</h4>
        <div class="input-row">
          <label>{{ locationField.label }}</label>
          <input
            v-model="setupStore.config.世界.空间定位.当前位置"
            type="text"
            class="underline-input"
            :placeholder="locationField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ areaTraitsField.label }}</label>
          <input
            v-model="setupStore.config.世界.空间定位.区域特征"
            type="text"
            class="underline-input"
            :placeholder="areaTraitsField.placeholder"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../../i18n';
import { useSetupStore } from '../../../../stores/setup';

const setupStore = useSetupStore();
const { t, fieldMeta } = useI18n();

const eraNameField = computed(() => fieldMeta('世界.时间系统.纪元名称'));
const currentTimeField = computed(() => fieldMeta('世界.时间系统.当前时间'));
const locationField = computed(() => fieldMeta('世界.空间定位.当前位置'));
const areaTraitsField = computed(() => fieldMeta('世界.空间定位.区域特征'));
</script>

<style scoped>
/* 组件特有样式（共享样式已在 global.css 中定义） */
</style>
