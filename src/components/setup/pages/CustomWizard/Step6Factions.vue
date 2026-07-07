<template>
  <div class="step-content-inner">
    <h3 class="step-title">{{ t('setup.customWizard.factions.title') }}</h3>
    <p class="step-desc">{{ t('setup.customWizard.factions.description') }}</p>

    <div class="form-section">
      <!-- 世界势力 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.factions.worldFactions') }}</h4>
        <div class="factions-container">
          <div v-for="(faction, name) in setupStore.config.世界.势力网络" :key="name" class="faction-card">
            <div class="faction-header">
              <span class="faction-name">{{ name }}</span>
              <button class="remove-btn" @click="removeWorldFaction(name as string)">×</button>
            </div>
            <div class="faction-stats">
              <div class="stat-item">
                <label>{{ influenceField.label }}</label>
                <input
                  :value="faction.影响力"
                  type="number"
                  class="stat-input"
                  min="0"
                  max="100"
                  @input="updateWorldFaction(name as string, '影响力', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="stat-item">
                <label>{{ membersField.label }}</label>
                <input
                  :value="faction.人数"
                  type="number"
                  class="stat-input"
                  min="0"
                  @input="updateWorldFaction(name as string, '人数', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>
          <div class="add-faction-form">
            <input
              v-model="newWorldFactionName"
              type="text"
              class="underline-input"
              :placeholder="t('setup.customWizard.factions.factionNamePlaceholder')"
            />
            <label class="inline-label">{{ influenceField.label }}</label>
            <input
              v-model.number="newWorldFactionInfluence"
              type="number"
              class="underline-input short"
              min="0"
              max="100"
            />
            <button class="add-btn small" @click="addWorldFaction">+</button>
          </div>
        </div>
      </div>

      <!-- 玩家势力关系 -->
      <div class="section-group">
        <h4 class="section-label">{{ t('setup.customWizard.factions.playerRelations') }}</h4>
        <div class="relations-container">
          <div v-for="(relation, name) in setupStore.config.玩家.势力关系" :key="name" class="relation-card">
            <div class="relation-header">
              <span class="relation-name">{{ name }}</span>
              <button class="remove-btn" @click="removePlayerRelation(name as string)">×</button>
            </div>
            <div class="relation-stats">
              <div class="stat-row">
                <label>{{ relationValueField.label || t('setup.customWizard.factions.reputation') }}</label>
                <input
                  :value="relation.声望值"
                  type="number"
                  class="stat-input"
                  min="-100"
                  max="100"
                  @input="updatePlayerRelation(name as string, '声望值', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="stat-row">
                <label>{{ t('setup.customWizard.factions.relationStatus') }}</label>
                <select
                  :value="relation.关系状态"
                  class="relation-select"
                  @change="updatePlayerRelation(name as string, '关系状态', ($event.target as HTMLSelectElement).value)"
                >
                  <option v-for="option in relationStatusOptions" :key="option" :value="option">
                    {{ enumDisplay('faction.playerRelation', option) }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <div class="add-relation-form">
            <input
              v-model="newRelationName"
              type="text"
              class="underline-input"
              :placeholder="t('setup.customWizard.factions.factionNamePlaceholder')"
            />
            <label class="inline-label">{{
              relationValueField.label || t('setup.customWizard.factions.reputation')
            }}</label>
            <input
              v-model.number="newRelationReputation"
              type="number"
              class="underline-input short"
              min="-100"
              max="100"
            />
            <select v-model="newRelationStatus" class="relation-select">
              <option v-for="option in relationStatusOptions" :key="option" :value="option">
                {{ enumDisplay('faction.playerRelation', option) }}
              </option>
            </select>
            <button class="add-btn small" @click="addPlayerRelation">+</button>
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

const relationStatusOptions = ['敌对', '冷淡', '中立', '友好', '盟友'] as const;

const influenceField = computed(() => fieldMeta('世界.势力网络.影响力'));
const membersField = computed(() => fieldMeta('世界.势力网络.人数'));
const relationValueField = computed(() => fieldMeta('玩家.势力关系.声望值'));

// 新世界势力表单
const newWorldFactionName = ref('');
const newWorldFactionInfluence = ref(10);

// 新玩家关系表单
const newRelationName = ref('');
const newRelationReputation = ref(0);
const newRelationStatus = ref<(typeof relationStatusOptions)[number]>('中立');

// 世界势力操作
function addWorldFaction() {
  const name = newWorldFactionName.value.trim();
  if (!name) return;

  setupStore.config.世界.势力网络[name] = {
    影响力: newWorldFactionInfluence.value || 10,
    人数: 0,
    关系: {},
  };

  newWorldFactionName.value = '';
  newWorldFactionInfluence.value = 10;
}

function removeWorldFaction(name: string) {
  delete setupStore.config.世界.势力网络[name];
}

function updateWorldFaction(name: string, field: string, value: string) {
  const num = parseInt(value) || 0;
  if (field === '影响力') {
    setupStore.config.世界.势力网络[name].影响力 = Math.max(0, Math.min(100, num));
  } else if (field === '人数') {
    setupStore.config.世界.势力网络[name].人数 = Math.max(0, num);
  }
}

// 玩家势力关系操作
function addPlayerRelation() {
  const name = newRelationName.value.trim();
  if (!name) return;

  setupStore.config.玩家.势力关系[name] = {
    声望值: newRelationReputation.value || 0,
    声望等级: '待计算',
    关系状态: newRelationStatus.value,
    头衔列表: [],
    近期互动: '无',
  };

  newRelationName.value = '';
  newRelationReputation.value = 0;
  newRelationStatus.value = '中立';
}

function removePlayerRelation(name: string) {
  delete setupStore.config.玩家.势力关系[name];
}

function updatePlayerRelation(name: string, field: string, value: string) {
  if (field === '声望值') {
    const num = parseInt(value) || 0;
    setupStore.config.玩家.势力关系[name].声望值 = Math.max(-100, Math.min(100, num));
  } else if (field === '关系状态') {
    setupStore.config.玩家.势力关系[name].关系状态 = value;
  }
}
</script>

<style scoped lang="scss">
/* 组件特有样式（共享样式已在 global.css 中定义） */

/* 势力容器 */
.factions-container,
.relations-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faction-card,
.relation-card {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.faction-header,
.relation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.faction-name,
.relation-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.faction-stats,
.relation-stats {
  display: flex;
  gap: 16px;
}

.stat-item,
.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;

  label {
    font-size: 12px;
    color: var(--text-tertiary);
    min-width: 50px;
  }
}

.stat-input {
  width: 70px;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  text-align: center;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
}

.relation-select {
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
.add-faction-form,
.add-relation-form {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  padding: 12px;
  border: 1px dashed var(--border-light);
  border-radius: 6px;
}

/* 响应式 */
@media (max-width: 768px) {
  .faction-stats,
  .relation-stats {
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 480px) {
  .faction-card,
  .relation-card {
    padding: 10px;
  }

  .faction-name,
  .relation-name {
    font-size: 14px;
  }

  .add-faction-form,
  .add-relation-form {
    flex-wrap: wrap;
    padding: 10px;

    .underline-input {
      flex: 1 1 100%;

      &.short {
        flex: 1 1 40%;
      }
    }
  }

  .add-relation-form .relation-select {
    flex: 1;
  }
}
</style>
