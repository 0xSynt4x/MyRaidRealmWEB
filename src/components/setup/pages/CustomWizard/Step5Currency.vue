<template>
  <div class="step-content-inner">
    <h3 class="step-title">{{ t('setup.customWizard.currency.title') }}</h3>
    <p class="step-desc">{{ t('setup.customWizard.currency.description') }}</p>

    <div class="form-section">
      <!-- 主货币 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.currency.mainCurrency') }}</h4>
        <div class="currency-row">
          <div class="input-row">
            <label>{{ mainCurrencyNameField.label }}</label>
            <input
              v-model="setupStore.config.玩家.货币资源.主货币.名称"
              type="text"
              class="underline-input"
              :placeholder="mainCurrencyNameField.placeholder"
            />
          </div>
          <div class="input-row">
            <label>{{ mainCurrencyAmountField.label || t('setup.customWizard.currency.mainAmount') }}</label>
            <input
              v-model.number="setupStore.config.玩家.货币资源.主货币.数量"
              type="number"
              class="underline-input short"
              :placeholder="mainCurrencyAmountField.placeholder"
              min="0"
            />
          </div>
        </div>
      </div>

      <!-- 次级货币 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.currency.secondaryCurrency') }}</h4>
        <div class="secondary-currencies">
          <div v-for="(currency, name) in setupStore.config.玩家.货币资源.次级货币" :key="name" class="currency-item">
            <div class="currency-name">{{ name }}</div>
            <div class="currency-details">
              <span>{{ t('setup.customWizard.currency.amount') }}: {{ currency.数量 }}</span>
              <span v-if="currency.兑换比例"
                >{{ t('setup.customWizard.currency.exchangeRate') }}: {{ currency.兑换比例 }}</span
              >
            </div>
            <button class="remove-btn" @click="removeSecondaryCurrency(name as string)">×</button>
          </div>
          <div class="add-currency-form">
            <input
              v-model="newCurrencyName"
              type="text"
              class="underline-input"
              :placeholder="t('setup.customWizard.currency.currencyNamePlaceholder')"
            />
            <input
              v-model.number="newCurrencyAmount"
              type="number"
              class="underline-input short"
              :placeholder="t('setup.customWizard.currency.amountPlaceholder')"
              min="0"
            />
            <input
              v-model="newCurrencyExchange"
              type="text"
              class="underline-input"
              :placeholder="t('setup.customWizard.currency.exchangeRateOptionalPlaceholder')"
            />
            <button class="add-btn small" @click="addSecondaryCurrency">+</button>
          </div>
        </div>
      </div>

      <!-- 初始物品 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.currency.items') }}</h4>
        <div class="items-container">
          <div v-for="(item, name) in setupStore.config.玩家.物品栏" :key="name" class="item-card">
            <div class="item-header">
              <span class="item-name">{{ name }}</span>
              <span class="item-quantity">×{{ item.数量 }}</span>
              <button class="remove-btn" @click="removeItem(name as string)">×</button>
            </div>
            <div class="item-details">
              <span class="item-type">{{ enumDisplay('player.itemType', item.类型) }}</span>
              <span class="item-quality">{{ enumDisplay('player.itemQuality', item.品质) }}</span>
            </div>
            <div v-if="item.备注" class="item-desc">{{ item.备注 }}</div>
          </div>
          <div class="add-item-form">
            <div class="form-row">
              <input
                v-model="newItemName"
                type="text"
                class="underline-input"
                :placeholder="t('setup.customWizard.currency.itemNamePlaceholder')"
              />
              <label class="inline-label">{{ t('setup.customWizard.currency.amount') }}</label>
              <input v-model.number="newItemQuantity" type="number" class="underline-input short" min="1" />
            </div>
            <div class="form-row">
              <select v-model="newItemType" class="item-select">
                <option v-for="option in itemTypeOptions" :key="option" :value="option">
                  {{ enumDisplay('player.itemType', option) }}
                </option>
              </select>
              <select v-model="newItemQuality" class="item-select">
                <option v-for="option in itemQualityOptions" :key="option" :value="option">
                  {{ enumDisplay('player.itemQuality', option) }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <input
                v-model="newItemDesc"
                type="text"
                class="underline-input full"
                :placeholder="t('setup.customWizard.currency.itemDescriptionPlaceholder')"
              />
              <button class="add-btn small" @click="addItem">+</button>
            </div>
          </div>
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

const itemTypeOptions = ['杂物', '证件', '消耗品', '装备', '材料', '贵重品'];
const itemQualityOptions = ['普通', '精良', '稀有', '史诗', '传说'] as const;

const mainCurrencyNameField = computed(() => fieldMeta('玩家.货币资源.主货币.名称'));
const mainCurrencyAmountField = computed(() => fieldMeta('玩家.货币资源.主货币.数量'));

// 新次级货币表单
const newCurrencyName = ref('');
const newCurrencyAmount = ref(0);
const newCurrencyExchange = ref('');

// 新物品表单
const newItemName = ref('');
const newItemQuantity = ref(1);
const newItemType = ref<(typeof itemTypeOptions)[number]>('杂物');
const newItemQuality = ref<'普通' | '精良' | '稀有' | '史诗' | '传说'>('普通');
const newItemDesc = ref('');

// 次级货币操作
function addSecondaryCurrency() {
  const name = newCurrencyName.value.trim();
  if (!name) return;

  setupStore.config.玩家.货币资源.次级货币[name] = {
    数量: newCurrencyAmount.value || 0,
    兑换比例: newCurrencyExchange.value,
    用途说明: '',
  };

  newCurrencyName.value = '';
  newCurrencyAmount.value = 0;
  newCurrencyExchange.value = '';
}

function removeSecondaryCurrency(name: string) {
  delete setupStore.config.玩家.货币资源.次级货币[name];
}

// 物品操作
function addItem() {
  const name = newItemName.value.trim();
  if (!name) return;

  setupStore.config.玩家.物品栏[name] = {
    数量: newItemQuantity.value || 1,
    类型: newItemType.value,
    品质: newItemQuality.value,
    有效期: '永久',
    特殊属性: '',
    备注: newItemDesc.value.trim(),
  };

  newItemName.value = '';
  newItemQuantity.value = 1;
  newItemType.value = '杂物';
  newItemQuality.value = '普通' as const;
  newItemDesc.value = '';
}

function removeItem(name: string) {
  delete setupStore.config.玩家.物品栏[name];
}
</script>

<style scoped lang="scss">
/* 组件特有样式（共享样式已在 global.css 中定义） */

.currency-row {
  display: flex;
  gap: 16px;
}

/* 次级货币 */
.secondary-currencies {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.currency-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.currency-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.currency-details {
  flex: 1;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.add-currency-form {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

/* 物品 */
.items-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.item-quantity {
  font-size: 13px;
  color: var(--accent-primary);
  font-weight: 500;
}

.item-details {
  display: flex;
  gap: 8px;
}

.item-type,
.item-quality {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-card);
  color: var(--text-tertiary);
}

.add-item-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 12px;
  border: 1px dashed var(--border-light);
  border-radius: 6px;

  .underline-input.full {
    flex: 1;
  }
}

.item-desc {
  width: 100%;
  font-size: 11px;
  color: var(--text-tertiary);
  font-style: italic;
  margin-top: 4px;
  padding-left: 4px;
}

.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.item-select {
  padding: 6px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  flex: 1;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .currency-row {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .add-currency-form {
    flex-wrap: wrap;

    .underline-input {
      flex: 1 1 45%;
    }
  }

  .form-row {
    flex-wrap: wrap;

    .underline-input {
      flex: 1 1 60%;

      &.short {
        flex: 0 0 30%;
      }
    }
  }

  .item-select {
    flex: 1 1 40%;
  }
}
</style>
