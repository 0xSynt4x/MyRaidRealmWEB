<template>
  <div class="factions-config-compact">
    <!-- 势力标签 -->
    <div class="factions-tags">
      <button
        v-for="(faction, name) in config.世界.势力网络"
        :key="name"
        class="faction-tag"
        :class="getRelationClass(config.玩家.势力关系?.[name]?.声望值 || 0)"
        @click="editingName = String(name)"
      >
        <i class="ti" :class="getFactionEmojiClass(config.玩家.势力关系?.[name]?.声望值 || 0)"></i
        >{{ name || t('config.factions.unnamed') }}
        <span class="faction-stats-mini">
          <span class="influence-mini" :title="t('config.factions.influenceTitle')"
            ><i class="ti ti-barbell"></i>{{ faction.影响力 || 0 }}</span
          >
          <span class="population-mini" :title="t('config.factions.populationTitle')"
            ><i class="ti ti-users"></i>{{ formatPopulation(faction.人数 || 0) }}</span
          >
        </span>
      </button>
      <button class="add-tag" @click="addFaction"><i class="ti ti-plus"></i></button>
    </div>

    <!-- 编辑面板 -->
    <div v-if="editingName !== null && editingFaction" class="edit-panel">
      <div class="panel-header">
        <span>{{ t('config.factions.editFaction', { name: editingName }) }}</span>
        <button @click="editingName = null"><i class="ti ti-x"></i></button>
      </div>

      <div class="input-row">
        <label>{{ t('config.factions.influence') }}</label>
        <input v-model.number="editingFaction.影响力" type="range" min="0" max="100" class="range-input" />
        <input v-model.number="editingFaction.影响力" type="number" min="0" max="100" class="number-input" />
      </div>

      <div class="input-row">
        <label>{{ t('config.factions.population') }}</label>
        <input
          v-model.number="editingFaction.人数"
          type="number"
          min="0"
          class="underline-input"
          :placeholder="field('世界.势力网络.人数').placeholder"
        />
      </div>

      <div class="input-row">
        <label>{{ t('config.factions.relation') }}</label>
        <input
          v-model.number="ensurePlayerRelationExists(editingName).声望值"
          type="range"
          min="-100"
          max="100"
          class="range-input"
        />
        <input
          v-model.number="ensurePlayerRelationExists(editingName).声望值"
          type="number"
          min="-100"
          max="100"
          class="number-input"
        />
        <span :class="['relation-badge', getRelationClass(ensurePlayerRelationExists(editingName).声望值)]">
          {{ getRelationText(ensurePlayerRelationExists(editingName).声望值) }}
        </span>
      </div>

      <div class="panel-actions">
        <button class="btn-danger" @click="removeFaction(editingName)">
          <i class="ti ti-trash"></i> {{ t('config.factions.delete') }}
        </button>
        <button class="btn-primary" @click="editingName = null">
          <i class="ti ti-check"></i> {{ t('config.factions.done') }}
        </button>
      </div>
    </div>

    <!-- 关系矩阵（势力>=2时显示） -->
    <div v-if="factionNames.length >= 2" class="relations-section">
      <div class="section-label">{{ t('config.factions.relationsBetween') }}</div>
      <div class="relations-grid">
        <div v-for="nameA in factionNames" :key="nameA" class="relation-row">
          <span class="row-label">{{ nameA || '?' }}</span>
          <div class="row-inputs">
            <div v-for="nameB in factionNames" :key="nameB" class="relation-cell">
              <input
                v-if="nameA !== nameB"
                :value="getRelationValue(nameA, nameB)"
                type="number"
                min="-100"
                max="100"
                class="relation-input"
                :placeholder="String(nameB).slice(0, 2) || '?'"
                @input="e => setRelationValue(nameA, nameB, Number((e.target as HTMLInputElement).value))"
              />
              <span v-else class="relation-self">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '../../i18n';

// 使用 defineModel 使 config 成为可写的响应式引用
const config = defineModel<any>('config', { required: true });
const { t, enumDisplay, fieldMeta } = useI18n();

function field(path: string) {
  return fieldMeta(path);
}

const editingName = ref<string | null>(null);

const factionNames = computed(() => Object.keys(config.value?.世界?.势力网络 || {}));

const editingFaction = computed(() => {
  if (editingName.value === null) return null;
  return config.value.世界.势力网络[editingName.value];
});

const editingPlayerRelation = computed(() => {
  if (editingName.value === null) return null;
  // 确保对象存在
  if (!config.value.玩家.势力关系) {
    return null;
  }
  return config.value.玩家.势力关系[editingName.value] || null;
});

// 确保玩家势力关系对象存在
function ensurePlayerRelationExists(name: string) {
  if (!config.value.玩家.势力关系) {
    config.value.玩家.势力关系 = {};
  }
  if (!config.value.玩家.势力关系[name]) {
    config.value.玩家.势力关系[name] = {
      声望值: 0,
      声望等级: '待计算',
      关系状态: '中立',
      头衔列表: [],
      近期互动: '无',
    };
  }
  return config.value.玩家.势力关系[name];
}

function addFaction() {
  const name = prompt(t('config.factions.promptName'));
  if (!name || name.trim() === '') return;

  if (!config.value.世界.势力网络) {
    config.value.世界.势力网络 = {};
  }
  if (!config.value.玩家.势力关系) {
    config.value.玩家.势力关系 = {};
  }

  config.value.世界.势力网络[name] = {
    影响力: 10,
    人数: 0,
    关系: {},
  };

  // 为新势力建立与其他势力的关系
  Object.keys(config.value.世界.势力网络).forEach(otherName => {
    if (otherName !== name) {
      config.value.世界.势力网络[name].关系[otherName] = {
        关系值: 0,
        关系描述: '中立',
      };
      config.value.世界.势力网络[otherName].关系[name] = {
        关系值: 0,
        关系描述: '中立',
      };
    }
  });

  config.value.玩家.势力关系[name] = {
    声望值: 0,
    声望等级: '待计算',
    关系状态: '中立',
    头衔列表: [],
    近期互动: '无',
  };

  editingName.value = name;
}

function formatPopulation(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function removeFaction(name: string) {
  // 从势力网络中删除
  delete config.value.世界.势力网络[name];

  // 从其他势力的关系中删除
  Object.keys(config.value.世界.势力网络).forEach(otherName => {
    delete config.value.世界.势力网络[otherName].关系[name];
  });

  // 从玩家势力关系中删除
  delete config.value.玩家.势力关系[name];

  editingName.value = null;
}

// 获取势力间关系值，处理空值情况
function getRelationValue(nameA: string, nameB: string): number {
  const factionA = config.value.世界.势力网络[nameA];
  if (!factionA || !factionA.关系) return 0;
  const relation = factionA.关系[nameB];
  return relation?.关系值 ?? 0;
}

// 设置势力间关系值
function setRelationValue(nameA: string, nameB: string, value: number) {
  if (!config.value.世界.势力网络[nameA].关系) {
    config.value.世界.势力网络[nameA].关系 = {};
  }
  if (!config.value.世界.势力网络[nameA].关系[nameB]) {
    config.value.世界.势力网络[nameA].关系[nameB] = { 关系值: 0, 关系描述: '中立' };
  }
  config.value.世界.势力网络[nameA].关系[nameB].关系值 = Math.max(-100, Math.min(100, value));
}

function getFactionEmojiClass(relation: number): string {
  if (relation >= 60) return 'ti-mood-happy';
  if (relation >= 20) return 'ti-mood-smile';
  if (relation >= -20) return 'ti-mood-neutral';
  if (relation >= -60) return 'ti-mood-sad';
  return 'ti-mood-angry';
}

function getRelationText(value: number): string {
  if (value >= 60) return enumDisplay('faction.playerRelation', '盟友');
  if (value >= 20) return enumDisplay('faction.playerRelation', '友好');
  if (value >= -20) return enumDisplay('faction.playerRelation', '中立');
  if (value >= -60) return enumDisplay('faction.playerRelation', '冷淡');
  return enumDisplay('faction.playerRelation', '敌对');
}

function getRelationClass(value: number): string {
  if (value >= 60) return 'ally';
  if (value >= 20) return 'friendly';
  if (value >= -20) return 'neutral';
  if (value >= -60) return 'cold';
  return 'hostile';
}
</script>

<style scoped>
.factions-config-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.factions-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.faction-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
  border-radius: 12px;
  font-size: calc(12px * var(--ui-font-scale));
  cursor: pointer;
  transition: all 150ms;
  color: var(--text-primary);
}

.faction-tag:hover {
  border-color: var(--accent-primary);
  transform: translateY(-1px);
}

.faction-tag.ally {
  border-color: var(--accent-success);
  background: rgba(var(--accent-success-rgb), 0.1);
}

.faction-tag.friendly {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.faction-tag.hostile {
  border-color: var(--accent-danger);
  background: rgba(var(--accent-danger-rgb), 0.1);
}

.faction-stats-mini {
  display: flex;
  gap: 4px;
  font-size: calc(10px * var(--ui-font-scale));
  margin-left: 4px;
}

.influence-mini,
.population-mini {
  font-weight: 500;
  color: var(--text-secondary);
}

.influence-mini {
  color: var(--accent-warning);
}

.population-mini {
  color: var(--accent-primary);
}

.add-tag {
  width: 28px;
  height: 28px;
  border: 1px dashed var(--border-light);
  background: transparent;
  border-radius: 12px;
  font-size: calc(14px * var(--ui-font-scale));
  cursor: pointer;
  transition: all 150ms;
  color: var(--text-secondary);
}

.add-tag:hover {
  border-color: var(--accent-success);
  background: var(--accent-success);
  color: white;
}

/* 编辑面板 */
.edit-panel {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 8px;
  margin-top: 4px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 600;
  color: var(--text-primary);
}

.panel-header button {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  font-size: calc(14px * var(--ui-font-scale));
  transition: all 150ms;
}

.panel-header button:hover {
  background: var(--accent-danger);
  color: white;
}

/* 使用 global.css 中的通用表单样式 */

.input-row {
  margin-bottom: 6px;
}

.select-input {
  flex: 1;
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 2px 4px;
  font-size: calc(12px * var(--ui-font-scale));
  background: transparent;
  color: var(--text-primary);
  transition: border-color 150ms;
}

.select-input:focus {
  outline: none;
  border-bottom-color: var(--accent-primary);
}

.range-input {
  flex: 1;
  cursor: pointer;
}

.number-input {
  width: 50px;
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 2px 4px;
  font-size: calc(12px * var(--ui-font-scale));
  text-align: center;
  background: transparent;
  color: var(--text-primary);
}

.relation-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: calc(10px * var(--ui-font-scale));
  font-weight: 600;
  color: white;
}

.relation-badge.ally {
  background: var(--accent-success);
}

.relation-badge.friendly {
  background: var(--accent-primary);
}

.relation-badge.neutral {
  background: var(--accent-warning);
}

.relation-badge.cold {
  background: rgba(var(--accent-warning-rgb), 0.92);
}

.relation-badge.hostile {
  background: var(--accent-danger);
}

.panel-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.btn-danger,
.btn-primary {
  flex: 1;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: calc(11px * var(--ui-font-scale));
  cursor: pointer;
  transition: all 150ms;
}

.btn-danger {
  background: var(--accent-danger);
  color: white;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-danger:hover,
.btn-primary:hover {
  opacity: 0.85;
}

/* 关系矩阵 */
.relations-section {
  margin-top: 8px;
}

.section-label {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.relations-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.relation-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.row-label {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
  min-width: 60px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-inputs {
  flex: 1;
  display: flex;
  gap: 4px;
}

.relation-cell {
  flex: 1;
}

.relation-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 2px 4px;
  font-size: calc(11px * var(--ui-font-scale));
  text-align: center;
  background: transparent;
  color: var(--text-primary);
}

.relation-input:focus {
  outline: none;
  border-bottom-color: var(--accent-primary);
}

.relation-self {
  display: block;
  text-align: center;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-tertiary);
}

/* ===== 响应式适配 ===== */

@media (max-width: 768px) {
  .factions-config-compact {
    gap: 6px;
  }

  .faction-tag {
    padding: 3px 6px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .faction-stats-mini {
    font-size: calc(9px * var(--ui-font-scale));
    gap: 3px;
  }

  .add-tag {
    width: 26px;
    height: 26px;
    font-size: calc(13px * var(--ui-font-scale));
  }

  .edit-panel {
    padding: 6px;
  }

  .panel-header {
    font-size: calc(11px * var(--ui-font-scale));
    margin-bottom: 6px;
  }

  .input-row {
    gap: 6px;
    margin-bottom: 5px;
  }

  .input-row label {
    font-size: calc(11px * var(--ui-font-scale));
    min-width: 36px;
  }

  .underline-input,
  .select-input {
    font-size: calc(11px * var(--ui-font-scale));
  }

  .number-input {
    width: 46px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .relation-badge {
    padding: 2px 6px;
    font-size: calc(9px * var(--ui-font-scale));
  }

  .btn-danger,
  .btn-primary {
    padding: 3px 6px;
    font-size: calc(10px * var(--ui-font-scale));
  }

  .section-label {
    font-size: calc(10px * var(--ui-font-scale));
  }

  .row-label {
    font-size: calc(10px * var(--ui-font-scale));
    min-width: 54px;
    max-width: 54px;
  }

  .relation-input {
    font-size: calc(10px * var(--ui-font-scale));
  }
}

@media (max-width: 480px) {
  .factions-config-compact {
    gap: 4px;
    padding: 2px 0;
  }

  .faction-tag {
    padding: 2px 5px;
    font-size: calc(10px * var(--ui-font-scale));
    border-radius: 10px;
  }

  .faction-stats-mini {
    font-size: calc(8px * var(--ui-font-scale));
    gap: 2px;
    margin-left: 2px;
  }

  .add-tag {
    width: 24px;
    height: 24px;
    font-size: calc(12px * var(--ui-font-scale));
    border-radius: 10px;
  }

  .edit-panel {
    padding: 4px;
  }

  .panel-header {
    font-size: calc(10px * var(--ui-font-scale));
    margin-bottom: 4px;
  }

  .panel-header button {
    width: 18px;
    height: 18px;
    font-size: calc(12px * var(--ui-font-scale));
  }

  .input-row {
    gap: 4px;
    margin-bottom: 4px;
  }

  .input-row label {
    font-size: calc(10px * var(--ui-font-scale));
    min-width: 32px;
  }

  .underline-input,
  .select-input {
    font-size: calc(10px * var(--ui-font-scale));
    padding: 1px 2px;
  }

  .number-input {
    width: 42px;
    font-size: calc(10px * var(--ui-font-scale));
    padding: 1px 2px;
  }

  .relation-badge {
    padding: 1px 4px;
    font-size: calc(8px * var(--ui-font-scale));
  }

  .panel-actions {
    gap: 3px;
    margin-top: 6px;
  }

  .btn-danger,
  .btn-primary {
    padding: 3px 5px;
    font-size: calc(9px * var(--ui-font-scale));
  }

  .section-label {
    font-size: calc(9px * var(--ui-font-scale));
    margin-bottom: 4px;
  }

  .relations-grid {
    gap: 3px;
  }

  .relation-row {
    gap: 3px;
  }

  .row-label {
    font-size: calc(9px * var(--ui-font-scale));
    min-width: 48px;
    max-width: 48px;
  }

  .row-inputs {
    gap: 3px;
  }

  .relation-input {
    font-size: calc(9px * var(--ui-font-scale));
    padding: 1px 2px;
  }

  .relation-self {
    font-size: calc(9px * var(--ui-font-scale));
  }
}
</style>
