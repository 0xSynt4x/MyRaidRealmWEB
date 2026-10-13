/**
 * 地图布局：把地点树的一层节点，算成一张可渲染的场景。
 *
 * 模型只给「谁属于谁」，这里负责「谁画在哪」。全部结果由名称哈希决定，
 * 因此同一份地点数据每次渲染都长一样，刷新不会乱跳。
 *
 * 摆位分两步：先按层级栅格 + 哈希摆一版，再跑重叠松弛（撞一起的沿最小
 * 平移方向各退一半），保证任何面积下建筑两两不压。路网分三种：房间层
 * 无路、聚落层走行 / 列之间的空隙中线、其余走绕建筑的 A* 寻路 ——
 * 三种都不会从建筑面上压过去。
 */
import {
  MAP_LEVEL_DEPTH,
  MAP_LEVEL_GRID,
  stableHash,
  type MapLevel,
  type MapTreeNode,
} from './mapLocationTree';

export type MapPoint = { x: number; y: number };

/** 建筑 / 房间在地图上的占位（正矩形，渲染成带描边的面）。 */
export type MapFootprint = {
  id: string;
  name: string;
  层级: MapLevel;
  描述: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 入口位置：道路从这里接出去，人物也常落在这附近 */
  入口: MapPoint;
  /** 当前玩家所在的那一栋，渲染时高亮 */
  isCurrent: boolean;
};

export type MapRoadKind = '主路' | '街' | '巷' | '小径';

export type MapRoad = {
  id: string;
  name: string;
  kind: MapRoadKind;
  points: MapPoint[];
};

/** 人物落点。玩家与 NPC 都在这里，靠 isPlayer / isCurrent 区分渲染样式。 */
export type MapPerson = {
  id: string;
  name: string;
  x: number;
  y: number;
  isPlayer: boolean;
  isCurrent: boolean;
  /** 命中的地点节点 id；没命中时为 null（散落在空白处） */
  nodeId: string | null;
};

export type MapScene = {
  grid: { width: number; height: number };
  /** 只画在本层的节点；当前层自己没有面，所以是子节点 */
  footprints: MapFootprint[];
  roads: MapRoad[];
  people: MapPerson[];
  /** 野外 / 郊野层的等高线装饰 */
  contours: MapPoint[][];
  /** 水体装饰（多边形） */
  water: MapPoint[][];
  /** 本层一个子节点都没有 */
  isEmpty: boolean;
  /** 本层没下级，画的是它自己一个方块（最内层房间的常态） */
  isSelfView: boolean;
};

/** 人物来源：由调用方从存档里取，地图这边不关心它怎么存的。 */
export type MapPersonSource = {
  id: string;
  name: string;
  /** 自由文本位置，用来跟节点名做匹配 */
  positionText: string;
  isPlayer: boolean;
  isPresent: boolean;
};

const EMPTY_POINT: MapPoint = { x: 0, y: 0 };

/** 把坐标夹进网格内，四周留出边距 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 归一化文本：去所有空白 + 转小写。位置匹配的通用口径。 */
function normalizeText(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** 两个位置文本是否互相命中：相等，或一方长度 ≥2 且被另一方包含。 */
function textHits(left: string, right: string): boolean {
  const a = normalizeText(left);
  const b = normalizeText(right);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (a.length >= 2 && b.includes(a)) {
    return true;
  }

  return b.length >= 2 && a.includes(b);
}

/**
 * 把人物位置文本拆成候选片段：原文 + 按层级分隔符切分。
 * 存档里常见写法是「中原 > 青石镇 > 悦来客栈」，拆开才好逐段比对。
 */
function splitPositionText(value: string): string[] {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return [];
  }

  const parts = raw
    .split(/[>＞/\\|,，、;；]+/u)
    .map(part => part.trim())
    .filter(Boolean);

  return [raw, ...parts];
}

/** 判断某层是否「野外 / 郊野」：名字带这些字就加等高线与水体装饰。 */
function isWildernessLevel(name: string, level: MapLevel): boolean {
  if (level === '建筑' || level === '房间') {
    return false;
  }

  return /野外|郊外|郊野|山|岭|峰|谷|坡|崖|林|溪|河|湖|海|荒|原|漠|泽|丘|岛|野/.test(name);
}

/** 网格内边距：盒子再大也不贴边，四周永远留一条可供通行的空地。 */
const BOX_MARGIN = 0.4;

/**
 * 每个子层级对应的盒子间隙：越往内层（房间）缝越窄，聚落层留出街巷宽度。
 * 间隙也决定「这一层能塞多少个方块还看得清」。
 */
const LEVEL_GAPS: Record<MapLevel, number> = {
  世界: 0.6,
  区域: 0.6,
  城市: 0.55,
  街区: 0.5,
  建筑: 0.45,
  房间: 0.22,
};

/** 占位面的最小几何信息：左上角 + 尺寸，附带中心点（松弛迭代要频繁用）。 */
type MapBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

/** 把面上带的矩形转成几何盒。 */
function toBoxes(footprints: MapFootprint[]): MapBox[] {
  return footprints.map(item => ({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    cx: item.x + item.width / 2,
    cy: item.y + item.height / 2,
  }));
}

/** 把几何盒夹回网格内；盒子比网格还大时只能居中。 */
function clampBox(box: MapBox, gridWidth: number, gridHeight: number): void {
  const minX = box.width / 2 + BOX_MARGIN;
  const maxX = gridWidth - box.width / 2 - BOX_MARGIN;
  box.cx = minX <= maxX ? clamp(box.cx, minX, maxX) : gridWidth / 2;

  const minY = box.height / 2 + BOX_MARGIN;
  const maxY = gridHeight - box.height / 2 - BOX_MARGIN;
  box.cy = minY <= maxY ? clamp(box.cy, minY, maxY) : gridHeight / 2;

  box.x = box.cx - box.width / 2;
  box.y = box.cy - box.height / 2;
}

/** 任意两个盒子之间还有没有压叠（含 gap 余量）。 */
function hasOverlap(boxes: MapBox[], gap: number): boolean {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const dx = (a.width + b.width) / 2 + gap - Math.abs(a.cx - b.cx);
      const dy = (a.height + b.height) / 2 + gap - Math.abs(a.cy - b.cy);

      if (dx > 0 && dy > 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 松弛迭代：撞在一起的盒子沿「错开量更小的那个方向」各退一半。
 *
 * 遍历顺序固定（就按摆位顺序），同样的输入跑出同样的结果，刷新不跳。
 */
function relaxBoxes(boxes: MapBox[], gridWidth: number, gridHeight: number, gap: number): void {
  for (let pass = 0; pass < 32; pass += 1) {
    let moved = false;

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const dx = (a.width + b.width) / 2 + gap - Math.abs(a.cx - b.cx);
        const dy = (a.height + b.height) / 2 + gap - Math.abs(a.cy - b.cy);

        if (dx <= 0 || dy <= 0) {
          continue;
        }

        if (dx < dy) {
          const dir = a.cx <= b.cx ? -1 : 1;
          a.cx += (dx / 2) * dir;
          b.cx -= (dx / 2) * dir;
        } else {
          const dir = a.cy <= b.cy ? -1 : 1;
          a.cy += (dy / 2) * dir;
          b.cy -= (dy / 2) * dir;
        }

        moved = true;
      }
    }

    for (const box of boxes) {
      clampBox(box, gridWidth, gridHeight);
    }

    if (!moved) {
      break;
    }
  }
}

/**
 * 摆位：把 n 个节点放进网格，当前节点排在最前。
 *
 * 分格 → 重叠松弛。松弛迭代保证「两两不压」：撞一起的沿最小平移方向各退一半，
 * 一轮推不开就按比例整体缩窗（5 档），直到没有重叠为止。
 * 盒子之间留的间隙随层级变化：房间缝最窄（一层能容纳更多间），
 * 建筑 / 街区留出街巷宽度，其它层级取中间值。
 */
function layoutFootprints(
  nodes: MapTreeNode[],
  gridWidth: number,
  gridHeight: number,
  currentNodeId: string | null,
  childLevel: MapLevel,
): MapFootprint[] {
  const count = nodes.length;

  if (count === 0) {
    return [];
  }

  // 当前玩家所在的那个节点排最前，其余按稳定哈希排 —— 顺序稳定，位置才稳定
  const ordered = [...nodes].sort((left, right) => {
    const leftCurrent = left.id === currentNodeId ? 0 : 1;
    const rightCurrent = right.id === currentNodeId ? 0 : 1;

    if (leftCurrent !== rightCurrent) {
      return leftCurrent - rightCurrent;
    }

    return stableHash(left.id) - stableHash(right.id);
  });

  const usableWidth = gridWidth - 2;
  const usableHeight = gridHeight - 2;
  const cols = Math.max(1, Math.min(Math.ceil(Math.sqrt((count * usableWidth) / usableHeight)), 6));
  const rows = Math.max(1, Math.ceil(count / cols));

  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;

  // 房间铺满、留窄缝；建筑留出街巷宽度
  const isRoom = childLevel === '房间';

  // 先按格子中心摆一版，再松弛解算
  const boxes: MapBox[] = ordered.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: 1 + cellWidth * col,
      y: 1 + cellHeight * row,
      width: cellWidth,
      height: cellHeight,
      cx: 1 + cellWidth * (col + 0.5),
      cy: 1 + cellHeight * (row + 0.5),
    };
  });

  // 平面占比：盒子在小格里也能留出缝，不会把整格塞满
  const ratios = { width: isRoom ? 0.62 : 0.5, height: isRoom ? 0.58 : 0.5 };
  let gap = isRoom ? 0.22 : LEVEL_GAPS[childLevel];

  // 正常宽度下推不开的才缩窗，且最多缩到比 1 个原盒还小为止
  for (const scale of [1, 0.95, 0.9, 0.85, 0.8]) {
    for (const box of boxes) {
      const w = cellWidth * ratios.width * scale;
      const h = cellHeight * ratios.height * scale;
      box.width = Math.max(1.2, w);
      box.height = Math.max(1.2, h);
      box.cx += (cellWidth - box.width) / 2;
      box.cy += (cellHeight - box.height) / 2;
    }

    relaxBoxes(boxes, gridWidth, gridHeight, gap);

    if (!hasOverlap(boxes, gap * 0.5)) {
      break;
    }

    gap *= 0.75;
  }

  return boxes.map((box, index) => {
    const node = ordered[index]!;

    // 入口开在朝向地图中心的那条边上，道路看起来是往里收的
    const towardCenter = box.cx < gridWidth / 2 ? 'left' : 'right';

    const 入口: MapPoint =
      towardCenter === 'left'
        ? { x: box.x, y: box.cy }
        : { x: box.x + box.width, y: box.cy };

    return {
      id: node.id,
      name: node.名称,
      层级: node.层级,
      描述: node.描述,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      入口,
      isCurrent: node.id === currentNodeId,
    };
  });
}

/**
 * 聚落路网：给「本层是建筑」的情况生成横纵街巷。
 *
 * 横街走相邻两行建筑之间的空地中线、纵街走相邻两列之间的空地中线 ——
 * 不是取建筑的行 / 列中心（那正好从房子上压过去）。提取一段段连续空隙，
 * 每段空隙取中点，街从格子之间穿过。
 */
function buildSettlementRoads(
  footprints: MapFootprint[],
  gridWidth: number,
  gridHeight: number,
): MapRoad[] {
  if (footprints.length < 4) {
    return buildMainRoad(footprints, gridWidth, gridHeight, '通行主路');
  }

  const roads: MapRoad[] = [];

  // 横向街巷：取相邻行之间的空隙中线。空隙宽度必须够一条街（≥0.5），否则不画
  const rowGaps = spanGaps(
    footprints.map(item => [item.y, item.y + item.height] as [number, number]),
    gridHeight,
  );
  rowGaps.forEach((mid, index) => {
    roads.push({
      id: `road-row-${index}`,
      name: index === 0 ? '主街' : `横巷${String(index).padStart(2, '0')}`,
      kind: index === 0 ? '街' : '巷',
      points: [
        { x: 0.6, y: mid },
        { x: gridWidth - 0.6, y: mid },
      ],
    });
  });

  const colGaps = spanGaps(
    footprints.map(item => [item.x, item.x + item.width] as [number, number]),
    gridWidth,
  );
  colGaps.slice(0, 3).forEach((mid, index) => {
    roads.push({
      id: `road-col-${index}`,
      name: index === 0 ? '纵街' : `纵巷${String(index).padStart(2, '0')}`,
      kind: index === 0 ? '街' : '巷',
      points: [
        { x: mid, y: 0.6 },
        { x: mid, y: gridHeight - 0.6 },
      ],
    });
  });

  return roads;
}

/**
 * 取一串区间之间的空隙，返回每段空隙的中点（只留够宽的，缝太窄的不算路）。
 *
 * 区间边界带 inflate 外扩一点，避免街紧贴房子皮 —— 看着像压上去。
 */
function spanGaps(ranges: [number, number][], limit: number, inflate = 0.35): number[] {
  if (!ranges.length) {
    return [];
  }

  const sorted = [...ranges].sort((left, right) => left[0] - right[0]);
  const mids: number[] = [];
  let cursor = 0;

  for (const [start, end] of sorted) {
    if (start - cursor >= 0.5) {
      mids.push((cursor + start) / 2);
    }

    cursor = Math.max(cursor, end);
  }

  if (limit - cursor >= 0.5) {
    mids.push((cursor + limit) / 2);
  }

  return mids.filter(mid => mid > inflate && mid < limit - inflate);
}

/**
 * 绕障碍寻路：在网格上跑 A*，建筑面是不可通行的障碍。
 *
 * 网眼尺寸固定 0.5 格，够细；障碍按「面外扩一点」处理，出来的路线会自然地
 * 从建筑旁边绕开而不是贴皮。出的线是四向折线，观感接近手画的巷子。
 */
function routeAroundBoxes(
  start: MapPoint,
  target: MapPoint,
  boxes: MapBox[],
  gridWidth: number,
  gridHeight: number,
): MapPoint[] {
  const cell = 0.5;
  const cols = Math.max(2, Math.ceil(gridWidth / cell));
  const rows = Math.max(2, Math.ceil(gridHeight / cell));

  const blocked = new Set<number>();
  for (const box of boxes) {
    // pad 只向外扩很小一点（0.2 格），用途是别让路紧贴房皮。
    // 外扩太多会把门连同门口那圈一起封住，路就出不去 ——
    // 剩下的距离感交给「门那一格单独放开」来保证。
    const minX = Math.floor((box.x - 0.2) / cell);
    const maxX = Math.ceil((box.x + box.width + 0.2) / cell);
    const minY = Math.floor((box.y - 0.2) / cell);
    const maxY = Math.ceil((box.y + box.height + 0.2) / cell);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) {
          continue;
        }

        blocked.add(y * cols + x);
      }
    }
  }

  // 把每栋的门那一格从障碍里挖出来。门在边的中点上，网眼 0.5，
  // 门口常常落在面内一两格，不挖路就出不去。
  // 只挖门所在的「一整行 / 一列」上最靠边的那一格 ——
  // 挖一大片，路就会从房子正中间穿出去。
  for (const box of boxes) {
    const doorX = Math.round((box.x + box.width / 2) / cell);
    const doorY = Math.round((box.y + box.height / 2) / cell);

    blocked.delete(doorY * cols + doorX);

    // 门在左右边 → 门口那一行左右各留一格；门在上下边 → 那一列上下各留一格
    const minX = Math.floor((box.x - 0.2) / cell);
    const maxX = Math.ceil((box.x + box.width + 0.2) / cell);
    const minY = Math.floor((box.y - 0.2) / cell);
    const maxY = Math.ceil((box.y + box.height + 0.2) / cell);
    const leftGap = doorX - minX;
    const rightGap = maxX - doorX;
    const topGap = doorY - minY;
    const bottomGap = maxY - doorY;

    if (leftGap <= rightGap && leftGap <= topGap && leftGap <= bottomGap) {
      blocked.delete(doorY * cols + minX);
    } else if (rightGap <= topGap && rightGap <= bottomGap) {
      blocked.delete(doorY * cols + maxX);
    } else if (topGap <= bottomGap) {
      blocked.delete(minY * cols + doorX);
    } else {
      blocked.delete(maxY * cols + doorX);
    }
  }

  const key = (x: number, y: number) => y * cols + x;
  const toPoint = (x: number, y: number): MapPoint => ({
    x: Math.min(Math.max(x * cell, 0.3), gridWidth - 0.3),
    y: Math.min(Math.max(y * cell, 0.3), gridHeight - 0.3),
  });

  const startCell = {
    x: clamp(Math.round(start.x / cell), 0, cols - 1),
    y: clamp(Math.round(start.y / cell), 0, rows - 1),
  };
  const targetCell = {
    x: clamp(Math.round(target.x / cell), 0, cols - 1),
    y: clamp(Math.round(target.y / cell), 0, rows - 1),
  };

  const startIndex = key(startCell.x, startCell.y);
  const targetIndex = key(targetCell.x, targetCell.y);

  // 起终点常压在自己门口/路边（贴着建筑皮）→ 把「起终点各自朝对方
  // 跨一步」的那一格放开作为出门通道。escape 里放进 freeCells 的
  // 只可能是「没被 pad 占住」的邻格 —— 门里的那一两格 extra 由
  // blocked.delete 已经处理，不会穿到房身上去。
  const freeCells = new Set<number>();
  freeCells.add(startIndex);
  freeCells.add(targetIndex);
  blocked.delete(startIndex);
  blocked.delete(targetIndex);

  const escape = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    const candidates: { x: number; y: number }[] = [];
    const seen = new Set<string>();
    const add = (x: number, y: number) => {
      const id = `${x}:${y}`;

      if (!seen.has(id)) {
        seen.add(id);
        candidates.push({ x, y });
      }
    };

    add(from.x + dx, from.y + dy);
    add(from.x - dx, from.y - dy);
    add(from.x + 1, from.y);
    add(from.x - 1, from.y);
    add(from.x, from.y + 1);
    add(from.x, from.y - 1);

    for (const candidate of candidates) {
      if (candidate.x < 0 || candidate.y < 0 || candidate.x >= cols || candidate.y >= rows) {
        continue;
      }

      const ck = key(candidate.x, candidate.y);

      // 没有被 pad 占住的才算「门外」；被占住的放了路就会穿房子。
      // 只加白名单，不动 blocked —— 中间路段照旧判定障碍。
      if (!blocked.has(ck) && !freeCells.has(ck)) {
        freeCells.add(ck);
      }
    }
  };

  escape(startCell, targetCell);
  escape(targetCell, startCell);

  // 兜底：起点或终点被 pad 完全围死（门正对邻栋）时，把四邻里
  // 没被占住的格子全放开，至少让路出得去，形状难看点但不穿房。
  // 但只在「真的出不去」时才兜 —— 平时放开会让路抄房子的近道。
  const rescue = (cell: { x: number; y: number }) => {
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .filter(([dx, dy]) => cell.x + dx >= 0 && cell.y + dy >= 0 && cell.x + dx < cols && cell.y + dy < rows)
      .map(([dx, dy]) => key(cell.x + dx, cell.y + dy))
      .filter(ck => !blocked.has(ck));

    if (neighbours.length > 0) {
      return;
    }

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (cell.x + dx < 0 || cell.y + dy < 0 || cell.x + dx >= cols || cell.y + dy >= rows) {
        continue;
      }

      freeCells.add(key(cell.x + dx, cell.y + dy));
    }
  };

  rescue(startCell);
  rescue(targetCell);

  const heuristic = (x: number, y: number) => Math.hypot(x - targetCell.x, y - targetCell.y);
  const cameFrom = new Map<number, number>();
  const costSoFar = new Map<number, number>();
  const startKey = startIndex;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  costSoFar.set(startKey, 0);
  const open: { x: number; y: number; score: number; from: number }[] = [
    { x: startCell.x, y: startCell.y, score: heuristic(startCell.x, startCell.y), from: -1 },
  ];

  let guard = 0;
  let found: { x: number; y: number } | null = null;
  const visitedCells = new Set<number>();

  while (open.length && guard < 200000) {
    guard += 1;
    open.sort((a, b) => a.score - b.score);
    const current = open.shift()!;
    const currentKey = key(current.x, current.y);

    if (visitedCells.has(currentKey)) {
      continue;
    }

    visitedCells.add(currentKey);

    if (current.x === targetCell.x && current.y === targetCell.y) {
      found = current;
      break;
    }

    if ((costSoFar.get(currentKey) ?? Infinity) < current.score - heuristic(current.x, current.y)) {
      continue;
    }

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
        continue;
      }

      const nKey = key(nx, ny);
      // 通行规则（只关心「目的格」，不关心当前格在哪）：
      // · 没被 pad 占住的格子 —— 路可以走；
      // · 起终点两格（门）—— 永远可走；
      // · freeCells 白名单里其余格（＝出门一步）—— 也可走，
      //   但只放开「起终点各一格」，数量极少，宁可形状难看也不穿房。
      if (blocked.has(nKey) && !freeCells.has(nKey)) {
        continue;
      }

      // 换向多花半步代价，出的线少走「奇怪的斜插」
      const turnPenalty = current.from === -1 ? 0 : (dx !== current.x - (current.from % cols) || dy !== current.y - Math.floor(current.from / cols)) ? 0.4 : 0;
      const cost = (costSoFar.get(currentKey) ?? 0) + 1 + turnPenalty;
      const known = costSoFar.get(nKey);

      if (known === undefined || cost < known) {
        costSoFar.set(nKey, cost);
        cameFrom.set(nKey, currentKey);
        open.push({ x: nx, y: ny, score: cost + heuristic(nx, ny), from: currentKey });
      }
    }
  }

  if (!found) {
    return [toPoint(startCell.x, startCell.y), toPoint(targetCell.x, targetCell.y)];
  }

  const path: MapPoint[] = [];
  let walk: number | null = key(found.x, found.y);
  while (walk !== null && walk !== -1) {
    const y = Math.floor(walk / cols);
    const x = walk - y * cols;
    path.unshift(toPoint(x, y));
    walk = cameFrom.get(walk) ?? null;
  }

  return path;
}

/**
 * 去掉连续重复的点（寻路出来的四向折线里常出现原地踏步的重复点）。
 */
function dedupePoints(points: MapPoint[]): MapPoint[] {
  const result: MapPoint[] = [];

  for (const point of points) {
    const last = result[result.length - 1];

    if (!last || last.x !== point.x || last.y !== point.y) {
      result.push(point);
    }
  }

  return result;
}

/**
 * 取门口「朝外那一小步」的坐标：从门口沿所在边的法线退出一格多。
 *
 * 寻路的起点如果正压在门口（= 建筑皮的延长线上），pad 外扩会让起点
 * 四周全是障碍，路线只能横穿建筑。先退出来一步，再交给寻路。
 */
function outwardStep(item: MapFootprint, gridWidth: number, gridHeight: number): MapPoint | null {
  const 入口 = item.入口;
  const left = Math.abs(入口.x - item.x);
  const right = Math.abs(item.x + item.width - 入口.x);
  const top = Math.abs(入口.y - item.y);
  const bottom = Math.abs(item.y + item.height - 入口.y);
  const nearest = Math.min(left, right, top, bottom);
  // pad 是 0.45 格，退得比它远一点，出门那一步才真的离开了影响圈
  const 步长 = 0.6;

  if (nearest === left) {
    return { x: Math.max(0.4, 入口.x - 步长), y: 入口.y };
  }

  if (nearest === right) {
    return { x: Math.min(gridWidth - 0.4, 入口.x + 步长), y: 入口.y };
  }

  if (nearest === top) {
    return { x: 入口.x, y: Math.max(0.4, 入口.y - 步长) };
  }

  if (nearest === bottom) {
    return { x: 入口.x, y: Math.min(gridHeight - 0.4, 入口.y + 步长) };
  }

  return null;
}

/**
 * 主路：一条从地图一端贯穿到另一端的路，把各建筑的入口一段段绕行连起来。
 *
 * 野外层要的就是这个效果 —— 一条土路蜿蜒而过，两侧散着庙、亭、驿站。
 * 没有任何建筑时给一条四点折线，避免地图空得像张白纸。
 */
function buildMainRoad(
  footprints: MapFootprint[],
  gridWidth: number,
  gridHeight: number,
  name: string,
): MapRoad[] {
  if (footprints.length === 0) {
    const hash = stableHash(name);
    const baseY = gridHeight * 0.55;

    return [
      {
        id: 'road-main',
        name,
        kind: '小径',
        points: [
          { x: 0.6, y: baseY + (((hash >> 3) % 12) - 6) / 24 * gridHeight },
          { x: gridWidth * 0.35, y: baseY + (((hash >> 7) % 12) - 6) / 20 * gridHeight },
          { x: gridWidth * 0.68, y: baseY + (((hash >> 11) % 12) - 6) / 20 * gridHeight },
          { x: gridWidth - 0.6, y: baseY + (((hash >> 15) % 12) - 6) / 24 * gridHeight },
        ],
      },
    ];
  }

  // 建筑按 x 排，主路从最左端的门外出发，一段段绕建筑连到最右端的门外。
  // 每一段的起点都是「上一段的目标」，段与段之间天然接上；
  // 自己那栋不算障碍，其余全是 —— 路只能从旁人房子旁边绕。
  const ordered = [...footprints].sort((left, right) => left.入口.x - right.入口.x);
  const boxes = toBoxes(ordered);
  const head = outwardStep(ordered[0]!, gridWidth, gridHeight) ?? ordered[0]!.入口;
  const points: MapPoint[] = [head];
  const push = (leg: MapPoint[]) => {
    for (const point of leg) {
      const last = points[points.length - 1]!;

      if (point.x !== last.x || point.y !== last.y) {
        points.push(point);
      }
    }
  };

  ordered.forEach((item, index) => {
    const others = boxes.filter((_, boxIndex) => boxIndex !== index);
    const isLast = index === ordered.length - 1;

    push(routeAroundBoxes(points[points.length - 1]!, item.入口, others, gridWidth, gridHeight));

    // 末段从最后那栋的门外横穿到地图外沿 —— 此时全场都是障碍，
    // 也就不会压回任何一栋上。起点用「门外一步」而不是门口，
    // 否则这一段会被 pad 圈死在门口，只能横穿回去。
    if (isLast) {
      const outward = outwardStep(item, gridWidth, gridHeight);
      const from = outward ?? item.入口;

      push(routeAroundBoxes(from, { x: gridWidth - 0.6, y: from.y }, boxes, gridWidth, gridHeight));
    }
  });

  // 逐段校验：任何一段采样后压进建筑面，就整段重绕（从上一段的
  // 实际终点出发，全场建筑都算障碍），仍然穿房就把这一段丢掉。
  // 宁可断一小截，也不让主路穿房。
  const sealed: MapPoint[] = [points[0]!];

  points.forEach((point, index) => {
    if (index === 0) {
      return;
    }

    const from = sealed[sealed.length - 1]!;
    const attempt = dirtyLeg([from, point], boxes)
      ? routeAroundBoxes(from, point, boxes, gridWidth, gridHeight)
      : [from, point];

    if (dirtyLeg(attempt, boxes)) {
      return;
    }

    for (const candidate of attempt) {
      const last = sealed[sealed.length - 1]!;

      if (candidate.x !== last.x || candidate.y !== last.y) {
        sealed.push(candidate);
      }
    }
  });

  return [
    {
      id: 'road-main',
      name,
      kind: '主路',
      points: sealed,
    },
  ];
}

/** 一段折线采样后是否压进任意建筑面（含端点）——「穿房」判据。 */
function dirtyLeg(points: MapPoint[], boxes: MapBox[]): boolean {
  return boxes.some(box =>
    samplePoints(points).some(
      point => point.x > box.x && point.x < box.x + box.width && point.y > box.y && point.y < box.y + box.height,
    ),
  );
}

/**
 * 把一条折线按固定步长采样成点串（两端保留），供穿建筑校验用。
 */
function samplePoints(points: MapPoint[], step = 0.35): MapPoint[] {
  const result: MapPoint[] = [];

  if (points.length === 0) {
    return result;
  }

  if (points.length === 1) {
    return [points[0]!];
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const slices = Math.max(1, Math.ceil(distance / step));

    for (let slice = 0; slice < slices; slice += 1) {
      const t = slice / slices;

      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }

  result.push(points[points.length - 1]!);

  return result;
}

/** 给非聚落层生成「接入路」：每栋建筑从门口绕行连到最近的一条路上。 */
function buildAccessRoads(
  footprints: MapFootprint[],
  roads: MapRoad[],
  gridWidth: number,
  gridHeight: number,
): MapRoad[] {
  if (roads.length === 0 || footprints.length === 0) {
    return [];
  }

  const result: MapRoad[] = [];
  const boxes = toBoxes(footprints);

  footprints.forEach((item, index) => {
    // 找离入口最近的路点
    let best: MapPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const road of roads) {
      for (const point of road.points) {
        const distance = Math.hypot(point.x - item.入口.x, point.y - item.入口.y);

        if (distance < bestDistance) {
          bestDistance = distance;
          best = point;
        }
      }
    }

    // 门口就在路边，不用再画一截
    if (!best || bestDistance <= 1.2) {
      return;
    }

    // 自己不是障碍，其余建筑都是。起点用「门外一步」——
    // 否则这一段会被 pad 圈死在门口，只能横穿到路上去。
    const others = boxes.filter((_, boxIndex) => boxIndex !== index);
    const outward = outwardStep(item, gridWidth, gridHeight);
    const legStart = outward ?? item.入口;
    const leg = routeAroundBoxes(legStart, best, others, gridWidth, gridHeight);
    const points = dedupePoints(outward ? [item.入口, ...leg] : leg);

    // 接入路的中间点不许落在任何一栋建筑里（含自己那栋，只有门口
    // 两点允许贴）。真压上去了就整段丢弃 —— 宁可不画这条小径，
    // 也不能让它穿房。这是最后一道闸，前面所有寻路技巧的兜底。
    const hitsAny = boxes.some(other =>
      samplePoints(points).some(point =>
        point.x > other.x
        && point.x < other.x + other.width
        && point.y > other.y
        && point.y < other.y + other.height
      ),
    );

    if (points.length < 3 || hitsAny) {
      return;
    }

    result.push({
      id: `road-access-${index}`,
      name: `${item.name}门口`,
      kind: '小径',
      points,
    });
  });

  return result;
}

/** 等高线装饰：两段正弦叠加，虚线描边，只做氛围。 */
function buildContours(gridWidth: number, gridHeight: number, seed: string): MapPoint[][] {
  const hash = stableHash(seed);
  const lines: MapPoint[][] = [];
  const count = 3 + (hash % 3);
  const samples = 17;

  for (let line = 0; line < count; line += 1) {
    const points: MapPoint[] = [];
    const amplitude = gridHeight * (0.05 + (line % 3) * 0.02);
    const baseY = gridHeight * (0.2 + line * 0.22);
    const phase = ((hash >> (line * 3)) % 10) / 3;

    for (let index = 0; index < samples; index += 1) {
      const t = index / (samples - 1);
      const x = t * gridWidth;
      const wave =
        Math.sin(t * Math.PI * 2 + phase) * amplitude +
        Math.sin(t * Math.PI * 5 + phase * 1.7) * amplitude * 0.35;
      points.push({ x, y: Math.min(Math.max(baseY + wave, 0.8), gridHeight - 0.8) });
    }

    lines.push(points);
  }

  return lines;
}

/** 水体装饰：一块不规则的闭合多边形，放在地图一角。 */
function buildWater(gridWidth: number, gridHeight: number, seed: string): MapPoint[][] {
  const hash = stableHash(seed);
  const centerX = gridWidth * (0.2 + ((hash % 40) / 100));
  const centerY = gridHeight * (0.62 + (((hash >> 6) % 25) / 100));
  const radiusX = gridWidth * 0.13;
  const radiusY = gridHeight * 0.11;
  const points: MapPoint[] = [];

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const wobble = 0.75 + (((hash >> index) % 10) / 20);

    points.push({
      x: centerX + Math.cos(angle) * radiusX * wobble,
      y: centerY + Math.sin(angle) * radiusY * wobble,
    });
  }

  return [points];
}

/**
 * 人物落点：先按位置文本匹配节点，命中的贴着那个面的外圈站。
 *
 * 同一个面上可能站好几个人（一栋宅子里三个 NPC 很常见），所以先按命中的面分组，
 * 组内沿外圈按序号均匀铺开，避免全挤在门口一个点上。
 */
function layoutPeople(
  sources: MapPersonSource[],
  footprints: MapFootprint[],
  tree: MapTreeNode[],
  gridWidth: number,
  gridHeight: number,
): MapPerson[] {
  const byId = new Map(footprints.map(item => [item.id, item]));

  // 先把每个人匹配到某个面上，顺便统计每个面上一共站了几个人
  const matched: (MapFootprint | null)[] = sources.map(source => {
    const fragments = splitPositionText(source.positionText);
    const node = fragments.length
      ? tree.find(item => fragments.some(fragment => textHits(fragment, item.名称))) ?? null
      : null;

    return node ? byId.get(node.id) ?? null : null;
  });

  const slotTotal = new Map<string, number>();
  const slotIndex = new Map<string, number>();

  for (const footprint of matched) {
    if (footprint) {
      slotTotal.set(footprint.id, (slotTotal.get(footprint.id) ?? 0) + 1);
    }
  }

  return sources.map((source, index) => {
    const footprint = matched[index] ?? null;
    const hash = stableHash(source.id || source.name);

    if (footprint) {
      const total = slotTotal.get(footprint.id) ?? 1;
      const order = slotIndex.get(footprint.id) ?? 0;
      slotIndex.set(footprint.id, order + 1);

      // 沿这个面的外圈铺开：只有一个人时按哈希挑一条边，多个人时按序号绕一圈
      const ring = Math.max(0.55, Math.min(footprint.width, footprint.height) * 0.32);
      const angle = total <= 1
        ? ((hash % 360) / 180) * Math.PI
        : (order / total) * Math.PI * 2 + (hash % 8) / 8;

      return {
        id: source.id,
        name: source.name,
        x: clamp(footprint.x + footprint.width / 2 + Math.cos(angle) * (footprint.width / 2 + ring), 0.5, gridWidth - 0.5),
        y: clamp(footprint.y + footprint.height / 2 + Math.sin(angle) * (footprint.height / 2 + ring), 0.5, gridHeight - 0.5),
        isPlayer: source.isPlayer,
        isCurrent: source.isPresent,
        nodeId: footprint.id,
      };
    }

    // 没匹配上：玩家用地图中心，NPC 用哈希撒点（稳定，不闪）
    if (source.isPlayer) {
      return {
        id: source.id,
        name: source.name,
        x: gridWidth / 2,
        y: gridHeight / 2,
        isPlayer: true,
        isCurrent: true,
        nodeId: null,
      };
    }

    return {
      id: source.id,
      name: source.name,
      x: 1.5 + (((hash >> 2) % 900) / 1000) * (gridWidth - 3),
      y: 1.5 + (((hash >> 12) % 900) / 1000) * (gridHeight - 3),
      isPlayer: false,
      isCurrent: source.isPresent,
      nodeId: null,
    };
  });
}

/**
 * 兜底摆位：当前这层没有下级可画时，把它自己画成正中一个方块。
 *
 * 剧情不是定死的，最内层（房间）本来就没有下级 —— 与其留一张空网格，
 * 不如把「玩家现在就在这里面」这件事本身画出来。
 */
function buildSelfFootprint(node: MapTreeNode, gridWidth: number, gridHeight: number): MapFootprint {
  const width = Math.min(gridWidth * 0.42, 12);
  const height = Math.min(gridHeight * 0.42, 9);
  const x = (gridWidth - width) / 2;
  const y = (gridHeight - height) / 2;

  return {
    id: node.id,
    name: node.名称,
    层级: node.层级,
    描述: node.描述,
    x,
    y,
    width,
    height,
    入口: { x: x + width / 2, y: y + height },
    isCurrent: true,
  };
}

/**
 * 组装一层地图场景。
 *
 * `currentNode` 是当前所在的地点；画的是它的子节点。`currentNodeId` 用于高亮
 * 「玩家现在就在这一栋里面」。树里没有当前节点时，退化成画根节点的子节点。
 */
export function buildMapScene(input: {
  currentNode: MapTreeNode | null;
  currentNodeId: string | null;
  people: MapPersonSource[];
}): MapScene {
  const { currentNode } = input;
  const children = currentNode?.子节点 ?? [];

  if (!currentNode) {
    // 整棵树都还没有（第一次打开、还没跑过回忆解析）：画空网格，不放人，
    // 免得人物名正好压在空态提示文字上。
    const grid = MAP_LEVEL_GRID['城市'];

    return {
      grid: { width: grid.width, height: grid.height },
      footprints: [],
      roads: [],
      people: [],
      contours: [],
      water: [],
      isEmpty: true,
      isSelfView: false,
    };
  }

  if (children.length === 0) {
    // 这一层没有下级可画（最内层的房间是常态）：把它自己画成正中一个方块，
    // 人落在这个方块周围，而不是留一张空网格。
    const grid = MAP_LEVEL_GRID[currentNode.层级];
    const self = buildSelfFootprint(currentNode, grid.width, grid.height);

    return {
      grid: { width: grid.width, height: grid.height },
      footprints: [self],
      roads: [],
      people: layoutPeople(input.people, [self], [currentNode], grid.width, grid.height),
      contours: [],
      water: [],
      isEmpty: false,
      isSelfView: true,
    };
  }

  const grid = MAP_LEVEL_GRID[currentNode.层级];
  const childLevel = children[0]!.层级;

  const footprints = layoutFootprints(
    children,
    grid.width,
    grid.height,
    input.currentNodeId,
    childLevel,
  );

  const roads: MapRoad[] = [];

  if (childLevel === '房间') {
    // 建筑内部：一间房挨着一间房，没有路
  } else if (childLevel === '建筑' || childLevel === '街区') {
    roads.push(...buildSettlementRoads(footprints, grid.width, grid.height));
  } else {
    roads.push(
      ...buildMainRoad(footprints, grid.width, grid.height, isWildernessLevel(currentNode.名称, currentNode.层级) ? '通行主路' : '主路'),
    );
  }

  roads.push(...buildAccessRoads(footprints, roads, grid.width, grid.height));

  const wilderness = isWildernessLevel(currentNode.名称, currentNode.层级);

  return {
    grid: { width: grid.width, height: grid.height },
    footprints,
    roads,
    people: layoutPeople(input.people, footprints, children, grid.width, grid.height),
    contours: wilderness ? buildContours(grid.width, grid.height, currentNode.id) : [],
    water: wilderness ? buildWater(grid.width, grid.height, `${currentNode.id}-water`) : [],
    isEmpty: false,
    isSelfView: false,
  };
}

/** 六档层级的中文说明，界面上用来提示「这一层放的是什么」。 */
export const MAP_LEVEL_HINTS: Record<MapLevel, string> = {
  世界: '整个世界',
  区域: '大范围地理单元',
  城市: '聚居地或据点',
  街区: '城市内的片区',
  建筑: '可进入的建筑或地标',
  房间: '建筑内部的空间',
};

/** 当前层级的下一层是什么；到房间就没有下一层了。 */
export function getNextMapLevel(level: MapLevel): MapLevel | null {
  const depth = MAP_LEVEL_DEPTH[level];
  const next = depth + 1;
  const levels: MapLevel[] = ['世界', '区域', '城市', '街区', '建筑', '房间'];

  return levels[next] ?? null;
}

export { EMPTY_POINT };
