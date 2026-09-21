import { computed, ref } from 'vue';
import { notify } from '../utils/notify';
import { tCurrent } from '../i18n';
import { useNotificationStore } from '../stores/notification';
import {
  deleteStandaloneArchive,
  downloadStandaloneArchiveById,
  formatArchiveSummaryForToast,
  getStandaloneArchiveFeedbackMessageKey,
  importArchiveFile,
  listStandaloneArchives,
  restoreStandaloneArchiveById,
  saveCurrentArchive,
  saveStandaloneArchiveSnapshot,
} from '../utils/archive';
import { loadStandaloneRuntimeMessages, loadStandaloneRuntimeSession } from '../utils/standaloneRuntime';
import { archiveStandaloneStageSummary, resolveStandaloneStageSummaryProgress } from '../utils/stageSummaryArchive';

/**
 * 存档管理
 *
 * 保存 / 导出 / 导入 / 恢复 / 下载 / 删除独立存档，以及存档状态提示与列表刷新。
 * 设置面板与初始化向导共用（两边原本各有一份逐字相同的实现）。
 */
export function useStandaloneArchiveManager() {
  const notificationStore = useNotificationStore();

  const isArchiving = ref(false);
  const isSavingStandaloneArchive = ref(false);
  const isImportingArchive = ref(false);
  const isRestoringArchiveId = ref<string | null>(null);
  const archiveStatusMessage = ref('');
  const archiveStatusTone = ref<'info' | 'error'>('info');
  const archiveInputRef = ref<HTMLInputElement | null>(null);
  const archiveRefreshTick = ref(0);
  const standaloneArchives = computed(() => {
    void archiveRefreshTick.value;
    return listStandaloneArchives();
  });
  const currentArchiveSession = computed(() => {
    void archiveRefreshTick.value;
    return loadStandaloneRuntimeSession();
  });
  const currentArchiveMessages = computed(() => {
    void archiveRefreshTick.value;
    return loadStandaloneRuntimeMessages();
  });
  const currentArchiveMessageIds = computed(() =>
    (currentArchiveMessages.value?.records ?? []).map(record => record.message_id),
  );
  const currentArchiveMessageCount = computed(() => currentArchiveMessageIds.value.length);
  const currentArchiveVariableSectionCount = computed(() => {
    const statData = currentArchiveSession.value?.stat_data;
    if (!statData || typeof statData !== 'object' || Array.isArray(statData)) {
      return 0;
    }

    return Object.keys(statData as Record<string, unknown>).length;
  });
  const currentArchiveMessageIdPreview = computed(() => {
    if (currentArchiveMessageIds.value.length === 0) {
      return tCurrent('contentCenter.archive.noMessageIds');
    }

    return currentArchiveMessageIds.value.join(', ');
  });

  const isArchivingStageSummary = ref(false);
  const stageSummaryProgress = computed(() => {
    void archiveRefreshTick.value;
    return resolveStandaloneStageSummaryProgress();
  });

  function setArchiveStatus(message: string, tone: 'info' | 'error' = 'info') {
    archiveStatusMessage.value = message;
    archiveStatusTone.value = tone;
  }

  function refreshStandaloneArchiveList() {
    archiveRefreshTick.value += 1;
  }

  async function handleArchiveExport() {
    if (isArchiving.value) {
      return;
    }

    const confirmed = await notificationStore.confirm({
      title: tCurrent('contentCenter.archive.exportConfirmTitle'),
      message: tCurrent('contentCenter.archive.exportConfirmMessage'),
      type: 'info',
      confirmText: tCurrent('contentCenter.archive.exportConfirmButton'),
    });

    if (!confirmed) {
      return;
    }

    isArchiving.value = true;
    try {
      await saveCurrentArchive();
      const message = tCurrent('contentCenter.archive.exportStandaloneSuccess');
      setArchiveStatus(message);
      notify.success(message);
    } catch (error) {
      const message = tCurrent('contentCenter.archive.actionFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    } finally {
      isArchiving.value = false;
    }
  }

  async function handleSaveStandaloneArchive() {
    if (isSavingStandaloneArchive.value) {
      return;
    }

    isSavingStandaloneArchive.value = true;
    try {
      const archive = saveStandaloneArchiveSnapshot();
      refreshStandaloneArchiveList();
      const message = tCurrent('contentCenter.archive.saveStandaloneSuccess', {
        summary: formatArchiveSummaryForToast(archive.summary),
      });
      setArchiveStatus(message);
      notify.success(message);
    } catch (error) {
      const message = tCurrent('contentCenter.archive.actionFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    } finally {
      isSavingStandaloneArchive.value = false;
    }
  }

  async function handleArchiveStageSummary() {
    if (isArchivingStageSummary.value) {
      return;
    }

    const pendingCount = stageSummaryProgress.value.pendingCount;

    if (pendingCount === 0) {
      const message = tCurrent('contentCenter.archive.stageSummaryNothingToArchive');
      setArchiveStatus(message);
      notify.info(message);
      return;
    }

    const confirmed = await notificationStore.confirm({
      title: tCurrent('contentCenter.archive.stageSummaryConfirmTitle'),
      message: tCurrent('contentCenter.archive.stageSummaryConfirmMessage', { pending: pendingCount }),
      type: 'info',
      confirmText: tCurrent('contentCenter.archive.stageSummaryConfirmButton'),
    });

    if (!confirmed) {
      return;
    }

    isArchivingStageSummary.value = true;
    try {
      const outcome = await archiveStandaloneStageSummary();
      refreshStandaloneArchiveList();
      const message =
        outcome.archivedCount > 0
          ? tCurrent('contentCenter.archive.stageSummaryArchivedSuccess', { count: outcome.archivedCount })
          : tCurrent('contentCenter.archive.stageSummaryNothingToArchive');
      setArchiveStatus(message);
      notify.success(message);
    } catch (error) {
      const message = tCurrent('contentCenter.archive.stageSummaryArchiveFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    } finally {
      isArchivingStageSummary.value = false;
    }
  }

  function triggerArchiveImport() {
    archiveInputRef.value?.click();
  }

  async function handleArchiveFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || isImportingArchive.value) {
      input.value = '';
      return;
    }

    isImportingArchive.value = true;
    try {
      const outcome = await importArchiveFile(file);
      refreshStandaloneArchiveList();
      const message = tCurrent(
        getStandaloneArchiveFeedbackMessageKey({
          scope: 'contentCenter',
          mode: 'import',
          outcome,
        }),
      );
      setArchiveStatus(message);
      notify.success(message);
    } catch (error) {
      const message = tCurrent('contentCenter.archive.actionFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    } finally {
      isImportingArchive.value = false;
      input.value = '';
    }
  }

  async function handleRestoreStandaloneArchive(archiveId: string) {
    if (isRestoringArchiveId.value) {
      return;
    }

    isRestoringArchiveId.value = archiveId;
    try {
      const outcome = restoreStandaloneArchiveById(archiveId);
      refreshStandaloneArchiveList();
      const restoredArchive = standaloneArchives.value.find(item => item.id === archiveId);
      const message = tCurrent(
        getStandaloneArchiveFeedbackMessageKey({
          scope: 'contentCenter',
          mode: 'restore',
          outcome,
        }),
        {
          summary: restoredArchive
            ? formatArchiveSummaryForToast(restoredArchive.summary)
            : tCurrent('contentCenter.archive.restoreStandaloneSuccessFallback'),
        },
      );
      setArchiveStatus(message);
      notify.success(message);
    } catch (error) {
      const message = tCurrent('contentCenter.archive.actionFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    } finally {
      isRestoringArchiveId.value = null;
    }
  }

  function handleDownloadStandaloneArchive(archiveId: string) {
    try {
      downloadStandaloneArchiveById(archiveId);
      setArchiveStatus(tCurrent('contentCenter.archive.exportSavedSuccess'));
    } catch (error) {
      const message = tCurrent('contentCenter.archive.actionFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    }
  }

  async function handleDeleteStandaloneArchive(archiveId: string) {
    const confirmed = await notificationStore.confirm({
      title: tCurrent('contentCenter.archive.deleteConfirmTitle'),
      message: tCurrent('contentCenter.archive.deleteConfirmMessage'),
      type: 'danger',
      confirmText: tCurrent('contentCenter.archive.deleteButton'),
    });

    if (!confirmed) {
      return;
    }

    try {
      deleteStandaloneArchive(archiveId);
      refreshStandaloneArchiveList();
      setArchiveStatus(tCurrent('contentCenter.archive.deleteSuccess'));
      notify.success(tCurrent('contentCenter.archive.deleteSuccess'));
    } catch (error) {
      const message = tCurrent('contentCenter.archive.actionFailed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setArchiveStatus(message, 'error');
      notify.error(message);
    }
  }

  return {
    isArchiving,
    isSavingStandaloneArchive,
    isImportingArchive,
    isRestoringArchiveId,
    archiveStatusMessage,
    archiveStatusTone,
    archiveInputRef,
    archiveRefreshTick,
    standaloneArchives,
    currentArchiveSession,
    currentArchiveMessages,
    currentArchiveMessageIds,
    currentArchiveMessageCount,
    currentArchiveVariableSectionCount,
    currentArchiveMessageIdPreview,
    isArchivingStageSummary,
    stageSummaryProgress,
    setArchiveStatus,
    refreshStandaloneArchiveList,
    handleArchiveExport,
    handleArchiveStageSummary,
    handleSaveStandaloneArchive,
    triggerArchiveImport,
    handleArchiveFileChange,
    handleRestoreStandaloneArchive,
    handleDownloadStandaloneArchive,
    handleDeleteStandaloneArchive,
  };
}
