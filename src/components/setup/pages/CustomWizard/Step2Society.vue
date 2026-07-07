<template>
  <div class="step-content-inner">
    <h3 class="step-title">{{ t('setup.customWizard.society.title') }}</h3>
    <p class="step-desc">{{ t('setup.customWizard.society.description') }}</p>

    <div class="form-section">
      <!-- 社会结构 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.society.socialStructure') }}</h4>
        <div class="input-row">
          <label>{{ powerStructureField.label }}</label>
          <input
            v-model="setupStore.config.世界.社会环境.权力结构"
            type="text"
            class="underline-input"
            :placeholder="powerStructureField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ socialAtmosphereField.label }}</label>
          <input
            v-model="setupStore.config.世界.社会环境.社会氛围"
            type="text"
            class="underline-input"
            :placeholder="socialAtmosphereField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ valuesField.label }}</label>
          <input
            v-model="setupStore.config.世界.社会环境.主流价值观"
            type="text"
            class="underline-input"
            :placeholder="valuesField.placeholder"
          />
        </div>
      </div>

      <!-- 世界规则 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.society.worldRules') }}</h4>
        <div class="input-row">
          <label>{{ powerSystemField.label }}</label>
          <input
            v-model="setupStore.config.世界.力量体系"
            type="text"
            class="underline-input"
            :placeholder="powerSystemField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ gameplayFocusField.label }}</label>
          <select v-model="setupStore.config.世界.玩法侧重" class="underline-select">
            <option v-for="option in gameplayFocusOptions" :key="option" :value="option">
              {{ enumDisplay('world.gameplayFocus', option) }}
            </option>
          </select>
        </div>
        <div class="input-row">
          <label>{{ worldRulesField.label }}</label>
          <textarea
            v-model="runningRulesText"
            class="underline-input"
            rows="3"
            :placeholder="t('setup.customWizard.society.runningRulesPlaceholder')"
          />
        </div>
        <div class="input-row">
          <label>{{ narrativeField.label }}</label>
          <input
            v-model="setupStore.config.世界.叙事玩法"
            type="text"
            class="underline-input"
            :placeholder="narrativeField.placeholder"
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
const { t, enumDisplay, fieldMeta } = useI18n();

const gameplayFocusOptions = ['自由探索', '战斗冒险', '经营模拟', '社交恋爱', '剧情推进'];

const powerStructureField = computed(() => fieldMeta('世界.社会环境.权力结构'));
const socialAtmosphereField = computed(() => fieldMeta('世界.社会环境.社会氛围'));
const valuesField = computed(() => fieldMeta('世界.社会环境.主流价值观'));
const powerSystemField = computed(() => fieldMeta('世界.力量体系'));
const gameplayFocusField = computed(() => fieldMeta('世界.玩法侧重'));
const worldRulesField = computed(() => fieldMeta('世界.运行规则'));
const narrativeField = computed(() => fieldMeta('世界.叙事玩法'));

const runningRulesText = computed({
  get: () => setupStore.config.世界.运行规则.join('\n'),
  set: value => {
    setupStore.config.世界.运行规则 = value
      .split(/\r?\n/)
      .map(rule => rule.trim())
      .filter(Boolean);
  },
});
</script>

<style scoped>
/* 组件特有样式（共享样式已在 global.css 中定义） */
</style>
