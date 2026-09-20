<template>
  <div class="settings-panel">
    <div class="settings-tabs">
      <button :class="{ active: currentTab === 'ui' }" @click="currentTab = 'ui'">
        <i class="ti ti-palette"></i> {{ t('settings.tab.ui') }}
      </button>
      <button :class="{ active: currentTab === 'mainApi' }" @click="currentTab = 'mainApi'">
        {{ t('settings.tab.mainApi') }}
      </button>
      <button :class="{ active: currentTab === 'assistantApi' }" @click="currentTab = 'assistantApi'">
        {{ t('settings.tab.assistantApi') }}
      </button>
      <button :class="{ active: currentTab === 'worldbook' }" @click="currentTab = 'worldbook'">
        {{ t('settings.tab.worldbookManager') }}
      </button>
      <button :class="{ active: currentTab === 'archive' }" @click="currentTab = 'archive'">
        {{ t('settings.tab.archiveManager') }}
      </button>
      <button class="declaration-tab-btn" :title="t('settings.tab.declaration')" @click="showDeclaration = true">
        <i class="ti ti-certificate"></i>
      </button>
    </div>

    <!-- 声明弹窗 -->
    <DeclarationModal :visible="showDeclaration" @close="showDeclaration = false" />

    <!-- ==================== 界面设置标签页（重新设计） ==================== -->
    <div v-show="currentTab === 'ui'" class="ui-settings">
      <!-- ─── 外观 ─── -->
      <div class="setting-card">
        <h3 class="card-title"><i class="ti ti-palette"></i>{{ t('settings.card.appearance') }}</h3>

        <div class="language-spotlight">
          <div class="language-spotlight-head">
            <div class="language-spotlight-title-row">
              <span class="language-spotlight-title">
                <i class="ti ti-language"></i>
                {{ t('settings.languageSectionTitle') }}
              </span>
            </div>
          </div>

          <div class="chip-group language-chip-group">
            <button :class="['chip', { active: locale === 'zh-CN' }]" @click="locale = 'zh-CN'">
              {{ t('common.language.zh-CN') }}
            </button>
            <button :class="['chip', { active: locale === 'en' }]" @click="locale = 'en'">
              {{ t('common.language.en') }}
            </button>
          </div>
        </div>

        <div class="setting-row stacked">
          <span class="row-label">{{ t('settings.theme') }}</span>
          <div class="chip-group">
            <button
              type="button"
              :class="['chip', { active: theme === 'light' }]"
              :title="t('settings.theme.light')"
              :aria-label="t('settings.theme.light')"
              @click.stop="handleThemeChange('light')"
            >
              <i class="ti ti-sun"></i>
            </button>
            <button
              type="button"
              :class="['chip', { active: theme === 'dark' }]"
              :title="t('settings.theme.dark')"
              :aria-label="t('settings.theme.dark')"
              @click.stop="handleThemeChange('dark')"
            >
              <i class="ti ti-moon"></i>
            </button>
            <button
              type="button"
              :class="['chip', { active: theme === 'steelcool' }]"
              :title="t('settings.theme.steelcool')"
              :aria-label="t('settings.theme.steelcool')"
              @click.stop="handleThemeChange('steelcool')"
            >
              <i class="ti ti-cube"></i>
            </button>
            <button
              type="button"
              :class="['chip', { active: theme === 'solarized' }]"
              :title="t('settings.theme.solarized')"
              :aria-label="t('settings.theme.solarized')"
              @click.stop="handleThemeChange('solarized')"
            >
              <i class="ti ti-solar-panel"></i>
            </button>
            <button
              type="button"
              :class="['chip', { active: theme === 'everforest1980s' }]"
              :title="t('settings.theme.everforest1980s')"
              :aria-label="t('settings.theme.everforest1980s')"
              @click.stop="handleThemeChange('everforest1980s')"
            >
              <i class="ti ti-seedling"></i>
            </button>
            <button
              type="button"
              :class="['chip', { active: theme === 'wuxia' }]"
              :title="t('settings.theme.wuxia')"
              :aria-label="t('settings.theme.wuxia')"
              @click.stop="handleThemeChange('wuxia')"
            >
              <i class="ti ti-certificate"></i>
            </button>
          </div>
        </div>

        <div class="setting-row stacked">
          <span class="row-label">{{ t('settings.font') }}</span>
          <div class="chip-group">
            <button
              :class="['chip', { active: fontFamily === 'yahei' }]"
              style="font-family: 'Microsoft YaHei', '微软雅黑', sans-serif"
              @click="fontFamily = 'yahei'"
            >
              {{ t('settings.font.yahei') }}
            </button>
            <button
              :class="['chip', { active: fontFamily === 'source-han-sans' }]"
              style="font-family: 'Noto Sans CJK', 'Source Han Sans SC', 'Noto Sans SC', sans-serif"
              @click="fontFamily = 'source-han-sans'"
            >
              {{ t('settings.font.source-han-sans') }}
            </button>
            <button
              :class="['chip', { active: fontFamily === 'lxgw-hazy' }]"
              style="font-family: 'LXGW 975 HazyGo SC 500W', sans-serif"
              @click="fontFamily = 'lxgw-hazy'"
            >
              {{ t('settings.font.lxgw-hazy') }}
            </button>
            <button
              :class="['chip', { active: fontFamily === 'hanchan' }]"
              style="font-family: '寒蝉半圆体', sans-serif"
              @click="fontFamily = 'hanchan'"
            >
              {{ t('settings.font.hanchan') }}
            </button>
            <button
              :class="['chip', { active: fontFamily === 'shanggu' }]"
              style="font-family: 'Shanggu Round', sans-serif"
              @click="fontFamily = 'shanggu'"
            >
              {{ t('settings.font.shanggu') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ─── 排版 ─── -->
      <div class="setting-card">
        <h3 class="card-title"><i class="ti ti-text-size"></i>{{ t('settings.card.typography') }}</h3>

        <div class="setting-row slider-row">
          <span class="row-label">{{ t('settings.uiFont') }}</span>
          <div class="slider-inline">
            <input v-model.number="fontSize" type="range" min="1" max="5" step="1" class="range-slider" />
          </div>
          <span class="row-value">{{ fontSizeLabels[fontSize] }}</span>
        </div>

        <div class="setting-row slider-row">
          <span class="row-label">{{ t('settings.contentFont') }}</span>
          <div class="slider-inline">
            <input v-model.number="contentFontSize" type="range" min="1" max="5" step="1" class="range-slider" />
          </div>
          <span class="row-value">{{ fontSizeLabels[contentFontSize] }}</span>
        </div>

        <div class="setting-row slider-row">
          <span class="row-label">{{ t('settings.lineHeight') }}</span>
          <div class="slider-inline">
            <input v-model.number="lineHeight" type="range" min="1" max="5" step="1" class="range-slider" />
          </div>
          <span class="row-value">{{ lineHeightLabels[lineHeight] }}</span>
        </div>
      </div>

      <!-- ─── 功能 ─── -->
      <div class="setting-card">
        <h3 class="card-title"><i class="ti ti-adjustments"></i>{{ t('settings.card.features') }}</h3>

        <!-- 自动滚动 -->
        <div class="setting-row">
          <span class="row-label">{{ t('settings.autoScroll') }}</span>
          <label class="toggle-switch">
            <input v-model="autoScroll" type="checkbox" />
            <span class="toggle-track"></span>
          </label>
        </div>

        <!-- 文生图 -->
        <div class="setting-row">
          <span class="row-label">
            {{ t('settings.textToImage') }}
            <a
              href="https://discord.com/channels/1134557553011998840/1463945242301567168/1468540724051181632"
              target="_blank"
              rel="noopener noreferrer"
              class="help-link"
              :title="t('settings.textToImageHelp')"
            >
              <i class="ti ti-help-circle"></i>
            </a>
          </span>
          <label class="toggle-switch">
            <input
              :checked="textToImageEnabled"
              type="checkbox"
              @change="handleTextToImageToggle(!textToImageEnabled)"
            />
            <span class="toggle-track"></span>
          </label>
          <div class="inline-toggle-group">
            <span class="row-label">
              {{ t('settings.onlineMode') }}
              <a
                href="https://discord.com/channels/1134557553011998840/1460568392317669468"
                target="_blank"
                rel="noopener noreferrer"
                class="help-link"
                :title="t('settings.onlineModeHelp')"
              >
                <i class="ti ti-help-circle"></i>
              </a>
            </span>
            <label class="toggle-switch">
              <input
                :checked="onlineModeEnabled"
                type="checkbox"
                @change="handleOnlineModeToggle(!onlineModeEnabled)"
              />
              <span class="toggle-track"></span>
            </label>
          </div>
        </div>

        <!-- 生存系统 -->
        <div class="setting-row">
          <span class="row-label">{{ t('settings.survivalSystem') }}</span>
          <div class="seg-control">
            <input
              id="survival-off"
              type="radio"
              name="survival"
              value="关闭"
              :checked="survivalModeFromStatData === '关闭'"
              @change="handleSurvivalModeChange('关闭')"
            />
            <label for="survival-off">{{ t('settings.survival.off') }}</label>
            <input
              id="survival-basic"
              type="radio"
              name="survival"
              value="基础模式"
              :checked="survivalModeFromStatData === '基础模式'"
              @change="handleSurvivalModeChange('基础模式')"
            />
            <label for="survival-basic">{{ t('settings.survival.basic') }}</label>
            <input
              id="survival-full"
              type="radio"
              name="survival"
              value="生存模式"
              :checked="survivalModeFromStatData === '生存模式'"
              @change="handleSurvivalModeChange('生存模式')"
            />
            <label for="survival-full">{{ t('settings.survival.full') }}</label>
            <span class="seg-indicator"></span>
          </div>
          <span class="row-value status">{{
            survivalModeFromStatData === '关闭'
              ? t('settings.survival.summary.off')
              : survivalModeFromStatData === '基础模式'
                ? t('settings.survival.summary.basic')
                : t('settings.survival.summary.full')
          }}</span>
        </div>

        <!-- 世界难度 -->
        <div class="setting-row stacked">
          <span class="row-label">{{ t('settings.worldDifficulty') }}</span>
          <div class="chip-group">
            <button
              v-for="difficulty in WORLD_DIFFICULTIES"
              :key="difficulty"
              type="button"
              :class="['chip', { active: worldDifficulty === difficulty }]"
              @click="handleWorldDifficultyChange(difficulty)"
            >
              {{ worldDifficultyLabelMap[difficulty] }}
            </button>
          </div>
          <span class="row-value status">{{ t('settings.worldDifficulty.alwaysOnRule') }}</span>
        </div>

        <!-- 选项点击行为 -->
        <div class="setting-row">
          <span class="row-label">{{ t('settings.optionClick') }}</span>
          <div class="seg-control">
            <input
              id="action-replace"
              type="radio"
              name="action-behavior"
              value="replace"
              :checked="actionOptionBehavior === 'replace'"
              @change="actionOptionBehavior = 'replace'"
            />
            <label for="action-replace">{{ t('settings.optionBehavior.replace') }}</label>
            <input
              id="action-append"
              type="radio"
              name="action-behavior"
              value="append"
              :checked="actionOptionBehavior === 'append'"
              @change="actionOptionBehavior = 'append'"
            />
            <label for="action-append">{{ t('settings.optionBehavior.append') }}</label>
            <span class="seg-indicator"></span>
          </div>
          <span class="row-value status">{{
            actionOptionBehavior === 'replace'
              ? t('settings.optionBehavior.replaceSummary')
              : t('settings.optionBehavior.appendSummary')
          }}</span>
        </div>
      </div>

      <!-- ─── 背景图 ─── -->
      <div class="setting-card">
        <h3 class="card-title"><i class="ti ti-photo"></i>{{ t('settings.card.backgroundImage') }}</h3>

        <!-- 已有图片 -->
        <template v-if="backgroundImage.imageUrl">
          <div class="bg-preview-row">
            <div class="bg-thumb">
              <img :src="backgroundImage.imageUrl" :alt="t('settings.backgroundPreviewAlt')" />
              <button class="bg-remove-btn" :title="t('settings.removeBackgroundImage')" @click="removeBackgroundImage">
                <i class="ti ti-x"></i>
              </button>
            </div>
            <div class="bg-controls">
              <div class="bg-ctrl-row">
                <span class="bg-ctrl-label">{{ t('settings.opacity') }}</span>
                <input
                  v-model.number="backgroundImage.opacity"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  class="range-slider sm"
                />
                <span class="bg-ctrl-val">{{ backgroundImage.opacity }}%</span>
              </div>
              <div class="bg-option-row">
                <div class="chip-group sm">
                  <button
                    v-for="s in ['cover', 'contain', 'auto'] as const"
                    :key="s"
                    :class="['chip mini', { active: backgroundImage.size === s }]"
                    @click="backgroundImage.size = s"
                  >
                    {{ backgroundSizeLabelMap[s] }}
                  </button>
                </div>
                <div class="chip-group sm">
                  <button
                    v-for="p in ['top', 'center', 'bottom'] as const"
                    :key="p"
                    :class="['chip mini', { active: backgroundImage.position === p }]"
                    @click="backgroundImage.position = p"
                  >
                    {{ backgroundPositionLabelMap[p] }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 无图片 -->
        <template v-else>
          <div class="bg-upload-row">
            <label class="upload-btn">
              <i class="ti ti-upload"></i>
              <span>{{ t('settings.upload') }}</span>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                @change="handleImageUpload"
              />
            </label>
            <div class="url-input-group">
              <input
                v-model="imageUrlInput"
                type="text"
                :placeholder="t('settings.pasteImageUrl')"
                class="url-input"
                @keyup.enter="handleUrlInput"
              />
              <button class="url-confirm-btn" :disabled="!imageUrlInput.trim()" @click="handleUrlInput">
                <i class="ti ti-check"></i>
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ==================== 辅助 API 配置标签页（保持不变） ==================== -->
    <div v-show="currentTab === 'mainApi'" class="api-dashboard">
      <div class="dash-card compact">
        <div class="card-header">
          <i class="ti ti-brain"></i>
          <span>{{ t('settings.mainApiTitle') }}</span>
        </div>
        <p class="api-header-desc">{{ t('settings.mainApiDesc') }}</p>

        <div class="api-list single-api-list">
          <div class="api-item">
            <div class="api-item-head">
              <div class="api-item-title static-title">
                <i class="ti ti-message-dots"></i>
                <span>{{ t('settings.mainApiCardTitle') }}</span>
                <small v-if="mainApi.model">{{ mainApi.model }}</small>
              </div>
            </div>

            <div class="api-item-body">
              <div class="config-grid">
                <div class="config-row">
                  <label><i class="ti ti-cloud"></i></label>
                  <select v-model="mainApi.source" @change="handleMainApiSourceChange">
                    <option value="openai_compatible">OpenAI</option>
                  </select>
                </div>

                <div class="config-row full">
                  <label><i class="ti ti-link"></i></label>
                  <input v-model="mainApi.apiurl" type="text" :placeholder="t('settings.apiUrlPlaceholder')" />
                </div>

                <div class="config-row full">
                  <label><i class="ti ti-key"></i></label>
                  <input v-model="mainApi.key" type="password" :placeholder="t('settings.apiKeyPlaceholder')" />
                </div>

                <div class="config-row full">
                  <label><i class="ti ti-cpu"></i></label>
                  <select v-if="mainApi.availableModels.length > 0" v-model="mainApi.model" class="model-select">
                    <option value="" disabled>{{ t('settings.selectModel') }}</option>
                    <option v-for="model in mainApi.availableModels" :key="model" :value="model">{{ model }}</option>
                  </select>
                  <input
                    v-else
                    v-model="mainApi.model"
                    type="text"
                    :placeholder="t('settings.modelPlaceholder')"
                    class="model-select"
                  />
                  <button class="inline-icon-btn" :disabled="isLoadingMainApi" @click="fetchMainApiModels">
                    <i :class="['ti', isLoadingMainApi ? 'ti-loader-2 ti-spin' : 'ti-download']"></i>
                  </button>
                </div>
              </div>

              <div class="action-row-combined">
                <button class="icon-btn primary save-btn-inline" @click="saveMainApiCard">
                  <i class="ti ti-check"></i>
                  <span>{{ t('settings.saveThisApi') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="saveResult" :class="['result-bar', saveResult.success ? 'success' : 'error']">
          <i :class="['ti', saveResult.success ? 'ti-circle-check' : 'ti-circle-x']"></i>
          <span>{{ saveResult.message }}</span>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'assistantApi'" class="api-dashboard">
      <div class="dash-card compact">
        <div class="card-header">
          <i class="ti ti-server"></i>
          <span>{{ t('settings.apiList') }}</span>
          <button class="inline-icon-btn" @click="handleAddApi">
            <i class="ti ti-plus"></i>
          </button>
        </div>
        <p class="api-header-desc">{{ t('settings.apiListDesc') }}</p>

        <div class="api-list">
          <div v-for="(api, index) in assistantApis" :key="api.id" class="api-item">
            <div class="api-item-head">
              <button class="api-item-title" @click="toggleCollapse(index)">
                <i :class="['ti', api.collapsed ? 'ti-chevron-right' : 'ti-chevron-down']"></i>
                <span>{{ t('settings.apiCardTitle', { index: index + 1 }) }}</span>
                <small v-if="api.model">{{ api.model }}</small>
              </button>
              <div class="api-item-actions">
                <button class="inline-icon-btn" :disabled="index === 0" @click="moveApiUp(index)">
                  <i class="ti ti-arrow-up"></i>
                </button>
                <button
                  class="inline-icon-btn"
                  :disabled="index === assistantApis.length - 1"
                  @click="moveApiDown(index)"
                >
                  <i class="ti ti-arrow-down"></i>
                </button>
                <button class="inline-icon-btn danger" :disabled="assistantApis.length <= 1" @click="removeApi(index)">
                  <i class="ti ti-trash"></i>
                </button>
              </div>
            </div>

            <div v-if="!api.collapsed" class="api-item-body">
              <div class="config-grid">
                <div class="config-row">
                  <label><i class="ti ti-cloud"></i></label>
                  <select v-model="api.source" @change="handleCardSourceChange(index)">
                    <option value="openai_compatible">OpenAI</option>
                  </select>
                </div>

                <div class="config-row full">
                  <label><i class="ti ti-link"></i></label>
                  <input v-model="api.apiurl" type="text" :placeholder="t('settings.apiUrlPlaceholder')" />
                </div>

                <div class="config-row full">
                  <label><i class="ti ti-key"></i></label>
                  <input v-model="api.key" type="password" :placeholder="t('settings.apiKeyPlaceholder')" />
                </div>

                <div class="config-row full">
                  <label><i class="ti ti-cpu"></i></label>
                  <select v-if="api.availableModels.length > 0" v-model="api.model" class="model-select">
                    <option value="" disabled>{{ t('settings.selectModel') }}</option>
                    <option v-for="model in api.availableModels" :key="model" :value="model">{{ model }}</option>
                  </select>
                  <input
                    v-else
                    v-model="api.model"
                    type="text"
                    :placeholder="t('settings.modelPlaceholder')"
                    class="model-select"
                  />
                  <button class="inline-icon-btn" :disabled="isLoadingById[api.id]" @click="fetchModels(index, api.id)">
                    <i :class="['ti', isLoadingById[api.id] ? 'ti-loader-2 ti-spin' : 'ti-download']"></i>
                  </button>
                </div>
              </div>

              <div class="action-row-combined">
                <button class="icon-btn primary save-btn-inline" @click="saveApiCard(index)">
                  <i class="ti ti-check"></i>
                  <span>{{ t('settings.saveThisApi') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="saveResult" :class="['result-bar', saveResult.success ? 'success' : 'error']">
          <i :class="['ti', saveResult.success ? 'ti-circle-check' : 'ti-circle-x']"></i>
          <span>{{ saveResult.message }}</span>
        </div>
      </div>
    </div>

    <div v-show="currentTab === 'worldbook'" class="api-dashboard">
      <section class="panel-section settings-management-panel">
        <div class="worldbook-workspace-shell compact-worldbook-shell">
          <article class="worldbook-entry-list-card worldbook-compact-card">
            <div class="preset-browser-head">
              <div>
                <span class="summary-label">{{ t('contentCenter.worldbook.editableSectionTitle') }}</span>
                <h5>{{ t('contentCenter.worldbook.editableSectionSubtitle') }}</h5>
              </div>
              <button
                class="primary-btn compact-action-btn"
                type="button"
                :disabled="!canEditWorldbookEntries"
                @click="addEditableEntry"
              >
                <i class="ti ti-plus"></i>
                {{ t('contentCenter.worldbook.addEntry') }}
              </button>
            </div>

            <p class="workspace-help-text workspace-help-text--compact">
              {{
                canEditWorldbookEntries
                  ? t('contentCenter.worldbook.editableHelp')
                  : t('contentCenter.worldbook.noPresetGuidance')
              }}
            </p>

            <div
              v-if="canEditWorldbookEntries && editableWorldbookEntries.length > 0"
              class="worldbook-entry-list compact-worldbook-list"
              role="list"
            >
              <article
                v-for="(entry, index) in editableWorldbookEntries"
                :key="editableEntryKeys[index]"
                :class="['worldbook-entry-item', 'compact-worldbook-item', { active: isEditableEntryExpanded(index) }]"
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
                canEditWorldbookEntries
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

          <div v-if="systemWorldbookEntries.length > 0" class="worldbook-entry-list compact-worldbook-list" role="list">
            <article
              v-for="asset in systemWorldbookEntries"
              :key="asset.id"
              :class="['worldbook-entry-item', 'compact-worldbook-item', { active: isSystemAssetExpanded(asset.id) }]"
            >
              <div class="compact-worldbook-item-head">
                <button type="button" class="compact-worldbook-trigger" @click="toggleSystemAssetExpanded(asset.id)">
                  <span class="preset-entry-order compact-order system-order">SYS</span>
                  <div class="worldbook-entry-copy compact-worldbook-copy">
                    <div class="compact-worldbook-title-line">
                      <strong>{{ asset.title }}</strong>
                      <span :class="['entry-enabled-badge', 'compact-badge', asset.enabled ? 'enabled' : 'disabled']">
                        {{ asset.enabled ? t('common.enabled') : t('common.disabled') }}
                      </span>
                      <span class="tag-chip compact-tag">{{ localContentKindLabel(asset.kind) }}</span>
                      <span class="tag-chip compact-tag">{{ t('contentCenter.worldbook.sourceBuiltin') }}</span>
                      <span v-if="isSettingsManagedAsset(asset.id)" class="tag-chip compact-tag settings-managed-chip">
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
                    {{ t('contentCenter.worldbook.deliveryLabel') }}：{{ resolveSystemAssetDisplayRouteLabel(asset) }}
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
    </div>

    <div v-show="currentTab === 'archive'" class="api-dashboard">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { klona } from 'klona';
import type { LocalContentEntryConfig } from '../../presets/types';
import { useAssistantApiEditor } from '../../composables/useAssistantApiEditor';
import { useSingleApiEditor } from '../../composables/useSingleApiEditor';
import { useI18n } from '../../i18n';
import { useNotificationStore } from '../../stores/notification';
import {
  applyOnlineModeToStandaloneLocalContent,
  applyTextToImageToStandaloneLocalContent,
  applyWorldDifficultyToStandaloneLocalContent,
  buildWorldDifficultyStandaloneLocalContent,
  getStandaloneLocalContentManifest,
  isLockedRouteStandaloneLocalContentAsset,
  isSettingsManagedStandaloneLocalContentAsset,
  type StandaloneLocalContentKind,
  type StandaloneLocalContentRoute,
} from '../../utils/standaloneLocalContent';
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
} from '../../utils/archive';
import { loadStandaloneRuntimeMessages, loadStandaloneRuntimeSession } from '../../utils/standaloneRuntime';
import { useSettingsStore, type SurvivalMode, type Theme, type WorldDifficulty } from '../../stores/settings';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { useSetupStore } from '../../stores/setup';
import DeclarationModal from './DeclarationModal.vue';
import { useStandaloneArchiveManager } from '../../composables/useStandaloneArchiveManager';

const currentTab = ref<'ui' | 'mainApi' | 'assistantApi' | 'worldbook' | 'archive'>('ui');
const showDeclaration = ref(false);
const { t } = useI18n();

const settingsStore = useSettingsStore();
const setupStore = useSetupStore();
const notificationStore = useNotificationStore();
const hostToastr = globalThis.toastr;
const toastr = {
  success(message: string) {
    if (hostToastr?.success) {
      hostToastr.success(message);
      return;
    }
    notificationStore.success(message);
  },
  error(message: string) {
    if (hostToastr?.error) {
      hostToastr.error(message);
      return;
    }
    notificationStore.error(message);
  },
  warning(message: string) {
    if (hostToastr?.warning) {
      hostToastr.warning(message);
      return;
    }
    notificationStore.warning(message);
  },
  info(message: string) {
    if (hostToastr?.info) {
      hostToastr.info(message);
      return;
    }
    notificationStore.info(message);
  },
};
const { persistMainApi, persistAssistantApis } = settingsStore;
const {
  locale,
  theme,
  fontFamily,
  fontSize,
  contentFontSize,
  lineHeight,
  autoScroll,
  actionOptionBehavior,
  textToImageEnabled,
  onlineModeEnabled,
  mainApi,
  assistantApis,
  backgroundImage,
  worldDifficulty,
  standaloneLocalContent,
} = storeToRefs(settingsStore);
const { selectedPreset } = storeToRefs(setupStore);

const {
  addApi,
  removeApi,
  moveUp,
  moveDown,
  toggleCollapse,
  handleSourceChange,
  fetchAvailableModels,
  markApiSaved,
  expandNextApi,
} = useAssistantApiEditor(assistantApis);

const {
  handleSourceChange: handleMainApiSourceChange,
  fetchAvailableModels: fetchMainApiAvailableModels,
  markApiSaved: markMainApiSaved,
} = useSingleApiEditor(mainApi);

const statDataStore = useStatDataStore();
const statDataActions = useStatDataActions();
const { data } = storeToRefs(statDataStore);

const {
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
  setArchiveStatus,
  refreshStandaloneArchiveList,
  handleArchiveExport,
  handleSaveStandaloneArchive,
  triggerArchiveImport,
  handleArchiveFileChange,
  handleRestoreStandaloneArchive,
  handleDownloadStandaloneArchive,
  handleDeleteStandaloneArchive,
} = useStandaloneArchiveManager();
const expandedSystemAssetId = ref<string | null>(null);
const selectedEditableEntryIndex = ref(0);
const editableEntryKeyMap = new WeakMap<LocalContentEntryConfig, string>();
let editableEntryKeySeed = 0;

const survivalModeFromStatData = computed<SurvivalMode>(() => {
  const mode = data.value.设置?.生存系统模式;
  return mode ?? '关闭';
});

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

const canEditWorldbookEntries = computed(() => Boolean(selectedPreset.value));
const editableWorldbookEntries = computed<LocalContentEntryConfig[]>(() => {
  const entries = selectedPreset.value?.localContentEntries;
  return Array.isArray(entries) ? entries : [];
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

// 背景图片相关状态
const imageUrlInput = ref('');

// 字体大小标签映射
const fontSizeLabels = computed<Record<number, string>>(() => ({
  1: t('settings.fontSize.1'),
  2: t('settings.fontSize.2'),
  3: t('settings.fontSize.3'),
  4: t('settings.fontSize.4'),
  5: t('settings.fontSize.5'),
}));

// 行距标签映射
const lineHeightLabels = computed<Record<number, string>>(() => ({
  1: t('settings.lineHeightValue.1'),
  2: t('settings.lineHeightValue.2'),
  3: t('settings.lineHeightValue.3'),
  4: t('settings.lineHeightValue.4'),
  5: t('settings.lineHeightValue.5'),
}));

const saveResult = ref<{ success: boolean; message: string } | null>(null);
const isLoadingById = ref<Record<string, boolean>>({});
const isLoadingMainApi = ref(false);

const WORLD_DIFFICULTIES: WorldDifficulty[] = ['最简单', '简单', '普通', '困难', '地狱'];

const worldDifficultyLabelMap = computed<Record<WorldDifficulty, string>>(() => ({
  最简单: t('settings.difficulty.easiest'),
  简单: t('settings.difficulty.easy'),
  普通: t('settings.difficulty.normal'),
  困难: t('settings.difficulty.hard'),
  地狱: t('settings.difficulty.hell'),
}));

const backgroundSizeLabelMap = computed<Record<'cover' | 'contain' | 'auto', string>>(() => ({
  cover: t('settings.backgroundSize.cover'),
  contain: t('settings.backgroundSize.contain'),
  auto: t('settings.backgroundSize.auto'),
}));

const backgroundPositionLabelMap = computed<Record<'top' | 'center' | 'bottom', string>>(() => ({
  top: t('settings.backgroundPosition.top'),
  center: t('settings.backgroundPosition.center'),
  bottom: t('settings.backgroundPosition.bottom'),
}));

const survivalModeSummaryMap = computed<Record<SurvivalMode, string>>(() => ({
  关闭: t('settings.survival.summary.off'),
  基础模式: t('settings.survival.summary.basic'),
  生存模式: t('settings.survival.summary.full'),
}));

function localizedToggleStatus(enabled: boolean) {
  return t(enabled ? 'common.enabled' : 'common.disabled');
}

function localizedSurvivalMode(mode: SurvivalMode) {
  if (mode === '关闭') return t('settings.survival.off');
  if (mode === '基础模式') return t('settings.survival.basic');
  return t('settings.survival.full');
}

function localizedDifficulty(difficulty: WorldDifficulty) {
  return worldDifficultyLabelMap.value[difficulty];
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
  if (!selectedPreset.value) {
    return null;
  }

  if (!Array.isArray(selectedPreset.value.localContentEntries)) {
    selectedPreset.value.localContentEntries = [];
  }

  return selectedPreset.value.localContentEntries;
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

function syncTextToImageLocalContent(enabled: boolean) {
  standaloneLocalContent.value = {
    ...standaloneLocalContent.value,
    enabledAssets: applyTextToImageToStandaloneLocalContent(standaloneLocalContent.value.enabledAssets, enabled),
  };
}

function syncOnlineModeLocalContent(enabled: boolean) {
  standaloneLocalContent.value = {
    ...standaloneLocalContent.value,
    enabledAssets: applyOnlineModeToStandaloneLocalContent(standaloneLocalContent.value.enabledAssets, enabled),
  };
}

function syncWorldDifficultyLocalContent() {
  standaloneLocalContent.value = {
    ...standaloneLocalContent.value,
    enabledAssets: applyWorldDifficultyToStandaloneLocalContent(standaloneLocalContent.value.enabledAssets),
  };
}

function handleThemeChange(mode: Theme) {
  theme.value = mode;
}

// 处理生存系统模式切换
async function handleSurvivalModeChange(mode: SurvivalMode) {
  try {
    await statDataActions.updateStatDataAtPath('settings.survival-mode', '设置.生存系统模式', mode);
    toastr.success(t('settings.survivalSwitched', { mode: localizedSurvivalMode(mode) }));
  } catch (e) {
    console.warn('[Settings] 同步生存系统模式到本地状态失败:', e);
  }
}

function handleWorldDifficultyChange(difficulty: WorldDifficulty) {
  worldDifficulty.value = difficulty;
  syncWorldDifficultyLocalContent();
  toastr.success(t('settings.worldDifficultySet', { difficulty: localizedDifficulty(difficulty) }));
}

// 处理文生图功能切换
async function handleTextToImageToggle(enabled: boolean) {
  textToImageEnabled.value = enabled;
  syncTextToImageLocalContent(enabled);
  toastr.success(t('settings.textToImageLocalRulesToggled', { status: localizedToggleStatus(enabled) }));
}

async function syncOnlineModeFromWorldbook() {
  syncOnlineModeLocalContent(onlineModeEnabled.value);
}

async function handleOnlineModeToggle(enabled: boolean) {
  onlineModeEnabled.value = enabled;
  syncOnlineModeLocalContent(enabled);
  toastr.success(t('settings.onlineModeLocalRulesToggled', { status: localizedToggleStatus(enabled) }));
}

onMounted(() => {
  void syncOnlineModeFromWorldbook();
  syncWorldDifficultyLocalContent();
});

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
    const message = t('settings.apiSaveStorageFailed');
    saveResult.value = { success: false, message };
    toastr.error(message);
    return;
  }

  saveResult.value = null;
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
    const message = t('settings.apiSaveStorageFailed');
    saveResult.value = { success: false, message };
    toastr.error(message);
    return;
  }

  saveResult.value = null;
}

function handleCardSourceChange(index: number) {
  handleSourceChange(index);
}

async function fetchModels(index: number, id: string) {
  isLoadingById.value[id] = true;

  try {
    const result = await fetchAvailableModels(index);

    if (result.success) {
      saveResult.value = { success: true, message: result.message };
      toastr.success(result.message);
    } else {
      saveResult.value = { success: false, message: result.message };
      toastr.error(result.message);
    }
  } catch (error) {
    const message = t('assistantApi.fetch.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    saveResult.value = { success: false, message };
    toastr.error(message);
  } finally {
    isLoadingById.value[id] = false;
  }
}

async function fetchMainApiModels() {
  isLoadingMainApi.value = true;

  try {
    const result = await fetchMainApiAvailableModels();

    if (result.success) {
      saveResult.value = { success: true, message: result.message };
      toastr.success(result.message);
    } else {
      saveResult.value = { success: false, message: result.message };
      toastr.error(result.message);
    }
  } catch (error) {
    const message = t('assistantApi.fetch.failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    saveResult.value = { success: false, message };
    toastr.error(message);
  } finally {
    isLoadingMainApi.value = false;
  }
}

function saveMainApiCard() {
  const result = markMainApiSaved();
  if (!result.valid) {
    saveResult.value = { success: false, message: result.message };
    toastr.warning(result.message);
    return;
  }

  const persisted = persistMainApi();
  if (!persisted) {
    const message = t('settings.apiSaveStorageFailed');
    saveResult.value = { success: false, message };
    toastr.error(message);
    return;
  }

  const message = t('settings.mainApiSaved');
  saveResult.value = { success: true, message };
  toastr.success(message);
}

function saveApiCard(index: number) {
  const previousApis = klona(assistantApis.value);
  const result = markApiSaved(index);
  if (!result.valid) {
    saveResult.value = { success: false, message: result.message };
    toastr.warning(result.message);
    return;
  }

  const persisted = persistAssistantApis();
  if (!persisted) {
    assistantApis.value = previousApis;
    const message = t('settings.apiSaveStorageFailed');
    saveResult.value = { success: false, message };
    toastr.error(message);
    return;
  }

  expandNextApi(index);
  const message = t('settings.assistantApiSaved');
  saveResult.value = { success: true, message };
  toastr.success(message);
}

// 背景图片处理函数
function handleUrlInput() {
  const url = imageUrlInput.value.trim();

  if (!url) {
    backgroundImage.value.imageUrl = '';
    toastr.info(t('settings.imageCleared'));
    return;
  }

  // 验证 URL 格式
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    toastr.error(t('settings.imageInvalidUrl'));
    return;
  }

  // 验证是否为图片URL（简单检查后缀）
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'];
  const hasImageExt = imageExtensions.some(ext => url.toLowerCase().includes(ext));

  if (!hasImageExt && !url.includes('?')) {
    toastr.warning(t('settings.imageMaybeNotImage'));
  }

  // 尝试加载图片验证
  const testImg = new Image();
  testImg.onload = () => {
    backgroundImage.value.imageUrl = url;
    toastr.success(t('settings.imageSet'));
  };
  testImg.onerror = () => {
    toastr.error(t('settings.imageLoadFailed'));
  };
  testImg.src = url;
}

async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (!supportedTypes.includes(file.type)) {
    toastr.error(t('settings.imageUnsupportedType'));
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    toastr.error(t('settings.imageTooLarge'));
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const result = e.target?.result as string;
    backgroundImage.value.imageUrl = result;
    toastr.success(t('settings.imageUploaded'));
    input.value = '';
  };
  reader.onerror = () => {
    toastr.error(t('settings.imageReadFailed'));
  };
  reader.readAsDataURL(file);
}

function removeBackgroundImage() {
  backgroundImage.value.imageUrl = '';
  imageUrlInput.value = '';
  toastr.info(t('settings.imageRemoved'));
}
</script>

<style scoped>
/* ===== 面板容器 ===== */
.settings-panel {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding-right: 2px;
}

/* ===== 标签页导航 ===== */
.settings-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  border-bottom: 2px solid var(--glass-border);
  align-items: center;
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.settings-tabs::-webkit-scrollbar {
  display: none;
}

.settings-tabs button {
  min-height: var(--touch-target-min);
  padding: 10px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--motion-normal) var(--ease-out-expo);
  position: relative;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}

.settings-tabs button:hover {
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.05);
}

.settings-tabs button.active {
  color: var(--accent-primary);
  font-weight: 600;
}

.settings-tabs button.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--gradient-primary);
  border-radius: 2px 2px 0 0;
}

/* 声明按钮 */
.declaration-tab-btn {
  margin-left: auto !important;
  padding: 6px 10px !important;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md) !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg) !important;
  border: 1px solid var(--glass-border) !important;
  color: hsl(260, 55%, 65%) !important;
  font-size: calc(14px * var(--ui-font-scale)) !important;
  transition: all var(--transition-normal) var(--ease-out-expo) !important;
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.declaration-tab-btn::after {
  display: none !important;
}

.declaration-tab-btn:hover {
  background: rgba(120, 80, 200, 0.15) !important;
  border-color: rgba(120, 80, 200, 0.35) !important;
  color: hsl(260, 65%, 75%) !important;
  box-shadow: 0 0 12px rgba(120, 80, 200, 0.2);
  transform: translateY(-1px) rotate(5deg);
}

.declaration-tab-btn:active {
  transform: translateY(0) scale(0.95) !important;
}

/* ===== 界面设置 ===== */
.ui-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ===== 统一卡片样式 ===== */
.setting-card {
  padding: 14px;
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-fast),
    border-color var(--motion-fast),
    transform var(--motion-fast);
}

.setting-card:hover {
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.14);
  transform: translateY(-1px);
}

/* 卡片标题 */
.card-title {
  margin: 0 0 12px 0;
  font-size: var(--text-base);
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title i {
  font-size: calc(14px * var(--ui-font-scale));
  /* icon 也需要渐变色，但 icon 用 background-clip 比较复杂，使用 inherit */
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.language-spotlight {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary) 24%, var(--card-border));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg));
  box-shadow: 0 8px 18px rgba(var(--accent-primary-rgb), 0.08);
}

.language-spotlight-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.language-spotlight-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.language-spotlight-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.language-spotlight-title i {
  color: var(--accent-primary);
}

.language-spotlight-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary) 30%, var(--card-border));
  background: color-mix(in srgb, var(--accent-primary) 12%, var(--control-bg));
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 600;
  color: var(--accent-primary);
}

.language-spotlight-desc {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-secondary);
}

.language-chip-group .chip {
  min-height: var(--touch-target-min);
  padding: 8px 12px;
  font-size: var(--text-sm);
  font-weight: 600;
}

/* ===== 统一行布局 ===== */
.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.setting-row + .setting-row {
  border-top: 1px solid var(--glass-border);
}

.setting-row.compact {
  padding: 4px 0;
}

.setting-row.compact + .setting-row.compact {
  border-top: none;
}

.local-content-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.local-content-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--card-bg) 82%, transparent);
}

.local-content-item input {
  margin-top: 2px;
}

.local-content-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.local-content-title {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text-primary);
}

.local-content-desc {
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--text-secondary);
}

.local-content-route {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--accent-primary);
}

/* 行标签 */
.row-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  min-width: 70px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.row-label.sm {
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  min-width: 42px;
}

/* 帮助链接 */
.help-link {
  color: var(--text-secondary);
  font-size: calc(13px * var(--ui-font-scale));
  transition: color var(--transition-fast) ease;
}

.help-link:hover {
  color: var(--accent-primary);
}

/* 行末数值/状态 */
.row-value {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent-primary);
  min-width: 42px;
  text-align: right;
  flex-shrink: 0;
}

.row-value.status {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 52px;
}

/* ===== Chip 按钮组 ===== */
.chip-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.chip-group.sm {
  gap: 3px;
}

.chip {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 3px 8px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-bg);
  cursor: pointer;
  font-size: var(--text-xs);
  font-family: var(--font-base);
  color: var(--text-secondary);
  transition: all var(--motion-fast) var(--ease-out-expo);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip:hover {
  background: rgba(var(--accent-primary-rgb), 0.08);
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  color: var(--text-primary);
  transform: translateY(-1px);
}

.chip.active {
  background: var(--gradient-primary);
  border-color: transparent;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(var(--accent-primary-rgb), 0.3);
}

.chip.active:hover {
  box-shadow: 0 4px 16px rgba(var(--accent-primary-rgb), 0.4);
  transform: translateY(-2px);
}

.chip i {
  font-size: calc(14px * var(--ui-font-scale));
}

/* Mini chip（背景图选项） */
.chip.mini {
  flex: 0 1 auto;
  padding: 3px 10px;
  font-size: calc(11px * var(--ui-font-scale));
  border-radius: 4px;
  gap: 0;
}

.chip.mini.active {
  box-shadow: none;
}

/* ===== 滑条（行内） ===== */
.slider-inline {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.range-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: linear-gradient(90deg, var(--control-border), rgba(var(--accent-primary-rgb), 0.3));
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: background var(--transition-fast) ease;
}

.range-slider:hover {
  background: linear-gradient(90deg, rgba(var(--accent-primary-rgb), 0.2), rgba(var(--accent-primary-rgb), 0.5));
}

.range-slider.sm {
  height: 4px;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--gradient-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.3);
  transition: all var(--transition-fast) ease;
  border: 2px solid white;
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 14px rgba(var(--accent-primary-rgb), 0.5);
}

.range-slider.sm::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--gradient-primary);
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.3);
  transition: all var(--transition-fast) ease;
}

.range-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 14px rgba(var(--accent-primary-rgb), 0.5);
}

.range-slider.sm::-moz-range-thumb {
  width: 14px;
  height: 14px;
}

/* ===== Toggle Switch（开关） ===== */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--glass-border);
  border-radius: 22px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toggle-track::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-track {
  background: var(--accent-primary);
  box-shadow: 0 0 8px rgba(var(--accent-primary-rgb), 0.3);
}

.toggle-switch input:checked + .toggle-track::before {
  transform: translateX(18px);
}

.toggle-switch input:focus-visible + .toggle-track {
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.2);
}

/* ===== Segmented Control（三段式） ===== */
.seg-control {
  position: relative;
  display: inline-flex;
  background: var(--control-border);
  border-radius: 22px;
  padding: 2px;
  flex-shrink: 0;
  height: 26px;
}

.seg-control input[type='radio'] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.seg-control label {
  position: relative;
  z-index: 1;
  padding: 2px 10px;
  font-size: calc(11px * var(--ui-font-scale));
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  white-space: nowrap;
  user-select: none;
}

.seg-control input[type='radio']:checked + label {
  color: white;
  font-weight: 600;
}

.seg-indicator {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  background: var(--accent-primary);
  border-radius: 20px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 4px rgba(var(--accent-primary-rgb), 0.3);
}

/* 三段式控件 */
.seg-control:has(input[type='radio']:nth-of-type(3)) .seg-indicator {
  width: calc(33.333% - 1.33px);
}

.seg-control:has(input[type='radio']:nth-of-type(3)) input[type='radio']:nth-of-type(1):checked ~ .seg-indicator {
  transform: translateX(0);
}

.seg-control:has(input[type='radio']:nth-of-type(3)) input[type='radio']:nth-of-type(2):checked ~ .seg-indicator {
  transform: translateX(100%);
}

.seg-control:has(input[type='radio']:nth-of-type(3)) input[type='radio']:nth-of-type(3):checked ~ .seg-indicator {
  transform: translateX(200%);
}

/* 二段式控件 */
.seg-control:not(:has(input[type='radio']:nth-of-type(3))) .seg-indicator {
  width: calc(50% - 2px);
}

.seg-control:not(:has(input[type='radio']:nth-of-type(3))) input[type='radio']:nth-of-type(1):checked ~ .seg-indicator {
  transform: translateX(0);
}

.seg-control:not(:has(input[type='radio']:nth-of-type(3))) input[type='radio']:nth-of-type(2):checked ~ .seg-indicator {
  transform: translateX(100%);
}

.inline-toggle-group {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ===== 背景图 ===== */
.bg-preview-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-width: 0;
}

.bg-thumb {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  overflow: visible;
  flex-shrink: 0;
  border: 1px solid var(--glass-border);
}

.bg-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: inherit;
}

.bg-remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.85);
  color: white;
  font-size: calc(10px * var(--ui-font-scale));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  z-index: 1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

.bg-remove-btn:hover {
  background: rgba(239, 68, 68, 1);
  transform: scale(1.15);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.bg-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

/* 背景图控制行 */
.bg-ctrl-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bg-ctrl-label {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 36px;
  flex-shrink: 0;
}

.bg-ctrl-val {
  font-size: calc(11px * var(--ui-font-scale));
  color: var(--accent-primary);
  font-weight: 600;
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}

.bg-option-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 上传行 */
.bg-upload-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.upload-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.upload-btn:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.4);
  color: var(--accent-primary);
}

.upload-btn input[type='file'] {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.url-input-group {
  flex: 1;
  display: flex;
  gap: 4px;
  min-width: 0;
}

.url-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  font-size: var(--text-xs);
  font-family: var(--font-base);
  color: var(--text-primary);
  min-width: 0;
  transition: all 0.2s ease;
}

.url-input:focus {
  outline: none;
  border-color: rgba(var(--accent-primary-rgb), 0.5);
}

.url-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.url-confirm-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--gradient-primary);
  color: white;
  font-size: calc(11px * var(--ui-font-scale));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.url-confirm-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.url-confirm-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

/* ===== 辅助 API Dashboard 样式（保持不变） ===== */
.api-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dash-card {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: var(--shadow-glass);
  transition: all var(--transition-fast) ease;
}

.dash-card:hover {
  box-shadow: var(--shadow-sm);
}

.dash-card.compact {
  padding: 10px 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 10px;
}

.card-header i {
  font-size: calc(14px * var(--ui-font-scale));
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-hint-inline {
  margin-left: auto;
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.api-header-desc {
  margin: -2px 0 10px;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
}

.mode-toggle,
.toggle-group {
  display: flex;
  gap: 8px;
}

.mode-btn-horizontal,
.toggle-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  cursor: pointer;
  font-size: var(--text-xs);
  font-family: var(--font-base);
  color: var(--text-secondary);
  transition: all var(--transition-fast) var(--ease-out-expo);
}

.mode-btn-horizontal:hover,
.toggle-btn:hover {
  border-color: rgba(var(--accent-primary-rgb), 0.3);
  color: var(--text-primary);
  background: rgba(var(--accent-primary-rgb), 0.05);
}

.mode-btn-horizontal.active,
.toggle-btn.active {
  background: var(--gradient-primary);
  border-color: transparent;
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(var(--accent-primary-rgb), 0.25);
}

.config-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-row.full {
  width: 100%;
}

.config-row label {
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.config-row input,
.config-row select {
  flex: 1;
  min-height: var(--touch-target-min);
  padding: 8px 12px;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-md);
  background: var(--control-bg);
  font-size: var(--text-sm);
  font-family: var(--font-base);
  color: var(--text-primary);
  transition: all var(--motion-fast) ease;
}

.config-row input:focus,
.config-row select:focus {
  outline: none;
  border-color: rgba(var(--accent-primary-rgb), 0.5);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.1);
}

.config-row input:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.model-select {
  flex: 1 !important;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inline-icon-btn {
  width: 40px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  color: var(--text-secondary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast) ease;
  flex-shrink: 0;
}

.inline-icon-btn:hover:not(:disabled) {
  border-color: rgba(var(--accent-primary-rgb), 0.4);
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.inline-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-row-combined {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.save-btn-inline {
  flex: 1;
  margin-left: auto;
}

.api-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.api-item {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  padding: 10px;
}

.api-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.api-item-title {
  border: none;
  background: transparent;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 0;
}

.api-item-title small {
  color: var(--text-secondary);
}

.api-item-actions {
  display: flex;
  gap: 6px;
}

.api-item-body {
  margin-top: 10px;
}

.item-toggle-group {
  margin-bottom: 8px;
}

.inline-icon-btn.danger {
  color: hsl(0, 84%, 60%);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  font-family: var(--font-base);
  font-weight: 500;
  transition: all var(--transition-fast) var(--ease-out-expo);
}

.icon-btn.primary {
  flex: 1;
  background: var(--gradient-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(var(--accent-primary-rgb), 0.2);
}

.icon-btn.primary:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(var(--accent-primary-rgb), 0.35);
  transform: translateY(-1px);
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 结果提示条 */
.result-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin-top: 8px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: fadeInUp 250ms var(--ease-out-expo);
}

.result-bar.success {
  background: rgba(34, 197, 94, 0.1);
  color: hsl(142, 71%, 45%);
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.result-bar.error {
  background: rgba(239, 68, 68, 0.1);
  color: hsl(0, 84%, 60%);
  border: 1px solid rgba(239, 68, 68, 0.25);
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

/* ===== 滚动条 ===== */
.settings-panel::-webkit-scrollbar {
  width: 5px;
}

.settings-panel::-webkit-scrollbar-track {
  background: transparent;
}

.settings-panel::-webkit-scrollbar-thumb {
  background: rgba(var(--accent-primary-rgb), 0.3);
  border-radius: 3px;
}

.settings-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--accent-primary-rgb), 0.5);
}

/* ===== 移动端响应式 ===== */
@media (max-width: 768px) {
  .settings-tabs button {
    flex: 0 0 auto;
    padding: 9px 12px;
    font-size: var(--text-xs);
  }

  .declaration-tab-btn {
    width: 30px;
    height: 30px;
    padding: 4px !important;
  }

  .setting-card {
    padding: 12px;
  }

  .bg-preview-row,
  .bg-upload-row {
    flex-wrap: wrap;
  }

  .action-row-combined {
    flex-wrap: wrap;
  }

  .save-btn-inline {
    width: 100%;
    margin-left: 0;
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
}

@media (max-width: 420px) {
  /* 含 chip-group 的行：改为上下两行布局 */
  .setting-row.stacked {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }

  .setting-row.stacked .row-label {
    min-width: unset;
  }

  /* 字体按钮：窄屏下每行 3 个 */
  .setting-row.stacked .chip-group .chip {
    flex: 0 1 calc(33.333% - 4px);
    min-width: 0;
    padding: 5px 4px;
    font-size: calc(12px * var(--ui-font-scale));
  }

  /* 滑条行：标签固定宽度缩小 */
  .setting-row.slider-row .row-label {
    min-width: 56px;
    font-size: calc(12px * var(--ui-font-scale));
  }

  .setting-row.slider-row .row-value {
    min-width: 30px;
    font-size: calc(12px * var(--ui-font-scale));
  }

  /* 背景图缩略图缩小 */
  .bg-thumb {
    width: 52px;
    height: 52px;
  }

  /* API 标签页：缩小字体防止溢出 */
  .config-row input,
  .config-row select {
    font-size: calc(11px * var(--ui-font-scale));
    padding: 6px 8px;
  }

  .model-select {
    font-size: calc(11px * var(--ui-font-scale)) !important;
  }

  .card-hint-inline {
    font-size: calc(10px * var(--ui-font-scale));
  }

  .mode-btn-horizontal span,
  .toggle-btn span {
    font-size: calc(11px * var(--ui-font-scale));
  }

  .config-row label {
    width: 24px;
  }
}

/* ===== 无障碍 / 减少动画 ===== */
@media (prefers-reduced-motion: reduce) {
  .chip:hover,
  .chip.active:hover {
    transform: none;
  }

  .declaration-tab-btn:hover {
    transform: none !important;
  }

  .result-bar {
    animation: none;
  }
}
</style>
