import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { GamePhase } from '../game/farkle/types';
import { tCurrent } from '../i18n';
import { useBadgeStore } from './badge';
import { useDiceGameStore } from './diceGame';
import { useNotificationStore } from './notification';
import { useSettingsStore } from './settings';

export type TabType =
  | 'profile'
  | 'faction'
  | 'business'
  | 'notebook'
  | 'content'
  | 'characters'
  | 'settings'
  | 'shop'
  | 'lottery'
  | 'dicegame'
  | 'donate';

export const useLayoutStore = defineStore('layout', () => {
  const settingsStore = useSettingsStore();

  // 右侧栏折叠状态从 settings store 获取
  const rightCollapsed = computed({
    get: () => settingsStore.rightCollapsed,
    set: (value: boolean) => {
      settingsStore.rightCollapsed = value;
    },
  });

  // 当前展开的 overlay 面板，null 表示无面板展开
  const overlayPanel = ref<TabType | null>(null);
  // 从右侧 NPC 缩略栏触发的人物详情目标
  const pendingNpcId = ref<string | null>(null);
  // 从右侧摘要触发的记事本目标标签
  const pendingNotebookTab = ref<'crisis' | 'opportunity' | 'todo' | null>(null);

  // 切换右侧栏折叠状态
  const toggleRight = () => {
    rightCollapsed.value = !rightCollapsed.value;
  };

  // 展开右侧栏
  const expandRight = () => {
    rightCollapsed.value = false;
  };

  // 折叠右侧栏
  const collapseRight = () => {
    rightCollapsed.value = true;
  };

  // 切换 overlay 面板
  const toggleOverlayPanel = async (tab: TabType) => {
    // 当前正在显示骰子游戏面板，需要做保护和清理
    if (overlayPanel.value === 'dicegame') {
      const diceGameStore = useDiceGameStore();
      const notificationStore = useNotificationStore();
      if (diceGameStore.gamePhase === GamePhase.Playing) {
        // 有赌注 → 弹窗确认；无赌注 → 直接关闭
        if (diceGameStore.hasBets) {
          const confirmed = await notificationStore.confirm({
            title: tCurrent('dice.quitConfirmTitle'),
            message: tCurrent('dice.quitConfirmMessage'),
            type: 'danger',
          });
          if (!confirmed) return;
        }
        diceGameStore.forceQuitGame();
      } else {
        // 非游戏中，清理游戏状态
        diceGameStore.closeGame();
      }
    }

    if (overlayPanel.value === tab) {
      overlayPanel.value = null; // 再次点击同一按钮，收回面板
    } else {
      overlayPanel.value = tab; // 点击其他按钮，切换面板

      // 打开可计数面板时，清零对应角标
      if (tab === 'shop' || tab === 'business' || tab === 'notebook' || tab === 'characters') {
        const badgeStore = useBadgeStore();
        badgeStore.markAsRead(tab);
      }

      if (tab === 'profile') {
        const badgeStore = useBadgeStore();
        badgeStore.markAsRead('players');
      }
    }
  };

  // 关闭 overlay 面板
  const closeOverlayPanel = async () => {
    // 关闭骰子游戏面板时清理游戏状态
    if (overlayPanel.value === 'dicegame') {
      const diceGameStore = useDiceGameStore();
      const notificationStore = useNotificationStore();
      if (diceGameStore.gamePhase === GamePhase.Playing) {
        // 有赌注 → 弹窗确认；无赌注 → 直接关闭
        if (diceGameStore.hasBets) {
          const confirmed = await notificationStore.confirm({
            title: tCurrent('dice.quitConfirmTitle'),
            message: tCurrent('dice.quitConfirmMessage'),
            type: 'danger',
          });
          if (!confirmed) return;
        }
        diceGameStore.forceQuitGame();
      } else {
        diceGameStore.closeGame();
      }
    }
    overlayPanel.value = null;
  };

  // 打开人物面板并设置待打开 NPC
  const openCharacterPanelWithNpc = (npcId: string) => {
    pendingNpcId.value = npcId;
    overlayPanel.value = 'characters';
  };

  // 清理待打开 NPC
  const clearPendingNpcId = () => {
    pendingNpcId.value = null;
  };

  // 打开记事本并切换到目标标签
  const openNotebookPanelWithTab = async (tab: 'crisis' | 'opportunity' | 'todo') => {
    pendingNotebookTab.value = tab;
    if (overlayPanel.value !== 'notebook') {
      await toggleOverlayPanel('notebook');
      return;
    }
  };

  // 清理待打开记事本标签
  const clearPendingNotebookTab = () => {
    pendingNotebookTab.value = null;
  };

  // 标记是否已初始化过布局（避免覆盖用户保存的状态）
  let layoutInitialized = false;

  // 根据视口宽度自动调整折叠状态（仅在首次加载且无保存状态时）
  const autoAdjustLayout = (width: number, force = false) => {
    // 如果已经初始化过且不是强制调整，则跳过
    if (layoutInitialized && !force) {
      return;
    }

    const settingsStore = useSettingsStore();
    const stored = settingsStore.$state;

    // 如果用户已有保存的设置，则不自动调整
    if (stored.rightCollapsed !== undefined && !force) {
      layoutInitialized = true;
      return;
    }

    // 否则根据屏幕宽度自动调整
    if (width < 768) {
      // 横屏手机/窄屏：右侧折叠
      rightCollapsed.value = true;
    } else if (width < 1024) {
      // 平板：右侧展开
      rightCollapsed.value = false;
    } else {
      // 桌面：右侧展开
      rightCollapsed.value = false;
    }

    layoutInitialized = true;
  };

  return {
    // 状态
    rightCollapsed,
    overlayPanel,
    pendingNpcId,
    pendingNotebookTab,
    // 方法
    toggleRight,
    expandRight,
    collapseRight,
    toggleOverlayPanel,
    closeOverlayPanel,
    openCharacterPanelWithNpc,
    clearPendingNpcId,
    openNotebookPanelWithTab,
    clearPendingNotebookTab,
    autoAdjustLayout,
  };
});
