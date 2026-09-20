<template>
  <Teleport to="#modal-container">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-content">
          <!-- Dashboard风格头部 -->
          <div class="dashboard-header">
            <div class="header-left">
              <div class="business-avatar">
                <span class="avatar-icon"><i class="ti" :class="businessIcon"></i></span>
              </div>
              <div class="header-info">
                <h3 class="business-title">{{ businessName }}</h3>
                <div class="business-tags">
                  <span class="detail-header-tag detail-header-tag--type">{{
                    enumDisplay('business.entityType', editedBusiness.类型, editedBusiness.类型)
                  }}</span>
                  <span
                    :class="[
                      'detail-header-tag',
                      'detail-header-tag--status',
                      `detail-header-tag--${getStatusClass(editedBusiness.运营?.运营状态)}`,
                    ]"
                  >
                    {{
                      enumDisplay(
                        'business.operationStatus',
                        editedBusiness.运营?.运营状态,
                        editedBusiness.运营?.运营状态,
                      )
                    }}
                  </span>
                  <span v-if="editedBusiness.位置" class="detail-header-tag detail-header-tag--location">
                    <i class="ti ti-map-pin"></i> {{ editedBusiness.位置 }}
                  </span>
                </div>
              </div>
            </div>
            <button class="dialog-close" :title="t('business.detail.close')" @click="handleClose">
              <i class="ti ti-x"></i>
            </button>
          </div>

          <!-- 主体内容 - 紧凑型多列布局 -->
          <div ref="detailModalBody" class="modal-body" @input="handleDetailInput">
            <!-- 财务仪表盘 - 最重要的信息放在顶部 -->
            <div class="info-section">
              <div class="section-title">
                <i class="ti ti-coins section-icon"></i>
                <span>{{ t('business.detail.financeOverview') }}</span>
              </div>
              <div class="finance-grid">
                <div class="finance-stats compact">
                  <div class="finance-row revenue">
                    <div class="row-left">
                      <i class="ti ti-trending-up stat-icon"></i>
                      <span class="stat-label">{{ t('business.detail.income') }}</span>
                    </div>
                    <input v-model.number="editedBusiness.财务.收入" type="number" class="stat-input revenue" min="0" />
                  </div>
                  <div class="finance-row expense">
                    <div class="row-left">
                      <i class="ti ti-trending-down stat-icon"></i>
                      <span class="stat-label">{{ t('business.detail.expense') }}</span>
                    </div>
                    <input v-model.number="editedBusiness.财务.支出" type="number" class="stat-input expense" min="0" />
                  </div>
                </div>

                <div class="profit-card" :class="{ positive: netProfit >= 0, negative: netProfit < 0 }">
                  <div class="profit-icon">
                    <i class="ti" :class="netProfit >= 0 ? 'ti-trending-up' : 'ti-alert-triangle'"></i>
                  </div>
                  <div class="profit-content">
                    <div class="profit-label">{{ t('business.detail.netProfit') }}</div>
                    <div class="profit-value">{{ netProfit >= 0 ? '+' : '' }}{{ netProfit }}</div>
                  </div>
                </div>

                <!-- 资产负债 - 两列布局 -->
                <div class="asset-grid">
                  <div class="asset-item">
                    <i class="ti ti-building-bank asset-icon"></i>
                    <span class="asset-label">{{ t('business.detail.assets') }}</span>
                    <input v-model.number="editedBusiness.财务.资产价值" type="number" class="asset-input" min="0" />
                  </div>
                  <div class="asset-item debt">
                    <i class="ti ti-credit-card asset-icon"></i>
                    <span class="asset-label">{{ t('business.detail.liabilities') }}</span>
                    <input v-model.number="editedBusiness.财务.负债" type="number" class="asset-input" min="0" />
                  </div>
                </div>
              </div>
            </div>

            <!-- 运营与市场 - 两列并排 -->
            <div class="dual-section">
              <!-- 运营管理 -->
              <div class="info-section compact">
                <div class="section-title">
                  <i class="ti ti-settings section-icon"></i>
                  <span>{{ t('business.detail.operations') }}</span>
                </div>
                <div class="compact-grid">
                  <div class="compact-item">
                    <i class="ti ti-users compact-icon"></i>
                    <span class="compact-label">{{ t('business.detail.staff') }}</span>
                    <input v-model.number="editedBusiness.运营.人员数量" type="number" class="compact-input" min="0" />
                  </div>
                  <div class="compact-item full">
                    <i class="ti ti-refresh compact-icon"></i>
                    <span class="compact-label">{{ t('business.detail.status') }}</span>
                    <input v-model="editedBusiness.运营.运营状态" type="text" class="compact-input" />
                  </div>
                </div>
              </div>

              <!-- 基本信息 -->
              <div class="info-section compact">
                <div class="section-title">
                  <i class="ti ti-clipboard-list section-icon"></i>
                  <span>{{ t('business.detail.basics') }}</span>
                </div>
                <div class="compact-grid">
                  <div class="compact-item">
                    <i class="ti ti-tag compact-icon"></i>
                    <span class="compact-label">{{ t('business.detail.type') }}</span>
                    <input v-model="editedBusiness.类型" type="text" class="compact-input" />
                  </div>
                  <div class="compact-item">
                    <i class="ti ti-map-pin compact-icon"></i>
                    <span class="compact-label">{{ t('business.detail.location') }}</span>
                    <input v-model="editedBusiness.位置" type="text" class="compact-input" />
                  </div>
                  <div class="compact-item full">
                    <i class="ti ti-building-monument compact-icon"></i>
                    <span class="compact-label">{{ t('business.detail.appearance') }}</span>
                    <input
                      v-model="editedBusiness.外观"
                      type="text"
                      class="compact-input"
                      :placeholder="t('business.detail.appearancePlaceholder')"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 重要设施 -->
            <div class="info-section">
              <div class="section-title">
                <i class="ti ti-tool section-icon"></i>
                <span>{{ t('business.detail.facilities') }}</span>
              </div>
              <div class="facilities-container">
                <div v-for="(_facility, index) in editedBusiness.重要设施" :key="index" class="facility-item">
                  <span class="facility-index">{{ index + 1 }}.</span>
                  <input
                    v-model="editedBusiness.重要设施[index]"
                    type="text"
                    class="facility-input"
                    :placeholder="t('business.detail.facilityPlaceholder')"
                  />
                  <button class="facility-remove-btn" :title="t('common.delete')" @click="removeFacility(index)">
                    ×
                  </button>
                </div>
                <button class="facility-add-btn" @click="addFacility">
                  <i class="ti ti-plus"></i>
                  {{ t('business.detail.addFacility') }}
                </button>
              </div>
            </div>

            <!-- 市场表现 - 紧凑型文本域 -->
            <div class="info-section">
              <div class="section-title">
                <i class="ti ti-chart-bar section-icon"></i>
                <span>{{ t('business.detail.marketPerformance') }}</span>
              </div>
              <div class="market-grid">
                <div class="market-item">
                  <div class="market-header">
                    <i class="ti ti-users market-icon"></i>
                    <span class="market-label">{{ t('business.detail.customerBase') }}</span>
                  </div>
                  <textarea
                    v-model="editedBusiness.市场.客户群体"
                    class="market-textarea auto-grow-textarea"
                    rows="1"
                    :placeholder="t('business.detail.customerBasePlaceholder')"
                  ></textarea>
                </div>
                <div class="market-item">
                  <div class="market-header">
                    <i class="ti ti-swords market-icon"></i>
                    <span class="market-label">{{ t('business.detail.competition') }}</span>
                  </div>
                  <textarea
                    v-model="editedBusiness.市场.竞争态势"
                    class="market-textarea auto-grow-textarea"
                    rows="1"
                    :placeholder="t('business.detail.competitionPlaceholder')"
                  ></textarea>
                </div>
                <div class="market-item">
                  <div class="market-header">
                    <i class="ti ti-sparkles market-icon"></i>
                    <span class="market-label">{{ t('business.detail.uniqueAdvantage') }}</span>
                  </div>
                  <textarea
                    v-model="editedBusiness.市场.特色优势"
                    class="market-textarea auto-grow-textarea"
                    rows="1"
                    :placeholder="t('business.detail.uniqueAdvantagePlaceholder')"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 风险与机遇 - 两列并排 -->
            <div class="dual-section">
              <div class="info-section compact">
                <div class="section-title">
                  <i class="ti ti-alert-triangle section-icon"></i>
                  <span>{{ t('business.detail.currentIssues') }}</span>
                </div>
                <textarea
                  v-model="editedBusiness.当前问题"
                  class="full-textarea auto-grow-textarea"
                  rows="1"
                  :placeholder="t('business.detail.currentIssuesPlaceholder')"
                ></textarea>
              </div>

              <div class="info-section compact">
                <div class="section-title">
                  <i class="ti ti-target section-icon"></i>
                  <span>{{ t('business.detail.growthPotential') }}</span>
                </div>
                <textarea
                  v-model="editedBusiness.发展潜力"
                  class="full-textarea auto-grow-textarea"
                  rows="1"
                  :placeholder="t('business.detail.growthPotentialPlaceholder')"
                ></textarea>
              </div>
            </div>

            <!-- 备注 -->
            <div class="info-section">
              <div class="section-title">
                <i class="ti ti-pencil section-icon"></i>
                <span>{{ t('business.detail.notes') }}</span>
              </div>
              <textarea
                v-model="editedBusiness.备注"
                class="full-textarea auto-grow-textarea"
                rows="1"
                :placeholder="t('business.detail.notesPlaceholder')"
              ></textarea>
            </div>
          </div>

          <!-- 底部操作栏 -->
          <div class="dialog-footer">
            <button class="footer-btn cancel" :title="t('business.detail.cancelEdit')" @click="handleClose">
              <i class="ti ti-x"></i>
              <span>{{ t('business.detail.cancelEdit') }}</span>
            </button>
            <button class="footer-btn save" :title="t('business.detail.saveChanges')" @click="handleSave">
              <i class="ti ti-check"></i>
              <span>{{ t('business.detail.saveChanges') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from '../../i18n';

interface BusinessData {
  类型: string;
  位置: string;
  外观: string;
  财务: {
    收入: number;
    支出: number;
    资产价值: number;
    负债: number;
  };
  运营: {
    运营状态: string;
    人员数量: number;
  };
  市场: {
    客户群体: string;
    竞争态势: string;
    特色优势: string;
  };
  重要设施: string[];
  当前问题: string;
  发展潜力: string;
  备注: string;
}

interface Props {
  visible?: boolean;
  businessName?: string;
  businessData: BusinessData;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  businessName: '',
});
const { t, enumDisplay } = useI18n();

const emit = defineEmits<{
  close: [];
  save: [data: BusinessData];
}>();

const editedBusiness = ref<BusinessData>({
  类型: '',
  位置: '',
  外观: '',
  财务: { 收入: 0, 支出: 0, 资产价值: 0, 负债: 0 },
  运营: { 运营状态: '', 人员数量: 0 },
  市场: { 客户群体: '', 竞争态势: '', 特色优势: '' },
  重要设施: [],
  当前问题: '',
  发展潜力: '',
  备注: '',
});

const detailModalBody = ref<HTMLElement | null>(null);

watch(
  () => props.businessData,
  newData => {
    if (newData) {
      editedBusiness.value = {
        类型: newData.类型 || '',
        位置: newData.位置 || '',
        外观: newData.外观 || '',
        财务: {
          收入: newData.财务?.收入 || 0,
          支出: newData.财务?.支出 || 0,
          资产价值: newData.财务?.资产价值 || 0,
          负债: newData.财务?.负债 || 0,
        },
        运营: {
          运营状态: newData.运营?.运营状态 || '',
          人员数量: newData.运营?.人员数量 || 0,
        },
        市场: {
          客户群体: newData.市场?.客户群体 || '',
          竞争态势: newData.市场?.竞争态势 || '',
          特色优势: newData.市场?.特色优势 || '',
        },
        重要设施: newData.重要设施 || [],
        当前问题: newData.当前问题 || '',
        发展潜力: newData.发展潜力 || '',
        备注: newData.备注 || '',
      };
      void nextTick(resizeDetailTextareas);
    }
  },
  { immediate: true, deep: true },
);

const businessIcon = computed(() => {
  const iconMap: Record<string, string> = {
    商铺: 'ti-building-store',
    工坊: 'ti-building-factory',
    公司: 'ti-building',
    运输: 'ti-truck',
    飞船: 'ti-rocket',
    灵田: 'ti-plant',
    据点: 'ti-building-castle',
    其他: 'ti-package',
  };
  return iconMap[editedBusiness.value.类型] || 'ti-building';
});

const netProfit = computed(() => {
  return editedBusiness.value.财务.收入 - editedBusiness.value.财务.支出;
});

function getStatusClass(status: string): string {
  if (status.includes('正常') || status.includes('营业')) return 'normal';
  if (status.includes('停业') || status.includes('整顿')) return 'warning';
  if (status.includes('亏损') || status.includes('困难')) return 'danger';
  return 'normal';
}

function handleClose() {
  emit('close');
}

function handleSave() {
  emit('save', editedBusiness.value);
  emit('close');
}

function addFacility() {
  editedBusiness.value.重要设施.push('');
}

function removeFacility(index: number) {
  editedBusiness.value.重要设施.splice(index, 1);
}

function resizeTextareaElement(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizeDetailTextareas() {
  const container = detailModalBody.value;
  if (!container) {
    return;
  }

  const textareas = container.querySelectorAll<HTMLTextAreaElement>('.auto-grow-textarea');
  textareas.forEach(resizeTextareaElement);
}

function handleDetailInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  if (!target.classList.contains('auto-grow-textarea')) {
    return;
  }

  resizeTextareaElement(target);
}

watch(
  () => props.visible,
  async visible => {
    if (!visible) {
      return;
    }

    await nextTick();
    resizeDetailTextareas();
  },
);
</script>

<style scoped>
/* 商业详情页特有样式 */

/* 覆盖模态框默认宽度 */
.modal-content {
  max-width: 700px;
}

/* 覆盖模态框主体内边距 */
.modal-body {
  padding: 10px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
}

/* 覆盖信息区块内边距 */
.info-section {
  padding: 8px 10px;
}

/* 覆盖区块标题字号，改为跟随全局字号变量 */
.section-title {
  font-size: var(--text-sm);
}

/* 关闭按钮悬停效果 */
.dialog-close:hover {
  transform: scale(1.1);
}

.business-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.detail-header-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  max-width: 100%;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(15, 23, 42, 0.24);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 4px 10px rgba(15, 23, 42, 0.12);
  color: rgba(255, 255, 255, 0.98);
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(15, 23, 42, 0.28);
}

.detail-header-tag--type {
  background: linear-gradient(135deg, rgba(71, 133, 255, 0.34), rgba(102, 179, 255, 0.2));
  border-color: rgba(179, 216, 255, 0.4);
}

.detail-header-tag--status {
  border-color: rgba(255, 255, 255, 0.2);
}

.detail-header-tag--normal {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.34), rgba(16, 185, 129, 0.2));
  border-color: rgba(167, 243, 208, 0.4);
  color: rgba(236, 253, 245, 0.99);
}

.detail-header-tag--warning {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.34), rgba(245, 158, 11, 0.2));
  border-color: rgba(253, 224, 71, 0.42);
  color: rgba(255, 251, 235, 0.99);
}

.detail-header-tag--danger {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.34), rgba(248, 113, 113, 0.2));
  border-color: rgba(254, 202, 202, 0.42);
  color: rgba(255, 241, 242, 0.99);
}

.detail-header-tag--location {
  min-width: 0;
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.24);
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 财务网格布局 */
.finance-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.finance-stats {
  display: grid;
  gap: 8px;
}

.finance-stats.compact {
  grid-template-columns: 1fr;
}

.finance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  background: var(--bg-primary);
  border-radius: 4px;
  border: 1px solid var(--border-light);
}

.row-left {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.stat-icon {
  font-size: calc(14px * var(--ui-font-scale));
  flex-shrink: 0;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.stat-input {
  width: 120px;
  max-width: 46%;
  padding: 4px 6px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  background: var(--bg-card);
  transition: all 200ms ease;
  text-align: right;
}

.stat-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.1);
}

.stat-input.revenue {
  color: var(--accent-success);
}

.stat-input.expense {
  color: var(--accent-danger);
}

.profit-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  border: 2px solid var(--border-light);
}

.profit-card.positive {
  border-color: var(--accent-success);
  background: color-mix(in srgb, var(--accent-success) 8%, var(--bg-primary));
}

.profit-card.negative {
  border-color: var(--accent-danger);
  background: color-mix(in srgb, var(--accent-danger) 8%, var(--bg-primary));
}

.profit-icon {
  font-size: calc(20px * var(--ui-font-scale));
}

.profit-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.profit-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.profit-value {
  font-size: var(--text-lg);
  font-weight: 700;
}

.profit-card.positive .profit-value {
  color: var(--accent-success);
}

.profit-card.negative .profit-value {
  color: var(--accent-danger);
}

.asset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.asset-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg-primary);
  border-radius: 4px;
}

.asset-icon {
  font-size: calc(16px * var(--ui-font-scale));
}

.asset-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 36px;
}

.asset-input {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-card);
  transition: all 200ms ease;
  min-width: 0;
}

.asset-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

/* 双列布局 */
.dual-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

/* 紧凑型网格 */
.compact-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compact-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: var(--bg-primary);
  border-radius: 3px;
}

.compact-item.full {
  grid-column: 1 / -1;
}

.compact-icon {
  font-size: calc(14px * var(--ui-font-scale));
  flex-shrink: 0;
}

.compact-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 32px;
  flex-shrink: 0;
}

.compact-input {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-card);
  transition: all 200ms ease;
  min-width: 0;
}

.compact-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

/* 市场网格 */
.market-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.market-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.market-header {
  display: flex;
  align-items: center;
  gap: 4px;
}

.market-icon {
  font-size: calc(14px * var(--ui-font-scale));
}

.market-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 600;
}

.market-textarea {
  padding: 4px 6px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 200ms ease;
  min-height: 30px;
  line-height: 1.4;
}

.market-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.full-textarea {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 200ms ease;
  min-height: 30px;
  line-height: 1.4;
}

.auto-grow-textarea {
  resize: none;
  overflow-y: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.full-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

/* 覆盖底部按钮间距和内边距 */
.dialog-footer {
  gap: 10px;
  padding: 12px 16px;
}

.footer-btn {
  padding: 10px 20px;
}

/* 重要设施样式 */
.facilities-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--bg-primary);
  border-radius: 4px;
}

.facility-index {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 20px;
}

.facility-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-card);
  transition: all 200ms ease;
}

.facility-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.facility-remove-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: var(--accent-danger);
  color: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: calc(16px * var(--ui-font-scale));
  line-height: 1;
  transition: all 200ms ease;
  flex-shrink: 0;
}

.facility-remove-btn:hover {
  background: color-mix(in srgb, var(--accent-danger) 80%, black);
}

.facility-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed var(--border-light);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all 200ms ease;
}

.facility-add-btn:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 5%, transparent);
}

/* 响应式优化 */
@media (max-width: 900px) {
  .market-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .modal-content {
    width: 100%;
    max-width: none;
    max-height: 100%;
  }

  .modal-body {
    padding: 8px;
  }

  .business-tags {
    gap: 6px;
  }

  .detail-header-tag {
    min-height: 24px;
    padding: 0 9px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .info-section {
    padding: 8px;
  }

  .finance-row {
    padding: 7px 8px;
    gap: 8px;
  }

  .stat-input {
    width: 108px;
    font-size: var(--text-sm);
  }

  .profit-card {
    padding: 8px;
  }

  .dual-section {
    grid-template-columns: 1fr;
  }
}
</style>
