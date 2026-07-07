<template>
  <div class="player-config-compact">
    <!-- 基本信息 -->
    <div class="input-row">
      <label>{{ field('玩家.姓名').label }}</label>
      <input
        v-model="config.玩家.姓名"
        :class="['underline-input', { 'blink-hint': !config.玩家.姓名 }]"
        :placeholder="field('玩家.姓名').placeholder"
      />
      <label>{{ field('玩家.性别').label }}</label>
      <select v-model="config.玩家.性别" class="underline-select">
        <option value="男">{{ enumDisplay('player.gender', '男') }}</option>
        <option value="女">{{ enumDisplay('player.gender', '女') }}</option>
        <option value="其他">{{ enumDisplay('player.gender', '其他') }}</option>
      </select>
      <label>{{ field('玩家.年龄').label }}</label>
      <input
        v-model="config.玩家.年龄"
        class="underline-input short"
        type="number"
        :placeholder="field('玩家.年龄').placeholder"
        min="1"
      />
    </div>

    <!-- 身份信息 -->
    <div class="input-row">
      <label>{{ field('玩家.身份信息.职业').label }}</label>
      <input
        v-model="config.玩家.身份信息.职业"
        class="underline-input"
        :placeholder="field('玩家.身份信息.职业').placeholder"
      />
      <label>{{ field('玩家.身份信息.阶层').label }}</label>
      <input
        v-model="config.玩家.身份信息.阶层"
        class="underline-input"
        :placeholder="field('玩家.身份信息.阶层').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('玩家.身份信息.特殊身份').label }}</label>
      <input
        v-model="config.玩家.身份信息.特殊身份"
        class="underline-input"
        :placeholder="field('玩家.身份信息.特殊身份').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('玩家.身份信息.背景信息').label }}</label>
      <input
        v-model="config.玩家.身份信息.背景信息"
        class="underline-input"
        :placeholder="field('玩家.身份信息.背景信息').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('玩家.当前目标').label }}</label>
      <input v-model="config.玩家.当前目标" class="underline-input" :placeholder="field('玩家.当前目标').placeholder" />
    </div>

    <!-- 货币资源 -->
    <div class="input-row">
      <label>{{ field('玩家.货币资源.主货币.名称').label }}</label>
      <input
        v-model="config.玩家.货币资源.主货币.名称"
        class="underline-input short"
        :placeholder="field('玩家.货币资源.主货币.名称').placeholder"
      />
      <span class="symbol">×</span>
      <input v-model.number="config.玩家.货币资源.主货币.数量" type="number" class="underline-input short" min="0" />
    </div>

    <!-- 积分兑换比例 -->
    <div class="input-row">
      <label>{{ t('config.player.exchangeRate') }}</label>
      <input
        v-model.number="config.设置.积分系统._兑换比例"
        type="number"
        class="underline-input short"
        min="0"
        step="0.1"
        :placeholder="field('设置.积分系统._兑换比例').placeholder"
      />
      <span class="exchange-hint">{{
        t('config.player.exchangeHint', {
          currency: config.玩家?.货币资源?.主货币?.名称 || t('config.player.defaultCurrencyName'),
        })
      }}</span>
    </div>

    <!-- 次级货币 -->
    <div v-if="secondaryCurrencies.length > 0" class="input-group">
      <label>{{ t('config.player.secondaryCurrency') }}</label>
      <div class="compact-list">
        <div v-for="(curr, name) in config.玩家.货币资源.次级货币" :key="name" class="list-row">
          <input :value="name" :placeholder="t('config.player.secondaryCurrencyName')" class="list-input" disabled />
          <input
            v-model.number="curr.数量"
            type="number"
            :placeholder="t('config.player.secondaryCurrencyAmount')"
            class="list-input xs"
            min="0"
          />
          <input
            v-model="curr.兑换比例"
            :placeholder="t('config.player.secondaryCurrencyRate')"
            class="list-input sm"
          />
          <button @click="deleteSecondaryCurrency(name)">🗑️</button>
        </div>
      </div>
    </div>
    <button class="add-mini" @click="addCurrency">{{ t('config.player.addSecondaryCurrency') }}</button>

    <!-- 初始物品 -->
    <div v-if="initialItems.length > 0" class="input-group">
      <label>{{ t('config.player.items') }}</label>
      <div class="compact-list">
        <div v-for="(item, name) in config.玩家.物品栏" :key="name" class="list-row">
          <input :value="name" :placeholder="t('config.player.itemName')" class="list-input" disabled />
          <input
            v-model.number="item.数量"
            type="number"
            :placeholder="t('config.player.itemAmount')"
            class="list-input xs"
            min="1"
          />
          <select v-model="item.类型" class="list-select sm">
            <option value="证件">{{ enumDisplay('player.itemType', '证件') }}</option>
            <option value="消耗品">{{ enumDisplay('player.itemType', '消耗品') }}</option>
            <option value="装备">{{ enumDisplay('player.itemType', '装备') }}</option>
            <option value="材料">{{ enumDisplay('player.itemType', '材料') }}</option>
            <option value="杂物">{{ enumDisplay('player.itemType', '杂物') }}</option>
          </select>
          <select v-model="item.品质" class="list-select sm">
            <option value="普通">{{ enumDisplay('player.itemQuality', '普通') }}</option>
            <option value="精良">{{ enumDisplay('player.itemQuality', '精良') }}</option>
            <option value="稀有">{{ enumDisplay('player.itemQuality', '稀有') }}</option>
            <option value="史诗">{{ enumDisplay('player.itemQuality', '史诗') }}</option>
            <option value="传说">{{ enumDisplay('player.itemQuality', '传说') }}</option>
          </select>
          <button @click="deleteItem(name)">🗑️</button>
        </div>
      </div>
    </div>
    <button class="add-mini" @click="addItem">{{ t('config.player.addInitialItem') }}</button>

    <!-- 库存货物 -->
    <div v-if="inventoryItems.length > 0" class="input-group">
      <label>{{ t('config.player.inventory') }}</label>
      <div class="compact-list">
        <div v-for="(item, name) in config.玩家.库存详情" :key="name" class="list-row">
          <input :value="name" :placeholder="t('config.player.inventoryName')" class="list-input" disabled />
          <input
            v-model.number="item.数量"
            type="number"
            :placeholder="t('config.player.itemAmount')"
            class="list-input xs"
            min="0"
          />
          <input v-model="item.单位" :placeholder="t('config.player.inventoryUnit')" class="list-input xs" />
          <input
            v-model.number="item.进货价"
            type="number"
            :placeholder="t('config.player.inventoryCost')"
            class="list-input xs"
            min="0"
          />
          <input
            v-model.number="item.预计售价"
            type="number"
            :placeholder="t('config.player.inventoryPrice')"
            class="list-input xs"
            min="0"
          />
          <button @click="deleteInventory(name)">🗑️</button>
        </div>
      </div>
    </div>
    <button class="add-mini" @click="addInventory">{{ t('config.player.addInventory') }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';

const config = defineModel<any>('config', { required: true });
const { t, enumDisplay, fieldMeta } = useI18n();

function field(path: string) {
  return fieldMeta(path);
}

// 计算属性用于判断是否有数据
const secondaryCurrencies = computed(() => Object.keys(config.value?.玩家?.货币资源?.次级货币 || {}));
const initialItems = computed(() => Object.keys(config.value?.玩家?.物品栏 || {}));
const inventoryItems = computed(() => Object.keys(config.value?.玩家?.库存详情 || {}));

function addCurrency() {
  const name = prompt(t('config.player.promptCurrencyName'));
  if (!name || name.trim() === '') return;

  if (!config.value.玩家.货币资源.次级货币) {
    config.value.玩家.货币资源.次级货币 = {};
  }
  config.value.玩家.货币资源.次级货币[name] = {
    数量: 0,
    兑换比例: '',
    用途说明: '',
  };
}

function deleteSecondaryCurrency(name: string | number) {
  delete config.value.玩家.货币资源.次级货币[String(name)];
}

function addItem() {
  const name = prompt(t('config.player.promptItemName'));
  if (!name || name.trim() === '') return;

  if (!config.value.玩家.物品栏) {
    config.value.玩家.物品栏 = {};
  }
  config.value.玩家.物品栏[name] = {
    数量: 1,
    类型: '杂物',
    品质: '普通',
    有效期: '永久',
    特殊属性: '',
    备注: '',
  };
}

function deleteItem(name: string | number) {
  delete config.value.玩家.物品栏[String(name)];
}

function addInventory() {
  const name = prompt(t('config.player.promptInventoryName'));
  if (!name || name.trim() === '') return;

  if (!config.value.玩家.库存详情) {
    config.value.玩家.库存详情 = {};
  }
  config.value.玩家.库存详情[name] = {
    数量: 0,
    单位: '件',
    存放地点: '仓库',
    品质状况: '完好',
    进货价: 0,
    预计售价: 0,
    备注: '',
  };
}

function deleteInventory(name: string | number) {
  delete config.value.玩家.库存详情[String(name)];
}
</script>

<style scoped>
.player-config-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.input-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 4px;
}

.input-group > label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 40px;
  font-weight: 500;
  padding-top: 2px;
}

/* 使用 global.css 中的通用表单样式 */

.underline-input.short,
.underline-select {
  flex: 0 0 60px;
}

.symbol {
  font-size: 12px;
  color: var(--text-secondary);
}

.exchange-hint {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 紧凑列表 */
.compact-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.list-input,
.list-select {
  flex: 1;
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 2px 4px;
  font-size: 12px;
  background: transparent;
  color: var(--text-primary);
}

.list-input.xs {
  flex: 0 0 48px;
}

.list-input.sm,
.list-select.sm {
  flex: 0 0 64px;
}

.list-input:focus,
.list-select:focus {
  outline: none;
  border-bottom-color: var(--accent-primary);
}

.list-input::placeholder {
  color: var(--text-tertiary);
  font-size: 11px;
}

.list-row button {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  border-radius: 4px;
  transition: all 150ms;
  flex-shrink: 0;
}

.list-row button:hover {
  background: var(--accent-danger);
}

/* 使用 global.css 中的 .add-mini 样式 */

.add-mini {
  margin-left: 40px;
}

/* ===== 响应式适配 ===== */

@media (max-width: 768px) {
  .player-config-compact {
    gap: 6px;
  }

  .input-group,
  .input-row {
    gap: 6px;
    margin-bottom: 3px;
  }

  .input-group > label,
  .input-row label {
    font-size: 11px;
    min-width: 36px;
  }

  .underline-input,
  .underline-select {
    font-size: 12px;
  }

  .underline-input.short,
  .underline-select {
    flex: 0 0 56px;
  }

  .list-input,
  .list-select {
    font-size: 11px;
  }

  .list-input.xs {
    flex: 0 0 44px;
  }

  .list-input.sm,
  .list-select.sm {
    flex: 0 0 60px;
  }

  .add-mini {
    font-size: 11px;
    margin-left: 36px;
  }
}

@media (max-width: 480px) {
  .player-config-compact {
    gap: 4px;
    padding: 2px 0;
  }

  .input-group,
  .input-row {
    gap: 4px;
    margin-bottom: 2px;
  }

  .input-group > label,
  .input-row label {
    font-size: 10px;
    min-width: 32px;
  }

  .underline-input,
  .underline-select {
    font-size: 11px;
    padding: 1px 2px;
  }

  .underline-input.short,
  .underline-select {
    flex: 0 0 48px;
  }

  .symbol {
    font-size: 11px;
  }

  .list-input,
  .list-select {
    font-size: 10px;
    padding: 1px 2px;
  }

  .list-input.xs {
    flex: 0 0 40px;
  }

  .list-input.sm,
  .list-select.sm {
    flex: 0 0 56px;
  }

  .list-row button {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .add-mini {
    padding: 3px 6px;
    font-size: 10px;
    margin-left: 32px;
  }
}

/* 姓名输入框闪烁提示 */
@keyframes blink-border {
  0%,
  100% {
    border-bottom-color: var(--accent-warning, #f59e0b);
  }
  50% {
    border-bottom-color: transparent;
  }
}

.underline-input.blink-hint {
  animation: blink-border 1.5s ease-in-out infinite;
}

.underline-input.blink-hint::placeholder {
  color: var(--accent-warning, #f59e0b);
}
</style>
