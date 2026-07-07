<template>
  <div class="step-content-inner">
    <h3 class="step-title">{{ t('setup.customWizard.identity.title') }}</h3>
    <p class="step-desc">{{ t('setup.customWizard.identity.description') }}</p>

    <div class="form-section">
      <!-- 基本信息 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.identity.basicInfo') }}</h4>
        <div class="input-row">
          <label>
            {{ nameField.label }}
            <span class="required">*</span>
          </label>
          <input
            v-model="setupStore.config.玩家.姓名"
            type="text"
            class="underline-input"
            :class="{ error: showNameError }"
            :placeholder="nameField.placeholder"
            @input="showNameError = false"
          />
        </div>
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
              class="gender-input"
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
            class="underline-input short"
            :placeholder="ageField.placeholder"
            min="1"
            max="999"
          />
        </div>
      </div>

      <!-- 身份信息 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.identity.identityInfo') }}</h4>
        <div class="input-row">
          <label>{{ occupationField.label }}</label>
          <input
            v-model="setupStore.config.玩家.身份信息.职业"
            type="text"
            class="underline-input"
            :placeholder="occupationField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ classField.label }}</label>
          <input
            v-model="setupStore.config.玩家.身份信息.阶层"
            type="text"
            class="underline-input"
            :placeholder="classField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ orgField.label }}</label>
          <input
            v-model="setupStore.config.玩家.身份信息.所属组织"
            type="text"
            class="underline-input"
            :placeholder="orgField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ specialIdentityField.label }}</label>
          <input
            v-model="setupStore.config.玩家.身份信息.特殊身份"
            type="text"
            class="underline-input"
            :placeholder="specialIdentityField.placeholder"
          />
        </div>
        <div class="input-row">
          <label>{{ backstoryField.label }}</label>
          <input
            v-model="setupStore.config.玩家.身份信息.背景信息"
            type="text"
            class="underline-input"
            :placeholder="backstoryField.placeholder"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../../../../i18n';
import { useSetupStore } from '../../../../stores/setup';

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
</script>

<style scoped lang="scss">
/* 组件特有样式（共享样式已在 global.css 中定义） */

/* 性别选择 */
.gender-select {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;

  button {
    padding: 6px 16px;
    border: 1px solid var(--border-light);
    background: transparent;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-primary);

    &:hover {
      border-color: var(--accent-primary);
    }

    &.active {
      background: var(--accent-primary);
      color: white;
      border-color: var(--accent-primary);
    }
  }
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
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-bottom-color: var(--accent-primary);
  }

  &::placeholder {
    color: var(--text-tertiary);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .gender-select button {
    padding: 5px 12px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .gender-select {
    width: 100%;
    flex-wrap: wrap;

    button {
      padding: 5px 14px;
    }
  }

  .gender-input {
    max-width: none;
    flex: 1;
  }
}
</style>
