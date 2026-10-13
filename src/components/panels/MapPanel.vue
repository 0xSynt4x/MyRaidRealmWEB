<template>
  <div class="map-panel">
    <!-- 顶部：地点规模 + 自动更新开关 / 间隔 + 回忆解析 -->
    <section class="map-toolbar">
      <div class="map-stat">
        <i class="ti ti-map-pin"></i>
        <span class="map-stat-num">{{ mapStore.nodeCount }}</span>
        <span class="map-stat-label">{{ t('map.nodeUnit') }}</span>
      </div>
      <div class="map-stat">
        <i class="ti ti-clock"></i>
        <span class="map-stat-label">{{ updatedAtText }}</span>
      </div>
      <button class="map-refresh" :disabled="refreshDisabled" @click="handleRefresh">
        <i :class="mapStore.isUpdating ? 'ti ti-loader-2 map-spin' : 'ti ti-refresh'"></i>
        <span>{{ mapStore.isUpdating ? t('map.refreshing') : t('map.refresh') }}</span>
      </button>
    </section>

    <section class="map-auto">
      <div class="map-auto-row">
        <span class="map-auto-label">{{ t('map.autoUpdate') }}</span>
        <label class="toggle-switch">
          <input v-model="settingsStore.mapAutoUpdateEnabled" type="checkbox" />
          <span class="toggle-track"></span>
        </label>
        <span class="map-auto-hint">
          {{ settingsStore.mapAutoUpdateEnabled ? t('map.autoUpdateOn') : t('map.autoUpdateOff') }}
        </span>
      </div>
      <div v-if="settingsStore.mapAutoUpdateEnabled" class="map-auto-row">
        <span class="map-auto-label">{{ t('map.interval') }}</span>
        <input
          :value="settingsStore.mapUpdateInterval"
          class="map-number"
          type="number"
          :min="MAP_UPDATE_INTERVAL_MIN"
          :max="MAP_UPDATE_INTERVAL_MAX"
          step="1"
          @change="handleIntervalChange"
        />
        <span class="map-auto-hint">{{ t('map.intervalHint', { count: settingsStore.mapUpdateInterval }) }}</span>
      </div>
      <div v-if="settingsStore.mapAutoUpdateEnabled" class="map-auto-row">
        <span class="map-auto-label">{{ t('map.progress') }}</span>
        <span class="map-auto-hint">{{ t('map.progressHint', { current: mapStore.bodyTurnCount, total: settingsStore.mapUpdateInterval }) }}</span>
      </div>
    </section>

    <p v-if="mapStore.lastError" class="map-error">
      <i class="ti ti-alert-triangle"></i>
      {{ mapStore.lastError }}
    </p>

    <!-- 面包屑：从根到当前查看层 -->
    <section v-if="breadcrumb.length" class="map-crumb">
      <template v-for="(node, index) in breadcrumb" :key="node.id">
        <button
          :class="['map-crumb-item', { active: node.id === viewNode?.id }]"
          @click="openNode(node.id)"
        >
          {{ node.名称 }}
        </button>
        <i v-if="index < breadcrumb.length - 1" class="ti ti-chevron-right map-crumb-sep"></i>
      </template>
    </section>

    <!-- 地图本体 -->
    <section class="map-stage">
      <svg
        ref="svgRef"
        class="map-svg"
        :viewBox="viewBox"
        :style="{ touchAction: zoom > 1 ? 'none' : 'auto' }"
        preserveAspectRatio="xMidYMid meet"
        @wheel.prevent="handleWheel"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
      >
        <defs>
          <pattern id="map-grid-pattern" width="1" height="1" patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 1" class="map-grid-line" />
          </pattern>
        </defs>

        <rect :width="scene.grid.width" :height="scene.grid.height" fill="url(#map-grid-pattern)" />

        <path
          v-for="(line, index) in scene.contours"
          :key="`contour-${index}`"
          class="map-contour"
          :d="toPath(line, false)"
        />

        <path
          v-for="(poly, index) in scene.water"
          :key="`water-${index}`"
          class="map-water"
          :d="toPath(poly, true)"
        />

        <g v-for="road in scene.roads" :key="road.id" class="map-road-group">
          <path class="map-road-outer" :d="toPath(road.points, false)" />
          <path class="map-road-inner" :d="toPath(road.points, false)" />
        </g>

        <g
          v-for="item in scene.footprints"
          :key="item.id"
          class="map-fp-group"
          @click.stop="enterOrSelect(item.id)"
        >
          <rect
            :class="['map-fp', { current: item.isCurrent, selected: item.id === selectedId }]"
            :x="item.x"
            :y="item.y"
            :width="item.width"
            :height="item.height"
            rx="0.18"
          />
          <text
            class="map-fp-label"
            :x="item.x + item.width / 2"
            :y="item.y + item.height / 2"
            :font-size="footprintFontSize"
          >
            {{ shortName(item.name) }}
          </text>
        </g>

        <g v-for="person in scene.people" :key="person.id" class="map-person-group">
          <circle
            :class="['map-person', person.isPlayer ? 'player' : 'npc']"
            :cx="person.x"
            :cy="person.y"
            :r="person.isPlayer ? personRadius * 1.35 : personRadius"
          />
          <text
            class="map-person-label"
            :x="person.x"
            :y="person.y - personRadius * 1.9"
            :font-size="personFontSize"
          >
            {{ person.name }}
          </text>
        </g>
      </svg>

      <div v-if="scene.isEmpty" class="map-empty">
        <i class="ti ti-help-circle"></i>
        <p>{{ t('map.empty') }}</p>
        <p class="map-empty-hint">{{ t('map.emptyHint') }}</p>
      </div>
      <div v-else-if="scene.isSelfView" class="map-empty map-empty-soft">
        <p class="map-empty-hint">{{ t('map.emptyChildren') }}</p>
      </div>

      <div class="map-zoom-bar">
        <button class="map-zoom-btn" :disabled="zoom <= 1" @click="stepZoom(-ZOOM_STEP)">
          <i class="ti ti-minus"></i>
        </button>
        <span class="map-zoom-text">{{ Math.round(zoom * 100) }}%</span>
        <button class="map-zoom-btn" :disabled="zoom >= MAX_ZOOM" @click="stepZoom(ZOOM_STEP)">
          <i class="ti ti-plus"></i>
        </button>
      </div>
    </section>

    <section class="map-legend">
      <span class="map-legend-item"><i class="map-dot player"></i>{{ t('map.legendPlayer') }}</span>
      <span class="map-legend-item"><i class="map-dot npc"></i>{{ t('map.legendNpc') }}</span>
      <span class="map-legend-item"><i class="map-dot building"></i>{{ t('map.legendBuilding') }}</span>
      <span v-if="scene.roads.length" class="map-legend-item"><i class="map-dot road"></i>{{ t('map.legendRoad') }}</span>
    </section>

    <!-- 下一级入口 -->
    <section v-if="viewNode && viewNode.子节点.length" class="map-next">
      <span class="map-next-label">{{ t('map.nextLevel', { level: t(levelLabelKey(viewNode.子节点[0]!.层级)) }) }}</span>
      <div class="map-next-list">
        <button
          v-for="child in viewNode.子节点"
          :key="child.id"
          :class="['map-chip', { active: child.id === selectedId }]"
          @click="openNode(child.id)"
        >
          {{ child.名称 }}
        </button>
      </div>
    </section>

    <!-- 选中详情 -->
    <section class="map-card">
      <div class="map-card-head">
        <i class="ti ti-info-circle"></i>
        <span>{{ t('map.detail') }}</span>
      </div>
      <template v-if="selectedNode">
        <div class="map-detail-title">
          <span class="map-detail-name">{{ selectedNode.名称 }}</span>
          <span class="map-level-tag">{{ t(levelLabelKey(selectedNode.层级)) }}</span>
        </div>
        <p class="map-detail-desc">{{ selectedNode.描述 || t('map.noDescription') }}</p>
        <p class="map-detail-hint">{{ MAP_LEVEL_HINTS[selectedNode.层级] }}</p>
        <div class="map-detail-actions">
          <button
            v-if="selectedNode.子节点.length"
            class="map-detail-btn"
            @click="viewNodeId = selectedNode.id"
          >
            <i class="ti ti-external-link"></i>{{ t('map.enter') }}
          </button>
          <span class="map-detail-meta">{{ t('map.childCount', { count: selectedNode.子节点.length }) }}</span>
        </div>
      </template>
      <p v-else class="map-detail-empty">{{ t('map.noSelection') }}</p>
    </section>

    <!-- 地点索引 -->
    <section class="map-card">
      <div class="map-card-head clickable" @click="indexExpanded = !indexExpanded">
        <i class="ti ti-list"></i>
        <span>{{ t('map.index') }}</span>
        <i :class="['ti', indexExpanded ? 'ti-chevron-up' : 'ti-chevron-down', 'map-card-arrow']"></i>
      </div>
      <div v-if="indexExpanded" class="map-index">
        <button
          v-for="item in indexItems"
          :key="item.node.id"
          :class="['map-index-item', { active: item.node.id === selectedId, current: item.node.id === playerNodeId }]"
          :style="{ paddingLeft: `${6 + item.depth * 12}px` }"
          @click="openNode(item.node.id)"
        >
          <i :class="['ti', levelIcon(item.node.层级)]"></i>
          <span class="map-index-name">{{ item.node.名称 }}</span>
          <i v-if="item.node.id === playerNodeId" class="ti ti-map-pin map-index-here"></i>
        </button>
        <p v-if="!indexItems.length" class="map-detail-empty">{{ t('map.empty') }}</p>
      </div>
    </section>

    <!-- 解析日志 -->
    <section v-if="mapStore.lastRawReply" class="map-card">
      <div class="map-card-head clickable" @click="logExpanded = !logExpanded">
        <i class="ti ti-file-text"></i>
        <span>{{ t('map.log') }}</span>
        <i :class="['ti', logExpanded ? 'ti-chevron-up' : 'ti-chevron-down', 'map-card-arrow']"></i>
      </div>
      <pre v-if="logExpanded" class="map-log">{{ mapStore.lastRawReply }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import { useMessageActions } from '../../composables/useMessageActions';
import { useI18n } from '../../i18n';
import { useMapStore } from '../../stores/map';
import { useMessagesStore } from '../../stores/messages';
import {
  DEFAULT_MAP_UPDATE_INTERVAL,
  MAP_UPDATE_INTERVAL_MAX,
  MAP_UPDATE_INTERVAL_MIN,
  useSettingsStore,
} from '../../stores/settings';
import { useStatDataStore } from '../../stores/statData';
import {
  buildMapScene,
  MAP_LEVEL_HINTS,
  type MapPersonSource,
  type MapPoint,
} from '../../utils/mapLayout';
import { findMapNodeByName, getMapBreadcrumb, type MapLevel, type MapTreeNode } from '../../utils/mapLocationTree';

const mapStore = useMapStore();
const settingsStore = useSettingsStore();
const statDataStore = useStatDataStore();
const messagesStore = useMessagesStore();
const messageActions = useMessageActions();
const { t } = useI18n();
const { data } = storeToRefs(statDataStore);
const { isStandaloneGenerationLocked } = storeToRefs(messagesStore);

// 地图数据只由前端维护，进面板时从会话读一次
onMounted(() => {
  mapStore.initFromSession();
});

const ZOOM_STEP = 0.5;
const MAX_ZOOM = 6;

const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const svgRef = ref<SVGSVGElement | null>(null);
const selectedId = ref<string | null>(null);
const viewNodeId = ref<string | null>(null);
const indexExpanded = ref(true);
const logExpanded = ref(false);

const tree = computed(() => mapStore.tree);

/** 玩家当前所在地点：拿存档里的位置文本去树里找 */
const playerNodeId = computed(() => {
  const positionText = data.value.世界?.空间定位?.当前位置 || '';
  const node = findMapNodeByName(tree.value, positionText);
  return node?.id ?? null;
});

/**
 * 默认打开的层：玩家所在地点。
 *
 * 玩家常常站在最内层（某个房间），那里本来就没有下级可画 —— 这时往上退一层，
 * 画出「他所在的那栋建筑里有哪些房间」，他自己那一间仍然高亮。
 * 一路退到顶都没有可画的下级时，就停回玩家所在地点（面板会把该地点本身画出来）。
 */
const defaultViewNodeId = computed(() => {
  const startId = playerNodeId.value ?? tree.value.根?.id ?? null;
  if (!startId) {
    return null;
  }

  let node = tree.value.节点映射.get(startId) ?? null;
  while (node && node.子节点.length === 0 && node.父级) {
    const parent = tree.value.节点映射.get(node.父级) ?? null;
    if (!parent) {
      break;
    }
    node = parent;
  }

  return node?.id ?? startId;
});

/** 当前查看的层：显式点过的层优先，否则按默认规则 */
const effectiveViewNodeId = computed(() => {
  if (viewNodeId.value && tree.value.节点映射.has(viewNodeId.value)) {
    return viewNodeId.value;
  }
  return defaultViewNodeId.value;
});

const viewNode = computed<MapTreeNode | null>(() => {
  const id = effectiveViewNodeId.value;
  return id ? tree.value.节点映射.get(id) ?? null : null;
});

const selectedNode = computed<MapTreeNode | null>(() => {
  const id = selectedId.value;
  if (id) {
    const node = tree.value.节点映射.get(id);
    if (node) {
      return node;
    }
  }
  return viewNode.value;
});

const breadcrumb = computed(() => {
  const id = effectiveViewNodeId.value;
  return id ? getMapBreadcrumb(tree.value, id) : [];
});

/** 地图上的人物来源：玩家 + 存档里的 NPC */
const peopleSources = computed<MapPersonSource[]>(() => {
  const list: MapPersonSource[] = [];
  const world = data.value.世界;

  list.push({
    id: 'player-current',
    name: data.value.玩家?.姓名 || t('map.legendPlayer'),
    positionText: world?.空间定位?.当前位置 || '',
    isPlayer: true,
    isPresent: true,
  });

  const archives = data.value.人物档案 ?? {};

  for (const [id, npc] of Object.entries(archives)) {
    list.push({
      id,
      name: npc.姓名 || id,
      positionText: npc.个人信息?.当前位置 || '',
      isPlayer: false,
      isPresent: false,
    });
  }

  return list;
});

/**
 * 只画与当前这一层有关的人：玩家永远在；NPC 必须能对上本层的子节点，
 * 或者就站在本层地点上。对不上的不画，免得别的城市的人被撒成本层的随机点。
 */
const visiblePeople = computed<MapPersonSource[]>(() => {
  const node = viewNode.value;

  if (!node) {
    return peopleSources.value.filter(item => item.isPlayer);
  }

  const childIds = new Set(node.子节点.map(child => child.id));

  return peopleSources.value.filter(item => {
    if (item.isPlayer) {
      return true;
    }

    const matched = findMapNodeByName(tree.value, item.positionText);
    if (!matched) {
      return false;
    }

    return childIds.has(matched.id) || matched.id === node.id;
  });
});

const scene = computed(() =>
  buildMapScene({
    currentNode: viewNode.value,
    currentNodeId: playerNodeId.value,
    people: visiblePeople.value,
  }),
);

const viewBox = computed(() => {
  const { width, height } = scene.value.grid;
  const viewWidth = width / zoom.value;
  const viewHeight = height / zoom.value;
  const maxX = Math.max(0, width - viewWidth);
  const maxY = Math.max(0, height - viewHeight);
  const x = Math.min(Math.max(panX.value, 0), maxX);
  const y = Math.min(Math.max(panY.value, 0), maxY);

  return `${x} ${y} ${viewWidth} ${viewHeight}`;
});

/** 字号跟着网格宽度走，缩放后仍然读得清 */
const footprintFontSize = computed(() => Math.max(0.42, scene.value.grid.width / 48));
const personFontSize = computed(() => Math.max(0.36, scene.value.grid.width / 62));
const personRadius = computed(() => Math.max(0.22, scene.value.grid.width / 130));

/** 地点索引：把树拍平成一列，用缩进表示层级 */
const indexItems = computed(() => {
  const out: { node: MapTreeNode; depth: number }[] = [];

  const walk = (node: MapTreeNode) => {
    out.push({ node, depth: node.深度 });
    for (const child of node.子节点) {
      walk(child);
    }
  };

  if (tree.value.根) {
    walk(tree.value.根);
  }

  return out;
});

const refreshDisabled = computed(() => mapStore.isUpdating || isStandaloneGenerationLocked.value);

const updatedAtText = computed(() => {
  if (!mapStore.updatedAt) {
    return t('map.neverUpdated');
  }

  const date = new Date(mapStore.updatedAt);

  if (Number.isNaN(date.getTime())) {
    return t('map.neverUpdated');
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}/${day} ${hour}:${minute}`;
});

function shortName(name: string): string {
  return name.length > 6 ? `${name.slice(0, 6)}…` : name;
}

function toPath(points: MapPoint[], close: boolean): string {
  if (!points.length) {
    return '';
  }

  const head = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
  const body = points
    .slice(1)
    .map(point => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return `${head} ${body}${close ? ' Z' : ''}`.trim();
}

function levelLabelKey(level: MapLevel): string {
  return `map.level.${level}`;
}

function levelIcon(level: MapLevel): string {
  // 只用在 tabler-inline.css 的 188 个子集里真实存在的图标。子集没有
  // map / home / road / door / compass / route 这些，硬写 className 只会
  // 渲染成空白方框（侧边栏那个「地图」图标不显示就是这么来的）。
  if (level === '世界') return 'ti ti-world';
  if (level === '区域') return 'ti ti-tower';
  if (level === '城市') return 'ti ti-building';
  if (level === '街区') return 'ti ti-stack';
  if (level === '建筑') return 'ti ti-building-bank';
  return 'ti ti-door-enter';
}

/** 点节点：选中它看详情，同时把地图切到它的父层（能看到它自己） */
function openNode(nodeId: string) {
  selectedId.value = nodeId;
  viewNodeId.value = nodeId;
  resetView();
}

/**
 * 点地图上的方块：有下级就切进那一层，没有下级（最内层房间）就只选中看详情。
 * 这样「点方块」和面包屑、索引、下一级 chips 的行为一致 —— 都是切入下一层。
 */
function enterOrSelect(nodeId: string) {
  const node = tree.value.节点映射.get(nodeId);

  if (node?.子节点.length) {
    openNode(nodeId);
    return;
  }

  selectNode(nodeId);
}

function selectNode(nodeId: string) {
  selectedId.value = nodeId;
}

function resetView() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function stepZoom(delta: number) {
  const next = Math.min(MAX_ZOOM, Math.max(1, Number((zoom.value + delta).toFixed(2))));

  if (next === zoom.value) {
    return;
  }

  // 以视图中心为锚点缩放
  const before = zoom.value;
  const width = scene.value.grid.width;
  const height = scene.value.grid.height;
  const centerX = panX.value + width / before / 2;
  const centerY = panY.value + height / before / 2;

  zoom.value = next;
  panX.value = centerX - width / next / 2;
  panY.value = centerY - height / next / 2;
}

function handleWheel(event: WheelEvent) {
  const rect = svgRef.value?.getBoundingClientRect();
  const before = zoom.value;
  const next = Math.min(MAX_ZOOM, Math.max(1, Number((before + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)).toFixed(2))));

  if (next === before) {
    return;
  }

  const width = scene.value.grid.width;
  const height = scene.value.grid.height;

  if (rect) {
    const ratioX = (event.clientX - rect.left) / rect.width;
    const ratioY = (event.clientY - rect.top) / rect.height;
    const anchorX = panX.value + ratioX * (width / before);
    const anchorY = panY.value + ratioY * (height / before);

    zoom.value = next;
    panX.value = anchorX - ratioX * (width / next);
    panY.value = anchorY - ratioY * (height / next);
    return;
  }

  zoom.value = next;
}

let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartPanX = 0;
let dragStartPanY = 0;

function handlePointerDown(event: PointerEvent) {
  if (zoom.value <= 1) {
    return;
  }

  dragging = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStartPanX = panX.value;
  dragStartPanY = panY.value;

  try {
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
  } catch {
    // 个别浏览器不支持指针捕获，忽略即可
  }
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging) {
    return;
  }

  const rect = svgRef.value?.getBoundingClientRect();

  if (!rect) {
    return;
  }

  const width = scene.value.grid.width / zoom.value;
  const height = scene.value.grid.height / zoom.value;

  panX.value = dragStartPanX - ((event.clientX - dragStartX) / rect.width) * width;
  panY.value = dragStartPanY - ((event.clientY - dragStartY) / rect.height) * height;
}

function handlePointerUp(event: PointerEvent) {
  if (!dragging) {
    return;
  }

  dragging = false;

  try {
    (event.currentTarget as SVGSVGElement).releasePointerCapture(event.pointerId);
  } catch {
    // 同上
  }
}

function handleIntervalChange(event: Event) {
  const raw = Number((event.target as HTMLInputElement).value);
  const value = Number.isFinite(raw) ? Math.round(raw) : DEFAULT_MAP_UPDATE_INTERVAL;
  const clamped = Math.min(MAP_UPDATE_INTERVAL_MAX, Math.max(MAP_UPDATE_INTERVAL_MIN, value));

  settingsStore.mapUpdateInterval = clamped;
  (event.target as HTMLInputElement).value = String(clamped);
}

async function handleRefresh() {
  await messageActions.sendStandaloneMapUpdate();
}

// 换一层就把视角复位，免得上一层的缩放位置带过来
watch(effectiveViewNodeId, () => {
  resetView();
});
</script>

<style scoped>
.map-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.map-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-md);
}

.map-stat {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.map-stat i {
  font-size: calc(15px * var(--ui-font-scale));
  color: var(--accent-primary);
}

.map-stat-num {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.map-refresh {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.14);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.35);
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
  transition: background var(--motion-fast);
}

.map-refresh:hover:not(:disabled) {
  background: rgba(var(--accent-primary-rgb), 0.24);
}

.map-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.map-spin {
  animation: map-spin 1s linear infinite;
}

@keyframes map-spin {
  to {
    transform: rotate(360deg);
  }
}

.map-auto {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-md);
}

.map-auto-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.map-auto-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  min-width: 68px;
}

.map-auto-hint {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--card-border);
  border-radius: 22px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-track::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary);
  box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.3);
}

.toggle-switch input:checked + .toggle-track::before {
  transform: translateX(18px);
}

.map-number {
  width: 68px;
  padding: 4px 8px;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--input-bg, var(--card-border));
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
  outline: none;
}

.map-number:focus {
  border-color: rgba(var(--accent-primary-rgb), 0.5);
}

.map-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 12px;
  font-size: var(--text-xs);
  color: var(--danger, #e06c75);
  background: rgba(224, 108, 117, 0.1);
  border: 1px solid rgba(224, 108, 117, 0.3);
  border-radius: var(--ui-radius-sm);
}

.map-crumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-sm);
}

.map-crumb-item {
  padding: 3px 8px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
  transition: color var(--motion-fast), background var(--motion-fast);
}

.map-crumb-item:hover {
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
}

.map-crumb-item.active {
  color: var(--accent-primary);
  font-weight: 600;
  background: rgba(var(--accent-primary-rgb), 0.16);
}

.map-crumb-sep {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-tertiary);
}

.map-stage {
  position: relative;
  background: var(--map-bg, rgba(0, 0, 0, 0.28));
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-md);
  overflow: hidden;
}

.map-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 52vh;
  cursor: grab;
  user-select: none;
}

.map-svg:active {
  cursor: grabbing;
}

.map-grid-line {
  fill: none;
  stroke: rgba(146, 64, 14, 0.28);
  stroke-width: 0.03;
}

.map-contour {
  fill: none;
  stroke: rgba(146, 64, 14, 0.42);
  stroke-width: 0.045;
  stroke-dasharray: 0.5 0.4;
}

.map-water {
  fill: rgba(79, 175, 211, 0.32);
  stroke: rgba(79, 175, 211, 0.55);
  stroke-width: 0.06;
}

.map-road-outer {
  fill: none;
  stroke: rgba(8, 8, 7, 0.8);
  stroke-width: 0.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.map-road-inner {
  fill: none;
  stroke: rgba(214, 176, 84, 0.62);
  stroke-width: 0.075;
  stroke-dasharray: 0.34 0.22;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.map-fp-group {
  cursor: pointer;
}

.map-fp {
  fill: rgba(245, 231, 198, 0.5);
  stroke: rgba(146, 64, 14, 0.75);
  stroke-width: 0.06;
  transition: fill var(--motion-fast);
}

.map-fp-group:hover .map-fp {
  fill: rgba(245, 158, 11, 0.34);
}

.map-fp.current {
  fill: rgba(64, 200, 112, 0.36);
  stroke: rgba(64, 200, 112, 0.9);
}

.map-fp.selected {
  fill: rgba(245, 196, 50, 0.42);
  stroke: rgba(249, 217, 118, 0.95);
  stroke-width: 0.1;
}

.map-fp-label {
  fill: var(--text-primary, #f5ebd6);
  text-anchor: middle;
  dominant-baseline: central;
  font-weight: 600;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.78);
  stroke-width: 0.11;
  pointer-events: none;
}

.map-person {
  stroke: rgba(0, 0, 0, 0.6);
  stroke-width: 0.05;
}

.map-person.player {
  fill: rgba(249, 217, 118, 0.96);
}

.map-person.npc {
  fill: rgba(196, 181, 253, 0.88);
}

.map-person-label {
  fill: var(--text-secondary, #d8cfc0);
  text-anchor: middle;
  font-weight: 500;
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.78);
  stroke-width: 0.1;
  pointer-events: none;
}

.map-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 16px;
  color: var(--text-secondary);
  pointer-events: none;
}

.map-empty i {
  font-size: calc(30px * var(--ui-font-scale));
  opacity: 0.5;
}

.map-empty p {
  margin: 0;
  font-size: var(--text-sm);
}

.map-empty-hint {
  font-size: var(--text-xs);
  opacity: 0.75;
}

/* 「这一层没下级」：只提示一句，不挡画面 */
.map-empty-soft {
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px 12px;
  gap: 0;
}

.map-empty-soft .map-empty-hint {
  font-size: var(--text-xs);
  opacity: 0.6;
}

.map-zoom-bar {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px;
  background: var(--glass-bg-heavy, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--glass-border);
  border-radius: var(--ui-radius-sm);
  backdrop-filter: blur(6px);
}

.map-zoom-btn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  background: transparent;
  border: none;
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
}

.map-zoom-btn:hover:not(:disabled) {
  background: rgba(var(--accent-primary-rgb), 0.2);
}

.map-zoom-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.map-zoom-text {
  min-width: 40px;
  text-align: center;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.map-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.map-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.map-dot.player {
  background: rgba(249, 217, 118, 0.96);
}

.map-dot.npc {
  background: rgba(196, 181, 253, 0.88);
}

.map-dot.building {
  border-radius: 2px;
  background: rgba(245, 231, 198, 0.6);
  border: 1px solid rgba(146, 64, 14, 0.8);
}

.map-dot.road {
  width: 12px;
  height: 3px;
  border-radius: 2px;
  background: rgba(214, 176, 84, 0.7);
}

.map-next {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.map-next-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.map-next-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.map-chip {
  padding: 4px 10px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all var(--motion-fast);
}

.map-chip:hover {
  color: var(--text-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.5);
}

.map-chip.active {
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.6);
  background: rgba(var(--accent-primary-rgb), 0.14);
}

.map-card {
  padding: 10px 12px;
  background: var(--card-bg-strong);
  border: 1px solid var(--card-border);
  border-radius: var(--ui-radius-md);
}

.map-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.map-card-head i {
  color: var(--accent-primary);
}

.map-card-head.clickable {
  cursor: pointer;
}

.map-card-arrow {
  margin-left: auto;
  color: var(--text-tertiary) !important;
}

.map-detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.map-detail-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.map-level-tag {
  padding: 2px 8px;
  font-size: calc(10px * var(--ui-font-scale));
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.14);
  border-radius: 999px;
}

.map-detail-desc {
  margin: 6px 0 0;
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--text-secondary);
}

.map-detail-hint {
  margin: 4px 0 0;
  font-size: calc(10px * var(--ui-font-scale));
  color: var(--text-tertiary);
}

.map-detail-actions {  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.map-detail-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  font-size: var(--text-xs);
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.14);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.35);
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
}

.map-detail-btn:hover {
  background: rgba(var(--accent-primary-rgb), 0.24);
}

.map-detail-meta {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-tertiary);
}

.map-detail-empty {
  margin: 8px 0 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

.map-index {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.map-index-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: var(--ui-radius-sm);
  cursor: pointer;
  text-align: left;
  transition: background var(--motion-fast), color var(--motion-fast);
}

.map-index-item:hover {
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.map-index-item.active {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.16);
}

.map-index-item.current {
  font-weight: 600;
}

.map-index-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.map-index-here {
  margin-left: auto;
  color: rgba(64, 200, 112, 0.95);
}

.map-log {
  margin: 8px 0 0;
  padding: 8px;
  max-height: 220px;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: calc(10px * var(--ui-font-scale));
  line-height: 1.5;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.28);
  border-radius: var(--ui-radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .map-svg {
    max-height: 44vh;
  }

  .map-toolbar,
  .map-auto {
    padding: 8px 10px;
  }
}
</style>
