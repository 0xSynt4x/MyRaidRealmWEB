<template>
  <div class="step-indicator">
    <div class="step-dots">
      <div
        v-for="step in props.totalSteps"
        :key="step"
        class="step-dot"
        :class="{
          active: step === props.currentStep,
          completed: step < props.currentStep,
        }"
        @click="$emit('goto', step)"
      ></div>
    </div>
    <span class="step-text"
      >{{ stepNames[props.currentStep - 1] }} ({{ props.currentStep }}/{{ props.totalSteps }})</span
    >
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../i18n';

const props = defineProps<{
  currentStep: number;
  totalSteps: number;
}>();

defineEmits<{
  goto: [step: number];
}>();

const { t } = useI18n();

const stepNames = computed(() => [
  t('setup.step.worldTime'),
  t('setup.step.socialEnvironment'),
  t('setup.step.playerIdentity'),
  t('setup.step.playerStats'),
  t('setup.step.currencyItems'),
  t('setup.step.factionNetwork'),
  t('setup.step.businessAssets'),
]);
</script>

<style scoped>
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
}

.step-dots {
  display: flex;
  gap: 8px;
}

.step-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-dot:hover {
  transform: scale(1.2);
}

.step-dot.active {
  background: var(--accent-primary);
  transform: scale(1.3);
}

.step-dot.completed {
  background: var(--accent-success);
}

.step-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 768px) {
  .step-indicator {
    padding: 12px;
    gap: 10px;
  }

  .step-dots {
    gap: 6px;
  }

  .step-dot {
    width: 8px;
    height: 8px;
  }

  .step-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .step-indicator {
    padding: 10px;
    gap: 8px;
  }

  .step-dots {
    gap: 5px;
  }

  .step-dot {
    width: 7px;
    height: 7px;
  }

  .step-text {
    font-size: 12px;
  }
}
</style>
