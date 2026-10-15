<template>
  <div class="banner-slot">
    <div class="banner">
      <!-- 底图 + 压暗遮罩：单独包一层裁切，圆角只作用于画面，
           菜单下拉挂在这层之外，才不会被 overflow 切掉 -->
      <div class="banner-clip" :class="{ 'is-night': 是夜里 }" aria-hidden="true">
        <img class="banner-bg" :class="{ 'is-fading': isFading }" :src="ambienceUrl" alt="" />
        <div class="banner-scrim"></div>
      </div>

      <!-- 顶部信息行：纪元 + 货币 + 全屏 / 回到首页（原顶栏内容并入此处） -->
      <div class="banner-top">
        <div class="banner-era">
          <span class="era-dot"></span>
          <span class="era-txt">{{ 纪元名称 }}</span>
        </div>

        <div class="banner-top-right">
          <span class="banner-money">
            <i class="ti ti-coins"></i>
            <em>{{ 主货币名称 }}</em>
            <b>{{ 主货币数量 }}</b>
          </span>

          <!-- 两个图标按钮直接外露（原来是「···」下拉里的两项），最右是回到首页 -->
          <button
            class="banner-ibtn"
            type="button"
            :title="isFullscreen ? t('header.exitFullscreen') : t('header.enterFullscreen')"
            :aria-label="isFullscreen ? t('header.exitFullscreen') : t('header.enterFullscreen')"
            @click="toggleFullscreen"
          >
            <i :class="isFullscreen ? 'ti ti-arrows-minimize' : 'ti ti-arrows-maximize'"></i>
          </button>

          <button
            class="banner-ibtn"
            type="button"
            :disabled="isResetting"
            :title="isResetting ? t('header.resettingGame') : t('header.resetGame')"
            :aria-label="isResetting ? t('header.resettingGame') : t('header.resetGame')"
            @click="handleResetGame"
          >
            <i :class="isResetting ? 'ti ti-loader-2 ti-spin' : 'ti ti-home'"></i>
          </button>
        </div>
      </div>

      <!-- 底部：地点名 + 时间 / 天气 -->
      <div class="banner-txt">
        <button
          class="banner-place"
          type="button"
          :title="t('map.openHint')"
          @click="handleOpenMap"
        >
          <i class="ti ti-map-pin"></i>
          <span class="banner-place-txt">{{ 当前地点 }}</span>
          <i class="ti ti-chevron-right banner-place-arrow"></i>
        </button>
        <div class="banner-sub">
          <i class="ti ti-clock"></i>
          <span>{{ 当前时间 }}</span>
          <b>/</b>
          <span>{{ 当前天气 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useFullscreen } from '../../composables/useFullscreen';
import { useI18n } from '../../i18n';
import { useLayoutStore } from '../../stores/layout';
import { useMessagesStore } from '../../stores/messages';
import { useNotificationStore } from '../../stores/notification';
import { useSetupStore } from '../../stores/setup';
import { useStatDataStore } from '../../stores/statData';
import { clearPendingStandaloneArchiveResume } from '../../utils/archive';
import { clearLocalGameState } from '../../utils/localGameState';
import { matchWeather, isNight, type WeatherFamily, type WeatherVariant } from '../../utils/weatherFamily';

// 氛围底图：全部是中性抽象质感，不指向任何具体题材，配什么世界观都不出戏。
// 按天气挑 —— 「雨」就给雨幕、「雪」就给雪片，但都不画具体物件（地标/建筑/人物），换什么世界观都不出戏。
// ⚠️ 「不画具体物件」不等于「不画天气本身」：上一版把云/雨/雪/光都排掉了，
//    结果一锅质感、读不出是什么天气，被逐张点名「对不上天气」。
import amb01Mist from '../../assets/banner/amb-01-mist.webp?url';
import amb02Silk from '../../assets/banner/amb-02-silk.webp?url';
import amb03Water from '../../assets/banner/amb-03-water.webp?url';
import amb04Stormcloud from '../../assets/banner/amb-04-stormcloud.webp?url';
import amb06Frost from '../../assets/banner/amb-06-frost.webp?url';
import amb07Cloud from '../../assets/banner/amb-07-cloud.webp?url';
import amb08Grain from '../../assets/banner/amb-08-grain.webp?url';
import amb09Sunny from '../../assets/banner/amb-09-sunny.webp?url';
import amb10Cloudy from '../../assets/banner/amb-10-cloudy.webp?url';
import amb11Overcast from '../../assets/banner/amb-11-overcast.webp?url';
import amb12Rain from '../../assets/banner/amb-12-rain.webp?url';
import amb13Snow from '../../assets/banner/amb-13-snow.webp?url';
import amb14Heat from '../../assets/banner/amb-14-heat.webp?url';
import amb15Cold from '../../assets/banner/amb-15-cold.webp?url';
import amb16Sunlit from '../../assets/banner/amb-16-sunlit.webp?url';
import amb17Rainbow from '../../assets/banner/amb-17-rainbow.webp?url';
import amb18Aurora from '../../assets/banner/amb-18-aurora.webp?url';
import amb19Meteor from '../../assets/banner/amb-19-meteor.webp?url';
import amb20EclipseSolar from '../../assets/banner/amb-20-eclipse-solar.webp?url';
import amb21EclipseLunar from '../../assets/banner/amb-21-eclipse-lunar.webp?url';

// 认不出天气时退回的全表随机池
const AMBIENCE_URLS = [
  amb01Mist,
  amb02Silk,
  amb03Water,
  amb04Stormcloud,
  amb06Frost,
  amb07Cloud,
  amb08Grain,
  amb09Sunny,
  amb10Cloudy,
  amb11Overcast,
  amb12Rain,
  amb13Snow,
  amb14Heat,
  amb15Cold,
  amb16Sunlit,
];

/**
 * 天气大类 → 底图组。
 * 一组可以放多张，同组内随机 —— 大类不变就不重抽，避免「小雨→大雨」也换图闪一下。
 * 认不出天气（unknown）时退回全表随机，就是原来「进局随机挑一张」的观感。
 *
 * 图名里的 `amb-01..08` 是早期按质感起的名（mist 雾 / silk 丝 / water 水 /
 * frost 霜 / cloud 云 / grain 颗粒），`amb-09..16` 是按天气起的名，`amb-17..21` 是特殊天象，别混。
 * `amb-04-stormcloud` 原来是 `amb-04-ink`（墨晕），内容换成阴天厚云后**一并改了名** ——
 * 剩下的老名字（`water` / `frost` / `grain`）也偏松，**要改图先打开看一眼，别按名字猜内容**。
 */
const AMBIENCE_BY_FAMILY: Record<WeatherFamily, string[]> = {
  // ⚠️ 晴天这两张必须是**明亮**的暖金 —— 晴天要是一张暗底光柱，用户一眼就觉得「怎么是黑的」。
  sunny: [amb09Sunny, amb16Sunlit],
  cloudy: [amb10Cloudy, amb07Cloud],
  overcast: [amb11Overcast, amb04Stormcloud],
  rain: [amb12Rain, amb03Water],
  snow: [amb13Snow, amb06Frost],
  fog: [amb01Mist],
  sand: [amb08Grain],
  // 特殊天象正常走下面的 SPECIAL_BY_VARIANT，这里只当兜底
  special: [amb17Rainbow, amb18Aurora, amb19Meteor, amb20EclipseSolar, amb21EclipseLunar],
  heat: [amb14Heat],
  cold: [amb15Cold],
  unknown: AMBIENCE_URLS,
};

/**
 * 特殊天象再细一层：彩虹 / 极光 / 流星 / 日食 / 月食 长得完全不一样。
 * 五种共用一张的话，挑哪张都会跟另外四种对不上 —— 所以按「哪一种」各自配图。
 */
const SPECIAL_BY_VARIANT: Record<WeatherVariant, string[]> = {
  rainbow: [amb17Rainbow],
  aurora: [amb18Aurora],
  meteor: [amb19Meteor],
  'solar-eclipse': [amb20EclipseSolar],
  'lunar-eclipse': [amb21EclipseLunar],
};

/** 取天气对应的底图组；认不出就退回全表随机 */
function poolFor(weather: string): string[] {
  const matched = matchWeather(weather);
  if (!matched) return AMBIENCE_URLS;
  if (matched.family === 'special' && matched.variant) {
    return SPECIAL_BY_VARIANT[matched.variant] ?? AMBIENCE_URLS;
  }
  return AMBIENCE_BY_FAMILY[matched.family] ?? AMBIENCE_URLS;
}

/**
 * 换图的最小单位。
 * 特殊天象细到「哪一种」，其余按大类 —— 也就是「小雨→大雨不换图，晴→极光才换」。
 */
function ambienceKey(weather: string): string {
  const matched = matchWeather(weather);
  if (!matched) return 'unknown';
  return matched.family === 'special' && matched.variant ? `special:${matched.variant}` : matched.family;
}

function pickAmbience(weather: string): string {
  const pool = poolFor(weather);
  return pool[Math.floor(Math.random() * pool.length)] ?? AMBIENCE_URLS[0];
}

const emit = defineEmits<{
  (event: 'reset-game'): void;
}>();

const store = useStatDataStore();
const { data } = storeToRefs(store);
const layoutStore = useLayoutStore();
const messagesStore = useMessagesStore();
const notificationStore = useNotificationStore();
const setupStore = useSetupStore();
const { t } = useI18n();
const { isFullscreen, toggleFullscreen } = useFullscreen();

const 纪元名称 = computed(() => data.value.世界?.时间系统?.纪元名称 || t('header.defaultEraName'));
const 当前时间 = computed(() => data.value.世界?.时间系统?.当前时间 || '--');
const 当前天气 = computed(() => data.value.世界?.时间系统?.当前天气 || t('header.defaultWeather'));
const 当前地点 = computed(() => data.value.世界?.空间定位?.当前位置 || '--');

// 点地点名直接开地图面板 —— 地图页自己会定位到玩家当前所在地点
function handleOpenMap() {
  layoutStore.toggleOverlayPanel('map');
}
const 主货币名称 = computed(() => data.value.玩家?.货币资源?.主货币?.名称 || t('header.defaultCurrencyName'));
const 主货币数量 = computed(() => Math.floor(data.value.玩家?.货币资源?.主货币?.数量 || 0));

// 在 setup 阶段就定下来，避免首帧闪一张再换
const ambienceUrl = ref(pickAmbience(data.value.世界?.时间系统?.当前天气 || ''));

// 只在「天气组」变化时换图：小雨→大雨不该闪，晴→雨才换；特殊天象细到「哪一种」
const isFading = ref(false);

watch(
  () => ambienceKey(当前天气.value),
  () => {
    const pool = poolFor(当前天气.value);
    // 还在这个图组里 → 保持不动
    if (pool.includes(ambienceUrl.value)) return;

    const next = pool[Math.floor(Math.random() * pool.length)] ?? AMBIENCE_URLS[0];
    if (next === ambienceUrl.value) return;

    // 先淡出，图载好再换 —— 内联图几乎瞬间完成，但走这一步才不会露出空白底
    isFading.value = true;
    const preload = new Image();
    const swap = () => {
      ambienceUrl.value = next;
      requestAnimationFrame(() => {
        isFading.value = false;
      });
    };
    preload.onload = swap;
    preload.onerror = swap;
    preload.src = next;
  },
);

// 夜色压暗：先看时间（19 点~次日 6 点），时间文本里没有钟点才看天气词带不带「夜 / 月明 / 星空」
const 是夜里 = computed(() => isNight(当前时间.value, 当前天气.value));

// —— 回到首页 ——
// 点击会清掉本局运行状态（存档不受影响），所以照旧先弹一次确认，确认了才动手。
const isResetting = ref(false);

async function handleResetGame() {
  if (isResetting.value) {
    return;
  }

  const confirmed = await notificationStore.confirm({
    title: t('header.resetGameConfirmTitle'),
    message: t('header.resetGameConfirmMessage'),
    type: 'danger',
    confirmText: t('header.continueResetGame'),
  });

  if (!confirmed) {
    return;
  }

  isResetting.value = true;

  try {
    clearPendingStandaloneArchiveResume();
    clearLocalGameState();
    setupStore.reset();
    messagesStore.clearMessages();
    emit('reset-game');

    notificationStore.success(t('header.resetGameSuccess'));
  } catch (error) {
    console.error('[SceneBanner] 回到首页失败:', error);
    notificationStore.error(
      t('header.resetGameFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isResetting.value = false;
  }
}
</script>

<style scoped>
/* ===== SceneBanner · 场景横幅 =====
   原顶栏（局名 / 时间·地点·天气 / 货币 / 全屏 / 回到首页）全部并入此处，顶栏本身只隐藏不删。
   高度由 --ui-banner-ar 算，不写死像素；颜色字号一律走令牌。 */

/* 外层只负责限宽居中，和正文列同宽同内边距，左右边缘跟消息卡片对齐 */
.banner-slot {
  flex: 0 0 auto;
  width: 100%;
  max-width: var(--ui-reading-w, 750px);
  margin: 0 auto;
  padding: var(--ui-space-4) 18px var(--ui-space-2);
}

.banner {
  /* 横幅上的控件尺寸：右上那两枚图标按钮共用，改一处两个一起变 */
  --banner-ctl: 30px;
  position: relative;
  /* ⚠️ width: 100% 不能省 —— 只有 aspect-ratio + max-height 时，
     浏览器会拿「被压过的高度」按比例反推宽度（实测 140 × 3.2 = 448px），
     横幅就比正文列窄一大截。显式钉住宽度后，宽度跟正文列走，
     比例只负责算高度；高度再由 max-height 封顶，多出的画面由底图 cover 裁掉。 */
  width: 100%;
  aspect-ratio: var(--ui-banner-ar);
  max-height: var(--ui-banner-h-max, 140px);
  border-radius: var(--ui-banner-r);
  flex: 0 0 auto;
  color: var(--ui-on-scrim);
  background: linear-gradient(135deg, var(--ui-accent-soft), transparent 62%), var(--ui-surface-2);
}

/* 只裁画面，不裁菜单 */
.banner-clip {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
}

.banner-bg {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: var(--ui-banner-focus, 50% 50%);
  transition:
    opacity var(--ui-banner-fade, 0.6s) ease,
    filter var(--ui-banner-fade, 0.6s) ease;
}

/* 换天气时先淡出再淡入，别硬切 */
.banner-bg.is-fading {
  opacity: 0;
}

/* 夜里：整幅压暗 + 偏冷，靠滤镜做，不额外加图 */
.banner-clip.is-night .banner-bg {
  filter: brightness(0.62) saturate(0.78) hue-rotate(-8deg);
}

.banner-clip.is-night .banner-scrim {
  background: linear-gradient(
    180deg,
    rgba(var(--ui-scrim-rgb), 0.72) 0%,
    rgba(var(--ui-scrim-rgb), 0.34) 24%,
    rgba(var(--ui-scrim-rgb), 0.38) 54%,
    rgba(var(--ui-scrim-rgb), 0.86) 100%
  );
}

/* 上下都要压暗：顶部压局名/货币/菜单，底部压地点与时间 */
.banner-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(var(--ui-scrim-rgb), 0.62) 0%,
    rgba(var(--ui-scrim-rgb), 0.2) 24%,
    rgba(var(--ui-scrim-rgb), 0.26) 54%,
    rgba(var(--ui-scrim-rgb), 0.8) 100%
  );
}

/* —— 顶部信息行 ——
   z-index 要比 .banner-txt 高，压在图上的一行别被底部那行字盖住 */
.banner-top {
  position: absolute;
  left: var(--ui-space-5);
  right: var(--ui-space-5);
  top: var(--ui-space-4);
  z-index: 3;
  display: flex;
  align-items: center;
  gap: var(--ui-space-3);
}

.banner-era {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
  min-width: 0;
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  font-weight: 500;
  color: var(--ui-on-scrim);
  text-shadow: 0 1px 10px rgba(var(--ui-scrim-rgb), 0.7);
}

.era-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ui-on-scrim-accent);
  box-shadow: 0 0 10px rgba(var(--ui-on-scrim-accent-rgb), 0.14);
}

.era-txt {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.banner-top-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
}

/* 货币：图标 + 名称 + 数量（结构与原顶栏 header-currency 一致） */
.banner-money {
  display: inline-flex;
  align-items: center;
  gap: var(--ui-space-2);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.banner-money i {
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  color: var(--ui-on-scrim-success);
}

.banner-money em {
  font-style: normal;
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  color: var(--ui-on-scrim-dim);
  text-shadow: 0 1px 10px rgba(var(--ui-scrim-rgb), 0.7);
}

.banner-money b {
  font-family: var(--font-mono);
  font-size: calc(var(--ui-fs-name) * var(--ui-font-scale));
  font-weight: 600;
  color: var(--ui-on-scrim-accent);
  text-shadow: 0 1px 10px rgba(var(--ui-scrim-rgb), 0.7);
}

/* 压在图上，按钮要自带底才看得见 */
.banner-ibtn {
  width: var(--banner-ctl);
  height: var(--banner-ctl);
  border-radius: var(--ui-radius-sm);
  display: grid;
  place-items: center;
  font-size: calc(var(--ui-fs-body) * var(--ui-font-scale));
  color: var(--ui-on-scrim);
  background: rgba(var(--ui-scrim-rgb), 0.26);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.banner-ibtn:hover {
  background: rgba(var(--ui-scrim-rgb), 0.44);
  color: var(--ui-on-scrim-accent);
}

/* 回到首页处理中：按钮灭灯，别让人连点 */
.banner-ibtn:disabled {
  opacity: 0.5;
  cursor: default;
}

.banner-ibtn:disabled:hover {
  background: rgba(var(--ui-scrim-rgb), 0.26);
  color: var(--ui-on-scrim);
}

/* —— 底部：地点名 + 时间 / 天气 —— */
.banner-txt {
  position: absolute;
  left: var(--ui-space-5);
  right: var(--ui-space-5);
  bottom: var(--ui-space-4);
  z-index: 2;
}

.banner-place {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
  min-width: 0;
  max-width: 100%;
  padding: 2px 6px 2px 0;
  font-family: var(--font-mono);
  font-size: calc(var(--ui-fs-meta) * var(--ui-font-scale));
  color: var(--ui-on-scrim);
  opacity: 0.62;
  text-shadow: 0 1px 10px rgba(var(--ui-scrim-rgb), 0.6);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity var(--motion-fast), color var(--motion-fast);
}

.banner-place:hover {
  opacity: 0.95;
  color: var(--ui-on-scrim-accent);
}

.banner-place i {
  flex: 0 0 auto;
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  color: var(--ui-on-scrim-accent);
}

.banner-place-arrow {
  flex: 0 0 auto;
  opacity: 0;
  font-size: calc(11px * var(--ui-font-scale)) !important;
  transition: opacity var(--motion-fast), transform var(--motion-fast);
}

.banner-place:hover .banner-place-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.banner-place-txt {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.banner-sub {
  margin-top: var(--ui-space-1);
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: calc(var(--ui-fs-meta) * var(--ui-font-scale));
  color: var(--ui-on-scrim);
  opacity: 0.62;
  text-shadow: 0 1px 10px rgba(var(--ui-scrim-rgb), 0.6);
}

.banner-sub b {
  font-weight: 400;
  opacity: 0.42;
}

/* 时间图标与地点图标同一套规格，两行才对得齐 */
.banner-sub i {
  flex: 0 0 auto;
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  color: var(--ui-on-scrim-accent);
}

/* ===== 响应式：断点与主项目一致（1023 / 767 / 480）===== */
@media (max-width: 1023px) {
  .banner-slot {
    padding: var(--ui-space-3) 14px var(--ui-space-2);
  }
}

@media (max-width: 768px) {
  .banner-slot {
    padding: var(--ui-space-3) 12px var(--ui-space-2);
  }

  /* 留白收窄，货币只留数字 */
  .banner-top {
    left: var(--ui-space-4);
    right: var(--ui-space-4);
    top: var(--ui-space-3);
    gap: var(--ui-space-2);
  }

  .banner-money em {
    display: none;
  }

  .banner-txt {
    left: var(--ui-space-4);
    right: var(--ui-space-4);
    bottom: var(--ui-space-3);
  }
}

@media (max-width: 480px) {
  .banner-era {
    font-size: calc(var(--ui-fs-meta) * var(--ui-font-scale));
  }
}
</style>
