<template>
  <div class="custom-wizard-container">
    <!-- 返回按钮 -->
    <button
      class="back-button setup-back-button"
      :title="t('setup.customWizard.backToPresetSelect')"
      @click="handleBack"
    >
      <i class="fa-solid fa-arrow-left"></i>
    </button>

    <!-- 步骤指示器 -->
    <StepIndicator :current-step="setupStore.customStep" :total-steps="setupStore.totalSteps" @goto="handleGotoStep" />

    <!-- 步骤内容区域 -->
    <div class="step-content">
      <Transition :name="setupStore.slideDirection" mode="out-in">
        <Step1WorldTime v-if="setupStore.customStep === 1" key="step1" />
        <Step2Society v-else-if="setupStore.customStep === 2" key="step2" />
        <Step3Identity v-else-if="setupStore.customStep === 3" key="step3" />
        <Step5Currency v-else-if="setupStore.customStep === 4" key="step4" />
        <Step6Factions v-else-if="setupStore.customStep === 5" key="step5" />
        <Step7Business v-else-if="setupStore.customStep === 6" key="step6" @export="handleExport" />
      </Transition>
    </div>

    <!-- 导航按钮 -->
    <div class="nav-buttons">
      <button v-if="!setupStore.isFirstStep" class="footer-btn cancel" @click="handlePrev">
        <i class="fa-solid fa-arrow-left"></i>
        <span>{{ t('common.previous') }}</span>
      </button>
      <div v-else class="spacer"></div>

      <button v-if="!setupStore.isLastStep" class="footer-btn save" @click="handleNext">
        <span>{{ t('common.next') }}</span>
        <i class="fa-solid fa-arrow-right"></i>
      </button>
      <button v-else class="footer-btn save" :disabled="!canProceed" @click="handleGoToSettings">
        <span>{{ t('common.next') }}</span>
        <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../../../i18n';
import { useSetupStore } from '../../../../stores/setup';
import StepIndicator from '../../common/StepIndicator.vue';
import Step1WorldTime from './Step1WorldTime.vue';
import Step2Society from './Step2Society.vue';
import Step3Identity from './Step3Identity.vue';
import Step5Currency from './Step5Currency.vue';
import Step6Factions from './Step6Factions.vue';
import Step7Business from './Step7Business.vue';

const emit = defineEmits<{ next: [] }>();

const setupStore = useSetupStore();
const { t } = useI18n();

// 是否可以进入下一步
const canProceed = computed(() => {
  return setupStore.config.玩家?.姓名?.trim() !== '';
});

// 返回
function handleBack() {
  if (setupStore.customStep > 1) {
    setupStore.prevStep();
  } else {
    setupStore.goToPage('presets', 'back');
  }
}

// 跳转到指定步骤
function handleGotoStep(step: number) {
  setupStore.goToStep(step);
}

// 上一步
function handlePrev() {
  setupStore.prevStep();
}

// 下一步
function handleNext() {
  // 验证当前步骤
  const { valid, errors } = setupStore.validateCurrentStep();
  if (!valid) {
    errors.forEach(error => toastr.warning(error));
    return;
  }
  setupStore.nextStep();
}

// 导出预设
function handleExport() {
  setupStore.exportPreset();
}

// 进入设置页面
function handleGoToSettings() {
  // 验证姓名
  if (!setupStore.config.玩家?.姓名?.trim()) {
    toastr.warning(t('setup.customWizard.nameRequiredBeforeSettings'));
    setupStore.goToStep(3);
    return;
  }

  // 发出 next 事件，由父组件处理页面跳转
  // 注意：变量写入统一在 SettingsPage 的"开始游戏"时处理
  emit('next');
}
</script>

<style scoped>
@import '../styles/setup-shared.css';

.custom-wizard-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  position: relative;
}

/* 返回按钮 */
.back-button {
  position: absolute;
  z-index: 10;
}

/* 步骤内容区域 */
.step-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  position: relative;
}

/* 导航按钮 */
.nav-buttons {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}

.nav-buttons .footer-btn {
  flex: 1;
}

.spacer {
  flex: 1;
}

/* 页面滑动切换动画 */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(50px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-50px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-50px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(50px);
}

/* 响应式 */
@media (max-width: 768px) {
  .back-button {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .step-content {
    padding: 16px;
  }

  .nav-buttons {
    padding: 12px 16px;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .back-button {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .step-content {
    padding: 12px;
  }

  .nav-buttons {
    padding: 10px 12px;
    gap: 8px;
  }

  .nav-buttons .footer-btn {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>
