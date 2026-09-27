<template>
  <!--
    🔴 defer 不能删：本弹窗在首页首帧就要显示，而挂载点 #modal-container 在 App 组件树内部，
    此刻 .app-container 还没插进 document → Teleport 找不到目标，内容会被整块丢弃
    （Vue 只在 dev 下警告，生产静默不显示）。defer 让目标解析推迟到应用挂载完成后。
  -->
  <Teleport to="#modal-container" defer>
    <Transition name="changelog-fade">
      <div
        v-if="visible"
        class="changelog-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="t('changelog.title')"
        @click.self="$emit('close')"
      >
        <div class="changelog-modal">
          <!-- 顶部渐变装饰线 -->
          <div class="modal-accent-bar"></div>

          <button
            class="close-btn"
            :title="t('changelog.close')"
            :aria-label="t('changelog.close')"
            @click="$emit('close')"
          >
            <i class="ti ti-x"></i>
          </button>

          <div class="changelog-body">
            <section v-for="entry in entries" :key="entry.date" class="entry">
              <div class="entry-head">
                <span class="entry-dot" aria-hidden="true"></span>
                <span class="entry-date">{{ entry.date }}</span>
              </div>
              <ul class="entry-items">
                <li v-for="(item, index) in entry.items" :key="index" class="entry-item">
                  <span class="item-dash" aria-hidden="true">-</span>
                  <span class="item-text">{{ item }}</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from '../../i18n';
import { getChangelogEntries } from '../../utils/changelog';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

// 最新在最前，由数据模块负责排序
const entries = computed(() => getChangelogEntries());

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/*
  遮罩层：只压暗，不做磨砂。
  🔴 不要给遮罩加 backdrop-filter —— 整页被模糊会让用户误以为界面本身出了问题，
  毛玻璃效果只留在弹窗卡片自己身上。
  🔴 暗度不能高：首页背景本身是暗色场景图，遮罩一压到 50%，弹窗再叠一层深色底，
  两者亮度就趋同了 → 弹窗看着是实心黑、透不出背后。0.25 是能压住背景又不吃掉纹理的量。
*/
.changelog-overlay {
  position: absolute;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.25);
}

/* ===== 弹窗主体 ===== */
.changelog-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  /* 高度固定：内容多少都不变，超出部分在 .changelog-body 里滚动。
     上限 520px（约 8 条可见），窄屏再按视口收缩。 */
  height: min(520px, 78%);
  overflow: hidden;
  border-radius: 16px;
  background: transparent;
  border: 1px solid var(--glass-border);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  /*
    🔴 不给卡片加 backdrop-filter：磨砂（blur）会把背后的画面糊成一片均匀色块，
    视觉上反而「更不透明」—— 想要真半透明，就得让背后的画面清晰透出来。
    文字与强调色一律沿用 global.css 的主题变量，这里不另起一套色值。
  */
}

/*
  半透明底。
  🔴 用主题的玻璃底色 + 不透明度，而不是直接拿 --glass-bg-heavy 原值（0.97）：
     原值是不透明的实色面（global.css 注释：「玻璃拟态系统 - 改为实色面，不做模糊」），
     叠在首页封面上就是一块实心色，没有玻璃感。
  🔴 0.92 = 只留一点点透明：有效不透明度约 0.89，背后封面只透出约 11%，
     凑近能看见一点光影，远看仍是实色面。
  🔴 用伪元素 + opacity 而不是给 background 套 color-mix：各主题的 --glass-bg-heavy
     有的是 rgba、有的是渐变（见 global.css 的液态玻璃主题），color-mix 遇到渐变会整条声明失效。
  用伪元素铺底而不是直接给 .changelog-modal 设 background，是为了让内容层统一 z-index: 1 叠在上面。
*/
.changelog-modal::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--glass-bg-heavy);
  opacity: 0.92;
  pointer-events: none;
}

/* ===== 顶部渐变装饰线 ===== */
.modal-accent-bar {
  position: relative;
  z-index: 1;
  height: 3px;
  flex: 0 0 auto;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-primary) 80%, transparent),
    var(--accent-primary),
    color-mix(in srgb, var(--accent-primary) 60%, transparent)
  );
  background-size: 200% 100%;
  animation: changelogAccentShift 4s ease infinite;
}

@keyframes changelogAccentShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* ===== 关闭按钮 ===== */
.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--text-primary) 8%, transparent);
  color: var(--text-secondary);
  font-size: calc(14px * var(--ui-font-scale));
  cursor: pointer;
  transition:
    background var(--motion-fast, 200ms ease),
    color var(--motion-fast, 200ms ease),
    transform var(--motion-fast, 200ms ease);
}

.close-btn:hover {
  background: color-mix(in srgb, var(--text-primary) 16%, transparent);
  color: var(--text-primary);
  transform: rotate(90deg) scale(1.1);
}

.close-btn:active {
  transform: rotate(90deg) scale(0.95);
}

/* ===== 内容区 ===== */
/*
  🔴 类名必须是 .changelog-body，不能用 .modal-body。
  .modal-body 是项目公共模态框系统（商业详情 / 派系详情 / 生成图浏览共用）的类名，
  global.css 给它配了 `background: var(--bg-primary)` —— 那是一块不透明实色底，
  会盖住整张卡片，让本弹窗的半透明底怎么调都看不出效果。专属类名可彻底隔离。
*/
.changelog-body {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  /* 顶部留出右上角关闭按钮的空间（原标题区已去掉） */
  padding: 16px 24px 22px;
}

.changelog-body::-webkit-scrollbar {
  width: 4px;
}

.changelog-body::-webkit-scrollbar-track {
  background: transparent;
}

.changelog-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-primary) 14%, transparent);
  border-radius: 2px;
}

.changelog-body::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--text-primary) 24%, transparent);
}

/* ===== 时间轴条目 ===== */
.entry {
  position: relative;
  padding-left: 18px;
}

/* 竖线：连到下一个条目，最后一条不画 */
.entry:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 14px;
  bottom: 0;
  left: 3px;
  width: 1px;
  background: var(--glass-border);
}

.entry-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}

/* 圆点：压在竖线上 */
.entry-dot {
  position: absolute;
  left: -18px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 18%, transparent);
}

.entry-date {
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--accent-primary);
}

.entry-items {
  margin: 6px 0 16px;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-item {
  display: flex;
  gap: 8px;
  font-size: calc(13px * var(--ui-font-scale));
  line-height: 1.6;
  color: var(--text-primary);
}

.item-dash {
  flex: 0 0 auto;
  color: var(--text-secondary);
}

.item-text {
  flex: 1 1 auto;
}

/* ===== 过渡 ===== */
.changelog-fade-enter-active,
.changelog-fade-leave-active {
  transition: opacity 220ms ease;
}

.changelog-fade-enter-active .changelog-modal,
.changelog-fade-leave-active .changelog-modal {
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
}

.changelog-fade-enter-from,
.changelog-fade-leave-to {
  opacity: 0;
}

.changelog-fade-enter-from .changelog-modal,
.changelog-fade-leave-to .changelog-modal {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 480px) {
  .changelog-modal {
    height: min(560px, 86%);
  }

  .changelog-body {
    padding: 14px 18px 18px;
  }
}
</style>
