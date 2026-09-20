/**
 * useCoverBackground 组合式函数
 * 首页封面的动态背景：写实概念图打底 + 多层矢量 / 画布动效叠加。
 *
 * 分层（由后至前）：
 * 1. 世界层 —— 底图、两层缓慢漂移的极光叠加，以及与底图锁定的发光层（核心辉光 / 放射光柱）。
 *    底图与极光一起做缓慢呼吸缩放，保证发光永远贴在传送门上；
 * 2. 独立层 —— 画布绘制的碎石与余烬、横向漂移的雾带；
 * 3. 顶层 —— 随机闪电、胶片颗粒、暗角，以及给标题与按钮留出的上下压暗。
 *
 * 传送门核心的位置不是写死的：底图的核心相对坐标与半径由离线脚本量出（见 COVER_ART），
 * 再按底图的实际铺法（四周外扩 5% + cover）换算成舞台像素，写进
 * --core-x / --core-y / --core-r 三个自定义属性，所有环绕动效据此定位。
 * 因此换底图只需更新 COVER_ART 里的几个数字，不必改任何动效代码。
 */

import { computed, onMounted, onUnmounted, ref } from 'vue';

import heroDeskGlowUrl from '../assets/home/hero-desk-glow.webp?url';
import heroDeskAuroraAUrl from '../assets/home/hero-desk-aurora-a.webp?url';
import heroDeskAuroraBUrl from '../assets/home/hero-desk-aurora-b.webp?url';
import heroDeskUrl from '../assets/home/hero-desk.webp?url';
import heroPortGlowUrl from '../assets/home/hero-port-glow.webp?url';
import heroPortAuroraAUrl from '../assets/home/hero-port-aurora-a.webp?url';
import heroPortAuroraBUrl from '../assets/home/hero-port-aurora-b.webp?url';
import heroPortUrl from '../assets/home/hero-port.webp?url';

/** 底图四周外扩比例：给呼吸缩放留出余量，避免露出边缘 */
const PLATE_OVERSCAN = 0.05;

/** 碎石细节贴图的边长（像素）。别调大 —— 贴图最终会被缩到十几像素，太大反而把质感抹平 */
const SHARD_DETAIL_SIZE = 64;

/** 余烬 / 浮尘数量 */
const EMBER_COUNT = 130;

/**
 * 碎石的数量与尺寸。
 *
 * 尺寸是「相对核心半径」的系数，实际像素 ≈ 核心半径 × 系数 × (0.34 + 轨道距离 × 0.3)。
 * 这两个值是从最初那版（44 块 / 0.035~0.195）减下来的：数量减半、尺寸取一半 ——
 * 最初那批在画面上又大又多、像贴上去的低模多面体，减到这个量级才像远景碎石。
 */
const SHARD_COUNT = 22;
const SHARD_SIZE_MIN = 0.0175;
const SHARD_SIZE_SPAN = 0.08;

/**
 * 环境光强度：背光面的底亮度。
 * 从 0.28 收到 0.16 —— 之前暗面被环境光垫得太高，明暗对比不够，石头看着发灰发平。
 */
const SHARD_AMBIENT = 0.16;

/** 半兰伯特系数：明暗交界柔一点，否则棱面会像水晶一样硬邦邦 */
const SHARD_WRAP = 0.06;

/** 竖屏切换阈值 */
const PORTRAIT_MAX_WIDTH = 760;

interface CoverArt {
  /** 底图地址 */
  src: string;
  /** 辉光遮罩（灰度图，作为 mask-image 使用） */
  glow: string;
  /**
   * 极光叠加层（两张）：黑底 + 极光光帘，网页端用「滤色」叠在底图上。
   * 黑 = 不发光，所以不需要透明通道；两层以不同速度和方向缓慢漂移，
   * 制造出「极光在流动」的观感（真实极光本来也是多层不同高度、各走各的）。
   */
  auroraA: string;
  auroraB: string;
  /** 底图原始像素尺寸 */
  iw: number;
  ih: number;
  /** 传送门核心在底图中的相对坐标（0~1） */
  cx: number;
  cy: number;
  /** 核心半径，相对底图宽度 */
  cr: number;
}

/** 横屏 / 竖屏两套底图 */
const COVER_ART: Record<'desk' | 'port', CoverArt> = {
  desk: {
    src: heroDeskUrl,
    glow: heroDeskGlowUrl,
    auroraA: heroDeskAuroraAUrl,
    auroraB: heroDeskAuroraBUrl,
    iw: 1216,
    ih: 832,
    cx: 0.536,
    cy: 0.434,
    cr: 0.098,
  },
  port: {
    src: heroPortUrl,
    glow: heroPortGlowUrl,
    auroraA: heroPortAuroraAUrl,
    auroraB: heroPortAuroraBUrl,
    iw: 832,
    ih: 1216,
    cx: 0.524,
    cy: 0.365,
    cr: 0.128,
  },
};

interface Shard {
  /** 绕核心的角度 */
  a: number;
  /** 距核心的距离（以核心半径为单位） */
  r: number;
  /** 向外漂移速度 */
  speed: number;
  /** 角速度 */
  omega: number;
  /** 尺寸系数 */
  size: number;
  /** 自身旋转角 */
  spin: number;
  /** 自转速度 */
  spinV: number;
  /** 外形轮廓（归一化坐标，可缓存复用） */
  shape: Path2D;
  /** 三角扇棱面：每个面一个路径 + 一条外法线（支点指向面中点） */
  faces: Array<{ path: Path2D; nx: number; ny: number }>;
  /** 细节贴图（颗粒 + 裂纹），不含任何光照信息 */
  detail: HTMLCanvasElement;
  /** 岩石基色亮度 */
  albedo: number;
}

interface Ember {
  /** 归一化坐标 */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 尺寸 */
  r: number;
  /** 暖色还是冷色 */
  warm: boolean;
  /** 闪烁相位 */
  phase: number;
}

export function useCoverBackground() {
  const stageRef = ref<HTMLElement | null>(null);
  const debrisRef = ref<HTMLCanvasElement | null>(null);
  const emberRef = ref<HTMLCanvasElement | null>(null);
  const flashRef = ref<HTMLElement | null>(null);

  const isPortrait = ref(false);
  const coverArt = computed<CoverArt>(() => (isPortrait.value ? COVER_ART.port : COVER_ART.desk));
  const plateSrc = computed(() => coverArt.value.src);
  const auroraA = computed(() => coverArt.value.auroraA);
  const auroraB = computed(() => coverArt.value.auroraB);
  /** 交给 CSS 的辉光遮罩，用自定义属性传下去，避免各主题 / 组件重复声明 */
  const glowVar = computed(() => `url("${coverArt.value.glow}")`);

  // ===== 运行期状态（仅在挂载后有效） =====
  let rafId = 0;
  let flashTimer = 0;
  let secondFlashTimer = 0;
  let disposed = false;
  let reduceMotion = false;
  let lastDraw = 0;

  let stageW = 0;
  let stageH = 0;
  let pixelRatio = 1;
  let coreX = 0;
  let coreY = 0;
  let coreR = 0;

  let shards: Shard[] = [];
  let embers: Ember[] = [];

  /**
   * 烘焙一张碎石细节贴图：大块斑驳 + 裂纹 + 粗砂粒，形状外的部分裁掉。
   *
   * 两点讲究：
   * 1. 贴图里**不含任何光照信息** —— 光照全部在绘制时实时计算（见 drawShards），
   *    否则碎片自转时高光会跟着一起转，看起来像石头自己在发光；
   * 2. 所有尺寸都按贴图边长的**比例**给。碎片在屏幕上只有十几像素，
   *    细密的砂点会被采样直接抹平，只有「大块斑驳」这个尺度留得住。
   */
  function createShardDetail(points: Array<[number, number]>): HTMLCanvasElement {
    const size = SHARD_DETAIL_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.translate(size / 2, size / 2);
    const radius = (size / 2) * 0.94;

    const shape = new Path2D();
    points.forEach(([x, y], i) => {
      const px = x * radius;
      const py = y * radius;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    });
    shape.closePath();

    ctx.save();
    ctx.clip(shape);

    // 1) 大块斑驳：石面深浅不匀。缩到十几像素后，只有这一层还看得见
    for (let i = 0; i < 10; i += 1) {
      const bx = (Math.random() - 0.5) * size * 0.95;
      const by = (Math.random() - 0.5) * size * 0.95;
      const br = size * (0.16 + Math.random() * 0.24);
      const blot = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      blot.addColorStop(
        0,
        // 亮斑压得比暗斑弱：亮斑是「加」在石面上的，太强会把背光面整体提亮，暗面就黑不下去了
        Math.random() > 0.52
          ? `rgba(255, 248, 232, ${(0.05 + Math.random() * 0.08).toFixed(3)})`
          : `rgba(0, 0, 0, ${(0.14 + Math.random() * 0.2).toFixed(3)})`,
      );
      blot.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blot;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2) 裂纹：从某个顶点往重心方向抖动着收拢，粗细按贴图尺寸取相对值
    const crackCount = 2 + Math.floor(Math.random() * 2);
    for (let c = 0; c < crackCount; c += 1) {
      const start = points[Math.floor(Math.random() * points.length)];
      ctx.beginPath();
      ctx.moveTo(start[0] * radius, start[1] * radius);
      const steps = 3 + Math.floor(Math.random() * 3);
      for (let s = 1; s <= steps; s += 1) {
        const shrink = 1 - s / steps;
        ctx.lineTo(
          start[0] * radius * shrink + (Math.random() - 0.5) * radius * 0.6,
          start[1] * radius * shrink + (Math.random() - 0.5) * radius * 0.6,
        );
      }
      ctx.strokeStyle = `rgba(0, 0, 0, ${(0.3 + Math.random() * 0.34).toFixed(3)})`;
      ctx.lineWidth = size * (0.022 + Math.random() * 0.03);
      ctx.stroke();
    }

    // 3) 粗砂粒：颗数少、颗粒大，太细的在这个尺度上等于没有
    for (let i = 0; i < 110; i += 1) {
      const px = (Math.random() - 0.5) * size;
      const py = (Math.random() - 0.5) * size;
      const dot = size * (0.016 + Math.random() * 0.028);
      ctx.fillStyle =
        Math.random() > 0.45
          ? `rgba(255, 252, 240, ${(0.04 + Math.random() * 0.08).toFixed(3)})`
          : `rgba(0, 0, 0, ${(0.1 + Math.random() * 0.22).toFixed(3)})`;
      ctx.fillRect(px, py, dot, dot);
    }

    ctx.restore();
    return canvas;
  }

  /**
   * 生成一片碎石：崩口轮廓、参差棱面（含每个面的外法线）、石面细节贴图一次定型。
   *
   * 两处刻意「做脏」，否则会像一块切面宝石：
   * 1. 每条边的中点沿法线随机推拉 —— 轮廓因此带崩口，不再是规整多边形；
   * 2. 棱面从一个偏离重心的支点扇出 —— 面的大小参差不齐，明暗不会切成一圈等分色块。
   * 外法线取「支点 → 面中点」的方向，绘制时按面法线与光线方向的夹角决定明暗。
   */
  function createShard(spawnAtEdge: boolean): Shard {
    const corners = 6 + Math.floor(Math.random() * 4);
    const squash = 0.52 + Math.random() * 0.5;
    const base: Array<[number, number]> = [];

    for (let i = 0; i < corners; i += 1) {
      const angle = (i / corners) * Math.PI * 2 + (Math.random() - 0.5) * 0.26;
      const len = 0.6 + Math.random() * 0.4;
      base.push([Math.cos(angle) * len, Math.sin(angle) * len * squash]);
    }

    // 每条边的中点沿法线推拉一下，轮廓就有了崩口
    const outline: Array<[number, number]> = [];
    for (let i = 0; i < corners; i += 1) {
      const p1 = base[i];
      const p2 = base[(i + 1) % corners];
      outline.push(p1);
      const mx = (p1[0] + p2[0]) / 2;
      const my = (p1[1] + p2[1]) / 2;
      const length = Math.sqrt(mx * mx + my * my) || 1;
      const push = (Math.random() - 0.44) * 0.32;
      outline.push([mx + (mx / length) * push, my + (my / length) * push]);
    }

    const shape = new Path2D();
    outline.forEach(([x, y], i) => {
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    // 支点偏离重心，棱面大小因此参差
    const pivotX = (Math.random() - 0.5) * 0.26;
    const pivotY = (Math.random() - 0.5) * 0.26;
    const faces: Shard['faces'] = [];
    for (let i = 0; i < outline.length; i += 1) {
      const p1 = outline[i];
      const p2 = outline[(i + 1) % outline.length];
      const path = new Path2D();
      path.moveTo(pivotX, pivotY);
      path.lineTo(p1[0], p1[1]);
      path.lineTo(p2[0], p2[1]);
      path.closePath();
      const mx = (p1[0] + p2[0]) / 2 - pivotX;
      const my = (p1[1] + p2[1]) / 2 - pivotY;
      const normalLength = Math.sqrt(mx * mx + my * my) || 1;
      faces.push({ path, nx: mx / normalLength, ny: my / normalLength });
    }

    return {
      a: Math.random() * Math.PI * 2,
      r: spawnAtEdge ? 2.6 + Math.random() * 0.8 : 0.5 + Math.random() * 0.7,
      speed: 0.05 + Math.random() * 0.07,
      omega: (Math.random() - 0.5) * 0.05,
      size: SHARD_SIZE_MIN + Math.random() * SHARD_SIZE_SPAN,
      spin: Math.random() * Math.PI * 2,
      spinV: (Math.random() - 0.5) * 0.55,
      shape,
      faces,
      detail: createShardDetail(outline),
      albedo: 78 + Math.random() * 40,
    };
  }

  /** 生成一粒余烬 / 浮尘 */
  function createEmber(): Ember {
    return {
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00022,
      vy: -(0.00016 + Math.random() * 0.00042),
      r: 0.6 + Math.random() * 1.9,
      warm: Math.random() > 0.28,
      phase: Math.random() * Math.PI * 2,
    };
  }

  /**
   * 重新计算舞台尺寸与传送门核心的像素位置，并按需切换横竖版底图。
   *
   * 核心位置必须按底图「外扩 + cover」的真实铺法反推，不能用元素矩形去量 ——
   * 元素矩形会把底图自己的呼吸缩放一起算进去，越动越偏。
   */
  function syncLayout() {
    const stage = stageRef.value;
    if (!stage) return;

    isPortrait.value = window.innerWidth < PORTRAIT_MAX_WIDTH && window.innerHeight > window.innerWidth;

    stageW = stage.clientWidth;
    stageH = stage.clientHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

    const art = coverArt.value;
    const plateW = stageW * (1 + PLATE_OVERSCAN * 2);
    const plateH = stageH * (1 + PLATE_OVERSCAN * 2);
    const scale = Math.max(plateW / art.iw, plateH / art.ih);
    const drawnW = art.iw * scale;
    const drawnH = art.ih * scale;
    const left = -stageW * PLATE_OVERSCAN + (plateW - drawnW) / 2;
    const top = -stageH * PLATE_OVERSCAN + (plateH - drawnH) / 2;

    coreX = left + art.cx * drawnW;
    coreY = top + art.cy * drawnH;
    coreR = art.cr * drawnW;

    stage.style.setProperty('--core-x', `${coreX.toFixed(1)}px`);
    stage.style.setProperty('--core-y', `${coreY.toFixed(1)}px`);
    stage.style.setProperty('--core-r', `${coreR.toFixed(1)}px`);

    for (const canvas of [debrisRef.value, emberRef.value]) {
      if (!canvas) continue;
      canvas.width = Math.round(stageW * pixelRatio);
      canvas.height = Math.round(stageH * pixelRatio);
      canvas.style.width = `${stageW}px`;
      canvas.style.height = `${stageH}px`;
    }
  }

  /**
   * 画碎石。
   *
   * 主光只有传送门核心一个，所以每一片碎石的明暗都不是随机的：
   * 先把「碎片指向核心」的方向转回碎片自身的坐标系，再逐个棱面算
   * 「面法线 · 光线方向」（朗伯漫反射）—— 朝向核心的面被烤亮、背向的面沉进暗部；
   * 再用点光源的距离衰减让离核心远的碎石整体压暗。
   * 主光之外只留一层偏冷的环境光垫底（天光散射），免得背光面死黑一片。
   * 颗粒与裂纹来自不含光照的细节贴图，所以碎片自转时明暗关系始终跟着核心走，不会转错。
   */
  function drawShards() {
    const canvas = debrisRef.value;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, stageW, stageH);

    const lightX = coreX;
    const lightY = coreY;

    for (let i = 0; i < shards.length; i += 1) {
      let shard = shards[i];
      shard.r += shard.speed * 0.016;
      shard.a += shard.omega * 0.016;
      shard.spin += shard.spinV * 0.016;
      if (shard.r > 3.5) {
        shards[i] = createShard(false);
        shard = shards[i];
      }

      const px = lightX + Math.cos(shard.a) * coreR * shard.r * 1.5;
      const py = lightY + Math.sin(shard.a) * coreR * shard.r * 1.22;
      if (px < -90 || px > stageW + 90 || py < -90 || py > stageH + 90) continue;

      const size = coreR * shard.size * (0.34 + shard.r * 0.3);
      const alpha = Math.min(1, (shard.r - 0.42) / 0.55) * Math.max(0, Math.min(1, (3.5 - shard.r) / 1.1));
      if (alpha <= 0.01) continue;

      // 光线方向转到碎片局部坐标：碎片转了多少，就把光线反向转回去
      const ldx = lightX - px;
      const ldy = lightY - py;
      const dist = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
      const cos = Math.cos(-shard.spin);
      const sin = Math.sin(-shard.spin);
      const llx = (ldx / dist) * cos - (ldy / dist) * sin;
      const lly = (ldx / dist) * sin + (ldy / dist) * cos;

      // 点光源衰减：离核心越远，主光越弱
      const falloff = 0.95 * ((coreR * 1.5) / (coreR * 1.5 + dist * 0.9));
      const base = shard.albedo;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(shard.spin);
      ctx.scale(size, size);

      // 1) 棱面：逐面按「面法线 · 光向」着色，朝光的面亮、背光的面暗
      const ambient = base * SHARD_AMBIENT;
      for (const face of shard.faces) {
        const ndl = face.nx * llx + face.ny * lly;
        // 半兰伯特：把明暗交界摊开一点，避免棱面像水晶那样一刀切
        const dif = (ndl + SHARD_WRAP > 0 ? (ndl + SHARD_WRAP) / (1 + SHARD_WRAP) : 0) * falloff;
        const lit = base * dif;
        // 环境光偏冷（天光散射）、主光偏暖（传送门），两束光相加
        const r = (ambient * 0.86 + lit * 0.92 + 210 * dif * 0.5) | 0;
        const g = (ambient * 0.92 + lit * 0.86 + 150 * dif * 0.44) | 0;
        const b = (ambient * 1.1 + lit * 0.72 + 80 * dif * 0.34) | 0;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fill(face.path);
      }

      // 2) 颗粒与裂纹：贴图里不含光照，只贡献岩石的粗糙质感
      ctx.save();
      ctx.clip(shard.shape);
      ctx.globalAlpha = alpha * 0.9;
      const half = 1 / 0.94;
      ctx.drawImage(shard.detail, -half, -half, half * 2, half * 2);
      ctx.restore();

      // 3) 内侧压暗描边，让轮廓从亮背景里咬得出来
      ctx.lineWidth = 0.05;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.stroke(shard.shape);

      ctx.restore();
    }
  }

  /** 画余烬与浮尘：暖冷混色，缓慢上浮并左右轻摆 */
  function drawEmbers(timestamp: number) {
    const canvas = emberRef.value;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, stageW, stageH);

    for (let i = 0; i < embers.length; i += 1) {
      let ember = embers[i];
      ember.x += ember.vx;
      ember.y += ember.vy;
      if (ember.y < -0.05 || ember.x < -0.05 || ember.x > 1.05) {
        embers[i] = createEmber();
        ember = embers[i];
        ember.y = 0.75 + Math.random() * 0.3;
      }

      const sway = Math.sin(timestamp * 0.0006 + ember.phase) * 0.012;
      const px = (ember.x + sway) * stageW;
      const py = ember.y * stageH;
      const flicker = 0.55 + 0.45 * Math.sin(timestamp * 0.004 + ember.phase * 2);
      const alpha = Math.min(0.75, ember.r / 2.6) * flicker;
      const radius = ember.r * (stageW < PORTRAIT_MAX_WIDTH ? 1 : 1.35);

      const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 5);
      if (ember.warm) {
        glow.addColorStop(0, `rgba(255, 224, 168, ${alpha.toFixed(3)})`);
        glow.addColorStop(0.35, `rgba(255, 168, 72, ${(alpha * 0.42).toFixed(3)})`);
      } else {
        glow.addColorStop(0, `rgba(198, 240, 255, ${alpha.toFixed(3)})`);
        glow.addColorStop(0.35, `rgba(110, 205, 240, ${(alpha * 0.38).toFixed(3)})`);
      }
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, radius * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 随机闪电：隔 7~16 秒闪一次，偶尔连闪两下 */
  function scheduleFlash() {
    if (disposed || reduceMotion) return;
    flashTimer = window.setTimeout(
      () => {
        const el = flashRef.value;
        if (el) {
          el.classList.remove('on');
          void el.offsetWidth;
          el.classList.add('on');
          if (Math.random() > 0.6) {
            secondFlashTimer = window.setTimeout(() => {
              el.classList.remove('on');
              void el.offsetWidth;
              el.classList.add('on');
            }, 420);
          }
        }
        scheduleFlash();
      },
      7000 + Math.random() * 9000,
    );
  }

  function frame(timestamp: number) {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);

    // 画布按 45fps 上限更新：肉眼已看不出差别，但能明显省电
    if (!reduceMotion && timestamp - lastDraw > 1000 / 45) {
      lastDraw = timestamp;
      drawShards();
      drawEmbers(timestamp);
    }
  }

  onMounted(() => {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    shards = Array.from({ length: SHARD_COUNT }, () => createShard(false));
    embers = Array.from({ length: EMBER_COUNT }, () => createEmber());

    syncLayout();
    window.addEventListener('resize', syncLayout);

    rafId = requestAnimationFrame(frame);
    scheduleFlash();
  });

  onUnmounted(() => {
    disposed = true;
    cancelAnimationFrame(rafId);
    window.clearTimeout(flashTimer);
    window.clearTimeout(secondFlashTimer);
    window.removeEventListener('resize', syncLayout);
    shards = [];
    embers = [];
  });

  return {
    stageRef,
    debrisRef,
    emberRef,
    flashRef,
    plateSrc,
    auroraA,
    auroraB,
    glowVar,
    syncLayout,
  };
}
