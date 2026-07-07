/**
 * useFullscreen 组合式函数
 * 统一管理全屏状态和操作
 * 支持 Safari webkit 前缀 API 及 iOS Safari CSS 模拟降级
 */

import { onMounted, onUnmounted, ref } from 'vue';

// ===== 跨浏览器全屏 API 辅助函数 =====

/** 安全获取 parent document（跨域 iframe 会抛异常） */
function getParentDoc(): Document | null {
  try {
    return window.parent?.document ?? null;
  } catch {
    return null;
  }
}

/** 获取当前全屏元素（标准 + webkit 前缀） */
function getFullscreenElement(doc: Document): Element | null {
  return doc.fullscreenElement ?? (doc as any).webkitFullscreenElement ?? null;
}

/** 请求全屏（标准优先，降级 webkit） */
function requestFS(el: Element): Promise<void> {
  if (el.requestFullscreen) return el.requestFullscreen();
  if ((el as any).webkitRequestFullscreen) {
    (el as any).webkitRequestFullscreen();
    return Promise.resolve();
  }
  return Promise.reject(new Error('Fullscreen API not supported'));
}

/** 退出全屏（标准优先，降级 webkit） */
function exitFS(doc: Document): Promise<void> {
  if (doc.exitFullscreen) return doc.exitFullscreen();
  if ((doc as any).webkitExitFullscreen) {
    (doc as any).webkitExitFullscreen();
    return Promise.resolve();
  }
  return Promise.reject(new Error('Exit fullscreen not supported'));
}

/** 检测是否支持原生全屏 API（含 webkit 前缀） */
function supportsNativeFullscreen(): boolean {
  const el = document.documentElement as any;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

/** 全屏相关事件名（标准 + webkit） */
const FS_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const;

export function useFullscreen() {
  const isFullscreen = ref(false);
  const viewportHeight = ref(0);
  /** 标记是否使用 CSS 模拟全屏（iOS Safari 等不支持原生全屏 API 的环境） */
  const isCSSFallback = ref(false);

  /**
   * 切换全屏状态
   */
  function toggleFullscreen() {
    if (supportsNativeFullscreen()) {
      // 原生全屏 API 可用（桌面 Safari / Chrome / Firefox 等）
      const iframe = window.frameElement as HTMLIFrameElement | null;
      const targetElement = iframe || document.documentElement;
      const parentDoc = getParentDoc();
      const isCurrentlyFullscreen = getFullscreenElement(document) || (parentDoc && getFullscreenElement(parentDoc));

      if (!isCurrentlyFullscreen) {
        requestFS(targetElement).catch(err => {
          console.warn('全屏请求失败:', err);
          requestFS(document.documentElement).catch(() => {
            // 原生 API 全部失败，降级 CSS 模拟
            enableCSSFullscreen();
          });
        });
      } else if (parentDoc && getFullscreenElement(parentDoc)) {
        // 退出全屏：优先从 parent 退出
        exitFS(parentDoc).catch(() => {
          exitFS(document).catch(() => {});
        });
      } else {
        exitFS(document).catch(() => {});
      }
    } else if (isFullscreen.value) {
      // 原生全屏 API 不可用（iOS Safari），使用 CSS 模拟
      disableCSSFullscreen();
    } else {
      enableCSSFullscreen();
    }
  }

  /** 启用 CSS 模拟全屏 */
  function enableCSSFullscreen() {
    isCSSFallback.value = true;
    isFullscreen.value = true;
    updateViewportHeight();
  }

  /** 禁用 CSS 模拟全屏 */
  function disableCSSFullscreen() {
    isCSSFallback.value = false;
    isFullscreen.value = false;
  }

  /**
   * 更新视口高度
   * 使用 window.innerHeight 而不是 100vh，避免移动端地址栏问题
   */
  function updateViewportHeight() {
    viewportHeight.value = window.innerHeight;
  }

  /**
   * 处理原生全屏状态变化事件
   */
  function handleFullscreenChange() {
    // CSS 模拟模式下不响应原生事件
    if (isCSSFallback.value) return;

    const parentDoc = getParentDoc();
    isFullscreen.value = !!(getFullscreenElement(document) || (parentDoc && getFullscreenElement(parentDoc)));

    // 全屏状态变化时更新高度
    if (isFullscreen.value) {
      // 延迟一帧更新，确保全屏动画完成后获取正确高度
      requestAnimationFrame(() => {
        updateViewportHeight();
      });
    }
  }

  /**
   * 处理窗口大小变化（包括设备旋转）
   */
  function handleResize() {
    if (isFullscreen.value) {
      updateViewportHeight();
    }
  }

  // 自动管理监听器的生命周期
  onMounted(() => {
    const parentDoc = getParentDoc();

    // 注册标准和 webkit 前缀两种事件
    for (const event of FS_EVENTS) {
      document.addEventListener(event, handleFullscreenChange);
      parentDoc?.addEventListener(event, handleFullscreenChange);
    }
    window.addEventListener('resize', handleResize);

    // 初始化状态
    handleFullscreenChange();
    updateViewportHeight();
  });

  onUnmounted(() => {
    const parentDoc = getParentDoc();

    for (const event of FS_EVENTS) {
      document.removeEventListener(event, handleFullscreenChange);
      parentDoc?.removeEventListener(event, handleFullscreenChange);
    }
    window.removeEventListener('resize', handleResize);
  });

  return {
    isFullscreen,
    viewportHeight,
    toggleFullscreen,
  };
}
