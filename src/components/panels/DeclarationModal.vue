<template>
  <Teleport to="#modal-container">
    <Transition name="modal">
      <div v-if="visible" class="declaration-overlay" @click.self="$emit('close')">
        <div class="declaration-modal">
          <!-- 顶部渐变装饰线 -->
          <div class="modal-gradient-bar"></div>

          <!-- 关闭按钮 -->
          <button class="close-btn" @click="$emit('close')">
            <i class="ti ti-x"></i>
          </button>

          <!-- 标题区 -->
          <div class="modal-header">
            <div class="header-icon">
              <i class="ti ti-certificate"></i>
            </div>
            <h2 class="header-title">DECLARATION</h2>
            <p class="header-subtitle">{{ t('declaration.subtitle') }}</p>
          </div>

          <!-- 作者信息卡片 -->
          <div class="info-cards">
            <div class="info-card">
              <div class="info-card-icon">
                <i class="ti ti-feather"></i>
              </div>
              <div class="info-card-content">
                <span class="info-label">{{ t('declaration.author') }}</span>
                <span class="info-value">Chr</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-card-icon">
                <i class="ti ti-broadcast"></i>
              </div>
              <div class="info-card-content">
                <span class="info-label">{{ t('declaration.platform') }}</span>
                <span class="info-value">类脑ΟΡΙΖΟΝΤΑΣ</span>
              </div>
            </div>
          </div>

          <!-- 免费声明徽章 -->
          <div class="free-badge">
            <div class="badge-glow"></div>
            <i class="ti ti-gift"></i>
            <div class="badge-text">
              <span class="badge-main">{{ t('declaration.freeMain') }}</span>
              <span class="badge-sub">{{ t('declaration.freeSub') }}</span>
            </div>
          </div>

          <!-- 许可协议 -->
          <div class="license-section">
            <div class="license-header">
              <span class="license-badge">CC BY-NC-SA 4.0</span>
              <span class="license-name">Creative Commons</span>
            </div>

            <div class="license-terms">
              <div class="term-card">
                <div class="term-icon by">
                  <i class="ti ti-user-edit"></i>
                </div>
                <div class="term-content">
                  <span class="term-label">Attribution</span>
                  <span class="term-desc">{{ t('declaration.attributionDesc') }}</span>
                </div>
              </div>
              <div class="term-card">
                <div class="term-icon nc">
                  <i class="ti ti-ban"></i>
                </div>
                <div class="term-content">
                  <span class="term-label">NonCommercial</span>
                  <span class="term-desc">{{ t('declaration.nonCommercialDesc') }}</span>
                </div>
              </div>
              <div class="term-card">
                <div class="term-icon sa">
                  <i class="ti ti-share"></i>
                </div>
                <div class="term-content">
                  <span class="term-label">ShareAlike</span>
                  <span class="term-desc">{{ t('declaration.shareAlikeDesc') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 查看完整协议链接 -->
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            class="license-link"
          >
            <span>{{ t('declaration.viewFullLicense') }}</span>
            <i class="ti ti-external-link"></i>
          </a>

          <!-- 底部提示 -->
          <p class="footer-note">
            <i class="ti ti-info-circle"></i>
            {{ t('declaration.footerNote') }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n';

defineProps<{
  visible: boolean;
}>();

const { t } = useI18n();

defineEmits<{
  close: [];
}>();
</script>

<style scoped>
/* ===== 过渡动画 ===== */
.modal-enter-active,
.modal-leave-active {
  transition: all 350ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-active .declaration-modal,
.modal-leave-active .declaration-modal {
  transition: all 350ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .declaration-modal,
.modal-leave-to .declaration-modal {
  transform: scale(0.88) translateY(20px);
  opacity: 0;
}

/* ===== 遮罩层 ===== */
.declaration-overlay {
  position: absolute;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ===== 弹窗主体 ===== */
.declaration-modal {
  position: relative;
  width: 100%;
  max-width: 420px;
  max-height: 85%;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 16px;
  background: var(--bg-card, #1a1a2e);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 1px 0 rgba(255, 255, 255, 0.06) inset;
  padding: 0 20px 20px;
}

/* 滚动条美化 */
.declaration-modal::-webkit-scrollbar {
  width: 4px;
}

.declaration-modal::-webkit-scrollbar-track {
  background: transparent;
}

.declaration-modal::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
}

.declaration-modal::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* ===== 顶部渐变装饰线 ===== */
.modal-gradient-bar {
  height: 3px;
  margin: 0 -20px;
  background: linear-gradient(90deg, hsl(280, 65%, 55%), hsl(220, 80%, 60%), hsl(180, 70%, 50%), hsl(150, 65%, 50%));
  background-size: 200% 100%;
  animation: gradientShift 4s ease infinite;
  border-radius: 16px 16px 0 0;
}

@keyframes gradientShift {
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
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary, #888);
  font-size: calc(14px * var(--ui-font-scale));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 250ms ease;
  z-index: 2;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-primary, #fff);
  transform: rotate(90deg) scale(1.1);
}

.close-btn:active {
  transform: rotate(90deg) scale(0.95);
}

/* ===== 标题区 ===== */
.modal-header {
  text-align: center;
  padding: 24px 0 16px;
}

.header-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, hsl(280, 60%, 50%), hsl(220, 70%, 55%));
  color: white;
  font-size: calc(20px * var(--ui-font-scale));
  margin-bottom: 12px;
  box-shadow: 0 8px 24px rgba(120, 80, 200, 0.3);
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.header-title {
  margin: 0;
  font-size: calc(20px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 4px;
  background: linear-gradient(135deg, hsl(280, 65%, 65%), hsl(220, 80%, 70%), hsl(180, 60%, 60%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--text-secondary, #888);
  letter-spacing: 8px;
  font-weight: 300;
}

/* ===== 信息卡片 ===== */
.info-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 250ms ease;
}

.info-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.info-card-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(14px * var(--ui-font-scale));
  flex-shrink: 0;
}

.info-card:first-child .info-card-icon {
  background: linear-gradient(135deg, hsl(280, 50%, 45%), hsl(280, 50%, 35%));
  color: hsl(280, 80%, 80%);
}

.info-card:last-child .info-card-icon {
  background: linear-gradient(135deg, hsl(220, 50%, 45%), hsl(220, 50%, 35%));
  color: hsl(220, 80%, 80%);
}

.info-card-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.info-label {
  font-size: calc(10px * var(--ui-font-scale));
  color: var(--text-secondary, #888);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.info-value {
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 600;
  color: var(--text-primary, #eee);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 免费声明徽章 ===== */
.free-badge {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.08), rgba(16, 185, 129, 0.04));
  border: 1px solid rgba(52, 211, 153, 0.2);
  margin-bottom: 14px;
  overflow: hidden;
}

.badge-glow {
  position: absolute;
  top: -50%;
  right: -20%;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.15), transparent 70%);
  pointer-events: none;
}

.free-badge > i {
  font-size: calc(20px * var(--ui-font-scale));
  color: hsl(160, 60%, 55%);
  flex-shrink: 0;
}

.badge-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.badge-main {
  font-size: calc(14px * var(--ui-font-scale));
  font-weight: 600;
  color: hsl(160, 55%, 60%);
}

.badge-sub {
  font-size: calc(11px * var(--ui-font-scale));
  color: hsl(160, 30%, 50%);
}

/* ===== 许可协议区 ===== */
.license-section {
  margin-bottom: 14px;
}

.license-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.license-badge {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 6px;
  background: linear-gradient(135deg, hsl(220, 60%, 50%), hsl(260, 55%, 50%));
  color: white;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(100, 80, 200, 0.25);
}

.license-name {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary, #888);
  font-weight: 500;
}

/* ===== 许可条款卡片 ===== */
.license-terms {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.term-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 250ms ease;
  cursor: default;
}

.term-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.term-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(13px * var(--ui-font-scale));
  flex-shrink: 0;
}

.term-icon.by {
  background: linear-gradient(135deg, hsl(35, 60%, 45%), hsl(35, 50%, 35%));
  color: hsl(35, 80%, 75%);
}

.term-icon.nc {
  background: linear-gradient(135deg, hsl(350, 55%, 45%), hsl(350, 50%, 35%));
  color: hsl(350, 75%, 75%);
}

.term-icon.sa {
  background: linear-gradient(135deg, hsl(200, 55%, 45%), hsl(200, 50%, 35%));
  color: hsl(200, 75%, 75%);
}

.term-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.term-label {
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 600;
  color: var(--text-primary, #eee);
  letter-spacing: 0.3px;
}

.term-desc {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary, #888);
}

/* ===== 查看完整协议链接 ===== */
.license-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(120, 80, 200, 0.1), rgba(80, 120, 220, 0.08));
  border: 1px solid rgba(120, 80, 200, 0.2);
  color: hsl(260, 60%, 70%);
  font-size: calc(13px * var(--ui-font-scale));
  font-weight: 500;
  text-decoration: none;
  transition: all 300ms ease;
  margin-bottom: 12px;
}

.license-link:hover {
  background: linear-gradient(135deg, rgba(120, 80, 200, 0.18), rgba(80, 120, 220, 0.14));
  border-color: rgba(120, 80, 200, 0.35);
  color: hsl(260, 70%, 78%);
  box-shadow: 0 4px 20px rgba(120, 80, 200, 0.15);
  transform: translateY(-1px);
}

.license-link:active {
  transform: translateY(0);
}

.license-link i {
  font-size: calc(11px * var(--ui-font-scale));
  transition: transform 250ms ease;
}

.license-link:hover i {
  transform: translate(2px, -2px);
}

/* ===== 底部提示 ===== */
.footer-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary, #666);
  text-align: center;
  line-height: 1.4;
}

.footer-note i {
  font-size: calc(12px * var(--ui-font-scale));
  opacity: 0.6;
  flex-shrink: 0;
}

/* ===== 移动端适配 ===== */
@media (max-width: 480px) {
  .declaration-overlay {
    padding: 10px;
    align-items: flex-end;
  }

  .declaration-modal {
    max-width: 100%;
    max-height: 80%;
    border-radius: 16px 16px 8px 8px;
    padding: 0 16px 16px;
  }

  .modal-header {
    padding: 20px 0 12px;
  }

  .header-icon {
    width: 40px;
    height: 40px;
    font-size: calc(18px * var(--ui-font-scale));
    border-radius: 12px;
  }

  .header-title {
    font-size: calc(18px * var(--ui-font-scale));
    letter-spacing: 3px;
  }

  .header-subtitle {
    font-size: calc(12px * var(--ui-font-scale));
    letter-spacing: 6px;
  }

  .info-cards {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .license-terms {
    gap: 4px;
  }
}
</style>
