<template>
  <div class="step-content-inner">
    <h3 class="step-title">{{ t('setup.customWizard.business.title') }}</h3>
    <p class="step-desc">{{ t('setup.customWizard.business.description') }}</p>

    <div class="form-section">
      <!-- 经营实体 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.business.entities') }}</h4>
        <div class="entities-container">
          <div v-for="(entity, name) in setupStore.config.玩家.经营实体" :key="name" class="entity-card">
            <div class="entity-header">
              <span class="entity-name">{{ name }}</span>
              <span class="entity-type">{{ enumDisplay('business.entityType', entity.类型) }}</span>
              <button class="remove-btn" @click="removeEntity(name as string)">×</button>
            </div>
            <div class="entity-details">
              <div class="detail-row">
                <label>{{ locationField.label }}</label>
                <input
                  :value="entity.位置"
                  type="text"
                  class="detail-input"
                  @input="updateEntity(name as string, '位置', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="detail-row">
                <label>{{ t('setup.customWizard.business.status') }}</label>
                <select
                  :value="entity.运营?.运营状态"
                  class="detail-select"
                  @change="updateEntity(name as string, '运营.运营状态', ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="option in operationStatusOptions" :key="option" :value="option">
                    {{ enumDisplay('business.operationStatus', option) }}
                  </option>
                </select>
              </div>
              <div class="detail-row">
                <label>{{ assetValueField.label }}</label>
                <input
                  :value="entity.财务.资产价值"
                  type="number"
                  class="detail-input short"
                  min="0"
                  @input="updateEntityFinance(name as string, '资产价值', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="detail-row">
                <label>{{ appearanceField.label }}</label>
                <input
                  :value="entity.外观"
                  type="text"
                  class="detail-input"
                  :placeholder="appearanceField.placeholder"
                  @input="updateEntity(name as string, '外观', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>

          <!-- 添加新实体 -->
          <div class="add-entity-form">
            <div class="form-row">
              <input
                v-model="newEntityName"
                type="text"
                class="underline-input"
                :placeholder="t('setup.customWizard.business.entityNamePlaceholder')"
              />
              <select v-model="newEntityType" class="entity-select">
                <option v-for="option in entityTypeOptions" :key="option" :value="option">
                  {{ enumDisplay('business.entityType', option) }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <input
                v-model="newEntityLocation"
                type="text"
                class="underline-input"
                :placeholder="locationField.placeholder"
              />
              <label class="inline-label">{{ assetValueField.label }}</label>
              <input v-model.number="newEntityValue" type="number" class="underline-input short" min="0" />
              <button class="add-btn small" @click="addEntity">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 配置摘要 -->
      <div class="section-group summary-section">
        <h4 class="section-label">{{ t('setup.customWizard.business.summary') }}</h4>
        <div class="summary-content">
          <div class="summary-item">
            <span class="summary-label">{{ t('setup.customWizard.business.summary.worldBackground') }}</span>
            <span class="summary-value"
              >{{ setupStore.config.世界.时间系统.纪元名称 }} · {{ setupStore.config.世界.力量体系 }}</span
            >
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('setup.customWizard.business.summary.playerRole') }}</span>
            <span class="summary-value"
              >{{ setupStore.config.玩家.姓名 || t('common.unnamed') }} ·
              {{ setupStore.config.玩家.身份信息.职业 }}</span
            >
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('setup.customWizard.business.summary.startingFunds') }}</span>
            <span class="summary-value"
              >{{ setupStore.config.玩家.货币资源.主货币.数量 }} {{ setupStore.config.玩家.货币资源.主货币.名称 }}</span
            >
          </div>
          <div class="summary-item">
            <span class="summary-label">{{ t('setup.customWizard.business.summary.entities') }}</span>
            <span class="summary-value">{{
              t('setup.customWizard.business.summary.entityCount', {
                count: Object.keys(setupStore.config.玩家.经营实体).length,
              })
            }}</span>
          </div>
        </div>
      </div>

      <!-- 导出预设 -->
      <div class="export-section">
        <button class="export-btn" @click="handleExport">
          <i class="fa-solid fa-download"></i>
          {{ t('setup.customWizard.business.export') }}
        </button>
        <p class="export-hint">{{ t('setup.customWizard.business.exportHint') }}</p>
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

const entityTypeOptions = ['小本生意', '商铺', '工坊', '工厂', '公司', '其他'] as const;
const operationStatusOptions = ['筹备中', '正常运营', '暂停营业', '扩张中'] as const;

const locationField = computed(() => fieldMeta('玩家.经营实体.位置'));
const appearanceField = computed(() => fieldMeta('玩家.经营实体.外观'));
const assetValueField = computed(() => fieldMeta('玩家.经营实体.财务.资产价值'));

// 新实体表单
const newEntityName = ref('');
const newEntityType = ref<(typeof entityTypeOptions)[number]>('小本生意');
const newEntityLocation = ref('');
const newEntityValue = ref(0);

// 添加经营实体
function addEntity() {
  const name = newEntityName.value.trim();
  if (!name) return;

  setupStore.config.玩家.经营实体[name] = {
    类型: newEntityType.value,
    位置: newEntityLocation.value,
    外观: '',
    财务: {
      收入: 0,
      支出: 0,
      资产价值: newEntityValue.value || 0,
      负债: 0,
    },
    运营: {
      运营状态: '筹备中',
      人员数量: 0,
    },
    市场: {
      客户群体: '',
      竞争态势: '',
      特色优势: '',
    },
    重要设施: [],
    当前问题: '',
    发展潜力: '',
    备注: '',
  };

  newEntityName.value = '';
  newEntityType.value = '小本生意';
  newEntityLocation.value = '';
  newEntityValue.value = 0;
}

// 删除经营实体
function removeEntity(name: string) {
  delete setupStore.config.玩家.经营实体[name];
}

// 更新经营实体
function updateEntity(name: string, field: string, value: string) {
  if (field === '位置') {
    setupStore.config.玩家.经营实体[name].位置 = value;
  } else if (field === '外观') {
    setupStore.config.玩家.经营实体[name].外观 = value;
  } else if (field === '运营.运营状态') {
    setupStore.config.玩家.经营实体[name].运营.运营状态 = value;
  }
}

// 更新财务数据
function updateEntityFinance(name: string, field: string, value: string) {
  const num = parseInt(value) || 0;
  if (field === '资产价值') {
    setupStore.config.玩家.经营实体[name].财务.资产价值 = Math.max(0, num);
  }
}

// 导出预设
function handleExport() {
  setupStore.exportPreset();
}
</script>

<style scoped lang="scss">
/* 组件特有样式（共享样式已在 global.css 中定义） */

/* 经营实体 */
.entities-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entity-card {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.entity-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.entity-name {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.entity-type {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--accent-primary);
  color: white;
}

.entity-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 12px;
    color: var(--text-tertiary);
    min-width: 60px;
  }
}

.detail-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  &.short {
    flex: 0 0 100px;
  }
}

.detail-select {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
}

/* 添加表单 */
.add-entity-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 12px;
  border: 1px dashed var(--border-light);
  border-radius: 6px;
}

.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.entity-select {
  padding: 6px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
}

/* 配置摘要 */
.summary-section {
  background: linear-gradient(135deg, var(--bg-card), var(--bg-secondary));
}

.summary-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

/* 导出区域 */
.export-section {
  text-align: center;
  padding: 16px;
  background: var(--bg-card);
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.export-btn {
  padding: 12px 24px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
}

.export-hint {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 响应式 */
@media (max-width: 768px) {
  .summary-content {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .entity-card {
    padding: 10px;
  }

  .entity-name {
    font-size: 14px;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;

    label {
      min-width: auto;
    }
  }

  .detail-input,
  .detail-select {
    width: 100%;
  }

  .detail-input.short {
    flex: none;
    width: 100%;
  }

  .form-row {
    flex-wrap: wrap;

    .underline-input {
      flex: 1 1 100%;

      &.short {
        flex: 1 1 40%;
      }
    }
  }

  .entity-select {
    flex: 1;
  }

  .export-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
