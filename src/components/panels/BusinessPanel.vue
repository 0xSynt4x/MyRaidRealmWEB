<template>
  <div class="business-panel">
    <!-- 经营实体详情弹窗 -->
    <BusinessDetailModal
      :visible="showDetailModal"
      :business-name="currentBusinessName"
      :business-data="currentBusinessData"
      @close="closeDetailModal"
      @save="saveBusinessData"
    />
    <!-- 💼 商业概览统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <i class="fa-solid fa-box"></i>
        <span class="stat-label">{{ t('business.statsInventory') }}</span>
        <span class="stat-value">{{ t('business.typeCount', inventoryStats) }}</span>
      </div>
      <div class="stat-item">
        <i class="fa-solid fa-building"></i>
        <span class="stat-label">{{ t('business.statsEntities') }}</span>
        <span class="stat-value">{{ t('business.entityCount', { count: enterpriseCount }) }}</span>
      </div>
      <div class="stat-item">
        <i class="fa-solid fa-chart-line"></i>
        <span class="stat-label">{{ t('business.statsRevenue') }}</span>
        <span class="stat-value revenue">¥{{ formatMoney(totalRevenue) }}</span>
      </div>
      <div class="stat-item">
        <i class="fa-solid fa-chart-line-down"></i>
        <span class="stat-label">{{ t('business.statsCost') }}</span>
        <span class="stat-value cost">¥{{ formatMoney(totalCost) }}</span>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-sections">
      <!-- 📦 库存详情 -->
      <div class="section">
        <div class="section-title" @click="toggleInventory">
          <i class="fa-solid fa-box"></i>
          {{ t('business.inventoryDetails') }}
          <i :class="['toggle-icon', 'fa-solid', isInventoryExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        </div>
        <div v-show="isInventoryExpanded" class="section-body">
          <div v-if="hasInventory" class="inventory-table-wrapper">
            <table class="inventory-table">
              <thead>
                <tr>
                  <th>{{ t('business.itemName') }}</th>
                  <th>{{ t('business.quantity') }}</th>
                  <th>{{ t('business.unit') }}</th>
                  <th>{{ t('business.storageLocation') }}</th>
                  <th>{{ t('business.quality') }}</th>
                  <th>{{ t('business.costPrice') }}</th>
                  <th>{{ t('business.salePrice') }}</th>
                  <th>{{ t('business.notes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, name) in data.玩家?.库存详情"
                  :key="name"
                  :class="{ pulsing: isBusinessInventoryChanged(name as string) }"
                  @mouseenter="dismissBusinessInventoryChanged(name as string)"
                >
                  <td class="col-name">{{ name }}</td>
                  <td class="col-number">{{ item.数量 }}</td>
                  <td>{{ item.单位 }}</td>
                  <td>{{ item.存放地点 }}</td>
                  <td>{{ enumDisplay('player.itemQuality', item.品质状况, item.品质状况) }}</td>
                  <td class="col-price-buy">{{ item.进货价 }}</td>
                  <td class="col-price-sell">{{ item.预计售价 }}</td>
                  <td class="col-note">{{ item.备注 || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-hint">{{ t('business.noInventory') }}</div>
        </div>
      </div>

      <!-- 🏢 实体资产 -->
      <div class="section">
        <div class="section-title" @click="toggleEnterprise">
          <i class="fa-solid fa-building"></i>
          {{ t('business.entityAssets') }}
          <i :class="['toggle-icon', 'fa-solid', isEnterpriseExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        </div>
        <div v-show="isEnterpriseExpanded" class="section-body">
          <div v-if="hasEnterprises" class="enterprise-grid">
            <div
              v-for="(enterprise, name) in data.玩家?.经营实体"
              :key="name"
              :class="['enterprise-card', { pulsing: isBusinessEnterpriseChanged(name as string) }]"
              @mouseenter="dismissBusinessEnterpriseChanged(name as string)"
              @click="openBusinessEnterpriseCard(name as string, enterprise)"
            >
              <div class="enterprise-name">【{{ name }}】</div>
              <div class="enterprise-compact">
                <span class="compact-item">{{
                  enumDisplay('business.entityType', enterprise.类型, enterprise.类型)
                }}</span>
                <span class="compact-divider">|</span>
                <span class="compact-item">{{ enterprise.位置 }}</span>
                <span class="compact-divider">|</span>
                <span class="compact-item"
                  >{{ getStatusIcon(enterprise.运营?.运营状态)
                  }}{{
                    enumDisplay('business.operationStatus', enterprise.运营?.运营状态, enterprise.运营?.运营状态)
                  }}</span
                >
              </div>
              <div class="enterprise-compact">
                <span class="compact-item money-in"
                  >¥{{ formatMoney(enterprise.财务?.收入 || 0) }}{{ t('business.perMonth') }}</span
                >
                <span class="compact-divider">|</span>
                <span class="compact-item money-out"
                  >¥{{ formatMoney(enterprise.财务?.支出 || 0) }}{{ t('business.perMonth') }}</span
                >
                <span class="compact-divider">|</span>
                <span class="compact-item">{{ enterprise.运营?.人员数量 || 0 }}</span>
              </div>
              <div v-if="enterprise.外观" class="enterprise-field appearance">
                🏛️ {{ t('business.appearance') }}: {{ enterprise.外观 }}
              </div>
              <div v-if="enterprise.重要设施 && enterprise.重要设施.length" class="enterprise-field facilities">
                🔧 {{ t('business.facilities') }}: {{ enterprise.重要设施.join(' / ') }}
              </div>
              <div v-if="enterprise.备注" class="enterprise-field note">{{ enterprise.备注 }}</div>
            </div>
          </div>
          <div v-else class="empty-hint">{{ t('business.noEntityAssets') }}</div>
        </div>
      </div>

      <!-- 📰 商业情报 -->
      <div class="section">
        <div class="section-title" @click="toggleIntel">
          <i class="fa-solid fa-newspaper"></i>
          {{ t('business.intel') }}
          <i :class="['toggle-icon', 'fa-solid', isIntelExpanded ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        </div>
        <div v-show="isIntelExpanded" class="section-body">
          <div v-if="hasIntel" class="intel-list">
            <div
              v-for="[key, intel] in sortedIntel"
              :key="key"
              :class="['intel-card', { pulsing: isBusinessIntelChanged(key) }]"
              @mouseenter="dismissBusinessIntelChanged(key)"
              @click="dismissBusinessIntelChanged(key)"
            >
              <!-- 删除按钮 -->
              <button class="card-delete-btn" :title="t('business.deleteIntel')" @click.stop="openDeleteIntel(key)">
                ×
              </button>
              <div class="intel-header">
                <div class="intel-main-line">
                  <span class="intel-stars">{{ getReliabilityStars(intel.可靠度) }}</span>
                  <span class="intel-title">{{ key }}</span>
                </div>
                <div class="intel-meta-line">
                  <span class="intel-time">{{ intel.获取时间 }}</span>
                  <span v-if="intel.时效性" class="intel-timeliness">⏱️{{ intel.时效性 }}</span>
                </div>
              </div>
              <div class="intel-content">{{ t('business.intelContent') }}: {{ intel.内容 }}</div>
            </div>
          </div>
          <div v-else class="empty-hint">{{ t('business.noIntel') }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from '../../i18n';
import { useDelete } from '../../composables/useDelete';
import { useBadgeStore } from '../../stores/badge';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { formatMoney } from '../../utils/format';
import BusinessDetailModal from './BusinessDetailModal.vue';

const store = useStatDataStore();
const statDataActions = useStatDataActions();
const { data } = storeToRefs(store);
const { deleteItem } = useDelete();
const { t, enumDisplay } = useI18n();

const badgeStore = useBadgeStore();

const isInventoryExpanded = ref(true);
const isEnterpriseExpanded = ref(true);
const isIntelExpanded = ref(true);

// 详情弹窗相关
const showDetailModal = ref(false);
const currentBusinessName = ref('');
const currentBusinessData = ref<any>({});

function openDetailModal(name: string, enterprise: any) {
  currentBusinessName.value = name;
  currentBusinessData.value = enterprise;
  showDetailModal.value = true;
}

function isBusinessInventoryChanged(name: string): boolean {
  return badgeStore.isChangedKey('business', `库存:${name}`);
}

function dismissBusinessInventoryChanged(name: string) {
  badgeStore.dismissChangedKey('business', `库存:${name}`);
}

function isBusinessEnterpriseChanged(name: string): boolean {
  return badgeStore.isChangedKey('business', `实体:${name}`);
}

function dismissBusinessEnterpriseChanged(name: string) {
  badgeStore.dismissChangedKey('business', `实体:${name}`);
}

function openBusinessEnterpriseCard(name: string, enterprise: any) {
  dismissBusinessEnterpriseChanged(name);
  openDetailModal(name, enterprise);
}

function isBusinessIntelChanged(name: string): boolean {
  return badgeStore.isChangedKey('business', `情报:${name}`);
}

function dismissBusinessIntelChanged(name: string) {
  badgeStore.dismissChangedKey('business', `情报:${name}`);
}

function closeDetailModal() {
  showDetailModal.value = false;
  currentBusinessName.value = '';
  currentBusinessData.value = {};
}

async function saveBusinessData(updatedData: any) {
  if (!data.value.玩家?.经营实体 || !currentBusinessName.value) {
    return;
  }

  await statDataActions.mutateStatData('business.save', draft => {
    Object.assign(draft.玩家.经营实体[currentBusinessName.value], updatedData);
  });
  toastr.success(t('business.saveSuccess'));
}

function toggleInventory() {
  isInventoryExpanded.value = !isInventoryExpanded.value;
}

function toggleEnterprise() {
  isEnterpriseExpanded.value = !isEnterpriseExpanded.value;
}

function toggleIntel() {
  isIntelExpanded.value = !isIntelExpanded.value;
}

const hasInventory = computed(() => {
  return Object.keys(data.value.玩家?.库存详情 || {}).length > 0;
});

const hasEnterprises = computed(() => {
  return Object.keys(data.value.玩家?.经营实体 || {}).length > 0;
});

const hasIntel = computed(() => {
  return Object.keys(data.value.玩家?.商业情报 || {}).length > 0;
});

const sortedIntel = computed(() => {
  return _(data.value.玩家?.商业情报 || {})
    .entries()
    .sortBy('[1].$time')
    .reverse()
    .value();
});

const inventoryStats = computed(() => {
  const items = data.value.玩家?.库存详情 || {};
  const types = Object.keys(items).length;
  const total = _(items).values().sumBy('数量');
  return { types, total };
});

const enterpriseCount = computed(() => {
  return Object.keys(data.value.玩家?.经营实体 || {}).length;
});

const totalRevenue = computed(() => {
  return _(data.value.玩家?.经营实体 || {})
    .values()
    .sumBy(e => e.财务?.收入 || 0);
});

const totalCost = computed(() => {
  return _(data.value.玩家?.经营实体 || {})
    .values()
    .sumBy(e => e.财务?.支出 || 0);
});

function getReliabilityStars(reliability: string): string {
  const starMap: Record<string, string> = {
    高: '[⭐⭐⭐]',
    较高: '[⭐⭐⭐]',
    中等: '[⭐⭐]',
    较低: '[⭐]',
    低: '[⭐]',
    未知: '[⭐]',
  };
  return starMap[reliability] || '[⭐⭐]';
}

function getStatusIcon(status: string): string {
  if (status.includes('正常') || status.includes('营业')) return '✅';
  if (status.includes('停业') || status.includes('整顿')) return '⚠️';
  if (status.includes('亏损') || status.includes('困难')) return '❌';
  return '●';
}

// formatMoney 已从 utils/format 导入

// 删除商业情报（使用统一删除函数）
function openDeleteIntel(key: string) {
  deleteItem({
    typeName: '商业情报',
    displayName: key,
    onDelete: () =>
      statDataActions.mutateStatData('business.delete-intel', draft => {
        delete draft.玩家.商业情报[key];
      }),
  });
}
</script>

<style scoped>
.business-panel {
  display: flex;
  flex-direction: column;
  background: transparent;
}

/* 统计栏 - 玻璃拟态渐变 */
.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--glass-border);
  position: relative;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  padding: 4px 10px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast) ease;
}

.stat-item:hover {
  background: rgba(var(--accent-primary-rgb), 0.08);
  border-color: rgba(var(--accent-primary-rgb), 0.2);
  transform: translateY(-1px);
}

.stat-item i {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 13px;
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.stat-value.revenue {
  color: hsl(142, 71%, 45%);
  text-shadow: 0 0 8px rgba(34, 197, 94, 0.15);
}

.stat-value.cost {
  color: hsl(0, 84%, 60%);
}

.content-sections {
  flex: 1;
  overflow-y: auto;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 区块 - 玻璃拟态 */
.section {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 6px 14px;
  box-shadow: var(--shadow-glass);
  transition: all var(--transition-normal) ease;
}

.section:hover {
  box-shadow: var(--shadow-md);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-base);
  padding: 6px 0;
  color: var(--accent-primary);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-fast) ease;
}

.section-title:hover {
  opacity: 0.85;
}

.section-title > i:first-child {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.toggle-icon {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  transition: transform 300ms var(--ease-out-expo);
}

.section-body {
  margin-top: 12px;
}

/* 库存表格 - 增强 */
.inventory-table-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  border-radius: var(--radius-sm);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--accent-primary-rgb), 0.45) transparent;
}

.inventory-table {
  width: max-content;
  border-collapse: collapse;
  font-size: var(--text-xs);
  background: transparent;
}

.inventory-table thead {
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.inventory-table th {
  padding: 10px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  border: none;
  border-bottom: 2px solid var(--glass-border);
  white-space: nowrap;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.inventory-table tbody tr {
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.06);
  transition: all var(--transition-fast) ease;
}

.inventory-table tbody tr:nth-child(even) {
  background: rgba(var(--accent-primary-rgb), 0.03);
}

.inventory-table tbody tr:hover {
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.inventory-table tbody tr.pulsing {
  animation: rowHeartbeat 1.15s ease-in-out infinite;
}

.inventory-table td {
  padding: 8px 10px;
  border: none;
  color: var(--text-primary);
  white-space: nowrap;
}

.col-name {
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-primary);
}

.col-number {
  text-align: right;
  font-family: var(--font-mono);
  font-weight: 600;
}

.col-price-buy,
.col-price-sell {
  text-align: right;
  font-family: var(--font-mono);
  font-weight: 500;
}

.col-price-buy {
  color: hsl(38, 92%, 50%);
}

.col-price-sell {
  color: hsl(142, 71%, 45%);
}

.col-note {
  font-size: 10px;
  font-style: italic;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 企业卡片网格 */
.enterprise-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.enterprise-card {
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border: 1px solid var(--card-border);
  border-top: 3px solid var(--accent-primary);
  border-radius: var(--radius-md);
  padding: 14px;
  cursor: pointer;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal),
    transform var(--motion-normal);
  position: relative;
  overflow: visible;
}

.enterprise-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
}

.enterprise-card.pulsing {
  animation: cardHeartbeat 1.15s ease-in-out infinite;
  box-shadow:
    var(--card-shadow-hover),
    inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.16);
}

.enterprise-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.enterprise-compact {
  font-size: var(--text-xs);
  color: var(--text-primary);
  line-height: 1.8;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.compact-item {
  white-space: nowrap;
}

.compact-item.money-in {
  color: hsl(142, 71%, 45%);
  font-family: var(--font-mono);
  font-weight: 600;
}

.compact-item.money-out {
  color: hsl(0, 84%, 60%);
  font-family: var(--font-mono);
  font-weight: 600;
}

.compact-divider {
  color: var(--text-secondary);
  opacity: 0.3;
}

.enterprise-field {
  font-size: var(--text-xs);
  color: var(--text-primary);
  line-height: 1.6;
  padding: 2px 0;
}

.enterprise-field.note {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px dashed var(--glass-border);
  color: var(--text-secondary);
  font-style: italic;
}

.enterprise-field.appearance {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.enterprise-field.facilities {
  margin-top: 2px;
  color: var(--accent-primary);
  font-size: var(--text-xs);
  font-weight: 500;
}

/* 情报卡片 */
.intel-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.intel-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  transition: all var(--transition-fast) ease;
  position: relative;
  overflow: visible;
}

/* 情报卡片删除按钮 - 组件级覆盖 (基础样式来自 delete-button.css) */
.intel-card .card-delete-btn {
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  font-size: 12px;
  z-index: 3;
}

.intel-card:hover .card-delete-btn {
  opacity: 1;
}

/* 情报卡片左侧装饰条 */
.intel-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: var(--gradient-warning);
  border-radius: 0 2px 2px 0;
  opacity: 0.6;
}

.intel-card:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.2);
  box-shadow: var(--shadow-sm);
}

.intel-card.pulsing {
  animation: cardHeartbeat 1.15s ease-in-out infinite;
}

.intel-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 6px;
  font-size: var(--text-sm);
  min-width: 0;
}

.intel-main-line {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.intel-meta-line {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 2px;
  min-width: 0;
  flex-wrap: wrap;
}

.intel-stars {
  color: hsl(38, 92%, 50%);
  font-size: 12px;
  flex-shrink: 0;
}

.intel-title {
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  line-height: 1.45;
  word-break: break-word;
  white-space: normal;
}

.intel-time {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  line-height: 1.2;
  word-break: break-word;
}

.intel-timeliness {
  font-size: var(--text-xs);
  color: hsl(38, 92%, 50%);
  line-height: 1.2;
}

.intel-content {
  font-size: var(--text-xs);
  color: var(--text-primary);
  line-height: 1.6;
  padding-left: 8px;
}

.empty-hint {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-style: italic;
  opacity: 0.6;
}

/* 滚动条 */
.content-sections::-webkit-scrollbar {
  width: 5px;
}

.content-sections::-webkit-scrollbar-track {
  background: transparent;
}

.content-sections::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.3);
  border-radius: 3px;
}

.content-sections::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--accent-primary-rgb), 0.5);
}

.inventory-table-wrapper::-webkit-scrollbar {
  height: 6px;
}

.inventory-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.inventory-table-wrapper::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.45);
  border-radius: 3px;
}

.inventory-table-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--accent-primary-rgb), 0.6);
}

@keyframes cardHeartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.01);
  }
  60% {
    transform: scale(0.996);
  }
}

@keyframes rowHeartbeat {
  0%,
  100% {
    background: transparent;
  }
  50% {
    background: rgba(var(--accent-primary-rgb), 0.1);
  }
}

@media (max-width: 900px) {
  .enterprise-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stats-bar {
    gap: 8px;
    padding: 10px;
  }

  .stat-item {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
    padding: 4px 8px;
  }

  .intel-card {
    padding: 10px 12px;
  }

  .intel-card .card-delete-btn {
    top: 6px;
    right: 6px;
  }

  .intel-main-line {
    padding-right: 24px;
  }

  .intel-stars {
    font-size: 11px;
  }

  .intel-title {
    font-size: 13px;
  }

  .intel-time,
  .intel-timeliness,
  .intel-content {
    font-size: 11px;
  }

  .intel-content {
    padding-left: 2px;
    line-height: 1.5;
    word-break: break-word;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stat-item:hover,
  .enterprise-card:hover {
    transform: none;
  }

  .enterprise-card.pulsing,
  .intel-card.pulsing,
  .inventory-table tbody tr.pulsing {
    animation: none !important;
  }
}
</style>
