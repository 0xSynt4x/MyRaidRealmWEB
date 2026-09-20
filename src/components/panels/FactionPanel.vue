<template>
  <div class="faction-panel">
    <!-- 💼 势力概览统计栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <i class="ti ti-world"></i>
        <span class="stat-label">{{ t('faction.statsFactions') }}</span>
        <span class="stat-value">{{ totalFactions }}{{ t('faction.countUnit') }}</span>
      </div>
      <div class="stat-item">
        <i class="ti ti-users"></i>
        <span class="stat-label">{{ t('faction.statsPopulation') }}</span>
        <span class="stat-value">{{ totalPopulation }}</span>
      </div>
      <div class="stat-item">
        <i class="ti ti-heart-handshake"></i>
        <span class="stat-label">{{ t('faction.statsAllies') }}</span>
        <span class="stat-value positive">{{ allyCount }}{{ t('faction.countUnit') }}</span>
      </div>
      <div class="stat-item">
        <i class="ti ti-skull"></i>
        <span class="stat-label">{{ t('faction.statsEnemies') }}</span>
        <span class="stat-value negative">{{ enemyCount }}{{ t('faction.countUnit') }}</span>
      </div>
    </div>

    <!-- 力导向图区域 -->
    <div class="graph-area">
      <div v-if="hasData" ref="graphContainer" class="faction-graph"></div>
      <div v-else class="empty-state">
        <i class="ti ti-world"></i>
        <h3>{{ t('faction.emptyTitle') }}</h3>
        <p>{{ t('faction.emptyDescription') }}</p>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <FactionDetailModal
      v-if="selectedFaction"
      :visible="showDetailModal"
      :faction-name="selectedFaction"
      :player-relation="factionRelations[selectedFaction]"
      :world-network="worldNetwork"
      @close="closeDetailModal"
    />
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import { useSettingsStore } from '../../stores/settings';
import { useStatDataStore } from '../../stores/statData';
import FactionDetailModal from './FactionDetailModal.vue';

const store = useStatDataStore();
const settingsStore = useSettingsStore();
const { t, enumDisplay } = useI18n();
const data = computed(() => store.data);

// 力导向图 DOM 引用
const graphContainer = ref<HTMLElement>();
let network: Network | null = null;
let resizeObserver: ResizeObserver | null = null;
const isNetworkVisible = ref(true);

// 性能优化：限制最大节点数
const MAX_VISIBLE_NODES = 50;

// 详情弹窗状态
const selectedFaction = ref<string>('');
const showDetailModal = ref(false);

// 获取势力关系和世界网络
const factionRelations = computed(() => data.value?.玩家?.势力关系 || {});
const worldNetwork = computed(() => data.value?.世界?.势力网络 || {});

// 从世界势力网络中提取所有势力
const allFactions = computed(() => {
  const factions = new Set<string>();
  _.forEach(worldNetwork.value, (factionData, factionName) => {
    factions.add(factionName);
    if (factionData.关系) {
      _.forEach(factionData.关系, (_, targetFaction) => {
        factions.add(targetFaction);
      });
    }
  });
  return Array.from(factions);
});

// 检查是否有数据
const hasData = computed(() => {
  return allFactions.value.length > 0;
});

// 概览统计
const totalFactions = computed(() => allFactions.value.length);

const allyCount = computed(() => {
  let count = 0;
  _.forEach(worldNetwork.value, factionData => {
    if (factionData.关系) {
      _.forEach(factionData.关系, relation => {
        if (relation.关系值 > 50) {
          count++;
        }
      });
    }
  });
  return count;
});

const enemyCount = computed(() => {
  let count = 0;
  _.forEach(worldNetwork.value, factionData => {
    if (factionData.关系) {
      _.forEach(factionData.关系, relation => {
        if (relation.关系值 < -50) {
          count++;
        }
      });
    }
  });
  return count;
});

const totalPopulation = computed(() => {
  let total = 0;
  _.forEach(worldNetwork.value, factionData => {
    total += factionData.人数 || 0;
  });
  return total;
});

// 获取 CSS 变量值（从 .app-container 读取，因为 data-theme 设置在该元素上）
const getCssVar = (varName: string): string => {
  const appContainer = document.querySelector('.app-container');
  const target = appContainer || document.documentElement;
  return getComputedStyle(target).getPropertyValue(varName).trim();
};

// 初始化网络图（添加节点数限制优化）
function initNetwork() {
  if (!graphContainer.value || !hasData.value) {
    return;
  }

  // 性能优化：如果节点过多，只显示影响力最大的节点
  let factionsToShow = allFactions.value;
  if (factionsToShow.length > MAX_VISIBLE_NODES) {
    const factionInfluenceMap = factionsToShow.map(name => ({
      name,
      influence: worldNetwork.value[name]?.影响力 || 0,
    }));
    factionsToShow = _(factionInfluenceMap)
      .orderBy(['influence'], ['desc'])
      .take(MAX_VISIBLE_NODES)
      .map(item => item.name)
      .value();
  }

  const nodesArray = factionsToShow.map(factionName => {
    const factionData = worldNetwork.value[factionName] || {};
    const influence = factionData.影响力 || 10;
    const population = factionData.人数 || 0;

    const relations: number[] = [];
    if (factionData.关系) {
      _.forEach(factionData.关系, relation => {
        relations.push(relation.关系值);
      });
    }

    const playerRelation = factionRelations.value[factionName];

    const getInfluenceColor = (inf: number): string => {
      if (inf >= 70) return getCssVar('--accent-danger');
      if (inf >= 50) return getCssVar('--accent-warning');
      if (inf >= 30) return getCssVar('--accent-primary');
      return getCssVar('--text-secondary');
    };

    const nodeColor = getInfluenceColor(influence);

    let tooltipText = `${factionName}`;
    tooltipText += `\n${t('faction.tooltipInfluence')}: ${influence} | ${t('faction.tooltipPopulation')}: ${population}`;
    if (playerRelation) {
      tooltipText += `\n\n${t('faction.tooltipYourReputation')}: ${playerRelation.声望值} (${playerRelation.声望等级})`;
      tooltipText += `\n${t('faction.tooltipRelationStatus')}: ${enumDisplay('faction.playerRelation', playerRelation.关系状态, playerRelation.关系状态)}`;
    } else {
      tooltipText += `\n\n${t('faction.tooltipNotConnected')}`;
    }
    tooltipText += `\n\n${t('faction.tooltipClickDetail')}`;

    const logPopulation = population > 0 ? Math.log10(population) : 0;
    const nodeSize = Math.max(20, Math.min(60, 10 + logPopulation * 8));

    return {
      id: factionName,
      label: factionName,
      value: nodeSize,
      color: {
        background: nodeColor,
        border: '#ffffff',
        highlight: { background: nodeColor, border: '#ffd700' },
        hover: { background: nodeColor, border: '#ffeb3b' },
      },
      font: {
        color: getCssVar('--text-primary'),
        size: 14,
        face: 'Microsoft YaHei',
      },
      title: tooltipText,
    };
  });

  const nodes = new DataSet(nodesArray);

  const edgesArray: any[] = [];
  _.forEach(worldNetwork.value, (factionData, source) => {
    if (factionData.关系) {
      _.forEach(factionData.关系, (relation, target) => {
        if (_.find(nodesArray, { id: source }) && _.find(nodesArray, { id: target })) {
          edgesArray.push({
            from: source,
            to: target,
            value: Math.abs(relation.关系值) / 10 + 1,
            color: {
              color: relation.关系值 >= 0 ? getCssVar('--accent-success') : getCssVar('--accent-danger'),
              opacity: 0.6,
            },
            dashes: relation.关系值 === 0,
            title: `${source} → ${target}\n${relation.关系描述 || `${t('faction.tooltipRelationValue')}: ${relation.关系值}`}`,
            smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
          });
        }
      });
    }
  });

  const edges = new DataSet(edgesArray);

  const options = {
    nodes: {
      shape: 'dot',
      size: 25,
      font: { size: 14, color: getCssVar('--text-primary'), face: 'Microsoft YaHei' },
      borderWidth: 3,
      shadow: true,
      scaling: { min: 20, max: 50 },
    },
    edges: {
      width: 2,
      shadow: true,
      smooth: { enabled: true, type: 'continuous', roundness: 0.5 },
      arrows: { to: { enabled: false } },
    },
    physics: {
      enabled: true,
      solver: 'forceAtlas2Based',
      forceAtlas2Based: {
        gravitationalConstant: -80,
        centralGravity: 0.02,
        springLength: 150,
        springConstant: 0.05,
        damping: 0.5,
      },
      stabilization: {
        enabled: true,
        iterations: factionsToShow.length > 20 ? 200 : 300, // 节点多时减少迭代次数
        updateInterval: 25,
      },
      // 性能优化：节点多时降低物理精度
      timestep: factionsToShow.length > 30 ? 0.7 : 0.5,
      adaptiveTimestep: true,
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      zoomView: true,
      dragView: true,
      dragNodes: true,
      navigationButtons: false,
      keyboard: { enabled: true, bindToWindow: false },
    },
  };

  if (network) {
    network.destroy();
    network = null;
  }

  network = new Network(graphContainer.value, { nodes, edges }, options);

  network.on('click', (params: any) => {
    if (params.nodes.length > 0) {
      selectedFaction.value = params.nodes[0];
      showDetailModal.value = true;
    }
  });

  network.on('doubleClick', (params: any) => {
    if (params.nodes.length > 0) {
      network?.focus(params.nodes[0], {
        scale: 1.5,
        animation: { duration: 500, easingFunction: 'easeInOutQuad' },
      });
    }
  });
}

function closeDetailModal() {
  showDetailModal.value = false;
  selectedFaction.value = '';
}

onMounted(async () => {
  await nextTick();
  if (hasData.value) {
    initNetwork();
  }

  if (graphContainer.value) {
    // 使用防抖优化 resize 性能
    const debouncedFit = useDebounceFn(() => {
      if (network) {
        network.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
      }
    }, 200);

    resizeObserver = new ResizeObserver(debouncedFit);
    resizeObserver.observe(graphContainer.value);

    // 使用 IntersectionObserver 检测组件可见性
    const visibilityObserver = new IntersectionObserver(
      entries => {
        isNetworkVisible.value = entries[0].isIntersecting;
        // 不可见时停止物理模拟，可见时恢复
        if (network) {
          if (isNetworkVisible.value) {
            (network as any).physics.options.enabled = true;
            network.stabilize();
          } else {
            (network as any).physics.options.enabled = false;
          }
        }
      },
      { threshold: 0.1 },
    );
    visibilityObserver.observe(graphContainer.value);

    // 组件卸载时断开观察
    onUnmounted(() => {
      visibilityObserver.disconnect();
    });
  }
});

onUnmounted(() => {
  if (network) {
    network.destroy();
    network = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// 使用防抖优化数据变化监听
const debouncedInitNetwork = useDebounceFn(async () => {
  await nextTick();
  if (hasData.value && isNetworkVisible.value) {
    initNetwork();
  }
}, 500);

const theme = computed(() => settingsStore.theme);
watch([hasData, factionRelations, worldNetwork, theme], debouncedInitNetwork, { deep: true });
</script>

<style scoped>
.faction-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-primary);
}

.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
}

.stat-item i {
  color: var(--accent-primary);
}

.stat-label {
  color: var(--text-secondary);
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
}

.stat-value.positive {
  color: var(--accent-success);
}

.stat-value.negative {
  color: var(--accent-danger);
}

.graph-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 12px 12px 8px;
  display: flex;
  flex-direction: column;
}

.faction-graph {
  background: var(--bg-card);
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
  min-height: clamp(260px, 46vh, 420px);
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--text-secondary);
  text-align: center;
}

.empty-state i {
  font-size: calc(64px * var(--ui-font-scale));
  opacity: 0.3;
}

.empty-state h3 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  max-width: 400px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .stats-bar {
    gap: 8px;
    padding: 10px 12px;
  }

  .stat-item {
    min-width: calc(50% - 4px);
  }
}

@media (max-width: 600px) {
  .graph-area {
    padding: 8px;
  }

  .faction-graph {
    padding: 8px;
    min-height: clamp(220px, 50vh, 340px);
  }

  .empty-state {
    gap: 10px;
    padding: 8px;
  }

  .empty-state i {
    font-size: calc(44px * var(--ui-font-scale));
  }

  .empty-state h3 {
    font-size: var(--text-lg);
  }
}
</style>
