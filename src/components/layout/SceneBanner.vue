<template>
  <div class="banner-slot">
    <div class="banner">
      <!-- 底图 + 压暗遮罩：单独包一层裁切，圆角只作用于画面，
           菜单下拉挂在这层之外，才不会被 overflow 切掉 -->
      <div class="banner-clip" :class="{ 'is-night': 是夜里 }" aria-hidden="true">
        <img class="banner-bg" :class="{ 'is-fading': isFading }" :src="ambienceUrl" alt="" />
        <div class="banner-scrim"></div>
      </div>

      <!-- 顶部信息行：局名 + 货币 + 三点菜单（原顶栏内容并入此处） -->
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

          <div ref="menuWrapRef" class="banner-menu-wrap">
            <button
              class="banner-ibtn"
              :class="{ 'is-open': isMenuOpen }"
              :title="t('header.moreActions')"
              aria-haspopup="menu"
              :aria-expanded="isMenuOpen"
              @click="toggleMenu"
            >
              <i class="ti ti-dots"></i>
            </button>

            <!-- 下拉：菜单项不写文字，解释走悬停气泡（data-tip → ::after） -->
            <Transition name="banner-menu">
              <div v-if="isMenuOpen" class="banner-menu" role="menu" :aria-label="t('header.topActionMenu')">
                <button
                  class="banner-menu-item"
                  role="menuitem"
                  :disabled="isRefreshing"
                  :aria-label="isRefreshing ? t('header.refreshing') : t('header.refreshVariables')"
                  :data-tip="isRefreshing ? t('header.refreshing') : t('header.refreshVariables')"
                  @click="runMenuAction(handleRefreshApi)"
                >
                  <i class="ti ti-wand" :class="{ 'ti-spin': isRefreshing }"></i>
                </button>

                <button
                  class="banner-menu-item"
                  role="menuitem"
                  :disabled="isArchiving"
                  :aria-label="isArchiving ? t('header.archiving') : t('header.archiveAndDownload')"
                  :data-tip="isArchiving ? t('header.archiving') : t('header.archiveAndDownload')"
                  @click="runMenuAction(handleArchive)"
                >
                  <i :class="isArchiving ? 'ti ti-loader-2 ti-spin' : 'ti ti-device-floppy'"></i>
                </button>

                <button
                  class="banner-menu-item is-danger"
                  role="menuitem"
                  :disabled="isResetting"
                  :aria-label="isResetting ? t('header.resettingGame') : t('header.resetGame')"
                  :data-tip="isResetting ? t('header.resettingGame') : t('header.resetGame')"
                  @click="runMenuAction(handleResetGame)"
                >
                  <i :class="isResetting ? 'ti ti-loader-2 ti-spin' : 'ti ti-rotate'"></i>
                </button>

                <button
                  class="banner-menu-item"
                  role="menuitem"
                  :aria-label="isFullscreen ? t('header.exitFullscreen') : t('header.enterFullscreen')"
                  :data-tip="isFullscreen ? t('header.exitFullscreen') : t('header.enterFullscreen')"
                  @click="runMenuAction(toggleFullscreen)"
                >
                  <i :class="isFullscreen ? 'ti ti-arrows-minimize' : 'ti ti-arrows-maximize'"></i>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- 底部：地点名 + 时间 / 天气 -->
      <div class="banner-txt">
        <div class="banner-place">
          <i class="ti ti-map-pin"></i>
          <span class="banner-place-txt">{{ 当前地点 }}</span>
        </div>
        <div class="banner-sub">
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useFullscreen } from '../../composables/useFullscreen';
import { useMessageActions } from '../../composables/useMessageActions';
import { useI18n } from '../../i18n';
import { useMessagesStore } from '../../stores/messages';
import { useNotificationStore } from '../../stores/notification';
import { useSetupStore } from '../../stores/setup';
import { useStatDataStore } from '../../stores/statData';
import { clearPendingStandaloneArchiveResume, saveCurrentArchive } from '../../utils/archive';
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
const messagesStore = useMessagesStore();
const notificationStore = useNotificationStore();
const setupStore = useSetupStore();
const messageActions = useMessageActions();
const { t } = useI18n();
const { isFullscreen, toggleFullscreen } = useFullscreen();

const 纪元名称 = computed(() => data.value.世界?.时间系统?.纪元名称 || t('header.defaultEraName'));
const 当前时间 = computed(() => data.value.世界?.时间系统?.当前时间 || '--');
const 当前天气 = computed(() => data.value.世界?.时间系统?.当前天气 || t('header.defaultWeather'));
const 当前地点 = computed(() => data.value.世界?.空间定位?.当前位置 || '--');
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

// —— 三点菜单（原顶栏下拉，四项：刷新变量 / 存档下载 / 重置游戏 / 全屏）——
const isRefreshing = ref(false);
const isArchiving = ref(false);
const isResetting = ref(false);
const menuWrapRef = ref<HTMLElement | null>(null);
const isMenuOpen = ref(false);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

function handleMenuClickOutside(event: MouseEvent) {
  const root = menuWrapRef.value;
  if (!root) return;
  if (!root.contains(event.target as Node)) {
    closeMenu();
  }
}

function handleMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu();
  }
}

function runMenuAction(action: () => void) {
  closeMenu();
  action();
}

onMounted(() => {
  document.addEventListener('mousedown', handleMenuClickOutside);
  document.addEventListener('keydown', handleMenuKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleMenuClickOutside);
  document.removeEventListener('keydown', handleMenuKeydown);
});

async function handleArchive() {
  if (isArchiving.value) {
    return;
  }

  const confirmed = await notificationStore.confirm({
    title: t('header.archiveConfirmTitle'),
    message: t('header.archiveConfirmMessage'),
    type: 'info',
    confirmText: t('header.continueArchive'),
  });

  if (!confirmed) {
    return;
  }

  isArchiving.value = true;

  try {
    await saveCurrentArchive();
    notificationStore.success(t('header.archiveSuccess'));
  } catch (error) {
    console.error('[SceneBanner] 存档失败:', error);
    notificationStore.error(
      t('header.archiveFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isArchiving.value = false;
  }
}

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
    console.error('[SceneBanner] 重置游戏失败:', error);
    notificationStore.error(
      t('header.resetGameFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isResetting.value = false;
  }
}

// 手动重跑最近一条 AI 回复的变量更新
async function handleRefreshApi() {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  try {
    await messageActions.refreshLatestAssistantVariableUpdate('scene_banner_manual_variable_refresh');
  } catch (error) {
    console.error('[SceneBanner] 刷新失败:', error);
    notificationStore.error(
      t('header.archiveFailed', { error: error instanceof Error ? error.message : String(error) }),
    );
  } finally {
    isRefreshing.value = false;
  }
}
</script>

<style scoped>
/* ===== SceneBanner · 场景横幅 =====
   原顶栏（局名 / 时间·地点·天气 / 货币 / 三点菜单）全部并入此处，顶栏本身只隐藏不删。
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
  /* 横幅上的控件尺寸：三点按钮和它下面那列菜单共用，改一处两边一起变 */
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
   z-index 要比 .banner-txt 高，否则下拉菜单会被底部那行字盖住 */
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

/* 菜单开着时按钮不熄灯，让人知道菜单是它开的 */
.banner-ibtn.is-open {
  background: rgba(var(--ui-scrim-rgb), 0.5);
  color: var(--ui-on-scrim-accent);
}

/* —— 三点菜单下拉 ——
   列宽 / 圆角 / 右边缘全跟「···」按钮对齐，它就成了按钮的延长，
   而不是贴在旁边的一块。原来每项 32px 再套 4px 内边距 = 40px，比按钮胖一圈。 */
.banner-menu-wrap {
  position: relative;
}

.banner-menu {
  position: absolute;
  right: 0;
  top: calc(100% + var(--ui-space-2));
  z-index: 6;
  width: var(--banner-ctl);
  padding: var(--ui-space-1) 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--ui-radius-sm);
  background: rgba(var(--ui-scrim-rgb), 0.44);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lg);
  transform-origin: top right;
}

/* 下拉动画：展开从按钮下缘落下来，收起原路收回 */
.banner-menu-enter-active,
.banner-menu-leave-active {
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.banner-menu-enter-from,
.banner-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.banner-menu-item {
  position: relative;
  width: var(--banner-ctl);
  height: var(--banner-ctl);
  border-radius: var(--ui-radius-sm);
  display: grid;
  place-items: center;
  font-size: calc(var(--ui-fs-body) * var(--ui-font-scale));
  color: var(--ui-on-scrim);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.banner-menu-item:hover:not(:disabled) {
  background: rgba(var(--ui-on-scrim-accent-rgb), 0.16);
  color: var(--ui-on-scrim-accent);
}

/* 会清档的那个：悬停走危险色，跟其它三项分开 */
.banner-menu-item.is-danger:hover:not(:disabled) {
  background: rgba(var(--ui-on-scrim-danger-rgb), 0.2);
  color: var(--ui-on-scrim-danger);
}

.banner-menu-item:disabled {
  opacity: 0.5;
  cursor: default;
}

/* 悬停解释气泡：从菜单左侧弹出来。
   ⚠️ 菜单容器不能加 overflow:hidden —— 会把气泡一起裁掉，圆角改由菜单项自己兜。 */
.banner-menu-item::after {
  content: attr(data-tip);
  position: absolute;
  right: calc(100% + var(--ui-space-2));
  top: 50%;
  transform: translateY(-50%) translateX(4px);
  padding: var(--ui-space-1) var(--ui-space-2);
  border-radius: var(--ui-radius-sm);
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  line-height: 1;
  white-space: nowrap;
  color: var(--ui-text);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.banner-menu-item:hover::after {
  opacity: 1;
  transform: translateY(-50%);
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
  font-size: calc(var(--ui-fs-scene) * var(--ui-font-scale));
  font-weight: 600;
  text-shadow: 0 1px 12px rgba(var(--ui-scrim-rgb), 0.6);
}

.banner-place i {
  flex: 0 0 auto;
  font-size: calc(var(--ui-fs-label) * var(--ui-font-scale));
  color: var(--ui-on-scrim-accent);
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

  .banner-place {
    font-size: calc(var(--ui-fs-name) * var(--ui-font-scale));
  }
}
</style>
