<template>
  <Teleport to="#modal-container">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-content">
          <!-- Dashboard风格头部 -->
          <div class="dashboard-header">
            <div class="header-left">
              <div class="faction-avatar">
                <span class="avatar-icon">{{ factionIcon }}</span>
              </div>
              <div class="header-info">
                <h3 class="faction-title">{{ factionName }}</h3>
                <div class="faction-tags">
                  <span v-if="playerRelation" :class="['tag', `status-${playerRelation.关系状态}`]">
                    {{ enumDisplay('faction.playerRelation', playerRelation.关系状态, playerRelation.关系状态) }}
                  </span>
                  <span v-if="playerRelation" class="tag">{{ playerRelation.声望等级 }}</span>
                  <span v-else class="tag">{{ t('faction.detail.noContact') }}</span>
                </div>
              </div>
            </div>
            <button class="dialog-close" @click="handleClose">✕</button>
          </div>

          <!-- 主体内容 -->
          <div class="modal-body">
            <!-- 势力基本信息 -->
            <div v-if="factionData" class="info-section">
              <div class="section-title">
                <span class="section-icon">📋</span>
                <span>{{ t('faction.detail.info') }}</span>
              </div>
              <div class="faction-stats">
                <div class="stat-card">
                  <div class="stat-icon">💪</div>
                  <div class="stat-info">
                    <div class="stat-label">{{ t('faction.detail.influence') }}</div>
                    <div class="stat-value">{{ factionData.影响力 || 0 }}</div>
                    <div class="stat-bar">
                      <div class="stat-fill influence" :style="{ width: (factionData.影响力 || 0) + '%' }"></div>
                    </div>
                  </div>
                </div>
                <div class="stat-card">
                  <div class="stat-icon">👥</div>
                  <div class="stat-info">
                    <div class="stat-label">{{ t('faction.detail.members') }}</div>
                    <div class="stat-value">{{ formatPopulation(factionData.人数 || 0) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 玩家与该势力的关系 -->
            <div v-if="playerRelation" class="info-section">
              <div class="section-title">
                <span class="section-icon">📊</span>
                <span>{{ t('faction.detail.yourRelation') }}</span>
              </div>
              <div class="reputation-dashboard">
                <div class="rep-gauge">
                  <div class="gauge-label">{{ t('faction.detail.reputationValue') }}</div>
                  <div class="gauge-value" :style="{ color: statusColor }">
                    {{ playerRelation.声望值 }}
                  </div>
                  <div class="gauge-bar">
                    <div class="gauge-fill" :style="{ width: reputationPercent + '%', background: statusColor }"></div>
                  </div>
                </div>
                <div class="excel-style">
                  <div class="excel-row">
                    <span class="excel-label">{{ t('faction.detail.reputationLevel') }}</span>
                    <span class="excel-value">{{ playerRelation.声望等级 }}</span>
                  </div>
                  <div class="excel-row">
                    <span class="excel-label">{{ t('faction.detail.relationStatus') }}</span>
                    <span :class="['excel-value', `status-${playerRelation.关系状态}`]">
                      {{ enumDisplay('faction.playerRelation', playerRelation.关系状态, playerRelation.关系状态) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 头衔列表 -->
              <div v-if="playerRelation.头衔列表.length > 0" class="title-section">
                <div class="subsection-title">{{ t('faction.detail.titles') }}</div>
                <div class="title-grid">
                  <div v-for="(title, index) in playerRelation.头衔列表" :key="title" class="title-item">
                    <span class="title-number">{{ index + 1 }}</span>
                    <span class="title-text">{{ title }}</span>
                  </div>
                </div>
              </div>

              <!-- 近期互动 -->
              <div v-if="playerRelation.近期互动 !== '无'" class="interaction-section">
                <div class="subsection-title">{{ t('faction.detail.recentInteraction') }}</div>
                <div class="interaction-box">
                  {{ playerRelation.近期互动 }}
                </div>
              </div>
            </div>

            <!-- 未建立联系提示 -->
            <div v-else class="info-section">
              <div class="no-relation-box">
                <i class="fa-solid fa-handshake-slash"></i>
                <p>{{ t('faction.detail.noRelation') }}</p>
              </div>
            </div>

            <!-- 关联势力网络 -->
            <div v-if="relatedFactions.length > 0" class="info-section">
              <div class="section-title">
                <span class="section-icon">🌐</span>
                <span>{{ t('faction.detail.relatedFactions') }}</span>
              </div>
              <div class="related-list">
                <div
                  v-for="related in relatedFactions"
                  :key="related.name"
                  class="related-card"
                  :class="{ positive: related.value >= 0, negative: related.value < 0 }"
                >
                  <div class="related-header">
                    <span class="related-name">{{ related.name }}</span>
                    <span :class="['related-value', related.value >= 0 ? 'positive' : 'negative']">
                      {{ related.value >= 0 ? '+' : '' }}{{ related.value }}
                    </span>
                  </div>
                  <div class="related-desc">{{ related.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作栏 -->
          <div class="dialog-footer">
            <button class="footer-btn close" @click="handleClose">{{ t('faction.detail.close') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';

interface FactionData {
  影响力?: number;
  人数?: number;
  关系?: Record<string, { 关系值: number; 关系描述: string }>;
}

interface Props {
  visible: boolean;
  factionName: string;
  playerRelation?: {
    声望值: number;
    声望等级: string;
    关系状态: string;
    头衔列表: string[];
    近期互动: string;
  };
  worldNetwork: Record<string, FactionData>;
}

const props = withDefaults(defineProps<Props>(), {
  playerRelation: undefined,
});
const { t, enumDisplay } = useI18n();
const emit = defineEmits<{
  close: [];
}>();

const factionIcon = computed(() => {
  const icons = ['🏛️', '⚔️', '🏰', '🕌', '🗼', '🏢', '🏭', '🏫', '🏦', '⛪'];
  const hash = props.factionName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return icons[hash % icons.length];
});

const statusColor = computed(() => {
  if (!props.playerRelation) return 'var(--text-secondary)';
  const colorMap: Record<string, string> = {
    盟友: 'var(--accent-success)',
    友好: 'var(--accent-primary)',
    中立: 'var(--text-secondary)',
    冷淡: 'var(--accent-warning)',
    敌对: 'var(--accent-danger)',
  };
  return colorMap[props.playerRelation.关系状态] || 'var(--text-secondary)';
});

const reputationPercent = computed(() => {
  if (!props.playerRelation) return 50;
  return Math.round(((props.playerRelation.声望值 + 100) / 200) * 100);
});

const factionData = computed(() => {
  return props.worldNetwork[props.factionName] || null;
});

function formatPopulation(num: number): string {
  if (num >= 10000) return t('faction.detail.populationTenThousand', { value: (num / 10000).toFixed(1) });
  if (num >= 1000) return t('faction.detail.populationThousand', { value: (num / 1000).toFixed(1) });
  return num.toString();
}

const relatedFactions = computed(() => {
  const relations: Array<{ name: string; value: number; desc: string }> = [];

  const faction = props.worldNetwork[props.factionName];
  if (faction && faction.关系) {
    _.forEach(faction.关系, (relation, targetName) => {
      relations.push({
        name: targetName,
        value: relation.关系值,
        desc: relation.关系描述,
      });
    });
  }

  _.forEach(props.worldNetwork, (factionData, sourceName) => {
    if (sourceName !== props.factionName && factionData.关系 && factionData.关系[props.factionName]) {
      if (!relations.find(r => r.name === sourceName)) {
        relations.push({
          name: sourceName,
          value: factionData.关系[props.factionName].关系值,
          desc: factionData.关系[props.factionName].关系描述,
        });
      }
    }
  });

  return _.orderBy(relations, 'value', 'desc');
});

function handleClose() {
  emit('close');
}
</script>

<style scoped>
/* 势力详情页特有样式 */

.reputation-dashboard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.rep-gauge {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.gauge-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  min-width: 50px;
}

.gauge-value {
  font-size: 20px;
  font-weight: 700;
  min-width: 50px;
  text-align: center;
}

.gauge-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.gauge-fill {
  height: 100%;
  transition: width 300ms ease;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
}

/* 进度条 */

.faction-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  min-width: 0;
}

.stat-card {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 10px;
  padding: 10px;
  background: var(--bg-primary);
  border-radius: 6px;
}

.stat-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
}

.stat-bar {
  height: 4px;
  background: var(--bg-card);
  border-radius: 2px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  transition: width 300ms ease;
}

.stat-fill.influence {
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-warning));
}

/* 头衔和互动区 */

.title-section,
.interaction-section {
  margin-top: 12px;
}

.no-relation-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-primary);
  border-radius: 4px;
  gap: 8px;
}

.no-relation-box i {
  font-size: 32px;
  color: var(--text-secondary);
  opacity: 0.5;
}

.no-relation-box p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.title-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-primary);
  padding: 6px 8px;
  border-radius: 4px;
}

.title-number {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.title-text {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.interaction-box {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.6;
  background: var(--bg-primary);
  border-radius: 4px;
  padding: 8px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.related-card {
  background: var(--bg-primary);
  border-radius: 4px;
  padding: 8px;
  border-left: 3px solid var(--border-light);
  transition: all 200ms ease;
}

.related-card.positive {
  border-left-color: var(--accent-success);
}

.related-card.negative {
  border-left-color: var(--accent-danger);
}

.related-card:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
}

.related-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.related-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.related-value {
  font-size: var(--text-sm);
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}

.related-value.positive {
  color: var(--accent-success);
  background: color-mix(in srgb, var(--accent-success) 12%, transparent);
}

.related-value.negative {
  color: var(--accent-danger);
  background: color-mix(in srgb, var(--accent-danger) 12%, transparent);
}

.related-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .faction-stats {
    flex-direction: column;
    gap: 8px;
  }

  .rep-gauge {
    gap: 8px;
    flex-wrap: wrap;
  }

  .gauge-label {
    min-width: auto;
  }

  .gauge-value {
    font-size: 18px;
    min-width: 44px;
  }

  .related-card:hover {
    transform: none;
  }
}

@media (max-width: 600px) {
  .stat-card {
    padding: 8px;
    gap: 8px;
  }

  .stat-icon {
    font-size: 20px;
  }

  .title-item {
    padding: 6px;
  }

  .interaction-box,
  .related-card {
    padding: 7px;
  }
}
</style>
