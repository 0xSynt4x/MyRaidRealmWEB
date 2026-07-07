<template>
  <div class="content-center-panel">
    <section class="content-tabbar" role="tablist" :aria-label="t('contentCenter.overview.tabAriaLabel')">
      <button
        v-for="card in contentSelectorCards"
        :id="`content-center-tab-${card.tab}`"
        :key="card.tab"
        :class="['content-tab', { active: currentTab === card.tab }]"
        type="button"
        role="tab"
        :aria-selected="currentTab === card.tab"
        :aria-controls="`content-center-panel-${card.tab}`"
        :tabindex="currentTab === card.tab ? 0 : -1"
        @click="currentTab = card.tab"
        @keydown.right.prevent="focusRelativeTab(card.tab, 1)"
        @keydown.down.prevent="focusRelativeTab(card.tab, 1)"
        @keydown.left.prevent="focusRelativeTab(card.tab, -1)"
        @keydown.up.prevent="focusRelativeTab(card.tab, -1)"
        @keydown.home.prevent="focusTab('presets')"
        @keydown.end.prevent="focusLastTab()"
      >
        <span :class="['content-tab-icon', card.tab]"><i :class="card.icon"></i></span>
        <span class="content-tab-copy">
          <span class="content-tab-title">{{ card.title }}</span>
          <span class="content-tab-desc">{{ card.description }}</span>
        </span>
      </button>
    </section>

    <div class="content-tab-stats" aria-hidden="true">
      <span
        v-for="metric in activeTabMetrics"
        :key="metric.label"
        class="content-stat-chip"
      >
        <span class="content-stat-label">{{ metric.label }}</span>
        <strong class="content-stat-value">{{ metric.value }}</strong>
      </span>
    </div>

    <section
      v-show="currentTab === 'presets'"
      id="content-center-panel-presets"
      class="panel-section"
      role="tabpanel"
      aria-labelledby="content-center-tab-presets"
    >
      <section class="preset-import-console preset-entry-list-card">
        <div class="preset-browser-head">
          <div>
            <h5>{{ t('contentCenter.presets.importConsoleTitle') }}</h5>
            <p class="preset-section-note">{{ t('contentCenter.presets.importConsoleSubtitle') }}</p>
          </div>
          <div class="button-group-wrap preset-import-actions">
            <button class="primary-btn compact-action-btn" type="button" @click="triggerTavernPresetImport">
              <i class="fa-solid fa-file-import"></i>
              {{ t('contentCenter.presets.importButton') }}
            </button>
          </div>
        </div>

        <input
          ref="tavernPresetImportInputRef"
          class="file-input-hidden"
          type="file"
          accept="application/json,.json"
          @change="handleTavernPresetFileChange"
        />

        <div class="tavern-preset-library-list" role="list">
          <article
            v-for="preset in tavernPresetLibraryItems"
            :key="preset.id"
            :class="['tavern-preset-library-item', { active: activeTavernPresetId === preset.id }]"
            role="listitem"
          >
            <button type="button" class="tavern-preset-select-btn" @click="handleSelectTavernPreset(preset.id)">
              <span class="preset-entry-order compact-order">{{ preset.kind === 'builtin' ? '内置' : '导入' }}</span>
              <span class="preset-entry-copy">
                <span class="preset-entry-title-row">
                  <strong>{{ preset.sourceName }}</strong>
                  <span
                    :class="[
                      'entry-enabled-badge',
                      'compact-badge',
                      activeTavernPresetId === preset.id ? 'enabled' : 'disabled',
                    ]"
                  >
                    {{ activeTavernPresetId === preset.id ? t('contentCenter.presets.activePresetBadge') : t('contentCenter.presets.availablePresetBadge') }}
                  </span>
                </span>
                <span class="preset-entry-preview">
                  {{ tavernPresetLibraryItemMetaMap[preset.id] }}
                </span>
              </span>
            </button>
            <button
              v-if="preset.kind === 'imported'"
              type="button"
              class="ghost-btn icon-only-btn compact-icon-btn danger-btn"
              :title="t('settings.delete')"
              @click="handleDeleteTavernPreset(preset.id)"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </article>
        </div>

        <dl class="compact-summary-list preset-import-summary-list">
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.activePresetSourceLabel') }}</dt>
            <dd>{{ tavernPresetSourceName }}</dd>
          </div>
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.importModeLabel') }}</dt>
            <dd>{{ tavernPresetImportModeLabel }}</dd>
          </div>
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.importedAtLabel') }}</dt>
            <dd>{{ importedTavernPresetTimeLabel }}</dd>
          </div>
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.enabledPromptCountLabel') }}</dt>
            <dd>{{ tavernPresetSummary.enabledPromptCount }}/{{ tavernPresetSummary.totalPromptCount }}</dd>
          </div>
        </dl>

        <p v-if="tavernPresetImportStatus" class="preset-import-status">{{ tavernPresetImportStatus }}</p>
      </section>

      <section class="summary-card preset-compact-summary">
        <div class="preset-browser-head">
          <div>
            <h5>{{ t('contentCenter.presets.sendOverviewTitle') }}</h5>
            <p class="preset-section-note">{{ t('contentCenter.presets.sendOverviewSubtitle') }}</p>
          </div>
        </div>

        <dl class="compact-summary-list preset-compact-summary-list">
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.runtimePresetLabel') }}</dt>
            <dd>{{ runtimePresetName }}</dd>
          </div>
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.runtimeModeLabel') }}</dt>
            <dd>{{ runtimePromptModeLabel }}</dd>
          </div>
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.parseStatus') }}</dt>
            <dd>{{ tavernPresetParseLabel }}</dd>
          </div>
          <div class="compact-summary-item">
            <dt>{{ t('contentCenter.presets.historyWindowLabel') }}</dt>
            <dd>{{ t('contentCenter.presets.historyWindowValue', { count: 8 }) }}</dd>
          </div>
        </dl>
      </section>

      <div class="preset-browser-shell">
        <aside class="preset-entry-list-card">
          <div class="preset-browser-head">
            <div>
              <h5>{{ t('contentCenter.presets.entryListTitle') }}</h5>
              <p class="preset-section-note">{{ t('contentCenter.presets.entryListSubtitle') }}</p>
            </div>
          </div>

          <div v-if="runtimeMainChainEntries.length > 0" class="preset-entry-list" role="list">
            <article
              v-for="entry in runtimeMainChainEntries"
              :key="entry.key"
              class="preset-entry-stack-item"
              role="listitem"
            >
              <button
                type="button"
                class="preset-entry-item preset-send-preview-item"
              >
                <div class="preset-entry-order">#{{ entry.orderIndex + 1 }}</div>
                <div class="preset-entry-copy">
                  <div class="preset-entry-title-row">
                    <strong>{{ runtimeMainChainEntryTitle(entry) }}</strong>
                    <span class="entry-enabled-badge enabled">{{ t('contentCenter.presets.liveChainBadge') }}</span>
                  </div>
                  <div class="preset-entry-meta-row">
                    <span class="tag-chip">{{ tavernPromptRoleLabel(entry.role) }}</span>
                    <span class="tag-chip">{{ runtimeMainChainEntrySourceLabel(entry) }}</span>
                  </div>
                  <p class="preset-entry-preview">{{ runtimeMainChainEntrySummary(entry) }}</p>
                </div>
              </button>
            </article>
          </div>
          <div v-else class="empty-state compact-empty">{{ t('contentCenter.presets.emptyMainChain') }}</div>

          <section class="preset-secondary-section preset-editor-section" :aria-label="t('contentCenter.presets.editorTitle')">
            <div class="preset-reference-divider"></div>

            <div class="preset-browser-head preset-browser-head-secondary">
              <div>
                <h5>{{ t('contentCenter.presets.editorTitle') }}</h5>
                <p class="preset-section-note preset-section-note-secondary">
                  {{ t('contentCenter.presets.editorHint') }}
                </p>
              </div>
              <div class="button-group-wrap preset-import-actions">
                <button
                  v-if="!activeTavernPresetEditable"
                  class="primary-btn compact-action-btn"
                  type="button"
                  @click="handleDuplicateActivePresetForEditing"
                >
                  <i class="fa-solid fa-copy"></i>
                  {{ t('contentCenter.presets.duplicateForEditButton') }}
                </button>
                <button
                  v-else
                  class="ghost-btn compact-action-btn"
                  type="button"
                  @click="handleAddTavernPrompt"
                >
                  <i class="fa-solid fa-plus"></i>
                  {{ t('contentCenter.presets.addPromptButton') }}
                </button>
              </div>
            </div>

            <div v-if="tavernPresetPromptViews.length > 0" class="preset-entry-list preset-editor-accordion" role="list">
              <article
                v-for="entry in tavernPresetPromptViews"
                :key="entry.identifier"
                class="preset-entry-stack-item preset-editor-accordion-item"
                role="listitem"
              >
                <button
                  type="button"
                  :class="['preset-entry-item', 'secondary', { active: selectedTavernPromptIdentifier === entry.identifier }]"
                  :aria-expanded="selectedTavernPromptIdentifier === entry.identifier"
                  @click="selectTavernPromptForEditing(entry.identifier)"
                >
                  <div class="preset-entry-order">#{{ entry.orderIndex + 1 }}</div>
                  <div class="preset-entry-copy">
                    <div class="preset-entry-title-row">
                      <strong>{{ entry.name }}</strong>
                      <span :class="['entry-enabled-badge', entry.enabledInOrder ? 'enabled' : 'disabled']">
                        {{ entry.enabledInOrder ? t('common.enabled') : t('common.disabled') }}
                      </span>
                    </div>
                  </div>
                  <i
                    :class="[
                      'fa-solid',
                      selectedTavernPromptIdentifier === entry.identifier ? 'fa-chevron-up' : 'fa-chevron-down',
                      'preset-editor-chevron',
                    ]"
                  ></i>
                </button>

                <form
                  v-if="selectedTavernPromptIdentifier === entry.identifier && hasSelectedTavernPromptDraft && tavernPresetPromptDraft"
                  class="preset-editor-form"
                  @submit.prevent="handleSaveTavernPromptDraft"
                >
                  <div v-if="!activeTavernPresetEditable" class="preset-detail-note-card secondary-note-card">
                    <i class="fa-solid fa-lock"></i>
                    <p>{{ t('contentCenter.presets.builtinEditHint') }}</p>
                  </div>

                  <div class="worldbook-editor-grid compact-worldbook-editor-grid preset-editor-fields">
                    <label class="worldbook-field compact-field">
                      <span class="summary-label">{{ t('contentCenter.presets.identifierLabel') }}</span>
                      <input v-model="tavernPresetPromptDraft.identifier" class="worldbook-input compact-worldbook-input" disabled />
                    </label>
                    <label class="worldbook-field compact-field">
                      <span class="summary-label">{{ t('contentCenter.presets.roleLabel') }}</span>
                      <select
                        v-model="tavernPresetPromptDraft.role"
                        class="worldbook-select compact-worldbook-input"
                        :disabled="!activeTavernPresetEditable"
                      >
                        <option value="system">{{ t('contentCenter.presets.role.system') }}</option>
                        <option value="user">{{ t('contentCenter.presets.role.user') }}</option>
                        <option value="assistant">{{ t('contentCenter.presets.role.assistant') }}</option>
                      </select>
                    </label>
                    <label class="worldbook-field compact-field worldbook-field-wide">
                      <span class="summary-label">{{ t('contentCenter.presets.nameLabel') }}</span>
                      <input
                        v-model="tavernPresetPromptDraft.name"
                        class="worldbook-input compact-worldbook-input"
                        :disabled="!activeTavernPresetEditable"
                      />
                    </label>
                    <label class="worldbook-field compact-field worldbook-field-wide preset-editor-enabled-row">
                      <input
                        v-model="tavernPresetPromptDraft.enabled"
                        type="checkbox"
                        :disabled="!activeTavernPresetEditable"
                      />
                      <span>{{ t('contentCenter.presets.enablePromptLabel') }}</span>
                    </label>
                    <label class="worldbook-field compact-field worldbook-field-body">
                      <span class="summary-label">{{ t('contentCenter.presets.bodyLabel') }}</span>
                      <textarea
                        v-model="tavernPresetPromptDraft.content"
                        class="worldbook-textarea compact-worldbook-textarea preset-editor-textarea"
                        :disabled="!activeTavernPresetEditable"
                      ></textarea>
                    </label>
                  </div>

                  <div class="button-group-wrap preset-import-actions">
                    <button class="primary-btn compact-action-btn" type="submit" :disabled="!activeTavernPresetEditable">
                      <i class="fa-solid fa-floppy-disk"></i>
                      {{ t('contentCenter.presets.savePromptButton') }}
                    </button>
                  </div>
                </form>
              </article>
            </div>
            <div v-else class="empty-state compact-empty">{{ t('contentCenter.presets.empty') }}</div>
          </section>
        </aside>
      </div>
    </section>

    <section
      v-show="currentTab === 'aiDebug'"
      id="content-center-panel-aiDebug"
      class="panel-section"
      role="tabpanel"
      aria-labelledby="content-center-tab-aiDebug"
    >
      <div class="ai-debug-stack-shell">
        <div class="preset-entry-list-card ai-debug-stack-header">
          <div class="preset-browser-head">
            <div>
              <h5>{{ t('contentCenter.aiDebug.messageListTitle') }}</h5>
              <p class="preset-section-note">{{ t('contentCenter.aiDebug.messageListSubtitle') }}</p>
            </div>
          </div>
        </div>

        <div v-if="assistantMessagesForDebug.length > 0" class="ai-debug-stack-list" role="list">
          <article
            v-for="message in assistantMessagesForDebug"
            :key="message.message_id"
            role="listitem"
            :class="[
              'preset-entry-detail-card',
              'ai-debug-stack-card',
              { active: selectedDebugMessage?.message_id === message.message_id },
            ]"
          >
            <button type="button" class="ai-debug-stack-trigger" @click="toggleDebugMessageCard(message.message_id)">
              <div class="ai-debug-stack-copy">
                <div class="ai-debug-stack-title-row">
                  <span class="preset-entry-order compact-order">#{{ message.message_id }}</span>
                  <strong class="ai-debug-stack-time">
                    {{ message.createdAt || t('common.notAvailable') }}
                  </strong>
                  <i
                    :class="[
                      'fa-solid',
                      selectedDebugMessage?.message_id === message.message_id ? 'fa-chevron-up' : 'fa-chevron-down',
                      'ai-debug-stack-chevron',
                    ]"
                  ></i>
                </div>

                <div class="compact-worldbook-meta-line ai-debug-stack-meta">
                  <span
                    :class="[
                      'tag-chip',
                      'compact-tag',
                      'ai-debug-summary-chip',
                      message.debug_trace?.main_pass ? 'main' : 'missing',
                    ]"
                  >
                    <i class="fa-solid fa-paper-plane"></i>
                    {{ t('contentCenter.aiDebug.passMainTitle') }}
                  </span>
                  <span
                    :class="[
                      'tag-chip',
                      'compact-tag',
                      'ai-debug-summary-chip',
                      resolvePreferredVariableDebugPass(message.debug_trace) ? 'variable' : 'missing',
                    ]"
                  >
                    <i class="fa-solid fa-arrows-rotate"></i>
                    {{ t('contentCenter.aiDebug.passVariableUpdateTitle') }}
                  </span>
                </div>
              </div>
            </button>

            <div v-if="selectedDebugMessage?.message_id === message.message_id" class="ai-debug-stack-body">
              <!-- 主API区块 -->
              <section class="debug-collapsible-card ai-debug-pass-card" :class="{ expanded: debugMainPassExpanded }">
                <button type="button" class="debug-collapsible-header" @click="toggleDebugMainPass">
                  <div class="debug-collapsible-title-row">
                    <span class="debug-pass-icon main"><i class="fa-solid fa-paper-plane"></i></span>
                    <span class="debug-collapsible-title">{{ t('contentCenter.aiDebug.passMainTitle') }}</span>
                    <span
                      v-if="selectedDebugTrace?.main_pass"
                      :class="['entry-enabled-badge', 'compact-badge', 'enabled']"
                    >
                      {{ t('contentCenter.aiDebug.traceStatusAvailable') }}
                    </span>
                    <span v-else :class="['entry-enabled-badge', 'compact-badge', 'disabled']">
                      {{ t('contentCenter.aiDebug.traceStatusMissing') }}
                    </span>
                  </div>
                  <i
                    :class="[
                      'fa-solid',
                      debugMainPassExpanded ? 'fa-chevron-up' : 'fa-chevron-down',
                      'debug-collapsible-chevron',
                    ]"
                  ></i>
                </button>

                <div v-if="debugMainPassExpanded" class="debug-collapsible-body">
                  <template v-if="selectedDebugTrace?.main_pass">
                    <div class="ai-debug-pass-strip">
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaApiLabel') }}: {{ selectedDebugTrace.main_pass.api_label }}
                      </span>
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaApiMode') }}: {{ selectedDebugTrace.main_pass.api_mode }}
                      </span>
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaRequestedAt') }}:
                        {{ selectedDebugTrace.main_pass.requested_at }}
                      </span>
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaTransport') }}:
                        {{ transportModeLabel(selectedDebugTrace.main_pass.transport_mode) }}
                      </span>
                    </div>

                    <button type="button" class="debug-sub-toggle" @click.stop="toggleDebugMainSub('requestMessages')">
                      <i
                        :class="[
                          'fa-solid',
                          isDebugMainSubExpanded('requestMessages') ? 'fa-chevron-down' : 'fa-chevron-right',
                        ]"
                      ></i>
                      <span>{{ t('contentCenter.aiDebug.requestMessagesTitle') }}</span>
                    </button>
                    <section
                      v-if="isDebugMainSubExpanded('requestMessages')"
                      class="debug-block-section debug-block-section-reading"
                    >
                      <div v-if="mainPassRequestMessageItems.length > 0" class="debug-conversation-list" role="list">
                        <article
                          v-for="item in mainPassRequestMessageItems"
                          :key="`main-request-message-${item.index}`"
                          :class="['debug-conversation-card', item.roleTone]"
                          role="listitem"
                        >
                          <div class="debug-conversation-card-head">
                            <div class="debug-conversation-topline">
                              <span :class="['debug-conversation-role', item.roleTone]">{{ item.roleLabel }}</span>
                              <span class="debug-conversation-index">第 {{ item.index }} 条</span>
                            </div>
                            <div v-if="item.metaRows.length > 0" class="debug-conversation-meta">
                              <span
                                v-for="meta in item.metaRows"
                                :key="`${item.index}-${meta.label}`"
                                class="debug-conversation-meta-item"
                              >
                                <span>{{ meta.label }}</span>
                                <strong>{{ meta.value }}</strong>
                              </span>
                            </div>
                          </div>
                          <p class="debug-reading-copy debug-conversation-content">{{ item.content }}</p>
                        </article>
                      </div>
                      <div v-else class="empty-state compact-empty">{{ t('common.notAvailable') }}</div>
                    </section>

                    <button type="button" class="debug-sub-toggle" @click.stop="toggleDebugMainSub('requestBody')">
                      <i
                        :class="[
                          'fa-solid',
                          isDebugMainSubExpanded('requestBody') ? 'fa-chevron-down' : 'fa-chevron-right',
                        ]"
                      ></i>
                      <span>{{ t('contentCenter.aiDebug.requestBodyTitle') }}</span>
                    </button>
                    <section
                      v-if="isDebugMainSubExpanded('requestBody')"
                      class="debug-block-section debug-block-section-reading"
                    >
                      <div v-if="mainPassRequestBodyView.hasStructuredContent" class="debug-request-summary">
                        <div v-if="mainPassRequestBodyView.summaryRows.length > 0" class="debug-request-summary-grid">
                          <article
                            v-for="row in mainPassRequestBodyView.summaryRows"
                            :key="`main-request-body-row-${row.label}`"
                            class="debug-request-stat"
                          >
                            <span class="summary-label">{{ row.label }}</span>
                            <strong class="summary-value break-all">{{ row.value }}</strong>
                          </article>
                        </div>

                        <div v-if="mainPassRequestBodyView.noteBlocks.length > 0" class="debug-request-notes">
                          <article
                            v-for="(note, noteIndex) in mainPassRequestBodyView.noteBlocks"
                            :key="`main-request-body-note-${noteIndex}`"
                            :class="['debug-request-note', { structured: note.structured }]"
                          >
                            <span class="summary-label">{{ note.label }}</span>
                            <div
                              :class="[
                                'debug-reading-copy',
                                note.structured ? 'debug-request-note-structured' : 'debug-request-note-copy',
                              ]"
                            >
                              {{ note.value }}
                            </div>
                          </article>
                        </div>
                      </div>
                      <article v-else class="debug-request-note debug-request-note-fallback">
                        <span class="summary-label">请求体原文</span>
                        <div class="debug-reading-copy debug-request-note-copy">
                          {{ mainPassRequestBodyView.fallbackText }}
                        </div>
                      </article>
                    </section>

                    <button type="button" class="debug-sub-toggle" @click.stop="toggleDebugMainSub('rawResponse')">
                      <i
                        :class="[
                          'fa-solid',
                          isDebugMainSubExpanded('rawResponse') ? 'fa-chevron-down' : 'fa-chevron-right',
                        ]"
                      ></i>
                      <span>{{ t('contentCenter.aiDebug.rawResponseTitle') }}</span>
                    </button>
                    <section
                      v-if="isDebugMainSubExpanded('rawResponse')"
                      class="debug-block-section debug-block-section-reading"
                    >
                      <pre class="preset-body-content debug-pre debug-pre-reading">{{
                        readableDebugPassResponse(selectedDebugTrace.main_pass)
                      }}</pre>
                    </section>
                  </template>
                  <div v-else class="empty-state compact-empty">{{ t('contentCenter.aiDebug.passMissing') }}</div>
                </div>
              </section>

              <!-- 辅助API区块 -->
              <section class="debug-collapsible-card ai-debug-pass-card" :class="{ expanded: debugVarPassExpanded }">
                <button type="button" class="debug-collapsible-header" @click="toggleDebugVarPass">
                  <div class="debug-collapsible-title-row">
                    <span class="debug-pass-icon variable"><i class="fa-solid fa-arrows-rotate"></i></span>
                    <span class="debug-collapsible-title">{{
                      t('contentCenter.aiDebug.passVariableUpdateTitle')
                    }}</span>
                    <span
                      v-if="selectedPreferredVariableTrace"
                      :class="['entry-enabled-badge', 'compact-badge', 'enabled']"
                    >
                      {{ t('contentCenter.aiDebug.traceStatusAvailable') }}
                    </span>
                    <span v-else :class="['entry-enabled-badge', 'compact-badge', 'disabled']">
                      {{ t('contentCenter.aiDebug.traceStatusMissing') }}
                    </span>
                  </div>
                  <i
                    :class="[
                      'fa-solid',
                      debugVarPassExpanded ? 'fa-chevron-up' : 'fa-chevron-down',
                      'debug-collapsible-chevron',
                    ]"
                  ></i>
                </button>

                <div v-if="debugVarPassExpanded" class="debug-collapsible-body">
                  <template v-if="selectedPreferredVariableTrace">
                    <div class="ai-debug-pass-strip">
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaApiLabel') }}:
                        {{ selectedPreferredVariableTrace.api_label }}
                      </span>
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaApiMode') }}:
                        {{ selectedPreferredVariableTrace.api_mode }}
                      </span>
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaRequestedAt') }}:
                        {{ selectedPreferredVariableTrace.requested_at }}
                      </span>
                      <span class="tag-chip compact-tag">
                        {{ t('contentCenter.aiDebug.metaTransport') }}:
                        {{ transportModeLabel(selectedPreferredVariableTrace.transport_mode) }}
                      </span>
                    </div>

                    <button type="button" class="debug-sub-toggle" @click.stop="toggleDebugVarSub('requestMessages')">
                      <i
                        :class="[
                          'fa-solid',
                          isDebugVarSubExpanded('requestMessages') ? 'fa-chevron-down' : 'fa-chevron-right',
                        ]"
                      ></i>
                      <span>{{ t('contentCenter.aiDebug.requestMessagesTitle') }}</span>
                    </button>
                    <section
                      v-if="isDebugVarSubExpanded('requestMessages')"
                      class="debug-block-section debug-block-section-reading"
                    >
                      <div
                        v-if="variablePassRequestMessageItems.length > 0"
                        class="debug-conversation-list"
                        role="list"
                      >
                        <article
                          v-for="item in variablePassRequestMessageItems"
                          :key="`variable-request-message-${item.index}`"
                          :class="['debug-conversation-card', item.roleTone]"
                          role="listitem"
                        >
                          <div class="debug-conversation-card-head">
                            <div class="debug-conversation-topline">
                              <span :class="['debug-conversation-role', item.roleTone]">{{ item.roleLabel }}</span>
                              <span class="debug-conversation-index">第 {{ item.index }} 条</span>
                            </div>
                            <div v-if="item.metaRows.length > 0" class="debug-conversation-meta">
                              <span
                                v-for="meta in item.metaRows"
                                :key="`${item.index}-${meta.label}`"
                                class="debug-conversation-meta-item"
                              >
                                <span>{{ meta.label }}</span>
                                <strong>{{ meta.value }}</strong>
                              </span>
                            </div>
                          </div>
                          <p class="debug-reading-copy debug-conversation-content">{{ item.content }}</p>
                        </article>
                      </div>
                      <div v-else class="empty-state compact-empty">{{ t('common.notAvailable') }}</div>
                    </section>

                    <button type="button" class="debug-sub-toggle" @click.stop="toggleDebugVarSub('requestBody')">
                      <i
                        :class="[
                          'fa-solid',
                          isDebugVarSubExpanded('requestBody') ? 'fa-chevron-down' : 'fa-chevron-right',
                        ]"
                      ></i>
                      <span>{{ t('contentCenter.aiDebug.requestBodyTitle') }}</span>
                    </button>
                    <section
                      v-if="isDebugVarSubExpanded('requestBody')"
                      class="debug-block-section debug-block-section-reading"
                    >
                      <div v-if="variablePassRequestBodyView.hasStructuredContent" class="debug-request-summary">
                        <div
                          v-if="variablePassRequestBodyView.summaryRows.length > 0"
                          class="debug-request-summary-grid"
                        >
                          <article
                            v-for="row in variablePassRequestBodyView.summaryRows"
                            :key="`variable-request-body-row-${row.label}`"
                            class="debug-request-stat"
                          >
                            <span class="summary-label">{{ row.label }}</span>
                            <strong class="summary-value break-all">{{ row.value }}</strong>
                          </article>
                        </div>

                        <div v-if="variablePassRequestBodyView.noteBlocks.length > 0" class="debug-request-notes">
                          <article
                            v-for="(note, noteIndex) in variablePassRequestBodyView.noteBlocks"
                            :key="`variable-request-body-note-${noteIndex}`"
                            :class="['debug-request-note', { structured: note.structured }]"
                          >
                            <span class="summary-label">{{ note.label }}</span>
                            <div
                              :class="[
                                'debug-reading-copy',
                                note.structured ? 'debug-request-note-structured' : 'debug-request-note-copy',
                              ]"
                            >
                              {{ note.value }}
                            </div>
                          </article>
                        </div>
                      </div>
                      <article v-else class="debug-request-note debug-request-note-fallback">
                        <span class="summary-label">请求体原文</span>
                        <div class="debug-reading-copy debug-request-note-copy">
                          {{ variablePassRequestBodyView.fallbackText }}
                        </div>
                      </article>
                    </section>

                    <button type="button" class="debug-sub-toggle" @click.stop="toggleDebugVarSub('rawResponse')">
                      <i
                        :class="[
                          'fa-solid',
                          isDebugVarSubExpanded('rawResponse') ? 'fa-chevron-down' : 'fa-chevron-right',
                        ]"
                      ></i>
                      <span>{{ t('contentCenter.aiDebug.rawResponseTitle') }}</span>
                    </button>
                    <section
                      v-if="isDebugVarSubExpanded('rawResponse')"
                      class="debug-block-section debug-block-section-reading"
                    >
                      <pre class="preset-body-content debug-pre debug-pre-reading">{{
                        readableDebugPassResponse(selectedPreferredVariableTrace)
                      }}</pre>
                    </section>

                    <template v-if="selectedPreferredVariableTrace.error_message">
                      <button
                        type="button"
                        class="debug-sub-toggle debug-sub-toggle-error"
                        @click.stop="toggleDebugVarSub('error')"
                      >
                        <i
                          :class="['fa-solid', isDebugVarSubExpanded('error') ? 'fa-chevron-down' : 'fa-chevron-right']"
                        ></i>
                        <span>{{ t('contentCenter.aiDebug.errorLabel') }}</span>
                      </button>
                      <section
                        v-if="isDebugVarSubExpanded('error')"
                        class="debug-block-section debug-block-section-structured"
                      >
                        <pre class="preset-body-content debug-pre debug-pre-structured">{{
                          selectedPreferredVariableTrace.error_message
                        }}</pre>
                      </section>
                    </template>
                  </template>
                  <div v-else class="empty-state compact-empty">{{ t('contentCenter.aiDebug.passMissing') }}</div>
                </div>
              </section>

              <!-- 最终原始消息 -->
              <section class="debug-collapsible-card ai-debug-pass-card" :class="{ expanded: debugFinalRawExpanded }">
                <button type="button" class="debug-collapsible-header" @click="toggleDebugFinalRaw">
                  <div class="debug-collapsible-title-row">
                    <span class="debug-pass-icon final"><i class="fa-solid fa-file-lines"></i></span>
                    <span class="debug-collapsible-title">{{ t('contentCenter.aiDebug.finalRawContentTitle') }}</span>
                  </div>
                  <i
                    :class="[
                      'fa-solid',
                      debugFinalRawExpanded ? 'fa-chevron-up' : 'fa-chevron-down',
                      'debug-collapsible-chevron',
                    ]"
                  ></i>
                </button>

                <div v-if="debugFinalRawExpanded" class="debug-collapsible-body">
                  <p class="asset-note">{{ t('contentCenter.aiDebug.finalRawContentHint') }}</p>
                  <pre class="preset-body-content debug-pre debug-pre-structured debug-pre-final">{{
                    selectedDebugMessage?.raw_content || t('common.notAvailable')
                  }}</pre>
                </div>
              </section>
            </div>
          </article>
        </div>
        <div v-else class="empty-state">{{ t('contentCenter.aiDebug.empty') }}</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, ref, watch } from 'vue';
import { useI18n } from '../../i18n';
import { useMessagesStore, type MessageRecord } from '../../stores/messages';
import {
  resolvePreferredVariableDebugPass,
  type StandaloneAiDebugPassTrace,
  type StandaloneAssistantDebugTrace,
} from '../../utils/standaloneAiDebug';
import {
  inspectStandaloneMainChainView,
  type StandaloneMainChainViewEntry,
} from '../../utils/standaloneLocalTurn';
import { getStandaloneRuntimeContentContext } from '../../utils/standaloneRuntime';
import {
  deleteImportedStandaloneTavernPreset,
  duplicateActiveStandaloneTavernPresetAsImported,
  getActiveStandaloneTavernPresetItem,
  getStandaloneTavernPresetInspection,
  getStandaloneTavernPresetLibraryItems,
  parseStandaloneTavernPresetDocument,
  saveImportedStandaloneTavernPreset,
  selectStandaloneTavernPreset,
  updateImportedStandaloneTavernPreset,
  type StandaloneTavernPresetLibraryItem,
  type StandaloneTavernPresetDocument,
  type StandaloneTavernPresetPromptView,
} from '../../utils/standaloneTavernPreset';

type ContentCenterTab = 'presets' | 'aiDebug';
type ContentSelectorMetric = {
  label: string;
  value: string | number;
};
type DebugReadableMetaRow = {
  label: string;
  value: string;
};
type DebugReadableMessageItem = {
  index: number;
  roleLabel: string;
  roleTone: 'system' | 'user' | 'assistant' | 'unknown';
  metaRows: DebugReadableMetaRow[];
  content: string;
};
type DebugRequestBodyNoteBlock = {
  label: string;
  value: string;
  structured?: boolean;
};
type DebugRequestBodyView = {
  summaryRows: DebugReadableMetaRow[];
  noteBlocks: DebugRequestBodyNoteBlock[];
  fallbackText: string;
  hasStructuredContent: boolean;
};
type TavernPresetPromptDraft = {
  identifier: string;
  name: string;
  role: 'system' | 'user' | 'assistant';
  enabled: boolean;
  content: string;
};

const currentTab = ref<ContentCenterTab>('presets');

const { t } = useI18n();
const messagesStore = useMessagesStore();
const tavernPresetImportInputRef = ref<HTMLInputElement | null>(null);
const tavernPresetRefreshTick = ref(0);
const tavernPresetImportStatus = ref('');
const tavernPresetLibraryItems = computed(() => {
  void tavernPresetRefreshTick.value;
  return getStandaloneTavernPresetLibraryItems();
});
const activeTavernPresetItem = computed(() => {
  void tavernPresetRefreshTick.value;
  return getActiveStandaloneTavernPresetItem();
});
const activeTavernPresetId = computed(() => activeTavernPresetItem.value.id);
const tavernPresetInspection = computed(() => {
  void tavernPresetRefreshTick.value;
  return getStandaloneTavernPresetInspection();
});
const tavernPresetSummary = computed(() => tavernPresetInspection.value);
const runtimeMainChainView = computed(() => {
  void tavernPresetRefreshTick.value;
  return inspectStandaloneMainChainView();
});
const runtimeContentContext = computed(() => {
  void tavernPresetRefreshTick.value;
  return getStandaloneRuntimeContentContext();
});
const selectedTavernPromptIdentifier = ref('');
const tavernPresetPromptDraft = ref<TavernPresetPromptDraft | null>(null);
const selectedDebugMessageId = ref<number | null>(null);
const debugMainPassExpanded = ref(false);
const debugVarPassExpanded = ref(false);
const debugFinalRawExpanded = ref(false);
const debugMainSubSections = ref<Record<string, boolean>>({});
const debugVarSubSections = ref<Record<string, boolean>>({});
const tavernPresetParseLabel = computed(() =>
  tavernPresetSummary.value.parseOk ? t('contentCenter.presets.parseOk') : t('contentCenter.presets.parseFallback'),
);
const tavernPresetActionOptionsLabel = computed(() =>
  tavernPresetSummary.value.containsActionOptionsRule
    ? t('contentCenter.presets.actionOptionsIncluded')
    : t('contentCenter.presets.actionOptionsMissing'),
);

const tavernPresetPromptViews = computed(() => tavernPresetInspection.value.prompts);
const runtimeMainChainEntries = computed(() => runtimeMainChainView.value.entries);
const runtimePresetName = computed(
  () => runtimeContentContext.value.presetMeta?.name || t('contentCenter.worldbook.noPreset'),
);
const tavernPresetSourceName = computed(() => tavernPresetSummary.value.sourceName);
const importedTavernPresetTimeLabel = computed(() => {
  const importedAt = activeTavernPresetItem.value.importedAt;
  if (!importedAt) {
    return t('contentCenter.presets.builtinPresetActive');
  }

  const date = new Date(importedAt);
  if (Number.isNaN(date.getTime())) {
    return t('common.notAvailable');
  }

  return date.toLocaleString();
});
const tavernPresetImportModeLabel = computed(() =>
  activeTavernPresetItem.value.kind === 'imported'
    ? t('contentCenter.presets.importedPresetActive')
    : t('contentCenter.presets.builtinPresetActive'),
);
const runtimePromptModeLabel = computed(() => {
  const mode = runtimeContentContext.value.promptAssets?.mode;
  if (mode === 'full') return t('contentCenter.presets.modeFull');
  if (mode === 'compact') return t('contentCenter.presets.modeCompactMainChain');
  return t('contentCenter.presets.runtimeModeUnknown');
});
const assistantMessagesForDebug = computed<MessageRecord[]>(() =>
  messagesStore.messages
    .filter(message => message.role === 'assistant')
    .slice()
    .sort((left, right) => right.message_id - left.message_id),
);
const latestAssistantMessageWithTrace = computed<MessageRecord | null>(
  () => assistantMessagesForDebug.value.find(message => hasDebugTrace(message)) ?? null,
);
const selectedDebugMessage = computed<MessageRecord | null>(() => {
  const messages = assistantMessagesForDebug.value;
  if (messages.length === 0) {
    return null;
  }

  if (selectedDebugMessageId.value === null) {
    return null;
  }

  const matched = messages.find(message => message.message_id === selectedDebugMessageId.value);
  return matched ?? null;
});
const selectedDebugTrace = computed<StandaloneAssistantDebugTrace | undefined>(
  () => selectedDebugMessage.value?.debug_trace,
);
const selectedPreferredVariableTrace = computed<StandaloneAiDebugPassTrace | undefined>(() =>
  resolvePreferredVariableDebugPass(selectedDebugTrace.value),
);
const mainPassRequestMessageItems = computed(() =>
  buildReadableDebugRequestMessages(selectedDebugTrace.value?.main_pass?.request_messages),
);
const variablePassRequestMessageItems = computed(() =>
  buildReadableDebugRequestMessages(selectedPreferredVariableTrace.value?.request_messages),
);
const mainPassRequestBodyView = computed(() =>
  buildReadableDebugRequestBodyView(selectedDebugTrace.value?.main_pass?.request_body_text),
);
const variablePassRequestBodyView = computed(() =>
  buildReadableDebugRequestBodyView(selectedPreferredVariableTrace.value?.request_body_text),
);
const contentSelectorCards = computed(() => {
  const cards: Array<{
    tab: ContentCenterTab;
    icon: string;
    title: string;
    description: string;
    summaryLabel: string;
    summaryValue: string;
    breakSummary?: boolean;
    metrics: ContentSelectorMetric[];
  }> = [
    {
      tab: 'presets',
      icon: 'fa-solid fa-layer-group',
      title: t('contentCenter.tab.presets'),
      description: t('contentCenter.overview.presets'),
      summaryLabel: t('contentCenter.presets.activePresetSourceLabel'),
      summaryValue: tavernPresetSourceName.value,
      breakSummary: true,
      metrics: [
        {
          label: t('contentCenter.presets.mainChainBlockCountLabel'),
          value: runtimeMainChainEntries.value.length,
        },
        {
          label: t('contentCenter.presets.rawPresetReferenceLabel'),
          value: runtimeMainChainView.value.rawPresetReferenceName,
        },
        {
          label: t('contentCenter.presets.actionOptionsLabel'),
          value: tavernPresetActionOptionsLabel.value,
        },
      ],
    },
    {
      tab: 'aiDebug',
      icon: 'fa-solid fa-bug',
      title: t('contentCenter.tab.aiDebug'),
      description: t('contentCenter.overview.aiDebug'),
      summaryLabel: t('contentCenter.aiDebug.selectedMessageLabel'),
      summaryValue: selectedDebugMessage.value
        ? `#${selectedDebugMessage.value.message_id}`
        : latestAssistantMessageWithTrace.value
          ? `#${latestAssistantMessageWithTrace.value.message_id}`
          : assistantMessagesForDebug.value[0]
            ? `#${assistantMessagesForDebug.value[0].message_id}`
            : t('common.notAvailable'),
      metrics: [
        {
          label: t('contentCenter.aiDebug.traceStatusAvailable'),
          value: assistantMessagesForDebug.value.filter(message => hasDebugTrace(message)).length,
        },
        {
          label: t('contentCenter.aiDebug.traceStatusMissing'),
          value: assistantMessagesForDebug.value.filter(message => !hasDebugTrace(message)).length,
        },
        {
          label: t('contentCenter.aiDebug.replyCountLabel'),
          value: assistantMessagesForDebug.value.length,
        },
      ],
    },
  ];

  return cards;
});

const activeTabMetrics = computed<ContentSelectorMetric[]>(() => {
  const card = contentSelectorCards.value.find(item => item.tab === currentTab.value);
  return card?.metrics ?? [];
});

const selectedTavernPrompt = computed<StandaloneTavernPresetPromptView | null>(() => {
  const promptViews = tavernPresetPromptViews.value;
  if (promptViews.length === 0) {
    return null;
  }

  if (!selectedTavernPromptIdentifier.value) {
    return null;
  }

  const matchedPrompt = promptViews.find(prompt => prompt.identifier === selectedTavernPromptIdentifier.value);
  return matchedPrompt ?? null;
});
const activeTavernPresetEditable = computed(() => activeTavernPresetItem.value.kind === 'imported');
const hasSelectedTavernPromptDraft = computed(() => Boolean(tavernPresetPromptDraft.value));
function focusTab(tab: ContentCenterTab) {
  currentTab.value = tab;
  void nextTick(() => {
    const tabElement = document.getElementById(`content-center-tab-${tab}`);
    if (tabElement instanceof HTMLButtonElement) {
      tabElement.focus();
    }
  });
}

function focusRelativeTab(fromTab: ContentCenterTab, offset: 1 | -1) {
  const tabOrder: ContentCenterTab[] = ['presets', 'aiDebug'];
  const currentIndex = tabOrder.indexOf(fromTab);
  const nextIndex = (currentIndex + offset + tabOrder.length) % tabOrder.length;
  focusTab(tabOrder[nextIndex]);
}

function focusLastTab() {
  focusTab('aiDebug');
}

function refreshTavernPresetState() {
  tavernPresetRefreshTick.value += 1;
  selectedTavernPromptIdentifier.value = tavernPresetPromptViews.value[0]?.identifier ?? '';
}

function triggerTavernPresetImport() {
  tavernPresetImportInputRef.value?.click();
}

function isValidTavernPresetDocument(document: StandaloneTavernPresetDocument) {
  return Array.isArray(document.prompts) || Array.isArray(document.prompt_order);
}

function cloneTavernPresetDocument(document: StandaloneTavernPresetDocument): StandaloneTavernPresetDocument {
  return JSON.parse(JSON.stringify(document)) as StandaloneTavernPresetDocument;
}

function normalizedDraftRole(role: StandaloneTavernPresetPromptView['role']): TavernPresetPromptDraft['role'] {
  if (role === 'system' || role === 'user' || role === 'assistant') {
    return role;
  }

  return 'user';
}

function syncTavernPromptDraftFromSelection() {
  const prompt = selectedTavernPrompt.value;
  if (!prompt) {
    tavernPresetPromptDraft.value = null;
    return;
  }

  tavernPresetPromptDraft.value = {
    identifier: prompt.identifier,
    name: prompt.name,
    role: normalizedDraftRole(prompt.role),
    enabled: prompt.enabledInOrder,
    content: prompt.content,
  };
}

function selectTavernPromptForEditing(identifier: string) {
  selectedTavernPromptIdentifier.value = identifier;
  syncTavernPromptDraftFromSelection();
}

function findPromptDefinition(document: StandaloneTavernPresetDocument, identifier: string) {
  const prompts = Array.isArray(document.prompts) ? document.prompts : [];
  return prompts.find(prompt => prompt.identifier === identifier);
}

function applyPromptDraftToDocument(draft: TavernPresetPromptDraft): StandaloneTavernPresetDocument {
  const document = cloneTavernPresetDocument(activeTavernPresetItem.value.document);
  const prompts = Array.isArray(document.prompts) ? document.prompts : [];
  document.prompts = prompts;

  let prompt = findPromptDefinition(document, draft.identifier);
  if (!prompt) {
    prompt = { identifier: draft.identifier };
    prompts.push(prompt);
  }

  prompt.name = draft.name.trim() || draft.identifier;
  prompt.role = draft.role;
  prompt.enabled = draft.enabled;
  prompt.content = draft.content;
  prompt.system_prompt = draft.role === 'system';

  const order = document.prompt_order?.[0]?.order;
  if (Array.isArray(order)) {
    const orderItem = order.find(item => item.identifier === draft.identifier);
    if (orderItem) {
      orderItem.enabled = draft.enabled;
    } else {
      order.push({ identifier: draft.identifier, enabled: draft.enabled });
    }
  } else {
    // 文档原本没有 prompt_order 时，列表视图只展示 enabled 的条目。
    // 生成 order 时同样只纳入原本可见（enabled）的条目，避免保存后
    // 原先隐藏的 disabled 条目突然出现在列表中。
    document.prompt_order = [
      {
        order: prompts
          .filter(item => Boolean(item.enabled) || item.identifier === draft.identifier)
          .map(item => ({ identifier: item.identifier, enabled: Boolean(item.enabled) })),
      },
    ];
  }

  return document;
}

function handleDuplicateActivePresetForEditing() {
  const duplicatedPreset = duplicateActiveStandaloneTavernPresetAsImported();
  refreshTavernPresetState();
  tavernPresetImportStatus.value = t('contentCenter.presets.duplicateSuccess', {
    name: duplicatedPreset.sourceName,
  });
}

function handleSaveTavernPromptDraft() {
  const draft = tavernPresetPromptDraft.value;
  if (!draft || !activeTavernPresetEditable.value) {
    return;
  }

  updateImportedStandaloneTavernPreset({
    presetId: activeTavernPresetId.value,
    document: applyPromptDraftToDocument(draft),
  });
  refreshTavernPresetState();
  selectedTavernPromptIdentifier.value = draft.identifier;
  syncTavernPromptDraftFromSelection();
  tavernPresetImportStatus.value = t('contentCenter.presets.savePromptSuccess', { name: draft.name || draft.identifier });
}

function handleAddTavernPrompt() {
  if (!activeTavernPresetEditable.value) {
    return;
  }

  const identifier = `custom_prompt_${Date.now()}`;
  tavernPresetPromptDraft.value = {
    identifier,
    name: t('contentCenter.presets.newPromptName'),
    role: 'user',
    enabled: true,
    content: '',
  };
  handleSaveTavernPromptDraft();
  selectedTavernPromptIdentifier.value = identifier;
}

function tavernPresetLibraryItemMeta(preset: StandaloneTavernPresetLibraryItem) {
  const inspection = getStandaloneTavernPresetInspection(preset.document, preset.sourceName);
  const importedAt = preset.importedAt ? new Date(preset.importedAt) : null;
  const timeLabel =
    importedAt && !Number.isNaN(importedAt.getTime())
      ? importedAt.toLocaleString()
      : t('contentCenter.presets.builtinPresetActive');
  return t('contentCenter.presets.libraryItemMeta', {
    count: inspection.totalPromptCount,
    enabled: inspection.enabledPromptCount,
    time: timeLabel,
  });
}

// 预设库每项的说明文案。用 computed 一次性构建，避免在 v-for 中
// 对每一项、每次渲染都重新 inspect/解析整份预设文档。
const tavernPresetLibraryItemMetaMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const preset of tavernPresetLibraryItems.value) {
    map[preset.id] = tavernPresetLibraryItemMeta(preset);
  }
  return map;
});

function handleSelectTavernPreset(presetId: string) {
  selectStandaloneTavernPreset(presetId);
  refreshTavernPresetState();
  tavernPresetImportStatus.value = t('contentCenter.presets.selectSuccess', {
    name: activeTavernPresetItem.value.sourceName,
  });
}

function handleDeleteTavernPreset(presetId: string) {
  const deletingPreset = tavernPresetLibraryItems.value.find(preset => preset.id === presetId);
  deleteImportedStandaloneTavernPreset(presetId);
  refreshTavernPresetState();
  tavernPresetImportStatus.value = t('contentCenter.presets.deleteSuccess', {
    name: deletingPreset?.sourceName ?? t('common.unknown'),
  });
}

async function handleTavernPresetFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const rawText = await file.text();
    const document = parseStandaloneTavernPresetDocument(rawText);
    if (!isValidTavernPresetDocument(document)) {
      tavernPresetImportStatus.value = t('contentCenter.presets.importInvalid');
      return;
    }

    const inspection = getStandaloneTavernPresetInspection(document, file.name);
    if (inspection.totalPromptCount === 0) {
      tavernPresetImportStatus.value = t('contentCenter.presets.importNoPrompts');
      return;
    }

    const importedPreset = saveImportedStandaloneTavernPreset({ sourceName: file.name, document });
    refreshTavernPresetState();
    tavernPresetImportStatus.value = t('contentCenter.presets.importSuccess', {
      name: importedPreset.sourceName,
      count: inspection.totalPromptCount,
    });
  } catch (error) {
    tavernPresetImportStatus.value = t('contentCenter.presets.importFailed', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    input.value = '';
  }
}

function hasDebugTrace(message: MessageRecord | null | undefined) {
  return Boolean(message?.debug_trace?.main_pass || resolvePreferredVariableDebugPass(message?.debug_trace));
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2) ?? t('common.notAvailable');
}

function asTrimmedDebugString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isDebugRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function debugRoleLabel(role: unknown): string {
  if (role === 'system') return '系统';
  if (role === 'user') return '用户';
  if (role === 'assistant') return '助手';
  return '未知';
}

function debugRoleTone(role: unknown): DebugReadableMessageItem['roleTone'] {
  if (role === 'system') return 'system';
  if (role === 'user') return 'user';
  if (role === 'assistant') return 'assistant';
  return 'unknown';
}

function asDebugDisplayValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

function createDebugMetaRow(label: string, value: unknown): DebugReadableMetaRow | null {
  const normalized = asDebugDisplayValue(value);
  if (!normalized) {
    return null;
  }

  return { label, value: normalized };
}

function readableDebugContentValue(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  const extractedText = extractDebugContentText(content).trim();
  if (extractedText) {
    return extractedText;
  }

  if (content == null) {
    return '';
  }

  return prettyJson(content);
}

function readableDebugRequestMessages(messages: unknown): string {
  const items = buildReadableDebugRequestMessages(messages);
  if (items.length === 0) {
    return t('common.notAvailable');
  }

  const blocks = items.map(item => {
    const metaLines = item.metaRows.map(meta => `${meta.label}：${meta.value}`);
    return [`第 ${item.index} 条 · ${item.roleLabel}`, ...metaLines, '', item.content].join('\n');
  });

  return blocks.join('\n\n────────────\n\n');
}

function buildReadableDebugRequestMessages(messages: unknown): DebugReadableMessageItem[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  return messages.map((message, index) => {
    if (!isDebugRecord(message)) {
      return {
        index: index + 1,
        roleLabel: debugRoleLabel(undefined),
        roleTone: 'unknown',
        metaRows: [],
        content: prettyJson(message),
      };
    }

    const metaRows = [
      createDebugMetaRow('名称', message.name),
      createDebugMetaRow('工具调用', message.tool_call_id),
      createDebugMetaRow('类型', message.type),
    ].filter((row): row is DebugReadableMetaRow => Boolean(row));

    return {
      index: index + 1,
      roleLabel: debugRoleLabel(message.role),
      roleTone: debugRoleTone(message.role),
      metaRows,
      content: readableDebugContentValue(message.content) || t('common.notAvailable'),
    };
  });
}

function readableDebugRequestBody(rawRequestBody: unknown): string {
  const view = buildReadableDebugRequestBodyView(rawRequestBody);
  if (!view.hasStructuredContent) {
    return view.fallbackText;
  }

  const sections = [
    '请求摘要',
    ...(view.summaryRows.length > 0 ? view.summaryRows.map(row => `${row.label}：${row.value}`) : ['无可展示摘要']),
  ];

  for (const note of view.noteBlocks) {
    sections.push('', note.label, note.value);
  }

  return sections.join('\n');
}

function buildReadableDebugRequestBodyView(rawRequestBody: unknown): DebugRequestBodyView {
  const trimmed = asTrimmedDebugString(rawRequestBody);
  if (!trimmed) {
    return {
      summaryRows: [],
      noteBlocks: [],
      fallbackText: t('common.notAvailable'),
      hasStructuredContent: false,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isDebugRecord(parsed)) {
      return {
        summaryRows: [],
        noteBlocks: [],
        fallbackText: trimmed,
        hasStructuredContent: false,
      };
    }

    const summaryRows = [
      createDebugMetaRow('模型', parsed.model),
      typeof parsed.stream === 'boolean' ? { label: '流式返回', value: parsed.stream ? '是' : '否' } : null,
      createDebugMetaRow('温度', parsed.temperature),
      createDebugMetaRow('Top P', parsed.top_p),
      createDebugMetaRow('最大 tokens', parsed.max_tokens),
      createDebugMetaRow('最大 completion tokens', parsed.max_completion_tokens),
      Array.isArray(parsed.tools) ? { label: '工具数量', value: String(parsed.tools.length) } : null,
      Array.isArray(parsed.messages) ? { label: 'messages 条数', value: String(parsed.messages.length) } : null,
    ].filter((row): row is DebugReadableMetaRow => Boolean(row));

    const noteBlocks: DebugRequestBodyNoteBlock[] = [];
    if (Array.isArray(parsed.messages)) {
      noteBlocks.push({
        label: 'messages 说明',
        value: '消息内容已在上方“实际发送的 messages 数组”中按阅读视图展开。',
      });
    }

    const summarizedKeys = new Set([
      'messages',
      'model',
      'stream',
      'temperature',
      'top_p',
      'max_tokens',
      'max_completion_tokens',
      'tools',
    ]);
    const otherFields = Object.fromEntries(Object.entries(parsed).filter(([key]) => !summarizedKeys.has(key)));

    if (Object.keys(otherFields).length > 0) {
      noteBlocks.push({
        label: '其他请求参数',
        value: prettyJson(otherFields),
        structured: true,
      });
    }

    return {
      summaryRows,
      noteBlocks,
      fallbackText: trimmed,
      hasStructuredContent: summaryRows.length > 0 || noteBlocks.length > 0,
    };
  } catch {
    return {
      summaryRows: [],
      noteBlocks: [],
      fallbackText: trimmed,
      hasStructuredContent: false,
    };
  }
}

function extractDebugContentText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map(item => {
      if (typeof item === 'string') {
        return item;
      }

      if (!isDebugRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      if (isDebugRecord(item.text) && typeof item.text.value === 'string') {
        return item.text.value;
      }

      if (typeof item.output_text === 'string') {
        return item.output_text;
      }

      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function extractDebugOutputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return '';
  }

  return output
    .map(item => {
      if (!isDebugRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      return extractDebugContentText(item.content);
    })
    .filter(Boolean)
    .join('\n');
}

function extractDebugResponseText(payload: unknown): string {
  if (!isDebugRecord(payload)) {
    return '';
  }

  const directOutputText = extractDebugOutputText(payload);
  if (directOutputText.trim()) {
    return directOutputText;
  }

  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0 || !isDebugRecord(choices[0])) {
    return '';
  }

  const firstChoice = choices[0];
  if (typeof firstChoice.text === 'string' && firstChoice.text.trim()) {
    return firstChoice.text;
  }

  const message = firstChoice.message;
  if (!isDebugRecord(message)) {
    return '';
  }

  return extractDebugContentText(message.content);
}

function extractDebugStreamingDeltaText(payload: unknown): string {
  if (!isDebugRecord(payload)) {
    return '';
  }

  if (typeof payload.output_text === 'string') {
    return payload.output_text;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0 && isDebugRecord(choices[0])) {
    const firstChoice = choices[0];
    const delta = firstChoice.delta;
    if (isDebugRecord(delta)) {
      return extractDebugContentText(delta.content) || (typeof delta.content === 'string' ? delta.content : '');
    }
  }

  const output = payload.output;
  if (!Array.isArray(output)) {
    return '';
  }

  return output
    .map(item => {
      if (!isDebugRecord(item)) {
        return '';
      }

      if (typeof item.text === 'string') {
        return item.text;
      }

      return extractDebugContentText(item.content);
    })
    .filter(Boolean)
    .join('');
}

function extractReadableTextFromSseTranscript(rawText: string): string {
  const lines = rawText.split(/\r?\n/);
  let aggregatedText = '';
  let sawSsePayload = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('data:')) {
      continue;
    }

    sawSsePayload = true;
    const payloadText = line.slice(5).trim();
    if (!payloadText || payloadText === '[DONE]') {
      continue;
    }

    try {
      const payload = JSON.parse(payloadText) as unknown;
      const deltaText = extractDebugStreamingDeltaText(payload);
      if (deltaText) {
        aggregatedText += deltaText;
      }
    } catch {
      continue;
    }
  }

  return sawSsePayload ? aggregatedText.trim() : '';
}

function extractReadableTextFromRawResponse(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return '';
  }

  const sseText = extractReadableTextFromSseTranscript(trimmed);
  if (sseText) {
    return sseText;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const responseText = extractDebugResponseText(parsed).trim();
    if (responseText) {
      return responseText;
    }
  } catch {
    // not JSON, fall back to original text
  }

  return trimmed;
}

function readableDebugPassResponse(pass: StandaloneAiDebugPassTrace | undefined): string {
  if (!pass) {
    return t('common.notAvailable');
  }

  const extractedText = asTrimmedDebugString(pass.extracted_text);
  if (extractedText) {
    return extractedText;
  }

  const rawResponseText = asTrimmedDebugString(pass.raw_response_text);
  const readableFromRaw = extractReadableTextFromRawResponse(rawResponseText);
  if (readableFromRaw) {
    return readableFromRaw;
  }

  return t('common.notAvailable');
}

function transportModeLabel(mode: 'streaming' | 'non_streaming') {
  return mode === 'streaming'
    ? t('contentCenter.aiDebug.metaTransportStreaming')
    : t('contentCenter.aiDebug.metaTransportNonStreaming');
}

function toggleDebugMainPass() {
  debugMainPassExpanded.value = !debugMainPassExpanded.value;
}

function toggleDebugVarPass() {
  debugVarPassExpanded.value = !debugVarPassExpanded.value;
}

function toggleDebugFinalRaw() {
  debugFinalRawExpanded.value = !debugFinalRawExpanded.value;
}

function toggleDebugMessageCard(messageId: number) {
  selectedDebugMessageId.value = selectedDebugMessageId.value === messageId ? null : messageId;
}

function isDebugMainSubExpanded(key: string) {
  return debugMainSubSections.value[key] === true;
}

function toggleDebugMainSub(key: string) {
  debugMainSubSections.value[key] = !debugMainSubSections.value[key];
}

function isDebugVarSubExpanded(key: string) {
  return debugVarSubSections.value[key] === true;
}

function toggleDebugVarSub(key: string) {
  debugVarSubSections.value[key] = !debugVarSubSections.value[key];
}

function resetDebugCollapseState() {
  debugMainPassExpanded.value = false;
  debugVarPassExpanded.value = false;
  debugFinalRawExpanded.value = false;
  debugMainSubSections.value = {};
  debugVarSubSections.value = {};
}

function syncSelectedDebugMessage(preferredMessageId?: number | null) {
  const availableMessages = assistantMessagesForDebug.value;
  if (availableMessages.length === 0) {
    selectedDebugMessageId.value = null;
    return;
  }

  if (
    typeof preferredMessageId === 'number' &&
    availableMessages.some(message => message.message_id === preferredMessageId)
  ) {
    selectedDebugMessageId.value = preferredMessageId;
    return;
  }

  if (preferredMessageId === null) {
    selectedDebugMessageId.value = null;
    return;
  }

  selectedDebugMessageId.value = null;
}

function tavernPromptRoleLabel(role: StandaloneTavernPresetPromptView['role']) {
  if (role === 'system') return t('contentCenter.presets.role.system');
  if (role === 'user') return t('contentCenter.presets.role.user');
  if (role === 'assistant') return t('contentCenter.presets.role.assistant');
  return t('contentCenter.presets.role.unknown');
}

function runtimeMainChainEntryTitle(entry: StandaloneMainChainViewEntry) {
  return t(`contentCenter.presets.mainChainEntry.${entry.key}.title`);
}

function runtimeMainChainEntrySummary(entry: StandaloneMainChainViewEntry) {
  return t(`contentCenter.presets.mainChainEntry.${entry.key}.summary`);
}

function runtimeMainChainEntrySourceLabel(entry: StandaloneMainChainViewEntry) {
  return t(`contentCenter.presets.mainChainEntry.${entry.key}.source`);
}

watch(
  () =>
    assistantMessagesForDebug.value
      .map(message => `${message.message_id}:${hasDebugTrace(message) ? '1' : '0'}`)
      .join('|'),
  () => {
    syncSelectedDebugMessage(selectedDebugMessageId.value);
  },
  { immediate: true },
);

watch(selectedDebugMessageId, () => {
  resetDebugCollapseState();
});

watch(
  () => selectedTavernPromptIdentifier.value,
  () => {
    syncTavernPromptDraftFromSelection();
  },
);

onActivated(() => {
  // 面板被 <KeepAlive> 缓存，重新激活时递增 tick，
  // 强制依赖 localStorage 的运行时 computed（运行时上下文、预设库等）重新求值，
  // 避免展示上一次打开时的陈旧数据。
  tavernPresetRefreshTick.value += 1;
  currentTab.value = 'presets';
  selectedTavernPromptIdentifier.value = tavernPresetPromptViews.value[0]?.identifier ?? '';
  syncTavernPromptDraftFromSelection();
  syncSelectedDebugMessage();
});
</script>

<style scoped>
.content-center-panel {
  --content-center-surface-radius: 16px;
  --content-center-surface-border: rgba(var(--accent-primary-rgb), 0.1);
  --content-center-surface-shadow: 0 12px 28px rgba(15, 23, 42, 0.07);
  --content-center-surface-shadow-strong: 0 16px 32px rgba(var(--accent-primary-rgb), 0.11);
  --content-center-soft-fill: rgba(var(--accent-primary-rgb), 0.045);
  --content-center-soft-fill-strong: rgba(var(--accent-primary-rgb), 0.07);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
}

.content-tabbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
  padding: 6px;
  border-radius: var(--content-center-surface-radius);
  border: 1px solid var(--content-center-surface-border);
  background: color-mix(in srgb, var(--card-bg-strong) 86%, transparent);
  box-shadow: var(--content-center-surface-shadow);
}

.content-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--transition-normal),
    background var(--transition-normal),
    box-shadow var(--transition-normal);
}

.content-tab:hover {
  background: rgba(var(--accent-primary-rgb), 0.05);
}

.content-tab.active {
  border-color: rgba(var(--accent-primary-rgb), 0.24);
  background: rgba(var(--accent-primary-rgb), 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.content-tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.14);
}

.content-tab-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  flex-shrink: 0;
  font-size: 13px;
}

.content-tab-icon.presets {
  background: rgba(var(--accent-secondary-rgb), 0.16);
  color: var(--accent-secondary);
}

.content-tab-icon.aiDebug {
  background: rgba(var(--accent-danger-rgb), 0.12);
  color: var(--accent-danger);
}

.content-tab-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.content-tab-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.2;
}

.content-tab.active .content-tab-title {
  color: var(--accent-primary);
}

.content-tab-desc {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-tab-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.content-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background: var(--content-center-soft-fill);
}

.content-stat-label {
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.2;
}

.content-stat-value {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.ghost-btn,
.primary-btn {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.14);
  background: color-mix(in srgb, var(--card-bg-strong) 76%, transparent);
  color: var(--text-secondary);
  border-radius: 12px;
  padding: 10px 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition:
    transform var(--transition-normal),
    border-color var(--transition-normal),
    background var(--transition-normal),
    color var(--transition-normal);
}

.ghost-btn:hover,
.primary-btn:hover:not(:disabled) {
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.primary-btn {
  color: #fff;
  background: linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.92), rgba(var(--accent-secondary-rgb), 0.9));
  border-color: transparent;
}

.primary-btn:hover:not(:disabled) {
  color: #fff;
  transform: translateY(-1px);
}

.ghost-btn:disabled,
.primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button-group-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card,
.status-card,
.asset-card,
.preset-card {
  border-radius: var(--content-center-surface-radius);
  border: 1px solid var(--content-center-surface-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 28%),
    color-mix(in srgb, var(--card-bg-strong) 88%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    var(--content-center-surface-shadow);
}

.preset-card h5 {
  margin: 0;
  color: var(--text-primary);
}

.status-card p,
.preset-description,
.asset-description,
.asset-note {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: var(--text-sm);
}

.asset-note {
  color: var(--text-tertiary);
}

.hero-meta-group,
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-pill,
.source-badge,
.preset-badge,
.tag-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1;
}

.hero-pill,
.preset-badge.idle,
.tag-chip {
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--text-secondary);
}

.hero-pill.accent,
.preset-badge.selected,
.source-badge.preset {
  background: rgba(var(--accent-primary-rgb), 0.14);
  color: var(--accent-primary);
}

.settings-managed-chip {
  background: rgba(var(--accent-secondary-rgb), 0.14);
  color: var(--accent-secondary);
}

.source-badge.builtin {
  background: rgba(var(--accent-success-rgb), 0.14);
  color: var(--accent-success);
}

.summary-card,
.status-card,
.preset-card,
.asset-card,
.preset-entry-list-card,
.preset-entry-detail-card,
.preset-detail-note-card,
.preset-detail-body-card {
  padding: 14px;
}

.summary-card,
.status-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compact-summary-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.compact-summary-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  background: var(--content-center-soft-fill);
}

.compact-summary-item dt {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.45;
}

.compact-summary-item dd {
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
  line-height: 1.45;
}

.debug-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.summary-label,
.asset-meta,
.preset-category,
.status-hint {
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.45;
  letter-spacing: 0.04em;
}

.summary-value {
  color: var(--text-primary);
  font-weight: 600;
}

.asset-grid,
.preset-list,
.status-grid {
  display: grid;
  gap: 12px;
}

.preset-browser-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.preset-secondary-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-import-console {
  gap: 10px;
}

.preset-import-actions {
  justify-content: flex-end;
}

.tavern-preset-library-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tavern-preset-library-item {
  display: flex;
  align-items: stretch;
  gap: 8px;
  padding: 9px;
  border-radius: 15px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background: rgba(var(--accent-primary-rgb), 0.035);
  transition:
    border-color var(--transition-normal),
    background var(--transition-normal),
    box-shadow var(--transition-normal),
    transform var(--transition-normal);
}

.tavern-preset-library-item.active {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  background: rgba(var(--accent-primary-rgb), 0.075);
  box-shadow: 0 10px 22px rgba(var(--accent-primary-rgb), 0.09);
}

.tavern-preset-select-btn {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: flex-start;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.tavern-preset-select-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.14);
  border-radius: 12px;
}

.preset-import-status {
  margin: 0;
  padding: 9px 11px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background: rgba(var(--accent-primary-rgb), 0.055);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.preset-editor-section {
  gap: 12px;
}

.preset-editor-accordion {
  gap: 9px;
}

.preset-editor-accordion-item {
  border-radius: 16px;
  background: rgba(var(--accent-primary-rgb), 0.025);
}

.preset-editor-accordion-item > .preset-entry-item {
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
}

.preset-editor-chevron {
  align-self: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

.preset-editor-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 28%),
    rgba(var(--accent-primary-rgb), 0.045);
}

.preset-editor-fields {
  grid-template-columns: minmax(0, 1fr) minmax(150px, 0.55fr);
}

.preset-editor-enabled-row {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

.preset-editor-textarea {
  min-height: 320px;
}

.preset-send-preview-item {
  cursor: default;
}

.preset-send-preview-item:hover {
  transform: none;
}

.debug-browser-shell {
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
}

.ai-debug-stack-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-debug-stack-header {
  gap: 8px;
}

.ai-debug-stack-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-debug-stack-card {
  gap: 0;
  padding: 0;
  overflow: hidden;
  border-color: rgba(var(--accent-primary-rgb), 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01)),
    color-mix(in srgb, var(--card-bg-strong) 90%, transparent);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal),
    transform var(--transition-normal),
    background var(--transition-normal);
}

.ai-debug-stack-card.active {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  box-shadow: 0 18px 40px rgba(var(--accent-primary-rgb), 0.12);
}

.ai-debug-stack-trigger {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.ai-debug-stack-trigger:hover {
  background: rgba(var(--accent-primary-rgb), 0.045);
}

.ai-debug-stack-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ai-debug-stack-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.ai-debug-stack-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-debug-stack-title-row .preset-entry-order {
  padding-top: 0;
}

.ai-debug-stack-time {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-debug-stack-chevron {
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 12px;
  flex-shrink: 0;
}

.ai-debug-stack-meta {
  gap: 6px;
}

.ai-debug-summary-chip {
  gap: 5px;
}

.ai-debug-summary-chip.main {
  background: rgba(var(--accent-primary-rgb), 0.11);
  color: var(--accent-primary);
}

.ai-debug-summary-chip.variable {
  background: rgba(var(--accent-secondary-rgb), 0.12);
  color: var(--accent-secondary);
}

.ai-debug-summary-chip.missing {
  background: rgba(var(--accent-danger-rgb), 0.11);
  color: var(--accent-danger);
}

.ai-debug-overview-preview {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.58;
  word-break: break-word;
}

.ai-debug-stack-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 14px 14px;
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background: linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.03), transparent 72%);
}

.ai-debug-overview-card {
  margin-top: 12px;
  padding: 14px;
  gap: 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent), rgba(var(--accent-primary-rgb), 0.04);
}

.ai-debug-overview-card.expanded {
  border-color: rgba(var(--accent-primary-rgb), 0.18);
}

.ai-debug-overview-toggle {
  width: 100%;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.ai-debug-overview-title-row {
  flex: 1 1 220px;
}

.ai-debug-overview-summary {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 38px;
}

.ai-debug-overview-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.08);
}

.ai-debug-overview-strip,
.ai-debug-pass-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ai-debug-overview-pass.main {
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.ai-debug-overview-pass.variable {
  background: rgba(var(--accent-secondary-rgb), 0.12);
  color: var(--accent-secondary);
}

.ai-debug-pass-card {
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.worldbook-workspace-shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.compact-worldbook-shell {
  grid-template-columns: minmax(0, 1fr);
}

.preset-entry-list-card,
.preset-entry-detail-card,
.preset-detail-note-card,
.preset-detail-body-card,
.worldbook-entry-list-card,
.worldbook-editor-card {
  border-radius: var(--content-center-surface-radius);
  border: 1px solid var(--content-center-surface-border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 28%),
    color-mix(in srgb, var(--card-bg-strong) 88%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    var(--content-center-surface-shadow);
}

.preset-entry-list-card,
.preset-entry-detail-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.debug-list-card,
.debug-detail-card,
.debug-pass-card {
  gap: 12px;
}

.worldbook-entry-list-card,
.worldbook-editor-card {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.worldbook-compact-card {
  padding: 12px;
  gap: 8px;
}

.preset-browser-head {
  display: flex;
  justify-content: space-between;
  gap: 10px 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.preset-browser-head > div,
.content-section-head > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.preset-browser-head h5 {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.24;
}

.preset-section-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
}

.preset-section-note-secondary {
  color: var(--text-tertiary);
}

.preset-browser-head.detail {
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.12);
}

.preset-entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

.preset-entry-stack-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.worldbook-entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 620px;
  overflow-y: auto;
  padding-right: 4px;
}

.compact-worldbook-list {
  gap: 7px;
  max-height: none;
  padding-right: 0;
}

.preset-entry-item {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
  border-radius: 14px;
  background: var(--content-center-soft-fill);
  color: inherit;
  text-align: left;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 11px 12px;
  cursor: pointer;
  transition:
    transform var(--transition-normal),
    border-color var(--transition-normal),
    background var(--transition-normal),
    box-shadow var(--transition-normal);
}

.worldbook-entry-item {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
  border-radius: 14px;
  background: var(--content-center-soft-fill);
  color: inherit;
  text-align: left;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  padding: 11px 12px;
  cursor: pointer;
  transition:
    transform var(--transition-normal),
    border-color var(--transition-normal),
    background var(--transition-normal),
    box-shadow var(--transition-normal);
}

.compact-worldbook-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 11px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.015)),
    color-mix(in srgb, var(--card-bg-strong) 88%, transparent);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.preset-entry-item:hover,
.preset-entry-item.active {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  background: var(--content-center-soft-fill-strong);
  box-shadow: 0 10px 20px rgba(var(--accent-primary-rgb), 0.09);
  transform: translateY(-1px);
}

.worldbook-entry-item:hover,
.worldbook-entry-item.active {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  background: var(--content-center-soft-fill-strong);
  box-shadow: 0 10px 20px rgba(var(--accent-primary-rgb), 0.09);
  transform: translateY(-1px);
}

.preset-entry-order {
  min-width: 44px;
  padding-top: 2px;
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 700;
}

.preset-entry-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.worldbook-entry-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compact-worldbook-copy {
  gap: 3px;
}

.compact-worldbook-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 7px;
}

.compact-worldbook-trigger {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 12px;
}

.compact-worldbook-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.14);
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.compact-order {
  min-width: 34px;
  padding-top: 0;
}

.system-order {
  min-width: 30px;
  font-size: 10px;
}

.compact-worldbook-title-line {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex-wrap: wrap;
}

.compact-worldbook-title-line strong {
  color: var(--text-primary);
  font-size: 12.5px;
  line-height: 1.28;
  letter-spacing: 0.01em;
  min-width: 0;
  flex: 1 1 180px;
}

.compact-badge {
  padding: 4px 8px;
  font-size: 10px;
}

.compact-worldbook-meta-line {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
}

.compact-tag {
  padding: 3px 7px;
  font-size: 10px;
}

.compact-worldbook-preview {
  min-width: 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.3;
  flex: 1 1 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.92;
}

.compact-worldbook-chevron {
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 12px;
  flex-shrink: 0;
}

.preset-entry-title-row,
.preset-entry-meta-row,
.preset-body-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.preset-entry-title-row strong {
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.32;
}

.entry-enabled-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
}

.entry-enabled-badge.enabled {
  background: rgba(var(--accent-success-rgb), 0.14);
  color: var(--accent-success);
}

.entry-enabled-badge.disabled {
  background: rgba(var(--accent-danger-rgb), 0.12);
  color: var(--accent-danger);
}

.preset-entry-identifier,
.break-all {
  word-break: break-all;
}

.preset-entry-identifier {
  color: var(--text-tertiary);
  font-size: 12px;
}

.preset-entry-preview {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
}

.preset-detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.status-card.compact {
  min-height: 78px;
}

.preset-detail-note-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  background: rgba(var(--accent-primary-rgb), 0.07);
}

.secondary-note-card {
  background: rgba(var(--accent-secondary-rgb), 0.08);
}

.secondary-note-card i {
  color: var(--accent-secondary);
}

.preset-detail-note-card i {
  color: var(--accent-primary);
  margin-top: 2px;
}

.preset-detail-note-card p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.preset-detail-body-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preset-detail-secondary-card {
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  padding-top: 2px;
}

.preset-entry-inline-detail {
  width: 100%;
}

.worldbook-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(180px, 0.8fr) minmax(180px, 0.8fr);
  gap: 12px;
}

.compact-worldbook-editor-grid {
  grid-template-columns: minmax(0, 1.2fr) minmax(140px, 0.8fr);
  gap: 7px;
}

.worldbook-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.worldbook-field-wide,
.worldbook-field-body {
  grid-column: 1 / -1;
}

.worldbook-input,
.worldbook-select,
.worldbook-textarea {
  width: 100%;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.14);
  border-radius: 14px;
  background: rgba(var(--accent-primary-rgb), 0.04);
  color: var(--text-primary);
  padding: 11px 14px;
  font: inherit;
  transition:
    border-color var(--transition-normal),
    background var(--transition-normal),
    box-shadow var(--transition-normal);
}

.compact-field {
  gap: 4px;
}

.compact-worldbook-input {
  border-radius: 12px;
  padding: 9px 12px;
  background: rgba(var(--accent-primary-rgb), 0.03);
}

.compact-worldbook-textarea {
  min-height: 160px;
  line-height: 1.55;
  padding: 10px 12px;
  background: rgba(var(--accent-primary-rgb), 0.03);
}

.compact-worldbook-textarea-readonly {
  color: var(--text-secondary);
}

.worldbook-input,
.worldbook-select {
  min-height: 44px;
}

.worldbook-textarea {
  min-height: 260px;
  line-height: 1.65;
  resize: vertical;
}

.worldbook-input:hover,
.worldbook-select:hover,
.worldbook-textarea:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
}

.worldbook-input:focus,
.worldbook-select:focus,
.worldbook-textarea:focus {
  outline: none;
  border-color: rgba(var(--accent-primary-rgb), 0.4);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.12);
  background: rgba(var(--accent-primary-rgb), 0.06);
}

.worldbook-editor-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.compact-worldbook-actions {
  flex-shrink: 0;
  gap: 6px;
  justify-content: flex-end;
}

.compact-icon-btn {
  width: 32px;
  min-width: 32px;
  height: 32px;
}

.compact-icon-btn:focus-visible,
.compact-toggle-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.14);
}

.compact-toggle-switch {
  width: 40px;
  height: 22px;
}

.compact-toggle-switch .toggle-track::after {
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
}

.compact-toggle-switch input:checked + .toggle-track::after {
  transform: translateX(18px);
}

.worldbook-editor-note {
  margin-top: -2px;
}

.compact-worldbook-note {
  margin-top: 0;
  padding: 9px 11px;
  border-radius: 12px;
}

.compact-worldbook-expand {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 7px;
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.09);
}

.workspace-help-text {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.workspace-help-text--compact {
  font-size: 11px;
  line-height: 1.5;
}

.route-segment-control {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: rgba(var(--accent-primary-rgb), 0.055);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
}

.route-segment-btn {
  min-height: 32px;
  padding: 6px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.route-segment-control[role='group'] .route-segment-btn {
  pointer-events: auto;
}

.route-segment-btn:hover {
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.route-segment-btn.active {
  background: linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.92), rgba(var(--accent-secondary-rgb), 0.78));
  color: white;
  box-shadow: 0 8px 18px rgba(var(--accent-primary-rgb), 0.2);
}

.route-segment-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.16);
}

.route-segment-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.route-segment-btn:disabled:hover {
  color: var(--text-secondary);
  background: transparent;
  box-shadow: none;
}

.route-segment-display {
  flex-shrink: 0;
  pointer-events: none;
  padding: 3px;
  border-radius: 12px;
}

.route-segment-control-system {
  width: 100%;
  margin-top: -2px;
  margin-bottom: 2px;
}

.compact-system-toggle {
  min-height: 32px;
  padding: 6px 10px;
  font-size: 11px;
}

.compact-system-meta-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.45;
  padding-inline: 2px;
}

.icon-only-btn {
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
}

.compact-action-btn {
  min-height: 36px;
  padding: 7px 11px;
}

.worldbook-system-section {
  gap: 12px;
}

.worldbook-system-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.worldbook-system-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent),
    color-mix(in srgb, var(--card-bg-strong) 82%, transparent);
}

.preset-body-content {
  margin: 0;
  padding: 14px 15px;
  border-radius: 12px;
  background: rgba(var(--accent-primary-rgb), 0.045);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.68;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: 620px;
  overflow: auto;
}

.preset-body-content-secondary {
  background: rgba(var(--accent-secondary-rgb), 0.05);
  border-color: rgba(var(--accent-secondary-rgb), 0.1);
}

.preset-reference-divider {
  height: 1px;
  margin: 4px 0 1px;
  background: linear-gradient(
    90deg,
    rgba(var(--accent-primary-rgb), 0),
    rgba(var(--accent-primary-rgb), 0.16),
    rgba(var(--accent-primary-rgb), 0)
  );
}

.preset-browser-head-secondary {
  margin-top: 2px;
}

.preset-entry-list-secondary {
  opacity: 0.92;
}

.preset-entry-item.secondary {
  border-style: dashed;
  background: rgba(var(--accent-primary-rgb), 0.025);
}

.preset-entry-item.secondary:hover,
.preset-entry-item.secondary.active {
  background: rgba(var(--accent-primary-rgb), 0.06);
}

.debug-block-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debug-block-section-reading {
  gap: 10px;
}

.debug-block-section-structured {
  gap: 8px;
}

.debug-reading-copy {
  margin: 0;
  color: color-mix(in srgb, var(--text-primary) 94%, white);
  font-family: 'Georgia', 'Times New Roman', 'Noto Serif SC', serif;
  font-size: 13px;
  line-height: 1.9;
  letter-spacing: 0.01em;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.debug-conversation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-conversation-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 26%),
    color-mix(in srgb, var(--card-bg-strong) 86%, rgba(var(--accent-primary-rgb), 0.06));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 10px 24px rgba(15, 23, 42, 0.08);
}

.debug-conversation-card.system {
  border-color: rgba(var(--accent-primary-rgb), 0.16);
  background:
    linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.09), transparent 36%),
    color-mix(in srgb, var(--card-bg-strong) 88%, rgba(var(--accent-primary-rgb), 0.08));
}

.debug-conversation-card.user {
  border-color: rgba(var(--accent-secondary-rgb), 0.16);
  background:
    linear-gradient(180deg, rgba(var(--accent-secondary-rgb), 0.09), transparent 36%),
    color-mix(in srgb, var(--card-bg-strong) 88%, rgba(var(--accent-secondary-rgb), 0.07));
}

.debug-conversation-card.assistant {
  border-color: rgba(var(--accent-success-rgb), 0.18);
  background:
    linear-gradient(180deg, rgba(var(--accent-success-rgb), 0.085), transparent 36%),
    color-mix(in srgb, var(--card-bg-strong) 88%, rgba(var(--accent-success-rgb), 0.06));
}

.debug-conversation-card.unknown {
  border-style: dashed;
}

.debug-conversation-card-head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-conversation-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-conversation-role,
.debug-conversation-index,
.debug-conversation-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
}

.debug-conversation-role {
  font-weight: 700;
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.debug-conversation-role.user {
  background: rgba(var(--accent-secondary-rgb), 0.14);
  color: var(--accent-secondary);
}

.debug-conversation-role.assistant {
  background: rgba(var(--accent-success-rgb), 0.14);
  color: var(--accent-success);
}

.debug-conversation-role.unknown {
  background: rgba(var(--accent-danger-rgb), 0.12);
  color: var(--accent-danger);
}

.debug-conversation-index {
  color: var(--text-tertiary);
  background: rgba(var(--accent-primary-rgb), 0.06);
}

.debug-conversation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.debug-conversation-meta-item {
  color: var(--text-secondary);
  background: rgba(var(--accent-primary-rgb), 0.05);
}

.debug-conversation-meta-item strong {
  color: var(--text-primary);
  font-weight: 600;
}

.debug-conversation-content {
  position: relative;
  padding-left: 14px;
}

.debug-conversation-content::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.4em;
  bottom: 0.4em;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.82), rgba(var(--accent-secondary-rgb), 0.72));
  opacity: 0.9;
}

.debug-request-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.debug-request-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.debug-request-stat,
.debug-request-note {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 15px;
  border-radius: 16px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 26%),
    color-mix(in srgb, var(--card-bg-strong) 88%, rgba(var(--accent-primary-rgb), 0.05));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.debug-request-stat {
  min-height: 92px;
}

.debug-request-stat .summary-value {
  font-size: 13px;
  line-height: 1.5;
}

.debug-request-notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-request-note.structured {
  border-color: rgba(var(--accent-primary-rgb), 0.14);
}

.debug-request-note-fallback {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 26%),
    color-mix(in srgb, var(--card-bg-strong) 86%, rgba(var(--accent-secondary-rgb), 0.05));
}

.debug-request-note-copy {
  color: var(--text-secondary);
}

.debug-request-note-structured {
  padding: 12px 13px;
  border-radius: 12px;
  background: rgba(var(--accent-primary-rgb), 0.045);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.72;
  letter-spacing: 0;
}

.debug-pre {
  font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.68;
}

.debug-pre-structured {
  padding: 14px 15px;
  background:
    linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.05), rgba(var(--accent-primary-rgb), 0.025)),
    rgba(255, 255, 255, 0.01);
  border-color: rgba(var(--accent-primary-rgb), 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  color: color-mix(in srgb, var(--text-primary) 92%, var(--text-secondary));
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  line-height: 1.72;
  letter-spacing: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: min(52vh, 640px);
  scrollbar-gutter: stable;
}

.debug-pre-reading {
  padding: 18px 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 24%),
    color-mix(in srgb, var(--card-bg-strong) 78%, rgba(var(--accent-primary-rgb), 0.08));
  border-color: rgba(var(--accent-primary-rgb), 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 8px 18px rgba(15, 23, 42, 0.08);
  color: color-mix(in srgb, var(--text-primary) 94%, white);
  font-family: 'Georgia', 'Times New Roman', 'Noto Serif SC', serif;
  font-size: 13px;
  line-height: 1.9;
  letter-spacing: 0.01em;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: min(60vh, 760px);
  scrollbar-gutter: stable both-edges;
}

.debug-pre-reading::selection {
  background: rgba(var(--accent-primary-rgb), 0.24);
}

.debug-pre-final {
  max-height: min(58vh, 760px);
}

.debug-collapsible-card {
  border-radius: 18px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent),
    color-mix(in srgb, var(--card-bg-strong) 86%, transparent);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.debug-collapsible-card.expanded {
  border-color: rgba(var(--accent-primary-rgb), 0.2);
}

.debug-collapsible-header {
  width: 100%;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

.debug-collapsible-header:hover {
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.debug-collapsible-title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1 1 220px;
  min-width: 0;
  flex-wrap: wrap;
}

.debug-collapsible-title {
  display: block;
  flex: 1 1 120px;
  min-width: 0;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
  color: var(--text-primary);
  white-space: normal;
  word-break: break-word;
}

.debug-collapsible-title-row .entry-enabled-badge {
  flex-shrink: 0;
  white-space: nowrap;
}

.debug-collapsible-summary {
  display: flex;
  flex: 1 1 100%;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-right: 0;
  padding-left: 38px;
}

.debug-collapsible-chevron {
  color: var(--text-tertiary);
  font-size: 12px;
  flex-shrink: 0;
  margin-left: auto;
  transition: transform var(--transition-fast);
}

.debug-collapsible-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 16px;
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  padding-top: 14px;
}

.debug-pass-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
  font-size: 12px;
}

.debug-pass-icon.main {
  background: rgba(var(--accent-primary-rgb), 0.14);
  color: var(--accent-primary);
}

.debug-pass-icon.variable {
  background: rgba(var(--accent-secondary-rgb), 0.14);
  color: var(--accent-secondary);
}

.debug-pass-icon.final {
  background: rgba(var(--accent-success-rgb), 0.12);
  color: var(--accent-success);
}

.debug-sub-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  border-radius: 12px;
  background: rgba(var(--accent-primary-rgb), 0.03);
  color: var(--text-secondary);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.debug-sub-toggle:hover {
  background: rgba(var(--accent-primary-rgb), 0.07);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
  color: var(--text-primary);
}

.debug-sub-toggle i {
  font-size: 10px;
  width: 14px;
  text-align: center;
  color: var(--text-tertiary);
  transition: color var(--transition-fast);
}

.debug-sub-toggle:hover i {
  color: var(--accent-primary);
}

.debug-sub-toggle-error {
  border-color: rgba(var(--accent-danger-rgb), 0.16);
  color: var(--accent-danger);
}

.debug-sub-toggle-error:hover {
  background: rgba(var(--accent-danger-rgb), 0.06);
  border-color: rgba(var(--accent-danger-rgb), 0.24);
}

.debug-sub-toggle-error i {
  color: var(--accent-danger);
}

.compact-empty {
  padding: 18px 14px;
}

.asset-grid,
.status-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.compact-runtime-grid {
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.preset-list {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.asset-card,
.preset-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.danger-btn {
  border-color: rgba(var(--accent-danger-rgb), 0.24);
  color: var(--accent-danger);
}

.danger-btn:hover:not(:disabled) {
  border-color: rgba(var(--accent-danger-rgb), 0.34);
  background: rgba(var(--accent-danger-rgb), 0.08);
  color: var(--accent-danger);
}

.preset-card.selected {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  box-shadow: 0 18px 40px rgba(var(--accent-primary-rgb), 0.12);
}

.asset-card-head,
.preset-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.asset-title-wrap,
.preset-title-wrap {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.asset-title {
  color: var(--text-primary);
  font-weight: 600;
}

.preset-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--accent-primary-rgb), 0.1);
  font-size: 20px;
}

.empty-state {
  padding: 28px 20px;
  text-align: center;
  color: var(--text-secondary);
  border-radius: var(--content-center-surface-radius);
  border: 1px dashed rgba(var(--accent-primary-rgb), 0.2);
  background: color-mix(in srgb, var(--card-bg-strong) 72%, transparent);
}

.empty-state.compact-empty {
  padding: 18px 14px;
}

.content-section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
}

.content-section-head h5 {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.24;
}

.error-state {
  color: var(--accent-danger);
}

.info-card {
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.error-card {
  background: rgba(var(--accent-danger-rgb), 0.08);
}

.toggle-switch {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.16);
  transition: background var(--transition-normal);
}

.toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
  transition: transform var(--transition-normal);
}

.toggle-switch input:checked + .toggle-track {
  background: rgba(var(--accent-primary-rgb), 0.42);
}

.toggle-switch input:checked + .toggle-track::after {
  transform: translateX(20px);
}

@media (max-width: 767px) {
  .content-tabbar {
    grid-template-columns: 1fr;
  }

  .preset-header,
  .asset-card-head,
  .preset-browser-head {
    flex-direction: column;
  }

  .preset-browser-shell {
    grid-template-columns: 1fr;
  }

  .debug-browser-shell {
    grid-template-columns: 1fr;
  }

  .ai-debug-stack-trigger,
  .ai-debug-stack-body {
    padding-left: 12px;
    padding-right: 12px;
  }

  .ai-debug-overview-card {
    padding: 12px;
  }

  .ai-debug-overview-summary {
    padding-left: 0;
  }

  .ai-debug-stack-title-row {
    align-items: center;
  }

  .debug-collapsible-summary {
    padding-left: 0;
  }

  .debug-conversation-card,
  .debug-request-stat,
  .debug-request-note {
    padding: 12px;
  }

  .debug-conversation-content {
    padding-left: 12px;
  }

  .debug-request-summary-grid {
    grid-template-columns: 1fr;
  }

  .worldbook-workspace-shell,
  .worldbook-editor-grid {
    grid-template-columns: 1fr;
  }

  .content-section-head {
    align-items: flex-start;
  }

  .worldbook-compact-card {
    padding: 10px;
    gap: 8px;
  }

  .compact-worldbook-item {
    padding: 9px 10px;
    gap: 7px;
  }

  .compact-worldbook-item-head {
    flex-direction: column;
    align-items: stretch;
  }

  .compact-worldbook-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .compact-worldbook-preview {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .compact-worldbook-editor-grid {
    grid-template-columns: 1fr;
  }

  .route-segment-control {
    width: 100%;
  }

  .route-segment-btn {
    min-height: 32px;
    padding: 6px;
    font-size: 11px;
  }

  .compact-worldbook-textarea {
    min-height: 132px;
  }

  .compact-summary-list {
    grid-template-columns: 1fr;
  }
}
</style>
