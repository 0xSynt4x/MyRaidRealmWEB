<template>
  <div class="player-info-page">
    <!-- 返回按钮 -->
    <SetupBackButton :title="t('setup.playerInfo.backToPresetSelect')" @click="handleBack" />

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 选中的预设信息 -->
      <div v-if="setupStore.selectedPreset" class="selected-preset">
        <span class="preset-icon">{{ setupStore.selectedPreset.icon }}</span>
        <span class="preset-name">{{ setupStore.selectedPreset.name }}</span>
      </div>

      <!-- 页面标题 -->
      <div class="page-header">
        <h2 class="page-title">{{ t('setup.playerInfo.title') }}</h2>
        <p class="page-subtitle">{{ t('setup.playerInfo.subtitle') }}</p>
      </div>

      <!-- 表单区域 - 复用 Step3Identity 的结构 -->
      <div class="form-section">
        <!-- 📋 基本信息 -->
        <div class="section-group">
          <h4 class="section-label">{{ t('setup.playerInfo.basicInfo') }}</h4>
          <div class="input-row">
            <label>
              {{ nameField.label }}
              <span class="required">*</span>
            </label>
            <input
              v-model="setupStore.config.玩家.姓名"
              type="text"
              class="underline-input setup-underline-input"
              :class="{ 'setup-underline-input--error': showNameError }"
              :placeholder="nameField.placeholder"
              @input="showNameError = false"
            />
          </div>
          <span v-if="showNameError" class="error-hint">{{ t('setup.playerInfo.nameRequired') }}</span>
          <div class="input-row">
            <label>{{ genderField.label }}</label>
            <div class="gender-select">
              <button :class="{ active: setupStore.config.玩家.性别 === '男' }" @click="selectGender('男')">
                {{ enumDisplay('player.gender', '男') }}
              </button>
              <button :class="{ active: setupStore.config.玩家.性别 === '女' }" @click="selectGender('女')">
                {{ enumDisplay('player.gender', '女') }}
              </button>
              <input
                v-model="customGender"
                type="text"
                class="gender-input setup-underline-input"
                :placeholder="genderField.placeholder || t('setup.playerInfo.customGender')"
                @focus="handleCustomGenderFocus"
                @input="handleCustomGenderInput"
              />
            </div>
          </div>
          <div class="input-row">
            <label>{{ ageField.label }}</label>
            <input
              v-model.number="setupStore.config.玩家.年龄"
              type="number"
              class="underline-input short setup-underline-input"
              :placeholder="ageField.placeholder"
              min="1"
              max="999"
            />
          </div>
        </div>

        <!-- 🎭 身份信息 -->
        <div class="section-group">
          <h4 class="section-label">{{ t('setup.playerInfo.identityInfo') }}</h4>
          <div class="input-row">
            <label>{{ occupationField.label }}</label>
            <input
              v-model="setupStore.config.玩家.身份信息.职业"
              type="text"
              class="underline-input setup-underline-input"
              :placeholder="occupationField.placeholder"
            />
          </div>
          <div class="input-row">
            <label>{{ classField.label }}</label>
            <input
              v-model="setupStore.config.玩家.身份信息.阶层"
              type="text"
              class="underline-input setup-underline-input"
              :placeholder="classField.placeholder"
            />
          </div>
          <div class="input-row">
            <label>{{ orgField.label }}</label>
            <input
              v-model="setupStore.config.玩家.身份信息.所属组织"
              type="text"
              class="underline-input setup-underline-input"
              :placeholder="orgField.placeholder"
            />
          </div>
          <div class="input-row">
            <label>{{ specialIdentityField.label }}</label>
            <input
              v-model="setupStore.config.玩家.身份信息.特殊身份"
              type="text"
              class="underline-input setup-underline-input"
              :placeholder="specialIdentityField.placeholder"
            />
          </div>
          <div class="input-row">
            <label>{{ backstoryField.label }}</label>
            <input
              v-model="setupStore.config.玩家.身份信息.背景信息"
              type="text"
              class="underline-input setup-underline-input"
              :placeholder="backstoryField.placeholder"
            />
          </div>
        </div>
      </div>

      <!-- 下一步按钮 -->
      <div class="action-area">
        <button class="next-btn" :disabled="!canProceed" @click="handleNext">
          <span>{{ t('setup.playerInfo.next') }}</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../../../i18n';
import { useSetupStore } from '../../../stores/setup';
import SetupBackButton from './components/SetupBackButton.vue';

const emit = defineEmits<{ next: [] }>();

const setupStore = useSetupStore();
const { t, enumDisplay, fieldMeta } = useI18n();

const customGender = ref('');
const showNameError = ref(false);

const nameField = computed(() => fieldMeta('玩家.姓名'));
const genderField = computed(() => fieldMeta('玩家.性别'));
const ageField = computed(() => fieldMeta('玩家.年龄'));
const occupationField = computed(() => fieldMeta('玩家.身份信息.职业'));
const classField = computed(() => fieldMeta('玩家.身份信息.阶层'));
const orgField = computed(() => fieldMeta('玩家.身份信息.所属组织'));
const specialIdentityField = computed(() => fieldMeta('玩家.身份信息.特殊身份'));
const backstoryField = computed(() => fieldMeta('玩家.身份信息.背景信息'));

// 是否可以进入下一步
const canProceed = computed(() => {
  return setupStore.config.玩家?.姓名?.trim() !== '';
});

// 选择性别
function selectGender(gender: string) {
  setupStore.config.玩家.性别 = gender;
  customGender.value = '';
}

// 自定义性别获得焦点
function handleCustomGenderFocus() {
  if (customGender.value) {
    setupStore.config.玩家.性别 = customGender.value;
  }
}

// 自定义性别输入
function handleCustomGenderInput() {
  if (customGender.value) {
    setupStore.config.玩家.性别 = customGender.value;
  }
}

// 返回
function handleBack() {
  setupStore.goBack();
}

// 下一步
function handleNext() {
  // 验证姓名
  if (!setupStore.config.玩家?.姓名?.trim()) {
    showNameError.value = true;
    return;
  }

  // 发出 next 事件，由父组件处理页面跳转
  // 注意：变量写入统一在 SettingsPage 的"开始游戏"时处理
  emit('next');
}
</script>

<style scoped>
@import './styles/setup-shared.css';

.player-info-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 内容区域 */
.content-area {
  width: 100%;
  max-width: 480px;
  padding: 60px 20px 40px;
}

/* 选中的预设 */
.selected-preset {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
  padding: 12px 20px;
  border-radius: 999px;
}

.preset-icon {
  font-size: 24px;
}

.preset-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 表单区域 */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

/* 分组卡片 */
.section-group {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-label {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 输入行 */
.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-row label {
  min-width: 80px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 下划线输入框 */
.underline-input {
  flex: 1;
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 8px 4px;
  font-size: 14px;
  background: transparent;
  color: var(--text-primary);
}

.underline-input.short {
  max-width: 120px;
}

.underline-input::placeholder {
  color: var(--text-tertiary);
}

.required {
  color: var(--accent-danger);
}

.error-hint {
  font-size: 12px;
  color: var(--accent-danger);
  margin-top: -8px;
}

/* 性别选择 */
.gender-select {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.gender-select button {
  color: var(--text-primary);
}

.gender-select button.active {
  color: var(--accent-primary);
}

.gender-input {
  flex: 1;
  max-width: 100px;
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 6px 4px;
  font-size: 13px;
  background: transparent;
  color: var(--text-primary);
}

.gender-input::placeholder {
  color: var(--text-tertiary);
}

/* 操作区域 */
.action-area {
  display: flex;
  justify-content: center;
}

.next-btn {
  padding-inline: 48px;
}

.next-btn i {
  font-size: 14px;
}

/* 响应式 */
@media (max-width: 768px) {
  .content-area {
    padding: 52px 16px 32px;
  }

  .page-title {
    font-size: 22px;
  }

  .section-group {
    padding: 16px;
    gap: 14px;
  }

  .input-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .input-row label {
    min-width: unset;
  }

  .underline-input {
    width: 100%;
  }

  .underline-input.short {
    max-width: none;
  }

  .gender-select {
    width: 100%;
  }

  .gender-select button {
    padding: 5px 12px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .content-area {
    padding: 48px 12px 24px;
  }

  .selected-preset {
    padding: 10px 16px;
    margin-bottom: 20px;
  }

  .preset-icon {
    font-size: 20px;
  }

  .preset-name {
    font-size: 13px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .form-section {
    gap: 20px;
    margin-bottom: 24px;
  }

  .section-group {
    padding: 14px;
    gap: 12px;
  }

  .section-label {
    font-size: 14px;
  }

  .input-row label {
    font-size: 13px;
  }

  .underline-input {
    font-size: 13px;
    padding: 6px 4px;
  }

  .gender-select {
    flex-wrap: wrap;
  }

  .gender-select button {
    padding: 5px 14px;
    font-size: 13px;
  }

  .gender-input {
    max-width: none;
    flex: 1;
  }

  .next-btn {
    padding: 12px 36px;
    font-size: 15px;
  }
}
</style>
