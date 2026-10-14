<template>
  <div class="donate-panel">
    <!-- 感谢语 -->
    <section class="thanks-section">
      <div class="thanks-icon">
        <i class="ti ti-heart"></i>
      </div>
      <h3 class="thanks-title">{{ t('donate.title') }}</h3>
      <p class="thanks-text">{{ t('donate.text') }}</p>
      <p class="promise-text">{{ t('donate.kofiPromise') }}</p>
    </section>

    <!-- 支持方式：一律竖排。
         面板最宽 760px、最窄约 320px，横向并排时右边那块会被挤成浮空的膏药。 -->
    <section class="support-section">
      <div class="qrcode-block">
        <div class="qrcode-container">
          <img :src="qrCodeUrl" :alt="t('donate.qrAlt')" class="qrcode-image" />
        </div>
        <p class="qrcode-hint">o(*￣▽￣*)y</p>
      </div>

      <a class="kofi-link" :href="KOFI_URL" target="_blank" rel="noopener noreferrer">
        <span>{{ t('donate.kofiLink') }}</span>
        <i class="ti ti-external-link"></i>
      </a>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n';
// 导入二维码图片 - 使用 ?url 后缀让 webpack 将图片转为 base64
import qrCodeUrl from '../../assets/donate.png?url';

const KOFI_URL = 'https://ko-fi.com/myraid_realms_sim';

const { t } = useI18n();
</script>

<style scoped>
/* 整块居中成一根竖轴：内容少的时候不会全挤在面板顶上。
   min-height: 100% 配上 border-box，内距算在高度里，不会顶出滚动条。
   横向内距交给外层面板容器，两层都加会叠成 28px。 */
.donate-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-5);
  width: 100%;
  max-width: 320px;
  min-height: 100%;
  margin: 0 auto;
  padding: var(--ui-space-2) 0;
  box-sizing: border-box;
}

/* ===== 感谢语 ===== */
.thanks-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-2);
  width: 100%;
  text-align: center;
}

/* 跟随主题强调色。原来写死红色渐变，换到金属 / 古卷 / 武侠那几套主题时
   全站都变成金色了，只有这颗心还是红的。 */
.thanks-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: var(--ui-space-1);
  border-radius: 50%;
  background: var(--ui-accent-soft);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.24);
  color: var(--ui-accent);
  box-shadow: 0 6px 20px rgba(var(--accent-primary-rgb), 0.14);
}

.thanks-icon i {
  font-size: calc(24px * var(--ui-font-scale));
}

.thanks-title {
  margin: 0;
  font-size: calc(16px * var(--ui-font-scale));
  font-weight: 600;
  letter-spacing: calc(1px * var(--ui-font-scale));
  color: var(--ui-text);
}

.thanks-text {
  margin: 0;
  max-width: 280px;
  font-size: calc(12.5px * var(--ui-font-scale));
  line-height: var(--ui-leading-ui);
  color: var(--ui-muted);
}

/* 捐赠用途承诺：给一块浅底让它从说明语里站出来，
   不加描边、不用强调色 —— 免得看着像第二个按钮 */
.promise-text {
  margin: var(--ui-space-1) 0 0;
  width: 100%;
  padding: 10px 16px;
  border-radius: var(--ui-radius-sm);
  background: var(--ui-surface-3);
  font-size: calc(12.5px * var(--ui-font-scale));
  line-height: var(--ui-leading-ui);
  color: var(--ui-text);
  box-sizing: border-box;
}

/* ===== 支持方式 ===== */
.support-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-3);
  width: 100%;
}

.qrcode-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ui-space-2);
}

/* 这张码是圆形放射排布的「赞赏码」，模块密、白边窄，
   显示尺寸只能不小于原来的 200px，缩下去会扫不出来。
   它本体是黑色模块 + 全透明底（74% 像素 alpha=0），
   必须压一块接近纯白才成立 —— 所以这块白底不跟随主题，是功能需要。 */
.qrcode-container {
  width: min(220px, 100%);
  aspect-ratio: 1;
  padding: 12px;
  border-radius: var(--ui-radius-md);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
  box-sizing: border-box;
}

.qrcode-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qrcode-hint {
  margin: 0;
  font-size: calc(11.5px * var(--ui-font-scale));
  letter-spacing: calc(0.5px * var(--ui-font-scale));
  color: var(--ui-dim);
}

/* Ko-fi 外链：结构与悬停反馈对齐站内既有的整行外链范式 */
.kofi-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ui-space-2);
  width: 100%;
  padding: 11px 16px;
  border-radius: var(--ui-radius-sm);
  background: var(--ui-accent-soft);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.3);
  color: var(--ui-accent);
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 500;
  text-decoration: none;
  box-sizing: border-box;
  transition: all var(--transition-normal);
}

.kofi-link:hover {
  background: rgba(var(--accent-primary-rgb), 0.22);
  border-color: rgba(var(--accent-primary-rgb), 0.5);
  box-shadow: 0 4px 20px rgba(var(--accent-primary-rgb), 0.15);
  transform: translateY(-1px);
}

.kofi-link:active {
  transform: translateY(0);
}

.kofi-link i {
  font-size: calc(11px * var(--ui-font-scale));
  transition: transform var(--transition-normal);
}

.kofi-link:hover i {
  transform: translate(2px, -2px);
}
</style>
