<template>
  <div class="business-config-compact">
    <!-- 商业实体列表 -->
    <div ref="entityListRef" v-if="entityNames.length > 0" class="entity-list" @input="handleTextareaInput">
      <div v-for="(entity, name) in config.玩家.经营实体" :key="name" class="entity-card">
        <!-- 基础信息 -->
        <div class="section-label">{{ t('config.business.basicInfo') }}</div>
        <div class="input-row">
          <input :value="name" :placeholder="t('config.business.entityName')" class="underline-input" disabled />
          <select v-model="entity.类型" class="underline-select">
            <option value="商铺">{{ enumDisplay('business.entityType', '商铺') }}</option>
            <option value="工坊">{{ enumDisplay('business.entityType', '工坊') }}</option>
            <option value="公司">{{ enumDisplay('business.entityType', '公司') }}</option>
            <option value="运输">{{ enumDisplay('business.entityType', '运输') }}</option>
            <option value="飞船">{{ enumDisplay('business.entityType', '飞船') }}</option>
            <option value="灵田">{{ enumDisplay('business.entityType', '灵田') }}</option>
            <option value="据点">{{ enumDisplay('business.entityType', '据点') }}</option>
            <option value="其他">{{ enumDisplay('business.entityType', '其他') }}</option>
          </select>
          <button class="delete-btn" @click="deleteEntity(name)"><i class="ti ti-trash"></i></button>
        </div>

        <div class="input-row multiline-input-row">
          <label>{{ field('玩家.经营实体.位置').label }}</label>
          <textarea
            v-model="entity.位置"
            :placeholder="field('玩家.经营实体.位置').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <div class="input-row multiline-input-row">
          <label>{{ field('玩家.经营实体.外观').label }}</label>
          <textarea
            v-model="entity.外观"
            :placeholder="field('玩家.经营实体.外观').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <div class="input-row">
          <label>{{ field('玩家.经营实体.运营.运营状态').label }}</label>
          <input
            v-model="entity.运营.运营状态"
            :placeholder="field('玩家.经营实体.运营.运营状态').placeholder"
            class="underline-input"
          />
        </div>

        <!-- 财务数据 -->
        <div class="section-label">{{ t('config.business.financial') }}</div>
        <div class="input-row">
          <label>{{ field('玩家.经营实体.财务.收入').label }}</label>
          <input v-model.number="entity.财务.收入" type="number" class="underline-input xs" min="0" />
          <label>{{ field('玩家.经营实体.财务.支出').label }}</label>
          <input v-model.number="entity.财务.支出" type="number" class="underline-input xs" min="0" />
        </div>

        <div class="input-row">
          <label>{{ field('玩家.经营实体.财务.资产价值').label }}</label>
          <input v-model.number="entity.财务.资产价值" type="number" class="underline-input" min="0" />
        </div>

        <div class="input-row">
          <label>{{ field('玩家.经营实体.财务.负债').label }}</label>
          <input v-model.number="entity.财务.负债" type="number" class="underline-input" min="0" />
        </div>

        <!-- 运营管理 -->
        <div class="section-label">{{ t('config.business.operations') }}</div>
        <div class="input-row">
          <label>{{ field('玩家.经营实体.运营.人员数量').label }}</label>
          <input v-model.number="entity.运营.人员数量" type="number" class="underline-input xs" min="0" />
        </div>

        <!-- 重要设施 -->
        <div class="section-label">{{ t('config.business.facilities') }}</div>
        <div class="input-row">
          <label>{{ field('玩家.经营实体.重要设施').label }}</label>
          <input
            :value="(entity.重要设施 || []).join(', ')"
            :placeholder="field('玩家.经营实体.重要设施').placeholder"
            class="underline-input"
            @input="
              e =>
                (entity.重要设施 = (e.target as HTMLInputElement).value
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean))
            "
          />
        </div>

        <!-- 市场表现 -->
        <div class="section-label">{{ t('config.business.market') }}</div>
        <div class="input-row">
          <label>{{ field('玩家.经营实体.市场.客户群体').label }}</label>
          <textarea
            v-model="entity.市场.客户群体"
            :placeholder="field('玩家.经营实体.市场.客户群体').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <div class="input-row">
          <label>{{ field('玩家.经营实体.市场.竞争态势').label }}</label>
          <textarea
            v-model="entity.市场.竞争态势"
            :placeholder="field('玩家.经营实体.市场.竞争态势').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <div class="input-row">
          <label>{{ field('玩家.经营实体.市场.特色优势').label }}</label>
          <textarea
            v-model="entity.市场.特色优势"
            :placeholder="field('玩家.经营实体.市场.特色优势').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <!-- 风险与机遇 -->
        <div class="section-label">{{ t('config.business.riskOpportunity') }}</div>
        <div class="input-row">
          <label>{{ field('玩家.经营实体.当前问题').label }}</label>
          <textarea
            v-model="entity.当前问题"
            :placeholder="field('玩家.经营实体.当前问题').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <div class="input-row">
          <label>{{ field('玩家.经营实体.发展潜力').label }}</label>
          <textarea
            v-model="entity.发展潜力"
            :placeholder="field('玩家.经营实体.发展潜力').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <!-- 备注 -->
        <div class="input-row">
          <label>{{ field('玩家.经营实体.备注').label }}</label>
          <textarea
            v-model="entity.备注"
            :placeholder="field('玩家.经营实体.备注').placeholder"
            class="underline-textarea auto-grow-textarea"
            rows="1"
          ></textarea>
        </div>

        <div v-if="!isLastEntity(name)" class="divider"></div>
      </div>
    </div>

    <button class="add-mini" @click="addEntity"><i class="ti ti-plus"></i> {{ t('config.business.addEntity') }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from '../../i18n';

const config = defineModel<any>('config', { required: true });
const { t, enumDisplay, fieldMeta } = useI18n();
const entityListRef = ref<HTMLElement | null>(null);

function field(path: string) {
  return fieldMeta(path);
}

const entityNames = computed(() => Object.keys(config.value?.玩家?.经营实体 || {}));

function isLastEntity(name: string | number): boolean {
  const names = entityNames.value;
  return names.indexOf(String(name)) === names.length - 1;
}

function resizeTextareaElement(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizeConfigTextareas() {
  const container = entityListRef.value;
  if (!container) {
    return;
  }

  const textareas = container.querySelectorAll<HTMLTextAreaElement>('.auto-grow-textarea');
  textareas.forEach(resizeTextareaElement);
}

function handleTextareaInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  if (!target.classList.contains('auto-grow-textarea')) {
    return;
  }

  resizeTextareaElement(target);
}

function addEntity() {
  const name = prompt(t('config.business.promptEntityName'));
  if (!name || name.trim() === '') return;

  if (!config.value.玩家.经营实体) {
    config.value.玩家.经营实体 = {};
  }
  config.value.玩家.经营实体[name] = {
    类型: '商铺',
    位置: '',
    外观: '',
    财务: {
      收入: 0,
      支出: 0,
      资产价值: 0,
      负债: 0,
    },
    运营: {
      运营状态: '正常运营',
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
  void nextTick(resizeConfigTextareas);
}

function deleteEntity(name: string | number) {
  delete config.value.玩家.经营实体[String(name)];
  void nextTick(resizeConfigTextareas);
}

watch(entityNames, async () => {
  await nextTick();
  resizeConfigTextareas();
});

watch(
  () => config.value?.玩家?.经营实体,
  async () => {
    await nextTick();
    resizeConfigTextareas();
  },
  { deep: true, immediate: true },
);

onMounted(() => {
  void nextTick(resizeConfigTextareas);
});
</script>

<style scoped>
.business-config-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.entity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 70vh;
  overflow-y: auto;
}

.entity-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-light);
}

.section-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--accent-primary);
  margin-top: 8px;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-light);
}

.section-label:first-child {
  margin-top: 0;
}

/* 使用 global.css 中的通用表单样式 */

.underline-input.xs {
  flex: 0 0 60px;
}

.underline-input.short,
.underline-select.short {
  flex: 0 0 80px;
}

.underline-textarea {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border: none;
  border-bottom: 1px solid var(--border-light);
  background: transparent;
  font-family: var(--font-base);
  font-size: var(--text-sm);
  color: var(--text-primary);
  min-height: 30px;
  line-height: 1.4;
  transition: border-color 200ms ease;
}

.auto-grow-textarea {
  resize: none;
  overflow-y: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.underline-textarea:focus {
  outline: none;
  border-bottom-color: var(--accent-primary);
}

.multiline-input-row {
  align-items: flex-start;
}

.multiline-input-row label {
  padding-top: 6px;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: calc(14px * var(--ui-font-scale));
  border-radius: 4px;
  transition: all 150ms;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: var(--accent-danger);
}

.divider {
  height: 1px;
  background: var(--border-light);
  margin: 8px 0;
}

/* 使用 global.css 中的 .add-mini 样式 */

.add-mini {
  margin-left: 0;
}

/* ===== 响应式适配 ===== */

@media (max-width: 768px) {
  .business-config-compact {
    gap: 6px;
  }

  .entity-list {
    gap: 10px;
  }

  .entity-card {
    gap: 5px;
    padding: 10px;
  }

  .section-label {
    font-size: var(--text-xs);
    margin-top: 6px;
    margin-bottom: 3px;
  }

  .input-row {
    gap: 6px;
    margin-bottom: 3px;
  }

  .input-row label {
    font-size: var(--text-xs);
    min-width: 60px;
  }

  .underline-input,
  .underline-select,
  .underline-textarea {
    font-size: var(--text-sm);
  }

  .underline-input.xs {
    flex: 0 0 56px;
  }

  .underline-select.short,
  .underline-input.short {
    flex: 0 0 72px;
  }

  .delete-btn {
    width: 26px;
    height: 26px;
    font-size: calc(13px * var(--ui-font-scale));
  }

  .add-mini {
    font-size: var(--text-xs);
  }
}

@media (max-width: 480px) {
  .business-config-compact {
    gap: 4px;
    padding: 2px 0;
  }

  .entity-list {
    gap: 8px;
  }

  .entity-card {
    gap: 4px;
    padding: 8px;
  }

  .section-label {
    font-size: var(--text-xs);
    margin-top: 4px;
    margin-bottom: 2px;
  }

  .input-row {
    gap: 4px;
    margin-bottom: 2px;
  }

  .input-row label {
    font-size: var(--text-xs);
    min-width: 50px;
  }

  .underline-input,
  .underline-select,
  .underline-textarea {
    font-size: var(--text-sm);
    padding: 2px 4px;
  }

  .underline-input.xs {
    flex: 0 0 48px;
  }

  .underline-select.short,
  .underline-input.short {
    flex: 0 0 64px;
  }

  .delete-btn {
    width: 24px;
    height: 24px;
    font-size: calc(12px * var(--ui-font-scale));
  }

  .add-mini {
    padding: 3px 6px;
    font-size: var(--text-xs);
  }
}
</style>
