<template>
  <div class="settings-page">
    <!-- 返回按钮 -->
    <SetupBackButton :title="t('setup.backToPreviousStep')" @click="handleBack" />

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 页面标题 -->
      <div class="page-header">
        <h2 class="page-title">{{ t('setup.settings.title') }}</h2>
        <p class="page-subtitle">{{ t('setup.settings.subtitle') }}</p>
      </div>

      <!-- 说明卡片 -->
      <div class="info-card">
        <i class="ti ti-info-circle"></i>
        <div class="info-content">
          <p>
            <strong>{{ t('setup.settings.infoTitle') }}</strong>
          </p>
          <p>{{ t('setup.settings.infoBody') }}</p>
          <p class="hint">{{ t('setup.settings.infoHint') }}</p>
        </div>
      </div>

      <div class="config-section language-config-section">
        <div class="section-header">
          <i class="ti ti-language"></i>
          <span>{{ t('settings.languageSectionTitle') }}</span>
        </div>
        <div class="config-row">
          <label>{{ t('common.language') }}</label>
          <select v-model="locale" class="setup-field-input">
            <option value="zh-CN">{{ t('common.language.zh-CN') }}</option>
            <option value="en">{{ t('common.language.en') }}</option>
          </select>
        </div>
      </div>

      <!-- API 配置区域 -->
      <div class="api-config">
        <div class="config-section api-tab-section">
          <div class="section-header">
            <i class="ti ti-plug"></i>
            <span>{{ t('setup.settings.apiSectionTitle') }}</span>
          </div>
          <p class="api-header-desc">{{ t('setup.settings.apiSectionDesc') }}</p>

          <div class="api-tab-switch">
            <button
              :class="['api-tab-btn', 'setup-chip-btn', { active: apiSetupTab === 'main' }]"
              @click="apiSetupTab = 'main'"
            >
              <span>{{ t('settings.tab.mainApi') }}</span>
            </button>
            <button
              :class="['api-tab-btn', 'setup-chip-btn', { active: apiSetupTab === 'assistant' }]"
              @click="apiSetupTab = 'assistant'"
            >
              <span>{{ t('settings.tab.assistantApi') }}</span>
            </button>
            <button
              :class="['api-tab-btn', 'setup-chip-btn', { active: apiSetupTab === 'worldbook' }]"
              @click="apiSetupTab = 'worldbook'"
            >
              <span>{{ t('settings.tab.worldbookManager') }}</span>
            </button>
            <button
              :class="['api-tab-btn', 'setup-chip-btn', { active: apiSetupTab === 'archive' }]"
              @click="apiSetupTab = 'archive'"
            >
              <span>{{ t('settings.tab.archiveManager') }}</span>
            </button>
          </div>
        </div>

        <template v-if="apiSetupTab === 'main'">
          <div class="config-section">
            <div class="section-header">
              <i class="ti ti-brain"></i>
              <span>{{ t('settings.mainApiTitle') }}</span>
            </div>
            <p class="api-header-desc">{{ t('settings.mainApiDesc') }}</p>
            <div class="api-standalone-hint">
              <i class="ti ti-info-circle"></i>
              <span>{{ t('settings.mainApiDirectBrowserHint') }}</span>
            </div>

            <div class="api-list single-api-list">
              <div class="api-card main-api-card">
                <div class="api-card-header">
                  <div class="api-card-title static-title">
                    <i class="ti ti-message-dots"></i>
                    <span>{{ t('settings.mainApiCardTitle') }}</span>
                    <small v-if="mainApi.model">{{ mainApi.model }}</small>
                  </div>
                </div>

                <div class="api-card-body">
                  <div class="config-grid">
                    <div class="config-row">
                      <label><i class="ti ti-cloud"></i> {{ t('settings.source') }}</label>
                      <select v-model="mainApi.source" class="setup-field-input" @change="handleMainApiSourceChange">
                        <option value="openai_compatible">OpenAI</option>
                      </select>
                    </div>

                    <div class="config-row">
                      <label><i class="ti ti-link"></i> {{ t('settings.apiUrl') }}</label>
                      <input
                        v-model="mainApi.apiurl"
                        type="text"
                        :placeholder="t('settings.apiUrlPlaceholder')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="config-row">
                      <label><i class="ti ti-key"></i> {{ t('settings.apiKey') }}</label>
                      <input
                        v-model="mainApi.key"
                        type="password"
                        :placeholder="t('settings.apiKeyPlaceholder')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="config-row model-row">
                      <label><i class="ti ti-cpu"></i> {{ t('settings.model') }}</label>
                      <select
                        v-if="mainApi.availableModels.length > 0"
                        v-model="mainApi.model"
                        class="model-select setup-field-input"
                      >
                        <option value="" disabled>{{ t('settings.selectModel') }}</option>
                        <option v-for="model in mainApi.availableModels" :key="model" :value="model">
                          {{ model }}
                        </option>
                      </select>
                      <input
                        v-else
                        v-model="mainApi.model"
                        type="text"
                        :placeholder="t('settings.modelPlaceholder')"
                        class="model-input setup-field-input"
                      />
                      <button class="fetch-btn setup-chip-btn" :disabled="isLoadingMainApi" @click="fetchMainApiModels">
                        <i :class="['ti', isLoadingMainApi ? 'ti-loader-2 ti-spin' : 'ti-download']"></i>
                      </button>
                    </div>
                  </div>

                  <div class="api-card-footer">
                    <button class="save-card-btn setup-chip-btn" @click="saveMainApiCard">
                      <i class="ti ti-device-floppy"></i>
                      <span>{{ t('settings.saveThisApi') }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="configError" class="error-message">
              <i class="ti ti-alert-circle"></i>
              <span>{{ configError }}</span>
            </div>
          </div>
        </template>

        <template v-else-if="apiSetupTab === 'assistant'">
          <div class="config-section">
            <div class="section-header">
              <i class="ti ti-server"></i>
              <span>{{ t('settings.apiList') }}</span>
              <button class="add-api-btn setup-chip-btn" @click="handleAddApi">
                <i class="ti ti-plus"></i>
                <span>{{ t('settings.addApi') }}</span>
              </button>
            </div>
            <p class="api-header-desc">{{ t('settings.apiListDesc') }}</p>

            <div class="api-list">
              <div v-for="(api, index) in assistantApis" :key="api.id" class="api-card">
                <div class="api-card-header">
                  <div class="api-card-title" @click="toggleCollapse(index)">
                    <i :class="['ti', api.collapsed ? 'ti-chevron-right' : 'ti-chevron-down']"></i>
                    <span>{{ t('settings.apiCardTitle', { index: index + 1 }) }}</span>
                    <small v-if="api.model">{{ api.model }}</small>
                  </div>

                  <div class="api-card-actions">
                    <button
                      class="icon-btn"
                      :disabled="index === 0"
                      :title="t('settings.moveUp')"
                      @click="moveApiUp(index)"
                    >
                      <i class="ti ti-arrow-up"></i>
                    </button>
                    <button
                      class="icon-btn"
                      :disabled="index === assistantApis.length - 1"
                      :title="t('settings.moveDown')"
                      @click="moveApiDown(index)"
                    >
                      <i class="ti ti-arrow-down"></i>
                    </button>
                    <button
                      class="icon-btn danger"
                      :disabled="assistantApis.length <= 1"
                      :title="t('settings.delete')"
                      @click="removeApi(index)"
                    >
                      <i class="ti ti-trash"></i>
                    </button>
                  </div>
                </div>

                <div v-if="!api.collapsed" class="api-card-body">
                  <div class="config-grid">
                    <div class="config-row">
                      <label><i class="ti ti-cloud"></i> {{ t('settings.source') }}</label>
                      <select v-model="api.source" class="setup-field-input" @change="handleCardSourceChange(index)">
                        <option value="openai_compatible">OpenAI</option>
                      </select>
                    </div>

                    <div class="config-row">
                      <label><i class="ti ti-link"></i> {{ t('settings.apiUrl') }}</label>
                      <input
                        v-model="api.apiurl"
                        type="text"
                        :placeholder="t('settings.apiUrlPlaceholder')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="config-row">
                      <label><i class="ti ti-key"></i> {{ t('settings.apiKey') }}</label>
                      <input
                        v-model="api.key"
                        type="password"
                        :placeholder="t('settings.apiKeyPlaceholder')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="config-row model-row">
                      <label><i class="ti ti-cpu"></i> {{ t('settings.model') }}</label>
                      <select
                        v-if="api.availableModels.length > 0"
                        v-model="api.model"
                        class="model-select setup-field-input"
                      >
                        <option value="" disabled>{{ t('settings.selectModel') }}</option>
                        <option v-for="model in api.availableModels" :key="model" :value="model">{{ model }}</option>
                      </select>
                      <input
                        v-else
                        v-model="api.model"
                        type="text"
                        :placeholder="t('settings.modelPlaceholder')"
                        class="model-input setup-field-input"
                      />
                      <button
                        class="fetch-btn setup-chip-btn"
                        :disabled="isLoadingById[api.id]"
                        @click="fetchModels(index, api.id)"
                      >
                        <i :class="['ti', isLoadingById[api.id] ? 'ti-loader-2 ti-spin' : 'ti-download']"></i>
                      </button>
                    </div>
                  </div>

                  <div class="api-card-footer">
                    <button class="save-card-btn setup-chip-btn" @click="saveApiCard(index)">
                      <i class="ti ti-device-floppy"></i>
                      <span>{{ t('settings.saveThisApi') }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="configError" class="error-message">
              <i class="ti ti-alert-circle"></i>
              <span>{{ configError }}</span>
            </div>
          </div>
        </template>

        <template v-else-if="apiSetupTab === 'worldbook'">
          <section class="panel-section settings-management-panel">
            <div class="worldbook-workspace-shell compact-worldbook-shell">
              <article class="worldbook-entry-list-card worldbook-compact-card">
                <div class="preset-browser-head">
                  <div>
                    <span class="summary-label">{{ t('contentCenter.worldbook.editableSectionTitle') }}</span>
                    <h5>{{ t('contentCenter.worldbook.editableSectionSubtitle') }}</h5>
                  </div>
                  <button class="primary-btn compact-action-btn" type="button" @click="addEditableEntry">
                    <i class="ti ti-plus"></i>
                    {{ t('contentCenter.worldbook.addEntry') }}
                  </button>
                </div>

                <p class="workspace-help-text workspace-help-text--compact">
                  {{
                    hasSelectedPreset
                      ? t('contentCenter.worldbook.editableHelp')
                      : t('contentCenter.worldbook.noPresetGuidance')
                  }}
                </p>

                <div
                  v-if="editableWorldbookEntries.length > 0"
                  class="worldbook-entry-list compact-worldbook-list"
                  role="list"
                >
                  <article
                    v-for="(entry, index) in editableWorldbookEntries"
                    :key="editableEntryKeys[index]"
                    :class="[
                      'worldbook-entry-item',
                      'compact-worldbook-item',
                      { active: isEditableEntryExpanded(index) },
                    ]"
                  >
                    <div class="compact-worldbook-item-head">
                      <button type="button" class="compact-worldbook-trigger" @click="toggleEditableEntryPanel(index)">
                        <span class="preset-entry-order compact-order">#{{ index + 1 }}</span>
                        <div class="worldbook-entry-copy compact-worldbook-copy">
                          <div class="compact-worldbook-title-line">
                            <strong>{{ editableEntryTitle(entry) }}</strong>
                            <span
                              :class="[
                                'entry-enabled-badge',
                                'compact-badge',
                                entry.enabled === false ? 'disabled' : 'enabled',
                              ]"
                            >
                              {{ entry.enabled === false ? t('common.disabled') : t('common.enabled') }}
                            </span>
                          </div>
                          <div class="compact-worldbook-meta-line">
                            <span class="tag-chip compact-tag">{{
                              localContentKindLabel(resolveEditableEntryKind(entry))
                            }}</span>
                            <span class="tag-chip compact-tag">{{
                              localContentRouteLabel(resolveEditableEntryRoute(entry))
                            }}</span>
                            <span class="compact-worldbook-preview">{{ editableEntryPreview(entry) }}</span>
                          </div>
                        </div>
                        <i
                          :class="[
                            'ti',
                            isEditableEntryExpanded(index) ? 'ti-chevron-up' : 'ti-chevron-down',
                            'compact-worldbook-chevron',
                          ]"
                        ></i>
                      </button>

                      <div class="worldbook-editor-head-actions compact-worldbook-actions">
                        <label class="toggle-switch compact-toggle-switch">
                          <input
                            :checked="entry.enabled !== false"
                            :aria-label="t('contentCenter.worldbook.toggleLabel', { title: editableEntryTitle(entry) })"
                            type="checkbox"
                            @change="toggleEditableEntry(index, entry.enabled === false)"
                          />
                          <span class="toggle-track"></span>
                        </label>
                        <button
                          class="ghost-btn icon-only-btn compact-icon-btn"
                          type="button"
                          :disabled="index === 0"
                          :title="t('settings.moveUp')"
                          @click="moveEditableEntryUp(index)"
                        >
                          <i class="ti ti-arrow-up"></i>
                        </button>
                        <button
                          class="ghost-btn icon-only-btn compact-icon-btn"
                          type="button"
                          :disabled="index === editableWorldbookEntries.length - 1"
                          :title="t('settings.moveDown')"
                          @click="moveEditableEntryDown(index)"
                        >
                          <i class="ti ti-arrow-down"></i>
                        </button>
                        <button
                          class="ghost-btn icon-only-btn compact-icon-btn danger-btn"
                          type="button"
                          :title="t('settings.delete')"
                          @click="deleteEditableEntry(index)"
                        >
                          <i class="ti ti-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div v-if="isEditableEntryExpanded(index)" class="compact-worldbook-expand">
                      <div class="worldbook-editor-grid compact-worldbook-editor-grid">
                        <label class="worldbook-field worldbook-field-wide compact-field">
                          <span class="summary-label">{{ t('contentCenter.worldbook.titleLabel') }}</span>
                          <input
                            :value="entry.name"
                            type="text"
                            class="worldbook-input compact-worldbook-input"
                            :placeholder="t('setup.localContentEntries.namePlaceholder')"
                            @input="handleEditableEntryNameInput(index, $event)"
                          />
                        </label>

                        <label class="worldbook-field compact-field">
                          <span class="summary-label">{{ t('contentCenter.worldbook.kindLabel') }}</span>
                          <select
                            :value="resolveEditableEntryKind(entry)"
                            class="worldbook-select compact-worldbook-input"
                            @change="handleEditableEntryKindChange(index, $event)"
                          >
                            <option value="general">{{ t('setup.localContentEntries.kind.general') }}</option>
                            <option value="worldbook">{{ t('setup.localContentEntries.kind.worldbook') }}</option>
                            <option value="plot_rule">{{ t('setup.localContentEntries.kind.plotRule') }}</option>
                            <option value="variable_update_rule">
                              {{ t('setup.localContentEntries.kind.variableUpdateRule') }}
                            </option>
                          </select>
                        </label>

                        <div class="worldbook-field worldbook-field-wide compact-field">
                          <span class="summary-label">{{ t('contentCenter.worldbook.routeLabel') }}</span>
                          <div
                            class="route-segment-control"
                            role="group"
                            :aria-label="t('contentCenter.worldbook.routeLabel')"
                          >
                            <button
                              type="button"
                              :class="['route-segment-btn', { active: resolveEditableEntryRoute(entry) === 'main' }]"
                              @click.stop="setEditableEntryRoute(index, 'main')"
                            >
                              {{ t('setup.localContentEntries.route.main') }}
                            </button>
                            <button
                              type="button"
                              :class="[
                                'route-segment-btn',
                                { active: resolveEditableEntryRoute(entry) === 'variable_update' },
                              ]"
                              @click.stop="setEditableEntryRoute(index, 'variable_update')"
                            >
                              {{ t('setup.localContentEntries.route.variableUpdate') }}
                            </button>
                            <button
                              type="button"
                              :class="['route-segment-btn', { active: resolveEditableEntryRoute(entry) === 'shared' }]"
                              @click.stop="setEditableEntryRoute(index, 'shared')"
                            >
                              {{ t('setup.localContentEntries.route.shared') }}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="preset-detail-note-card worldbook-editor-note compact-worldbook-note">
                        <i class="ti ti-edit"></i>
                        <p>{{ t('contentCenter.worldbook.editorHint') }}</p>
                      </div>

                      <label class="worldbook-field worldbook-field-body compact-field">
                        <span class="summary-label">{{ t('contentCenter.worldbook.bodyLabel') }}</span>
                        <textarea
                          :value="entry.content"
                          class="worldbook-textarea compact-worldbook-textarea"
                          rows="8"
                          :placeholder="t('setup.localContentEntries.contentPlaceholder')"
                          @input="handleEditableEntryContentInput(index, $event)"
                        />
                      </label>
                    </div>
                  </article>
                </div>
                <div v-else class="empty-state compact-empty">
                  {{
                    hasSelectedPreset
                      ? t('contentCenter.worldbook.editableEmpty')
                      : t('contentCenter.worldbook.noPresetGuidance')
                  }}
                </div>
              </article>
            </div>

            <section class="summary-card worldbook-system-section">
              <div class="preset-browser-head">
                <div>
                  <span class="summary-label">{{ t('contentCenter.worldbook.systemSectionTitle') }}</span>
                  <h5>{{ t('contentCenter.worldbook.systemSectionSubtitle') }}</h5>
                </div>
              </div>

              <div
                v-if="systemWorldbookEntries.length > 0"
                class="worldbook-entry-list compact-worldbook-list"
                role="list"
              >
                <article
                  v-for="asset in systemWorldbookEntries"
                  :key="asset.id"
                  :class="[
                    'worldbook-entry-item',
                    'compact-worldbook-item',
                    { active: isSystemAssetExpanded(asset.id) },
                  ]"
                >
                  <div class="compact-worldbook-item-head">
                    <button
                      type="button"
                      class="compact-worldbook-trigger"
                      @click="toggleSystemAssetExpanded(asset.id)"
                    >
                      <span class="preset-entry-order compact-order system-order">SYS</span>
                      <div class="worldbook-entry-copy compact-worldbook-copy">
                        <div class="compact-worldbook-title-line">
                          <strong>{{ asset.title }}</strong>
                          <span
                            :class="['entry-enabled-badge', 'compact-badge', asset.enabled ? 'enabled' : 'disabled']"
                          >
                            {{ asset.enabled ? t('common.enabled') : t('common.disabled') }}
                          </span>
                          <span class="tag-chip compact-tag">{{ localContentKindLabel(asset.kind) }}</span>
                          <span class="tag-chip compact-tag">{{ t('contentCenter.worldbook.sourceBuiltin') }}</span>
                          <span
                            v-if="isSettingsManagedAsset(asset.id)"
                            class="tag-chip compact-tag settings-managed-chip"
                          >
                            {{ t('contentCenter.worldbook.settingsManaged') }}
                          </span>
                        </div>
                        <div class="compact-worldbook-meta-line">
                          <span class="compact-worldbook-preview">{{ assetPreviewText(asset) }}</span>
                        </div>
                      </div>
                      <i
                        :class="[
                          'ti',
                          isSystemAssetExpanded(asset.id) ? 'ti-chevron-up' : 'ti-chevron-down',
                          'compact-worldbook-chevron',
                        ]"
                      ></i>
                    </button>

                    <div class="worldbook-editor-head-actions compact-worldbook-actions">
                      <button
                        v-if="!isSettingsManagedAsset(asset.id)"
                        class="ghost-btn compact-toggle-btn compact-system-toggle"
                        type="button"
                        @click="toggleAsset(asset.id, !asset.enabled)"
                      >
                        {{ asset.enabled ? t('common.disabled') : t('common.enabled') }}
                      </button>
                    </div>
                  </div>

                  <div
                    class="route-segment-control route-segment-control-system"
                    role="group"
                    :aria-label="t('contentCenter.worldbook.routeLabel')"
                  >
                    <button
                      type="button"
                      :disabled="isSystemAssetRouteLocked(asset.id)"
                      :class="['route-segment-btn', { active: resolveSystemAssetDisplayRoute(asset) === 'main' }]"
                      @click.stop="handleSystemAssetRouteTap(asset, 'main')"
                    >
                      {{ t('setup.localContentEntries.route.main') }}
                    </button>
                    <button
                      type="button"
                      :disabled="isSystemAssetRouteLocked(asset.id)"
                      :class="[
                        'route-segment-btn',
                        { active: resolveSystemAssetDisplayRoute(asset) === 'variable_update' },
                      ]"
                      @click.stop="handleSystemAssetRouteTap(asset, 'variable_update')"
                    >
                      {{ t('setup.localContentEntries.route.variableUpdate') }}
                    </button>
                    <button
                      type="button"
                      :disabled="isSystemAssetRouteLocked(asset.id)"
                      :class="['route-segment-btn', { active: resolveSystemAssetDisplayRoute(asset) === 'shared' }]"
                      @click.stop="handleSystemAssetRouteTap(asset, 'shared')"
                    >
                      {{ t('setup.localContentEntries.route.shared') }}
                    </button>
                  </div>

                  <div v-if="isSystemAssetExpanded(asset.id)" class="compact-worldbook-expand">
                    <div class="compact-system-meta-line">
                      <span class="summary-label">{{ t('contentCenter.worldbook.sourceLabel') }}</span>
                      <span class="break-all">{{ asset.sourceName }}</span>
                      <span class="summary-label">
                        {{ t('contentCenter.worldbook.deliveryLabel') }}：{{
                          resolveSystemAssetDisplayRouteLabel(asset)
                        }}
                      </span>
                    </div>
                    <div class="preset-detail-note-card worldbook-editor-note compact-worldbook-note">
                      <i class="ti ti-info-circle"></i>
                      <p>
                        {{
                          isSystemAssetRouteLocked(asset.id)
                            ? t('contentCenter.worldbook.routeLockedHint')
                            : isSettingsManagedAsset(asset.id)
                              ? t('contentCenter.worldbook.settingsManagedHint')
                              : t('contentCenter.worldbook.readOnlyHint')
                        }}
                      </p>
                    </div>
                    <label class="worldbook-field worldbook-field-body compact-field">
                      <span class="summary-label">{{ t('contentCenter.worldbook.bodyLabel') }}</span>
                      <textarea
                        class="worldbook-textarea compact-worldbook-textarea compact-worldbook-textarea-readonly"
                        :value="resolveReadonlyAssetContent(asset.id)"
                        rows="8"
                        readonly
                      />
                    </label>
                  </div>
                </article>
              </div>
              <div v-else class="empty-state compact-empty">{{ t('contentCenter.worldbook.empty') }}</div>
            </section>
          </section>
        </template>

        <template v-else>
          <section class="panel-section settings-management-panel">
            <section class="summary-card archive-overview-card">
              <div class="archive-compact-summary">
                <div class="compact-summary-item archive-current-snapshot-item">
                  <dt>{{ t('contentCenter.archive.currentSnapshotTitle') }}</dt>
                  <dd>
                    {{
                      t('contentCenter.archive.currentSnapshotValue', {
                        messages: currentArchiveMessageCount,
                        variables: currentArchiveVariableSectionCount,
                      })
                    }}
                  </dd>
                </div>
              </div>
            </section>

            <div class="status-grid archive-action-grid">
              <article class="settings-status-card archive-action-card">
                <span class="summary-label">{{ t('contentCenter.archive.saveStatus') }}</span>
                <div class="button-group-wrap">
                  <button class="primary-btn" :disabled="isArchiving" @click="handleArchiveExport">
                    <i :class="isArchiving ? 'ti ti-loader-2 ti-spin' : 'ti ti-download'"></i>
                    {{ t('contentCenter.archive.downloadButton') }}
                  </button>
                  <button class="ghost-btn" :disabled="isSavingStandaloneArchive" @click="handleSaveStandaloneArchive">
                    <i :class="isSavingStandaloneArchive ? 'ti ti-loader-2 ti-spin' : 'ti ti-device-floppy'"></i>
                    {{ t('contentCenter.archive.saveLocalButton') }}
                  </button>
                </div>
              </article>

              <article class="settings-status-card archive-action-card">
                <span class="summary-label">{{ t('contentCenter.archive.importStatus') }}</span>
                <div class="button-group-wrap">
                  <button class="ghost-btn" :disabled="isImportingArchive" @click="triggerArchiveImport">
                    <i :class="isImportingArchive ? 'ti ti-loader-2 ti-spin' : 'ti ti-file-import'"></i>
                    {{ t('contentCenter.archive.importButton') }}
                  </button>
                </div>
              </article>
            </div>

            <input
              ref="archiveInputRef"
              class="file-input-hidden"
              type="file"
              accept=".json,application/json"
              @change="handleArchiveFileChange"
            />

            <div v-if="standaloneArchives.length > 0" class="asset-grid archive-grid">
              <article v-for="archive in standaloneArchives" :key="archive.id" class="asset-card archive-card">
                <div class="asset-card-head">
                  <div class="asset-title-wrap">
                    <span class="asset-title">{{ archive.presetName }}</span>
                    <span class="tag-chip">{{
                      t('contentCenter.archive.messagesCount', { count: archive.messageCount })
                    }}</span>
                  </div>
                  <span class="source-badge builtin"
                    >{{ t('contentCenter.archive.createdAt') }}：{{ archive.createdAt }}</span
                  >
                </div>
                <p class="asset-description">{{ archive.summary }}</p>
                <div class="archive-meta-grid">
                  <span class="asset-meta archive-id"
                    >{{ t('contentCenter.archive.archiveIdLabel') }}：{{ archive.id }}</span
                  >
                </div>
                <div class="button-group-wrap">
                  <button
                    class="primary-btn"
                    :disabled="isRestoringArchiveId === archive.id"
                    @click="handleRestoreStandaloneArchive(archive.id)"
                  >
                    <i :class="isRestoringArchiveId === archive.id ? 'ti ti-loader-2 ti-spin' : 'ti ti-rotate'"></i>
                    {{ t('contentCenter.archive.restoreButton') }}
                  </button>
                  <button class="ghost-btn" @click="handleDownloadStandaloneArchive(archive.id)">
                    <i class="ti ti-file-download"></i>
                    {{ t('contentCenter.archive.exportSavedButton') }}
                  </button>
                  <button class="ghost-btn danger-btn" @click="handleDeleteStandaloneArchive(archive.id)">
                    <i class="ti ti-trash"></i>
                    {{ t('contentCenter.archive.deleteButton') }}
                  </button>
                </div>
              </article>
            </div>
            <div v-else class="empty-state">{{ t('contentCenter.archive.emptyStandalone') }}</div>

            <div
              v-if="archiveStatusMessage"
              :class="[
                'summary-card',
                'archive-status-card',
                archiveStatusTone === 'error' ? 'archive-status-card--error' : 'archive-status-card--info',
              ]"
            >
              <span class="summary-label">{{ t('contentCenter.archive.statusTitle') }}</span>
              <p>{{ archiveStatusMessage }}</p>
            </div>
          </section>
        </template>
      </div>

      <!-- 操作按钮 -->
      <div class="action-area">
        <button class="skip-btn setup-chip-btn" @click="handleSkip">
          <span>{{ t('settings.skip') }}</span>
        </button>
        <button class="start-btn setup-primary-btn" :disabled="isStarting" @click="handleStart">
          <i :class="['ti', isStarting ? 'ti-loader-2 ti-spin' : 'ti-player-play']"></i>
          <span>{{ t('settings.startGame') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { klona } from 'klona';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useAssistantApiEditor } from '../../../composables/useAssistantApiEditor';
import { useMessageActions } from '../../../composables/useMessageActions';
import { useSingleApiEditor } from '../../../composables/useSingleApiEditor';
import { useI18n } from '../../../i18n';
import type { LocalContentEntryConfig } from '../../../presets/types';
import { notify } from '../../../utils/notify';
import { useSettingsStore } from '../../../stores/settings';
import { useSetupStore } from '../../../stores/setup';
import { useStatDataStore } from '../../../stores/statData';
import { clearPendingStandaloneArchiveResume, loadPendingStandaloneArchiveResume } from '../../../utils/archive';
import { writeSetupConfigToCurrentMessage } from '../../../utils/setupStartGame';
import {
  buildWorldDifficultyStandaloneLocalContent,
  getStandaloneLocalContentManifest,
  isLockedRouteStandaloneLocalContentAsset,
  isSettingsManagedStandaloneLocalContentAsset,
  type StandaloneLocalContentKind,
  type StandaloneLocalContentRoute,
} from '../../../utils/standaloneLocalContent';
import SetupBackButton from './components/SetupBackButton.vue';
import { useStandaloneArchiveManager } from '../../../composables/useStandaloneArchiveManager';

const emit = defineEmits<{ complete: [] }>();
const apiSetupTab = ref<'main' | 'assistant' | 'worldbook' | 'archive'>('main');
const messageActions = useMessageActions();

const setupStore = useSetupStore();
const settingsStore = useSettingsStore();
const statDataStore = useStatDataStore();
const { persistMainApi, persistAssistantApis } = settingsStore;
const { t } = useI18n();

const { mainApi, assistantApis, locale, standaloneLocalContent } = storeToRefs(settingsStore);
const { selectedPreset } = storeToRefs(setupStore);

const {
  addApi,
  removeApi,
  moveUp,
  moveDown,
  toggleCollapse,
  handleSourceChange,
  validateAllApis,
  fetchAvailableModels,
  markApiSaved,
  expandNextApi,
} = useAssistantApiEditor(assistantApis);

const {
  handleSourceChange: handleMainApiSourceChange,
  validateApi: validateMainApi,
  fetchAvailableModels: fetchMainApiAvailableModels,
  markApiSaved: markMainApiSaved,
} = useSingleApiEditor(mainApi);

const isLoadingById = ref<Record<string, boolean>>({});
const isLoadingMainApi = ref(false);
const isStarting = ref(false);
const configError = ref('');
const expandedSystemAssetId = ref<string | null>(null);
const selectedEditableEntryIndex = ref(0);
const editableEntryKeyMap = new WeakMap<LocalContentEntryConfig, string>();
let editableEntryKeySeed = 0;

const {
  isArchiving,
  isSavingStandaloneArchive,
  isImportingArchive,
  isRestoringArchiveId,
  archiveStatusMessage,
  archiveStatusTone,
  archiveInputRef,
  standaloneArchives,
  currentArchiveMessageCount,
  currentArchiveVariableSectionCount,
  handleArchiveExport,
  handleSaveStandaloneArchive,
  triggerArchiveImport,
  handleArchiveFileChange,
  handleRestoreStandaloneArchive,
  handleDownloadStandaloneArchive,
  handleDeleteStandaloneArchive,
} = useStandaloneArchiveManager();

const worldbookEntries = computed(() =>
  getStandaloneLocalContentManifest().map(asset => {
    const routeOverride = standaloneLocalContent.value.builtinAssetRouteOverrides[asset.id];
    const route = routeOverride ?? asset.route;
    const enabled =
      asset.id === 'main-api-prompt'
        ? true
        : (standaloneLocalContent.value.enabledAssets[asset.id] ?? asset.defaultEnabled);
    return {
      ...asset,
      route,
      enabled,
      sourceKind: 'builtin' as const,
    };
  }),
);

/**
 * 是否选中了预设。只影响提示文案：有预设时条目跟着预设走，没预设时存进设置里的自定义容器。
 * 两种情况都能编辑，所以按钮不再受它控制。
 */
const hasSelectedPreset = computed(() => Boolean(selectedPreset.value));
const editableWorldbookEntries = computed<LocalContentEntryConfig[]>(() => {
  if (selectedPreset.value) {
    const entries = selectedPreset.value.localContentEntries;
    return Array.isArray(entries) ? entries : [];
  }

  // 没预设时用手填条目：存在会话里，跟着存档走
  return setupStore.customWorldbookEntries;
});
const systemWorldbookEntries = computed(() => worldbookEntries.value.filter(asset => asset.sourceKind === 'builtin'));
const editableEntryKeys = computed(() =>
  editableWorldbookEntries.value.map(entry => {
    const cachedKey = editableEntryKeyMap.get(entry);
    if (cachedKey) {
      return cachedKey;
    }

    const nextKey = `settings-editable-worldbook-${editableEntryKeySeed}`;
    editableEntryKeySeed += 1;
    editableEntryKeyMap.set(entry, nextKey);
    return nextKey;
  }),
);

// 返回上一步
function handleBack() {
  setupStore.goBack();
}

function buildOpeningPrompt() {
  const backgroundInfo = setupStore.config.玩家?.身份信息?.背景信息
    ? `玩家背景:${setupStore.config.玩家.身份信息.背景信息}.`
    : '';

  return locale.value === 'en'
    ? `Based on the context above, generate a fitting opening scene for the story.${backgroundInfo} Requirements: naturally introduce the player character's identity and background within the opening narrative. ( for all subsequent replies)`
    : `根据上文,生成相应的开局剧情.${backgroundInfo}要求:在剧情中自然地引出玩家角色的身份和背景.`;
}

function handleAddApi() {
  addApi();
}

function moveApiUp(index: number) {
  const previousApis = klona(assistantApis.value);
  const moved = moveUp(index);
  if (!moved) {
    return;
  }

  const persisted = persistAssistantApis();
  if (!persisted) {
    assistantApis.value = previousApis;
    configError.value = t('settings.apiSaveStorageFailed');
    notify.error(configError.value);
    return;
  }

  configError.value = '';
}

function moveApiDown(index: number) {
  const previousApis = klona(assistantApis.value);
  const moved = moveDown(index);
  if (!moved) {
    return;
  }

  const persisted = persistAssistantApis();
  if (!persisted) {
    assistantApis.value = previousApis;
    configError.value = t('settings.apiSaveStorageFailed');
    notify.error(configError.value);
    return;
  }

  configError.value = '';
}

function handleCardSourceChange(index: number) {
  handleSourceChange(index);
}

function localContentRouteLabel(route: StandaloneLocalContentRoute) {
  if (route === 'main') return t('settings.localContentRoute.main');
  if (route === 'variable_update') return t('settings.localContentRoute.variableUpdate');
  return t('settings.localContentRoute.shared');
}

function localContentKindLabel(kind: StandaloneLocalContentKind) {
  if (kind === 'worldbook') return t('contentCenter.worldbook.kind.worldbook');
  if (kind === 'plot_rule') return t('contentCenter.worldbook.kind.plotRule');
  if (kind === 'variable_update_rule') return t('contentCenter.worldbook.kind.variableUpdateRule');
  return t('contentCenter.worldbook.kind.general');
}

function assetPreviewText(asset: { description?: string | null }) {
  const preview = (asset.description ?? '').replace(/\s+/g, ' ').trim();
  return preview || t('contentCenter.worldbook.noBodyPreview');
}

function resolveSystemAssetDisplayRoute(asset: { id: string; route: StandaloneLocalContentRoute }) {
  return standaloneLocalContent.value.builtinAssetRouteOverrides[asset.id] ?? asset.route;
}

function resolveSystemAssetDisplayRouteLabel(asset: { id: string; route: StandaloneLocalContentRoute }) {
  return localContentRouteLabel(resolveSystemAssetDisplayRoute(asset));
}

function isSystemAssetRouteLocked(assetId: string) {
  return isLockedRouteStandaloneLocalContentAsset(assetId);
}

function isSystemAssetExpanded(assetId: string) {
  return expandedSystemAssetId.value === assetId;
}

function toggleSystemAssetExpanded(assetId: string) {
  expandedSystemAssetId.value = expandedSystemAssetId.value === assetId ? null : assetId;
}

function expandSystemAsset(assetId: string) {
  expandedSystemAssetId.value = assetId;
}

function handleSystemAssetRouteTap(
  asset: { id: string; title: string; route: StandaloneLocalContentRoute },
  segment: StandaloneLocalContentRoute,
) {
  if (isSystemAssetRouteLocked(asset.id)) {
    expandSystemAsset(asset.id);
    return;
  }

  const activeRoute = resolveSystemAssetDisplayRoute(asset);
  expandSystemAsset(asset.id);
  if (segment === activeRoute) {
    return;
  }

  standaloneLocalContent.value = {
    ...standaloneLocalContent.value,
    builtinAssetRouteOverrides: {
      ...standaloneLocalContent.value.builtinAssetRouteOverrides,
      [asset.id]: segment,
    },
  };
}

function resolveReadonlyAssetContent(assetId: string): string {
  const asset = worldbookEntries.value.find(entry => entry.id === assetId);
  if (!asset) {
    return '';
  }

  if (asset.id === 'plot-world-difficulty') {
    return buildWorldDifficultyStandaloneLocalContent(settingsStore.worldDifficulty);
  }

  return asset.rawContent.trim();
}

function ensureEditableEntries(): LocalContentEntryConfig[] | null {
  if (selectedPreset.value) {
    if (!Array.isArray(selectedPreset.value.localContentEntries)) {
      selectedPreset.value.localContentEntries = [];
    }

    return selectedPreset.value.localContentEntries;
  }

  // 没选预设（比如 AI 生成开局）：条目存进会话，跟着存档走，照样会进正文/变量更新
  return setupStore.customWorldbookEntries;
}

function editableEntryTitle(entry: LocalContentEntryConfig) {
  const title = entry.name.trim();
  return title || t('common.unnamed');
}

function editableEntryPreview(entry: LocalContentEntryConfig) {
  const preview = entry.content.replace(/\s+/g, ' ').trim();
  return preview || t('contentCenter.worldbook.noBodyPreview');
}

function resolveEditableEntryKind(entry: LocalContentEntryConfig): StandaloneLocalContentKind {
  return entry.kind ?? 'general';
}

function resolveEditableEntryRoute(entry: LocalContentEntryConfig): StandaloneLocalContentRoute {
  return entry.route ?? 'shared';
}

function isEditableEntryExpanded(index: number) {
  return selectedEditableEntryIndex.value === index;
}

function toggleEditableEntryPanel(index: number) {
  if (selectedEditableEntryIndex.value === index) {
    return;
  }

  selectedEditableEntryIndex.value = index;
}

function setEditableEntryRoute(index: number, route: StandaloneLocalContentRoute) {
  const entries = ensureEditableEntries();
  const entry = entries?.[index];
  if (!entry) {
    return;
  }

  entry.route = route;
}

function handleEditableEntryNameInput(index: number, event: Event) {
  const entries = ensureEditableEntries();
  const entry = entries?.[index];
  if (!entry) {
    return;
  }

  entry.name = (event.target as HTMLInputElement).value;
}

function handleEditableEntryContentInput(index: number, event: Event) {
  const entries = ensureEditableEntries();
  const entry = entries?.[index];
  if (!entry) {
    return;
  }

  entry.content = (event.target as HTMLTextAreaElement).value;
}

function handleEditableEntryKindChange(index: number, event: Event) {
  const entries = ensureEditableEntries();
  const entry = entries?.[index];
  if (!entry) {
    return;
  }

  entry.kind = (event.target as HTMLSelectElement).value as StandaloneLocalContentKind;
}

function toggleEditableEntry(index: number, nextEnabled: boolean) {
  const entries = ensureEditableEntries();
  const entry = entries?.[index];
  if (!entry) {
    return;
  }

  entry.enabled = nextEnabled;
}

function addEditableEntry() {
  const entries = ensureEditableEntries();
  if (!entries) {
    return;
  }

  entries.push({
    name: '',
    content: '',
    kind: 'general',
    route: 'shared',
    enabled: true,
  });
  selectedEditableEntryIndex.value = entries.length - 1;
}

function deleteEditableEntry(index: number) {
  const entries = ensureEditableEntries();
  if (!entries || !entries[index]) {
    return;
  }

  entries.splice(index, 1);
  if (entries.length === 0) {
    selectedEditableEntryIndex.value = 0;
    return;
  }

  selectedEditableEntryIndex.value = Math.min(index, entries.length - 1);
}

function moveEditableEntryUp(index: number) {
  const entries = ensureEditableEntries();
  if (!entries || index <= 0 || index >= entries.length) {
    return;
  }

  const [entry] = entries.splice(index, 1);
  entries.splice(index - 1, 0, entry);
  selectedEditableEntryIndex.value = index - 1;
}

function moveEditableEntryDown(index: number) {
  const entries = ensureEditableEntries();
  if (!entries || index < 0 || index >= entries.length - 1) {
    return;
  }

  const [entry] = entries.splice(index, 1);
  entries.splice(index + 1, 0, entry);
  selectedEditableEntryIndex.value = index + 1;
}

function isSettingsManagedAsset(assetId: string) {
  return isSettingsManagedStandaloneLocalContentAsset(assetId);
}

function toggleAsset(assetId: string, nextEnabled: boolean) {
  if (isSettingsManagedAsset(assetId)) {
    return;
  }

  standaloneLocalContent.value.enabledAssets[assetId] = nextEnabled;
}

async function fetchModels(index: number, id: string) {
  configError.value = '';
  isLoadingById.value[id] = true;

  try {
    const result = await fetchAvailableModels(index);
    if (result.success) {
      notify.success(result.message);
    } else {
      configError.value = result.message;
      notify.error(result.message);
    }
  } catch (error) {
    configError.value = t('assistantApi.fetch.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    notify.error(configError.value);
  } finally {
    isLoadingById.value[id] = false;
  }
}

watch(
  () => selectedPreset.value?.id ?? '',
  () => {
    selectedEditableEntryIndex.value = 0;
  },
);

watch(
  () => editableWorldbookEntries.value.length,
  length => {
    if (length === 0) {
      selectedEditableEntryIndex.value = 0;
      return;
    }

    if (selectedEditableEntryIndex.value > length - 1) {
      selectedEditableEntryIndex.value = length - 1;
    }
  },
);

async function fetchMainApiModels() {
  configError.value = '';
  isLoadingMainApi.value = true;

  try {
    const result = await fetchMainApiAvailableModels();
    if (result.success) {
      notify.success(result.message);
    } else {
      configError.value = result.message;
      notify.error(result.message);
    }
  } catch (error) {
    configError.value = t('assistantApi.fetch.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    notify.error(configError.value);
  } finally {
    isLoadingMainApi.value = false;
  }
}

function saveMainApiCard() {
  const result = markMainApiSaved();
  if (!result.valid) {
    configError.value = result.message;
    notify.warning(result.message);
    return;
  }

  const persisted = persistMainApi();
  if (!persisted) {
    configError.value = t('settings.apiSaveStorageFailed');
    notify.error(configError.value);
    return;
  }

  configError.value = '';
  notify.success(t('settings.mainApiSaved'));
}

function saveApiCard(index: number) {
  const previousApis = klona(assistantApis.value);
  const result = markApiSaved(index);
  if (!result.valid) {
    configError.value = result.message;
    notify.warning(result.message);
    return;
  }

  const persisted = persistAssistantApis();
  if (!persisted) {
    assistantApis.value = previousApis;
    configError.value = t('settings.apiSaveStorageFailed');
    notify.error(configError.value);
    return;
  }

  expandNextApi(index);
  configError.value = '';
  notify.success(t('settings.assistantApiSaved'));
}

// 验证辅助 API 配置
function validateApiConfig(): boolean {
  const mainApiValidation = validateMainApi();
  if (!mainApiValidation.valid) {
    configError.value = t('settings.mainApiRequired');
    return false;
  }

  const result = validateAllApis();
  if (!result.valid) {
    configError.value = result.message;
    return false;
  }

  configError.value = '';
  return true;
}

// 跳过设置
async function handleSkip() {
  if (!validateApiConfig()) {
    notify.warning(configError.value || t('settings.mainApiRequired'));
    return;
  }

  await startGame();
}

// 开始游戏
async function handleStart() {
  configError.value = '';

  // 验证配置
  if (!validateApiConfig()) {
    return;
  }

  await startGame();
}

// 实际开始游戏逻辑
async function startGame() {
  if (isStarting.value) {
    return;
  }

  isStarting.value = true;

  try {
    const pendingArchiveResume = loadPendingStandaloneArchiveResume();

    if (pendingArchiveResume) {
      clearPendingStandaloneArchiveResume();
      statDataStore.refreshData('archive-resume-ready');
      emit('complete');
      notify.success(t('setup.standalone.archiveResumeReady'));
      return;
    }

    await writeSetupConfigToCurrentMessage(klona(setupStore.config), 'setup.start-game');

    statDataStore.refreshData('setup.start-game');

    // 先进入主游戏界面，再在主界面里继续等待开场消息生成
    emit('complete');

    const openingPrompt = buildOpeningPrompt();

    const openingTriggered = await messageActions.sendStandaloneUserMessage(openingPrompt, 'setup_start_game_opening');

    if (openingTriggered) {
      notify.success(t('setup.standalone.setupCompleted'));
    } else {
      notify.warning(t('setup.standalone.openingReplyPending'));
    }
  } catch (error) {
    console.error('开始游戏失败:', error);
    notify.error(t('setup.settings.startGameFail'));
  } finally {
    isStarting.value = false;
  }
}
</script>

<style scoped>
@import './styles/setup-shared.css';

.settings-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 40px;
}

.content-area {
  width: 100%;
  max-width: 620px;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: calc(24px * var(--ui-font-scale));
  font-weight: 700;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  font-size: calc(14px * var(--ui-font-scale));
  color: var(--text-secondary);
}

.info-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg-strong));
  border: 1px solid color-mix(in srgb, var(--accent-primary) 22%, var(--card-border));
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
}

.info-card > i {
  color: var(--accent-primary);
  font-size: calc(20px * var(--ui-font-scale));
  flex-shrink: 0;
  margin-top: 2px;
}

.info-content p {
  margin: 0 0 8px 0;
  font-size: calc(14px * var(--ui-font-scale));
  color: var(--text-primary);
  line-height: 1.5;
}

.info-content p:last-child {
  margin-bottom: 0;
}

.info-content .hint {
  color: var(--text-secondary);
  font-size: calc(13px * var(--ui-font-scale));
}

.api-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 32px;
}

.config-section {
  background: var(--card-bg-strong);
  border-radius: var(--radius-lg);
  padding: 16px;
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
}

.language-config-section {
  border-color: color-mix(in srgb, var(--accent-primary) 24%, var(--card-border));
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg-strong));
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: calc(15px * var(--ui-font-scale));
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.section-header > i {
  color: var(--accent-primary);
}

.header-hint {
  margin-left: auto;
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 400;
  color: var(--text-secondary);
}

.add-api-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  border: 1px solid var(--control-border);
  color: var(--accent-primary);
  background: var(--control-bg);
  border-radius: var(--radius-md);
  padding: 6px 10px;
  box-shadow: var(--control-shadow);
  cursor: pointer;
  font-size: calc(12px * var(--ui-font-scale));
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    transform var(--motion-fast);
}

.add-api-btn:hover {
  border-color: var(--control-border-hover);
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--control-bg));
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.mode-toggle {
  display: flex;
  gap: 12px;
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-lg);
  background: var(--control-bg);
  box-shadow: var(--control-shadow);
  cursor: pointer;
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
  color: var(--text-secondary);
}

.mode-btn:hover {
  border-color: var(--control-border-hover);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.mode-btn.active {
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--control-bg));
  border-color: rgba(var(--accent-primary-rgb), 0.36);
  box-shadow: 0 10px 22px rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.mode-btn small {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-tertiary);
  text-align: center;
}

.api-header-desc {
  margin: -4px 0 12px;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  line-height: 1.5;
}

.api-standalone-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid color-mix(in srgb, var(--accent-warning, #f59e0b) 30%, var(--card-border));
  background: color-mix(in srgb, var(--accent-warning, #f59e0b) 10%, var(--card-bg-strong));
  color: var(--text-secondary);
  font-size: calc(12px * var(--ui-font-scale));
  line-height: 1.5;
}

.api-standalone-hint > i {
  color: var(--accent-warning, #f59e0b);
  margin-top: 2px;
  flex-shrink: 0;
}

.api-tab-section {
  padding-bottom: 14px;
}

.api-tab-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.api-tab-btn {
  flex: 1 1 0;
  min-height: 42px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-bg);
  box-shadow: var(--control-shadow);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
}

.api-tab-btn:hover {
  border-color: var(--control-border-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.api-tab-btn.active {
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--control-bg));
  border-color: rgba(var(--accent-primary-rgb), 0.36);
  box-shadow: 0 8px 18px rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.settings-management-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-management-panel .summary-card,
.settings-management-panel .asset-card,
.settings-management-panel .settings-status-card,
.settings-management-panel .worldbook-entry-list-card,
.settings-management-panel .preset-detail-note-card {
  border-radius: var(--radius-lg);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 12%, var(--card-border));
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 28%),
    color-mix(in srgb, var(--card-bg-strong) 88%, transparent);
  box-shadow: var(--card-shadow);
}

.settings-management-panel .summary-card,
.settings-management-panel .settings-status-card,
.settings-management-panel .asset-card,
.settings-management-panel .worldbook-entry-list-card,
.settings-management-panel .preset-detail-note-card {
  padding: 14px;
}

.settings-management-panel .summary-card,
.settings-management-panel .settings-status-card,
.settings-management-panel .asset-card,
.settings-management-panel .worldbook-entry-list-card {
  display: flex;
  flex-direction: column;
}

.settings-management-panel .summary-card,
.settings-management-panel .settings-status-card {
  gap: 6px;
}

.settings-management-panel .asset-card,
.settings-management-panel .worldbook-entry-list-card {
  gap: 12px;
}

.settings-management-panel .settings-status-card p,
.settings-management-panel .asset-description,
.settings-management-panel .workspace-help-text,
.settings-management-panel .preset-section-note,
.settings-management-panel .archive-message-note p,
.settings-management-panel .preset-detail-note-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: calc(12px * var(--ui-font-scale));
}

.settings-management-panel .summary-label,
.settings-management-panel .asset-meta,
.settings-management-panel .status-hint {
  color: var(--text-tertiary);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.45;
  letter-spacing: 0.04em;
}

.settings-management-panel .tag-chip,
.settings-management-panel .source-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: calc(12px * var(--ui-font-scale));
  line-height: 1;
}

.settings-management-panel .tag-chip {
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--text-secondary);
}

.settings-management-panel .source-badge.builtin {
  background: rgba(var(--accent-success-rgb), 0.14);
  color: var(--accent-success);
}

.settings-management-panel .settings-managed-chip {
  background: rgba(var(--accent-secondary-rgb), 0.14);
  color: var(--accent-secondary);
}

.settings-management-panel .primary-btn,
.settings-management-panel .ghost-btn {
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
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast);
}

.settings-management-panel .ghost-btn:hover,
.settings-management-panel .primary-btn:hover:not(:disabled) {
  color: var(--accent-primary);
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.settings-management-panel .primary-btn {
  color: #fff;
  background: linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.92), rgba(var(--accent-secondary-rgb), 0.9));
  border-color: transparent;
}

.settings-management-panel .primary-btn:hover:not(:disabled) {
  color: #fff;
  transform: translateY(-1px);
}

.settings-management-panel .ghost-btn:disabled,
.settings-management-panel .primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.settings-management-panel .danger-btn {
  border-color: rgba(var(--accent-danger-rgb), 0.24);
  color: var(--accent-danger);
}

.settings-management-panel .danger-btn:hover:not(:disabled) {
  border-color: rgba(var(--accent-danger-rgb), 0.34);
  background: rgba(var(--accent-danger-rgb), 0.08);
  color: var(--accent-danger);
}

.settings-management-panel .button-group-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-management-panel .file-input-hidden {
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

.settings-management-panel .preset-browser-head,
.settings-management-panel .asset-card-head,
.settings-management-panel .content-section-head {
  display: flex;
  justify-content: space-between;
  gap: 10px 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.settings-management-panel .preset-browser-head > div,
.settings-management-panel .asset-card-head > div,
.settings-management-panel .content-section-head > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.settings-management-panel .preset-browser-head h5,
.settings-management-panel .content-section-head h5 {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.24;
}

.settings-management-panel .status-grid,
.settings-management-panel .asset-grid {
  display: grid;
  gap: 12px;
}

.settings-management-panel .archive-action-grid,
.settings-management-panel .archive-grid {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.settings-management-panel .archive-action-card {
  justify-content: space-between;
}

.settings-management-panel .asset-title-wrap {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.settings-management-panel .asset-title {
  color: var(--text-primary);
  font-weight: 600;
}

.settings-management-panel .archive-meta-grid {
  display: grid;
  gap: 6px;
}

.settings-management-panel .archive-id,
.settings-management-panel .break-all {
  word-break: break-all;
}

.settings-management-panel .compact-summary-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.08);
  background: color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg-strong));
}

.settings-management-panel .compact-summary-item dt {
  margin: 0;
  color: var(--text-tertiary);
  font-size: calc(12px * var(--ui-font-scale));
  line-height: 1.45;
}

.settings-management-panel .compact-summary-item dd {
  margin: 0;
  color: var(--text-primary);
  font-weight: 600;
  line-height: 1.45;
}

.settings-management-panel .archive-overview-card {
  gap: 10px;
  background:
    linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.065), rgba(var(--accent-primary-rgb), 0.02)),
    color-mix(in srgb, var(--card-bg-strong) 88%, transparent);
}

.settings-management-panel .archive-overview-head {
  align-items: flex-start;
}

.settings-management-panel .archive-compact-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-management-panel .archive-current-snapshot-item {
  background: rgba(var(--accent-primary-rgb), 0.05);
}

.settings-management-panel .archive-message-note {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px dashed rgba(var(--accent-primary-rgb), 0.14);
  background: rgba(var(--accent-primary-rgb), 0.025);
}

.settings-management-panel .archive-message-preview {
  color: var(--text-secondary);
  font-size: calc(12px * var(--ui-font-scale));
  line-height: 1.7;
}

.settings-management-panel .archive-status-card--info {
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.settings-management-panel .archive-status-card--error {
  background: rgba(var(--accent-danger-rgb), 0.08);
}

.settings-management-panel .empty-state {
  padding: 28px 20px;
  text-align: center;
  color: var(--text-secondary);
  border-radius: var(--radius-lg);
  border: 1px dashed rgba(var(--accent-primary-rgb), 0.2);
  background: color-mix(in srgb, var(--card-bg-strong) 72%, transparent);
}

.settings-management-panel .empty-state.compact-empty {
  padding: 18px 14px;
}

.settings-management-panel .worldbook-workspace-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}

.settings-management-panel .worldbook-compact-card {
  gap: 8px;
}

.settings-management-panel .worldbook-entry-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 620px;
  overflow-y: auto;
  padding-right: 4px;
}

.settings-management-panel .compact-worldbook-list {
  gap: 7px;
  max-height: none;
  padding-right: 0;
}

.settings-management-panel .worldbook-entry-item {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg-strong));
  color: inherit;
  text-align: left;
  transition:
    transform var(--motion-fast),
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast);
}

.settings-management-panel .worldbook-entry-item:hover,
.settings-management-panel .worldbook-entry-item.active {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
  background: color-mix(in srgb, var(--accent-primary) 9%, var(--card-bg-strong));
  box-shadow: 0 10px 20px rgba(var(--accent-primary-rgb), 0.09);
  transform: translateY(-1px);
}

.settings-management-panel .compact-worldbook-item {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px 11px;
}

.settings-management-panel .compact-worldbook-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 7px;
}

.settings-management-panel .compact-worldbook-trigger {
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

.settings-management-panel .compact-worldbook-trigger:focus-visible,
.settings-management-panel .compact-icon-btn:focus-visible,
.settings-management-panel .compact-toggle-btn:focus-visible,
.settings-management-panel .route-segment-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.14);
}

.settings-management-panel .preset-entry-order {
  min-width: 44px;
  padding-top: 2px;
  color: var(--accent-primary);
  font-size: calc(12px * var(--ui-font-scale));
  font-weight: 700;
}

.settings-management-panel .compact-order {
  min-width: 34px;
  padding-top: 0;
}

.settings-management-panel .system-order {
  min-width: 30px;
  font-size: calc(10px * var(--ui-font-scale));
}

.settings-management-panel .worldbook-entry-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-management-panel .compact-worldbook-copy {
  gap: 3px;
}

.settings-management-panel .compact-worldbook-title-line,
.settings-management-panel .compact-worldbook-meta-line {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  min-width: 0;
}

.settings-management-panel .compact-worldbook-title-line strong {
  color: var(--text-primary);
  font-size: calc(12.5px * var(--ui-font-scale));
  line-height: 1.28;
  letter-spacing: 0.01em;
  min-width: 0;
  flex: 1 1 180px;
}

.settings-management-panel .entry-enabled-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 10px;
  border-radius: 999px;
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1;
  font-weight: 700;
}

.settings-management-panel .compact-badge {
  padding: 4px 8px;
  font-size: calc(10px * var(--ui-font-scale));
}

.settings-management-panel .entry-enabled-badge.enabled {
  background: rgba(var(--accent-success-rgb), 0.14);
  color: var(--accent-success);
}

.settings-management-panel .entry-enabled-badge.disabled {
  background: rgba(var(--accent-danger-rgb), 0.12);
  color: var(--accent-danger);
}

.settings-management-panel .compact-tag {
  padding: 3px 7px;
  font-size: calc(10px * var(--ui-font-scale));
}

.settings-management-panel .compact-worldbook-preview {
  min-width: 0;
  color: var(--text-secondary);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.3;
  flex: 1 1 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.92;
}

.settings-management-panel .compact-worldbook-chevron {
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: calc(12px * var(--ui-font-scale));
  flex-shrink: 0;
}

.settings-management-panel .worldbook-editor-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.settings-management-panel .compact-worldbook-actions {
  flex-shrink: 0;
  gap: 6px;
  justify-content: flex-end;
}

.settings-management-panel .compact-icon-btn {
  width: 32px;
  min-width: 32px;
  height: 32px;
}

.settings-management-panel .icon-only-btn {
  padding: 0;
}

.settings-management-panel .toggle-switch {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.settings-management-panel .compact-toggle-switch {
  width: 40px;
  height: 22px;
}

.settings-management-panel .toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.settings-management-panel .toggle-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.16);
  transition: background var(--motion-fast);
}

.settings-management-panel .toggle-track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
  transition: transform var(--motion-fast);
}

.settings-management-panel .compact-toggle-switch .toggle-track::after {
  top: 2px;
  left: 2px;
}

.settings-management-panel .toggle-switch input:checked + .toggle-track {
  background: rgba(var(--accent-primary-rgb), 0.42);
}

.settings-management-panel .toggle-switch input:checked + .toggle-track::after {
  transform: translateX(20px);
}

.settings-management-panel .compact-toggle-switch input:checked + .toggle-track::after {
  transform: translateX(18px);
}

.settings-management-panel .worldbook-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(140px, 0.8fr);
  gap: 7px;
}

.settings-management-panel .worldbook-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-management-panel .worldbook-field-wide,
.settings-management-panel .worldbook-field-body {
  grid-column: 1 / -1;
}

.settings-management-panel .worldbook-input,
.settings-management-panel .worldbook-select,
.settings-management-panel .worldbook-textarea {
  width: 100%;
  min-height: 44px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.14);
  border-radius: 12px;
  background: rgba(var(--accent-primary-rgb), 0.03);
  color: var(--text-primary);
  padding: 9px 12px;
  font: inherit;
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast);
}

.settings-management-panel .worldbook-textarea {
  min-height: 160px;
  line-height: 1.55;
  resize: vertical;
}

.settings-management-panel .compact-worldbook-textarea-readonly {
  color: var(--text-secondary);
}

.settings-management-panel .worldbook-input:hover,
.settings-management-panel .worldbook-select:hover,
.settings-management-panel .worldbook-textarea:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.28);
}

.settings-management-panel .worldbook-input:focus,
.settings-management-panel .worldbook-select:focus,
.settings-management-panel .worldbook-textarea:focus {
  outline: none;
  border-color: rgba(var(--accent-primary-rgb), 0.4);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.12);
  background: rgba(var(--accent-primary-rgb), 0.06);
}

.settings-management-panel .preset-detail-note-card {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  background: rgba(var(--accent-primary-rgb), 0.07);
}

.settings-management-panel .preset-detail-note-card i {
  color: var(--accent-primary);
  margin-top: 2px;
}

.settings-management-panel .compact-worldbook-note {
  padding: 9px 11px;
  border-radius: 12px;
}

.settings-management-panel .compact-worldbook-expand {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 7px;
  border-top: 1px solid rgba(var(--accent-primary-rgb), 0.09);
}

.settings-management-panel .route-segment-control {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border-radius: 12px;
  background: rgba(var(--accent-primary-rgb), 0.055);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
}

.settings-management-panel .route-segment-control-system {
  width: 100%;
  margin-top: -2px;
  margin-bottom: 2px;
}

.settings-management-panel .route-segment-btn {
  min-height: 32px;
  padding: 6px 8px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--motion-fast),
    color var(--motion-fast),
    box-shadow var(--motion-fast),
    transform var(--motion-fast);
}

.settings-management-panel .route-segment-btn:hover {
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.settings-management-panel .route-segment-btn.active {
  background: linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.92), rgba(var(--accent-secondary-rgb), 0.78));
  color: white;
  box-shadow: 0 8px 18px rgba(var(--accent-primary-rgb), 0.2);
}

.settings-management-panel .route-segment-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.settings-management-panel .route-segment-btn:disabled:hover {
  color: var(--text-secondary);
  background: transparent;
  box-shadow: none;
}

.settings-management-panel .compact-system-toggle {
  min-height: 32px;
  padding: 6px 10px;
  font-size: calc(11px * var(--ui-font-scale));
}

.settings-management-panel .compact-system-meta-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-secondary);
  font-size: calc(11px * var(--ui-font-scale));
  line-height: 1.45;
  padding-inline: 2px;
}

.settings-management-panel .compact-action-btn {
  min-height: 36px;
  padding: 7px 11px;
}

.settings-management-panel .worldbook-system-section {
  gap: 12px;
}

.single-api-list {
  gap: 0;
}

.static-title {
  cursor: default;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.api-card {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--card-bg-strong) 76%, var(--bg-card-solid));
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.api-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-light);
  background: color-mix(in srgb, var(--gradient-subtle) 60%, transparent);
}

.api-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 0;
}

.api-card-title small {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.api-card-actions {
  display: flex;
  gap: 6px;
}

.api-card-body {
  padding: 12px;
}

.config-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.config-row.block-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.config-row label {
  width: 120px;
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.config-row input:not(.setup-field-input),
.config-row select:not(.setup-field-input) {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-bg);
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--text-primary);
  box-shadow: var(--control-shadow);
}

.toggle-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-bg);
  box-shadow: var(--control-shadow);
  cursor: pointer;
  font-size: calc(13px * var(--ui-font-scale));
  color: var(--text-secondary);
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
}

.toggle-btn:hover {
  border-color: var(--control-border-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.toggle-btn.active {
  background: color-mix(in srgb, var(--accent-primary) 14%, var(--control-bg));
  border-color: rgba(var(--accent-primary-rgb), 0.36);
  box-shadow: 0 8px 18px rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.model-row {
  display: flex;
  gap: 8px;
}

.model-select,
.model-input {
  flex: 1;
}

.fetch-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  box-shadow: var(--control-shadow);
  cursor: pointer;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast),
    box-shadow var(--motion-fast);
}

.fetch-btn:hover:not(:disabled) {
  border-color: var(--control-border-hover);
  color: var(--accent-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.fetch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.api-card-footer {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.save-card-btn {
  border: 1px solid var(--control-border);
  color: var(--accent-primary);
  background: var(--control-bg);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: var(--control-shadow);
  cursor: pointer;
  font-size: calc(13px * var(--ui-font-scale));
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    box-shadow var(--motion-fast),
    transform var(--motion-fast);
}

.save-card-btn:hover {
  border-color: var(--control-border-hover);
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--control-bg));
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--accent-danger) 10%, var(--card-bg-strong));
  border: 1px solid color-mix(in srgb, var(--accent-danger) 30%, var(--card-border));
  border-radius: var(--radius-md);
  color: var(--accent-danger);
  font-size: calc(13px * var(--ui-font-scale));
  margin-top: 12px;
}

.action-area {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.skip-btn {
  padding: 14px 32px;
  background: var(--control-bg);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  box-shadow: var(--control-shadow);
  color: var(--text-secondary);
  font-size: calc(15px * var(--ui-font-scale));
  cursor: pointer;
  transition:
    border-color var(--motion-fast),
    background var(--motion-fast),
    color var(--motion-fast),
    box-shadow var(--motion-fast),
    transform var(--motion-fast);
}

.skip-btn:hover {
  border-color: var(--control-border-hover);
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--control-bg));
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.start-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 48px;
  background: var(--gradient-primary);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.36);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 24px rgba(var(--accent-primary-rgb), 0.18);
  color: white;
  font-size: calc(16px * var(--ui-font-scale));
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--motion-normal),
    box-shadow var(--motion-normal),
    opacity var(--motion-fast);
}

.start-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(var(--accent-primary-rgb), 0.24);
}

.start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .settings-page {
    padding-top: 20px;
  }

  .content-area {
    padding: 16px;
  }

  .mode-toggle {
    flex-direction: column;
  }

  .api-tab-switch {
    flex-direction: column;
  }

  .settings-management-panel .preset-browser-head,
  .settings-management-panel .asset-card-head,
  .settings-management-panel .content-section-head {
    flex-direction: column;
  }

  .settings-management-panel .content-section-head {
    align-items: flex-start;
  }

  .settings-management-panel .worldbook-editor-grid,
  .settings-management-panel .archive-action-grid,
  .settings-management-panel .archive-grid {
    grid-template-columns: 1fr;
  }

  .settings-management-panel .compact-worldbook-item-head {
    flex-direction: column;
    align-items: stretch;
  }

  .settings-management-panel .compact-worldbook-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .settings-management-panel .compact-worldbook-preview {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .settings-management-panel .route-segment-control {
    width: 100%;
  }

  .config-row {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .config-row label {
    width: auto;
  }

  .action-area {
    flex-direction: column;
  }

  .skip-btn,
  .start-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
