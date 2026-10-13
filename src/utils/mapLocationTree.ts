/**
 * 地图地点树：把「地图模型」返回的扁平地点列表整理成一棵可渲染的树。
 *
 * 模型只负责给结构（名称 / 层级 / 父级 / 描述），坐标、摆放、道路全部由前端算。
 * 这里做三件事：层级归一、重名合并、父子关系容错 —— 模型偶尔会写错层级名、
 * 挂错父级或重复同一个地点，不能让这些把整张地图带崩。
 */

/** 六档层级，由大到小。这是显示在地图界面上的名字，改动会直接改变界面文案。 */
export const MAP_LEVELS = ['世界', '区域', '城市', '街区', '建筑', '房间'] as const;

export type MapLevel = (typeof MAP_LEVELS)[number];

/** 层级深度：世界 0，房间 5。用来排序、判断「下一层是什么」。 */
export const MAP_LEVEL_DEPTH: Record<MapLevel, number> = {
  世界: 0,
  区域: 1,
  城市: 2,
  街区: 3,
  建筑: 4,
  房间: 5,
};

/** 每层网格尺寸（格数）。层级越大越宏观，网格越大。 */
export const MAP_LEVEL_GRID: Record<MapLevel, { width: number; height: number }> = {
  世界: { width: 48, height: 36 },
  区域: { width: 42, height: 32 },
  城市: { width: 34, height: 28 },
  街区: { width: 28, height: 24 },
  建筑: { width: 24, height: 20 },
  房间: { width: 20, height: 16 },
};

/** 每个节点是一个地点。字段与给模型的数据契约一一对应。 */
export type MapNode = {
  名称: string;
  层级: string;
  父级: string;
  描述: string;
};

export type MapTreeNode = {
  /** 名称即 ID：名称在树里全局唯一，用它做键最省事 */
  id: string;
  名称: string;
  层级: MapLevel;
  父级: string;
  描述: string;
  /** 直接子节点，已按层级与名称排好序 */
  子节点: MapTreeNode[];
  /** 从根到自己的层级深度 */
  深度: number;
};

export type MapTree = {
  /** 根节点；空树时为 null */
  根: MapTreeNode | null;
  /** 深度优先展开的全部节点 */
  节点列表: MapTreeNode[];
  /** 名称 → 节点 */
  节点映射: Map<string, MapTreeNode>;
};

/** 空树：会话里还没有任何地点数据时用它，避免各处判空。 */
export const EMPTY_MAP_TREE: MapTree = {
  根: null,
  节点列表: [],
  节点映射: new Map(),
};

/**
 * 把模型写的层级名归一到六档。模型偶尔会写「大区」「城镇」「室内」这类近义词，
 * 按关键词兜底推断；完全不认识的一律当「建筑」——挂错层比整条丢掉损失小。
 */
export function normalizeMapLevel(value: unknown): MapLevel {
  const text = String(value ?? '').trim();

  if ((MAP_LEVELS as readonly string[]).includes(text)) {
    return text as MapLevel;
  }

  if (/世界|位面|宇宙|星海|诸天|大陆架/.test(text)) return '世界';
  if (/区域|大区|大洲|洲|省|州|郡|国|星区|星域|版图|疆域/.test(text)) return '区域';
  if (/城市|城镇|城池|城|镇|村|基地|站点|据点|驻地|门派|宗门|坊市/.test(text)) return '城市';
  if (/街区|城区|片区|街道|郊野|郊外|厂区|园区|楼层|区域带/.test(text)) return '街区';
  if (/建筑|地标|客栈|宅院|店铺|厂房|舱室|庙宇|楼|阁|堂|殿|院|馆|铺|坊/.test(text)) {
    return '建筑';
  }
  if (/房间|室内|屋内|卧室|办公室|仓库|大厅|密室|客房|厢房|居室/.test(text)) return '房间';

  return '建筑';
}

/** 稳定哈希（FNV-1a）：同一个名字每次都落在同一个位置，刷新不会乱跳。 */
export function stableHash(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * 清洗模型返回的原始节点：去空名、层级归一、去掉自指父级、按名称去重。
 *
 * 重名时保留描述最长的那条（信息最全），并把它的父级尽量补全 ——
 * 被丢掉的那条如果挂着子节点，子节点的父级仍然指向这个名字，所以合并是安全的。
 */
export function sanitizeMapNodes(input: unknown): MapNode[] {
  if (!Array.isArray(input)) {
    return [];
  }

  // 这里用归一后的层级类型存，后面的合并与建树都直接按六档处理
  const merged = new Map<string, { 名称: string; 层级: MapLevel; 父级: string; 描述: string }>();

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }

    const record = raw as Record<string, unknown>;
    const 名称 = String(record['名称'] ?? record['name'] ?? '').trim();

    if (!名称) {
      continue;
    }

    const 层级 = normalizeMapLevel(record['层级'] ?? record['level']);
    const 父级原文 = String(record['父级'] ?? record['parent'] ?? '').trim();
    const 父级 = 父级原文 === 名称 ? '' : 父级原文;
    const 描述 = String(record['描述'] ?? record['description'] ?? '').trim();

    const existing = merged.get(名称);

    if (!existing) {
      merged.set(名称, { 名称, 层级, 父级, 描述 });
      continue;
    }

    merged.set(名称, {
      名称,
      层级: MAP_LEVEL_DEPTH[层级] < MAP_LEVEL_DEPTH[existing.层级] ? 层级 : existing.层级,
      父级: existing.父级 || 父级,
      描述: 描述.length > existing.描述.length ? 描述 : existing.描述,
    });
  }

  return [...merged.values()];
}

/**
 * 由扁平节点列表建树。
 *
 * 容错三连：父级找不到就往上找最近的祖先挂靠（不留悬空）；层级比父级浅一档以上时
 * 按父级层级下推一档（修「跨级挂载」）；多个根时保留层级最浅的一个，其余挂到它下面。
 */
export function buildMapTree(input: unknown): MapTree {
  const nodes = sanitizeMapNodes(input);

  if (nodes.length === 0) {
    return EMPTY_MAP_TREE;
  }

  const byName = new Map<string, MapTreeNode>();

  for (const node of nodes) {
    // 走到这里的节点层级已经归一过，再收一次口是为了让类型系统也认这件事
    const 层级 = normalizeMapLevel(node.层级);

    byName.set(node.名称, {
      id: node.名称,
      名称: node.名称,
      层级,
      父级: node.父级,
      描述: node.描述,
      子节点: [],
      深度: MAP_LEVEL_DEPTH[层级],
    });
  }

  const roots: MapTreeNode[] = [];

  for (const node of byName.values()) {
    const parent = node.父级 ? byName.get(node.父级) : undefined;

    if (!parent || parent === node) {
      // 没有父级或父级不存在 → 当成根候选
      if (node.父级) {
        node.父级 = '';
      }
      roots.push(node);
      continue;
    }

    // 跨级挂载修正：子节点层级必须比父级深，且不深过一档以上
    const expectedDepth = MAP_LEVEL_DEPTH[parent.层级] + 1;
    if (MAP_LEVEL_DEPTH[node.层级] !== expectedDepth) {
      const corrected = MAP_LEVELS[Math.min(expectedDepth, MAP_LEVELS.length - 1)]!;
      node.层级 = corrected;
    }

    parent.子节点.push(node);
  }

  roots.sort((left, right) => {
    if (left.层级 !== right.层级) {
      return MAP_LEVEL_DEPTH[left.层级] - MAP_LEVEL_DEPTH[right.层级];
    }
    return left.名称.localeCompare(right.名称, 'zh-Hans-CN');
  });

  const 根 = roots[0] ?? null;

  // 有多个根：把层级最浅的当根，其余挂上去，避免地图出现互不相连的孤岛
  if (根) {
    for (let index = 1; index < roots.length; index += 1) {
      const extra = roots[index]!;
      extra.父级 = 根.名称;
      if (MAP_LEVEL_DEPTH[extra.层级] <= MAP_LEVEL_DEPTH[根.层级]) {
        const correctedDepth = Math.min(MAP_LEVEL_DEPTH[根.层级] + 1, MAP_LEVELS.length - 1);
        extra.层级 = MAP_LEVELS[correctedDepth]!;
      }
      根.子节点.push(extra);
    }
  }

  const 节点列表: MapTreeNode[] = [];

  const walk = (node: MapTreeNode, depth: number) => {
    node.深度 = depth;
    node.子节点.sort((left, right) => left.名称.localeCompare(right.名称, 'zh-Hans-CN'));
    节点列表.push(node);

    for (const child of node.子节点) {
      walk(child, depth + 1);
    }
  };

  if (根) {
    walk(根, 0);
  }

  return { 根, 节点列表, 节点映射: byName };
}

/** 从根到目标节点的路径（含两端）；找不到时返回空数组。 */
export function getMapBreadcrumb(tree: MapTree, nodeId: string): MapTreeNode[] {
  const target = tree.节点映射.get(nodeId);

  if (!target) {
    return [];
  }

  const chain: MapTreeNode[] = [];
  const visited = new Set<string>();
  let cursor: MapTreeNode | undefined = target;

  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    chain.unshift(cursor);
    cursor = cursor.父级 ? tree.节点映射.get(cursor.父级) : undefined;
  }

  return chain;
}

/** 目标节点所在的层级列表（同父级的兄弟，含自己）；没有父级时返回根。 */
export function getMapSiblings(tree: MapTree, nodeId: string): MapTreeNode[] {
  const target = tree.节点映射.get(nodeId);

  if (!target) {
    return tree.根 ? [tree.根] : [];
  }

  if (!target.父级) {
    return [target];
  }

  const parent = tree.节点映射.get(target.父级);

  return parent ? parent.子节点 : [target];
}

/** 按名称找节点，支持「一方包含另一方」的宽松匹配（NPC 位置文本常常带修饰语）。 */
export function findMapNodeByName(tree: MapTree, name: string): MapTreeNode | null {
  const target = String(name ?? '').trim();

  if (!target) {
    return null;
  }

  const exact = tree.节点映射.get(target);
  if (exact) {
    return exact;
  }

  const normalized = target.replace(/\s+/g, '').toLowerCase();

  for (const node of tree.节点列表) {
    const candidate = node.名称.replace(/\s+/g, '').toLowerCase();

    if (candidate === normalized) {
      return node;
    }
  }

  // 宽松命中：一方长度 ≥2 且被另一方包含。先找最长的候选，避免「东街」命中「东街口」
  let best: MapTreeNode | null = null;

  for (const node of tree.节点列表) {
    const candidate = node.名称.replace(/\s+/g, '').toLowerCase();

    if (candidate.length < 2 && normalized.length < 2) {
      continue;
    }

    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      if (!best || node.名称.length > best.名称.length) {
        best = node;
      }
    }
  }

  return best;
}

const MAP_DATA_BLOCK_REGEX = /<地图数据>([\s\S]*?)<\/地图数据>/i;
/** 模型偶尔会漏掉闭合标签，这里兜一层「只给了开标签」的情况。 */
const MAP_DATA_OPEN_ONLY_REGEX = /<地图数据>([\s\S]*)$/i;
const JSON_ARRAY_REGEX = /\[[\s\S]*\]/;

/**
 * 从模型回复里抽出 `<地图数据>` 里的 JSON 数组。
 *
 * 三级兜底：完整标签 → 只有开标签 → 直接在全文里找最外层数组。
 * 解析失败时返回空数组与错误说明，调用方据此换下一个候选 API。
 */
export function parseMapDataBlock(rawReply: string): { nodes: MapNode[]; errorMessage: string } {
  const text = String(rawReply ?? '');

  const blockMatch =
    text.match(MAP_DATA_BLOCK_REGEX) ?? text.match(MAP_DATA_OPEN_ONLY_REGEX) ?? null;

  const payload = (blockMatch?.[1] ?? text).trim();
  const arrayMatch = payload.match(JSON_ARRAY_REGEX);
  const jsonText = (arrayMatch?.[0] ?? payload).trim();

  if (!jsonText) {
    return { nodes: [], errorMessage: '回复里没有地图数据' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { nodes: [], errorMessage: `地图数据不是合法 JSON（${message}）` };
  }

  const nodes = sanitizeMapNodes(parsed);

  if (nodes.length === 0) {
    return { nodes: [], errorMessage: '地图数据里没有任何地点' };
  }

  return { nodes, errorMessage: '' };
}
