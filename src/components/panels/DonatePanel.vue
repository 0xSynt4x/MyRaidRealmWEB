<template>
  <div class="donate-panel">
    <!-- 感谢语 -->
    <section class="thanks-section">
      <div class="thanks-icon">
        <i class="ti ti-heart"></i>
      </div>
      <h3 class="thanks-title">{{ t('donate.title') }}</h3>
      <p class="thanks-text">{{ t('donate.text') }}</p>
    </section>

    <!-- 二维码区域 -->
    <section class="qrcode-section">
      <div class="qrcode-container">
        <img :src="qrCodeUrl" :alt="t('donate.qrAlt')" class="qrcode-image" />
      </div>
      <p class="qrcode-hint">o(*￣▽￣*)y</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n';
// 导入二维码图片 - 使用 ?url 后缀让 webpack 将图片转为 base64
import qrCodeUrl from '../../assets/donate.png?url';

const { t } = useI18n();
</script>

<style scoped>
.donate-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 16px;
}

/* 感谢语区域 */
.thanks-section {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.thanks-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(238, 90, 90, 0.3);
}

.thanks-icon i {
  font-size: calc(28px * var(--ui-font-scale));
  color: white;
}

.thanks-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
}

.thanks-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 280px;
}

/* 二维码区域 */
.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qrcode-container {
  width: 200px;
  height: 200px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.555);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.qrcode-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qrcode-hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}
</style>
