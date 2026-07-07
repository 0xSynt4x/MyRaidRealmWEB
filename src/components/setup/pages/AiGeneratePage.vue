<template>
  <div class="ai-generate-page">
    <SetupBackButton :title="t('setup.aiGenerate.backToPresetSelect')" @click="handleBack" />

    <div class="page-header">
      <h2 class="page-title">{{ t('setup.aiGenerate.title') }}</h2>
      <p class="page-subtitle">{{ t('setup.aiGenerate.subtitle') }}</p>
    </div>

    <div class="tabs-section">
      <button
        v-for="module in moduleTabs"
        :key="module.key"
        type="button"
        class="module-tab"
        :class="{ active: activeTab === module.key }"
        @click="activeTab = module.key"
      >
        <span class="module-tab__icon">
          <i :class="module.icon"></i>
        </span>
        <span class="module-tab__content">
          <span class="module-tab__title">{{ module.title }}</span>
          <span class="module-tab__status">{{ getTabStatusLabel(module.key) }}</span>
        </span>
      </button>
    </div>

    <div class="module-workbench">
      <div class="form-section-group module-intro-card">
        <div>
          <h3 class="section-header">{{ t('setup.aiGenerate.currentPage', { title: currentTabTitle }) }}</h3>
          <p class="section-description">{{ currentTabDescription }}</p>
        </div>
        <div
          v-if="activeTab === 'final'"
          class="final-status-chip"
          :class="{ success: finalAssemblyState.complete, warning: !finalAssemblyState.complete }"
        >
          {{ getTabStatusLabel(activeTab) }}
        </div>
        <div v-else class="module-status-chip" :class="getModuleStatusClass(currentEditingModuleKey)">
          {{ getModuleStatusLabel(currentEditingModuleKey) }}
        </div>
      </div>

      <template v-if="activeTab !== 'final'">
        <div class="form-section">
          <template v-if="activeTab === 'world'">
            <div class="form-section-group">
              <h3 class="section-header">{{ t('setup.aiGenerate.section.worldInput') }}</h3>
              <div class="form-grid">
                <div class="form-field">
                  <label for="world-type">{{ t('setup.aiGenerate.field.worldType') }}</label>
                  <DropdownWithCustomInput
                    id="world-type-select"
                    v-model="formData.world.worldType"
                    custom-input-id="world-type"
                    :options="worldTypeOptions"
                    display-namespace="setup.aiGenerate.worldTypeOption"
                    :placeholder="t('setup.dropdown.placeholder')"
                    :custom-placeholder="t('setup.aiGenerate.customPlaceholder.worldType')"
                  />
                </div>

                <div class="form-field">
                  <label for="era-name">{{ t('setup.aiGenerate.field.eraName') }}</label>
                  <DropdownWithCustomInput
                    id="era-name-select"
                    v-model="formData.world.eraName"
                    custom-input-id="era-name"
                    :options="eraNameOptions"
                    display-namespace="setup.aiGenerate.eraNameOption"
                    :placeholder="t('setup.dropdown.placeholder')"
                    :custom-placeholder="t('setup.aiGenerate.customPlaceholder.eraName')"
                  />
                </div>

                <div class="form-field full-width world-rules-field">
                  <label>{{ t('setup.aiGenerate.field.worldRules', { count: rulesCount }) }}</label>
                  <WorldRulesInput v-model="formData.world.worldRules" />
                </div>

                <div class="form-field full-width">
                  <label for="world-organization-network">{{
                    t('setup.aiGenerate.field.worldOrganizationNetwork')
                  }}</label>
                  <textarea
                    id="world-organization-network"
                    v-model="formData.world.worldOrganizationNetwork"
                    rows="4"
                    :placeholder="t('setup.aiGenerate.placeholder.worldOrganizationNetwork')"
                    class="setup-field-input"
                  />
                </div>
              </div>
            </div>

            <div class="form-section-group optional-section">
              <h3
                class="section-header optional"
                role="button"
                tabindex="0"
                :aria-expanded="worldOptionalExpanded"
                aria-controls="world-optional-content"
                @click="toggleWorldOptionalSection"
                @keydown.enter="toggleWorldOptionalSection"
                @keydown.space.prevent="toggleWorldOptionalSection"
              >
                <i :class="worldOptionalExpanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
                <span>{{ t('setup.aiGenerate.section.worldOptional') }}</span>
              </h3>

              <transition name="expand">
                <div v-show="worldOptionalExpanded" id="world-optional-content" class="optional-content">
                  <div class="form-grid">
                    <div class="form-field full-width">
                      <label>{{ t('setup.aiGenerate.field.survivalMode') }}</label>
                      <SurvivalModeSelector v-model="formData.world.survivalMode" />
                    </div>
                  </div>
                </div>
              </transition>
            </div>

            <div class="form-section-group">
              <h3 class="section-header">{{ t('setup.aiGenerate.section.worldFreeform') }}</h3>
              <div class="form-field full-width">
                <label for="world-additional-requirement">{{
                  t('setup.aiGenerate.field.worldAdditionalRequirement')
                }}</label>
                <textarea
                  id="world-additional-requirement"
                  v-model="formData.world.additionalRequirement"
                  rows="6"
                  :placeholder="t('setup.aiGenerate.placeholder.worldAdditionalRequirement')"
                  class="setup-field-input"
                />
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'player'">
            <div class="form-section-group">
              <h3 class="section-header">{{ t('setup.aiGenerate.section.playerInput') }}</h3>
              <div class="form-grid">
                <div class="form-field">
                  <label for="player-name">{{
                    fieldMeta('玩家.姓名', { label: t('setup.aiGenerate.field.playerName') }).label
                  }}</label>
                  <input
                    id="player-name"
                    v-model="formData.player.playerName"
                    type="text"
                    :placeholder="
                      fieldMeta('玩家.姓名', { placeholder: t('setup.aiGenerate.placeholder.playerName') }).placeholder
                    "
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field">
                  <label for="player-age">{{
                    fieldMeta('玩家.年龄', { label: t('setup.aiGenerate.field.playerAge') }).label
                  }}</label>
                  <input
                    id="player-age"
                    v-model="formData.player.playerAge"
                    type="text"
                    :placeholder="
                      fieldMeta('玩家.年龄', { placeholder: t('setup.aiGenerate.placeholder.playerAge') }).placeholder
                    "
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field">
                  <label for="player-gender">{{ t('setup.aiGenerate.field.playerGender') }}</label>
                  <input
                    id="player-gender"
                    v-model="formData.player.playerGender"
                    type="text"
                    :placeholder="t('setup.aiGenerate.placeholder.playerGender')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field">
                  <label for="player-identity">{{ t('setup.aiGenerate.field.playerIdentity') }}</label>
                  <input
                    id="player-identity"
                    v-model="formData.player.playerIdentity"
                    type="text"
                    :placeholder="t('setup.aiGenerate.placeholder.playerIdentity')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field full-width">
                  <label for="player-goal">{{ t('setup.aiGenerate.field.playerGoal') }}</label>
                  <textarea
                    id="player-goal"
                    v-model="formData.player.playerGoal"
                    rows="3"
                    :placeholder="t('setup.aiGenerate.placeholder.playerGoal')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field full-width">
                  <label for="player-skills">{{ t('setup.aiGenerate.field.playerSkills') }}</label>
                  <textarea
                    id="player-skills"
                    v-model="formData.player.playerSkills"
                    rows="3"
                    :placeholder="t('setup.aiGenerate.placeholder.playerSkills')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field">
                  <label for="main-currency">{{
                    fieldMeta('玩家.货币资源.主货币.名称', { label: t('setup.aiGenerate.field.mainCurrency') }).label
                  }}</label>
                  <DropdownWithCustomInput
                    id="main-currency-select"
                    v-model="formData.player.mainCurrencyName"
                    custom-input-id="main-currency"
                    :options="mainCurrencyOptions"
                    display-namespace="setup.aiGenerate.currencyOption"
                    :placeholder="t('setup.dropdown.placeholder')"
                    :custom-placeholder="
                      fieldMeta('玩家.货币资源.主货币.名称', {
                        placeholder: t('setup.aiGenerate.customPlaceholder.mainCurrency'),
                      }).placeholder
                    "
                  />
                </div>

                <div class="form-field">
                  <label for="initial-funds">{{
                    fieldMeta('玩家.货币资源.主货币.数量', { label: t('setup.aiGenerate.field.initialFunds') }).label
                  }}</label>
                  <input
                    id="initial-funds"
                    v-model.number="formData.player.initialFunds"
                    type="number"
                    :placeholder="
                      fieldMeta('玩家.货币资源.主货币.数量', {
                        placeholder: t('setup.aiGenerate.placeholder.initialFunds'),
                      }).placeholder
                    "
                    min="0"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field full-width">
                  <label for="player-faction-relationship">{{
                    t('setup.aiGenerate.field.playerFactionRelationship')
                  }}</label>
                  <textarea
                    id="player-faction-relationship"
                    v-model="formData.player.factionRelationship"
                    rows="3"
                    :placeholder="t('setup.aiGenerate.placeholder.playerFactionRelationship')"
                    class="setup-field-input"
                  />
                </div>
              </div>
            </div>

            <div class="form-section-group optional-section">
              <h3
                class="section-header optional"
                role="button"
                tabindex="0"
                :aria-expanded="playerOptionalExpanded"
                aria-controls="player-optional-content"
                @click="togglePlayerOptionalSection"
                @keydown.enter="togglePlayerOptionalSection"
                @keydown.space.prevent="togglePlayerOptionalSection"
              >
                <i :class="playerOptionalExpanded ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right'"></i>
                <span>{{ t('setup.aiGenerate.section.playerOptional') }}</span>
              </h3>

              <transition name="expand">
                <div v-show="playerOptionalExpanded" id="player-optional-content" class="optional-content">
                  <div class="form-grid">
                    <div class="form-field">
                      <label for="secondary-currency-name">{{
                        t('setup.aiGenerate.field.secondaryCurrencyName')
                      }}</label>
                      <input
                        id="secondary-currency-name"
                        v-model="secondaryCurrencyName"
                        type="text"
                        :placeholder="t('setup.aiGenerate.placeholder.secondaryCurrencyName')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="form-field">
                      <label for="secondary-currency-amount">{{
                        t('setup.aiGenerate.field.secondaryCurrencyAmount')
                      }}</label>
                      <input
                        id="secondary-currency-amount"
                        v-model.number="secondaryCurrencyAmount"
                        type="number"
                        :placeholder="t('setup.aiGenerate.placeholder.secondaryCurrencyAmount')"
                        min="0"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="form-field">
                      <label for="secondary-currency-rate">{{
                        t('setup.aiGenerate.field.secondaryCurrencyRate')
                      }}</label>
                      <input
                        id="secondary-currency-rate"
                        v-model="secondaryCurrencyRate"
                        type="text"
                        :placeholder="t('setup.aiGenerate.placeholder.secondaryCurrencyRate')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="form-field">
                      <label for="secondary-currency-usage">{{
                        t('setup.aiGenerate.field.secondaryCurrencyUsage')
                      }}</label>
                      <input
                        id="secondary-currency-usage"
                        v-model="secondaryCurrencyUsage"
                        type="text"
                        :placeholder="t('setup.aiGenerate.placeholder.secondaryCurrencyUsage')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="form-field full-width">
                      <label for="player-inventory">{{ t('setup.aiGenerate.field.playerInventory') }}</label>
                      <textarea
                        id="player-inventory"
                        v-model="formData.player.inventory"
                        rows="3"
                        :placeholder="t('setup.aiGenerate.placeholder.playerInventory')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="form-field full-width">
                      <label for="player-notebook">{{ t('setup.aiGenerate.field.playerNotebook') }}</label>
                      <textarea
                        id="player-notebook"
                        v-model="formData.player.notebook"
                        rows="3"
                        :placeholder="t('setup.aiGenerate.placeholder.playerNotebook')"
                        class="setup-field-input"
                      />
                    </div>

                    <div class="form-field full-width">
                      <label for="player-business-entity">{{ t('setup.aiGenerate.field.playerBusinessEntity') }}</label>
                      <textarea
                        id="player-business-entity"
                        v-model="formData.player.businessEntity"
                        rows="4"
                        :placeholder="t('setup.aiGenerate.placeholder.playerBusinessEntity')"
                        class="setup-field-input"
                      />
                    </div>
                  </div>
                </div>
              </transition>
            </div>

            <div class="form-section-group">
              <h3 class="section-header">{{ t('setup.aiGenerate.section.playerFreeform') }}</h3>
              <div class="form-field full-width">
                <label for="player-additional-requirement">{{
                  t('setup.aiGenerate.field.playerAdditionalRequirement')
                }}</label>
                <textarea
                  id="player-additional-requirement"
                  v-model="formData.player.additionalRequirement"
                  rows="6"
                  :placeholder="t('setup.aiGenerate.placeholder.playerAdditionalRequirement')"
                  class="setup-field-input"
                />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="form-section-group">
              <h3 class="section-header">{{ t('setup.aiGenerate.section.npcInput') }}</h3>
              <div class="form-grid">
                <div class="form-field full-width">
                  <label for="important-npcs">{{ t('setup.aiGenerate.field.importantNpcs') }}</label>
                  <textarea
                    id="important-npcs"
                    v-model="formData.npc.importantNPCs"
                    rows="3"
                    :placeholder="t('setup.aiGenerate.placeholder.importantNpcs')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field">
                  <label for="npc-count-preference">{{ t('setup.aiGenerate.field.npcCountPreference') }}</label>
                  <input
                    id="npc-count-preference"
                    v-model="formData.npc.npcCountPreference"
                    type="text"
                    :placeholder="t('setup.aiGenerate.placeholder.npcCountPreference')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field">
                  <label for="npc-identity-profession">{{
                    t('setup.aiGenerate.field.npcIdentityAndProfession')
                  }}</label>
                  <input
                    id="npc-identity-profession"
                    v-model="formData.npc.identityAndProfession"
                    type="text"
                    :placeholder="t('setup.aiGenerate.placeholder.npcIdentityAndProfession')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field full-width">
                  <label for="npc-personality-status">{{ t('setup.aiGenerate.field.npcPersonalityAndStatus') }}</label>
                  <textarea
                    id="npc-personality-status"
                    v-model="formData.npc.personalityAndStatus"
                    rows="4"
                    :placeholder="t('setup.aiGenerate.placeholder.npcPersonalityAndStatus')"
                    class="setup-field-input"
                  />
                </div>

                <div class="form-field full-width">
                  <label for="npc-player-relationship">{{
                    t('setup.aiGenerate.field.npcPlayerRelationshipDirection')
                  }}</label>
                  <textarea
                    id="npc-player-relationship"
                    v-model="formData.npc.playerRelationshipDirection"
                    rows="3"
                    :placeholder="t('setup.aiGenerate.placeholder.npcPlayerRelationshipDirection')"
                    class="setup-field-input"
                  />
                </div>
              </div>
            </div>

            <div class="form-section-group">
              <h3 class="section-header">{{ t('setup.aiGenerate.section.npcFreeform') }}</h3>
              <div class="form-field full-width">
                <label for="npc-additional-requirement">{{
                  t('setup.aiGenerate.field.npcAdditionalRequirement')
                }}</label>
                <textarea
                  id="npc-additional-requirement"
                  v-model="formData.npc.additionalRequirement"
                  rows="6"
                  :placeholder="t('setup.aiGenerate.placeholder.npcAdditionalRequirement')"
                  class="setup-field-input"
                />
              </div>
            </div>
          </template>
        </div>

        <div class="result-section form-section-group">
          <div class="result-header">
            <div>
              <label class="input-label">{{
                t('setup.aiGenerate.result.editableLabel', { title: currentTabTitle })
              }}</label>
              <p class="section-description result-description">
                {{ t('setup.aiGenerate.result.editableDescription') }}
              </p>
            </div>
            <div class="result-header-actions">
              <button
                class="retry-button"
                :disabled="!canGenerateModule(currentEditingModuleKey)"
                @click="handleGenerate(currentEditingModuleKey)"
              >
                <i
                  :class="
                    currentModuleState.isGenerating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-wand-magic-sparkles'
                  "
                />
                {{
                  currentModuleState.editableResult.trim()
                    ? t('setup.aiGenerate.action.regenerate')
                    : t('setup.aiGenerate.action.generateCurrentPage')
                }}
              </button>
              <button
                class="stop-button stop-button--compact"
                :disabled="!currentModuleState.isGenerating"
                @click="handleStopGenerate(currentEditingModuleKey)"
              >
                <i class="fa-solid fa-stop" />
                {{ t('setup.aiGenerate.action.stop') }}
              </button>
            </div>
          </div>

          <div v-if="currentModuleDependencyHint" class="warning-panel">
            <div class="warning-panel__title">
              <i class="fa-solid fa-link"></i> {{ t('setup.aiGenerate.warning.generationOrder') }}
            </div>
            <p>{{ currentModuleDependencyHint }}</p>
          </div>

          <div v-if="currentModuleErrorMessages.length > 0" class="error-stack">
            <div
              v-for="message in currentModuleErrorMessages"
              :key="message"
              class="error-banner"
              role="alert"
              aria-live="polite"
            >
              <i class="fa-solid fa-triangle-exclamation" />
              <span>{{ message }}</span>
            </div>
          </div>

          <textarea
            v-model="currentModuleState.editableResult"
            class="result-editor setup-field-input"
            rows="16"
            :placeholder="getModuleResultPlaceholder(currentEditingModuleKey)"
            @input="handleModuleResultInput(currentEditingModuleKey)"
            @blur="handleModuleResultBlur(currentEditingModuleKey)"
          />
        </div>
      </template>

      <div v-else class="final-section form-section-group">
        <div class="result-header final-result-header">
          <div>
            <label class="input-label">{{ t('setup.aiGenerate.result.finalLabel') }}</label>
            <p class="section-description result-description">
              {{ t('setup.aiGenerate.result.finalDescription') }}
            </p>
          </div>
          <div
            class="final-status-chip"
            :class="{ success: finalAssemblyState.complete, warning: !finalAssemblyState.complete }"
          >
            {{ getTabStatusLabel('final') }}
          </div>
        </div>

        <div v-if="finalAssemblyState.requiredMissingModules.length > 0" class="warning-panel warning-panel--danger">
          <div class="warning-panel__title">
            <i class="fa-solid fa-circle-info"></i> {{ t('setup.aiGenerate.warning.requiredMissingTitle') }}
          </div>
          <ul>
            <li v-for="moduleName in finalAssemblyState.requiredMissingModules" :key="moduleName">
              {{ t('setup.aiGenerate.warning.requiredMissingItem', { moduleName }) }}
            </li>
          </ul>
        </div>

        <div v-if="finalAssemblyState.optionalMissingModules.length > 0" class="warning-panel">
          <div class="warning-panel__title">
            <i class="fa-solid fa-circle-info"></i> {{ t('setup.aiGenerate.warning.optionalMissingTitle') }}
          </div>
          <ul>
            <li v-for="moduleName in finalAssemblyState.optionalMissingModules" :key="moduleName">
              {{ t('setup.aiGenerate.warning.optionalMissingItem', { moduleName }) }}
            </li>
          </ul>
        </div>

        <div v-if="finalAssemblyState.invalidModules.length > 0" class="warning-panel warning-panel--danger">
          <div class="warning-panel__title">
            <i class="fa-solid fa-triangle-exclamation"></i> {{ t('setup.aiGenerate.warning.invalidModulesTitle') }}
          </div>
          <ul>
            <li v-for="message in finalAssemblyState.invalidModules" :key="message">{{ message }}</li>
          </ul>
        </div>

        <div v-if="finalAssemblyState.validationError" class="warning-panel warning-panel--danger">
          <div class="warning-panel__title">
            <i class="fa-solid fa-shield-halved"></i> {{ t('setup.aiGenerate.warning.finalValidationFailed') }}
          </div>
          <p>{{ finalAssemblyState.validationError }}</p>
          <ul v-if="finalValidationHints.length > 0" class="validation-hints-list">
            <li v-for="hint in finalValidationHints" :key="hint">{{ hint }}</li>
          </ul>
        </div>

        <div class="form-section-group">
          <h3 class="section-header">{{ t('setup.aiGenerate.section.localContentEntries') }}</h3>
          <p class="section-description">{{ t('setup.aiGenerate.localContentEntriesHelp') }}</p>
          <div class="optional-content">
            <WorldbookEntriesInput v-model="formData.localContentEntries" />
          </div>
        </div>

        <textarea
          :value="finalAssemblyState.previewText"
          class="result-editor result-editor--final setup-field-input"
          rows="18"
          readonly
          :placeholder="finalResultPlaceholder"
        />

        <div class="apply-row">
          <button class="download-button" :disabled="isResultActionDisabled" @click="handleDownload">
            <i class="fa-solid fa-download" />
            {{ t('setup.aiGenerate.action.downloadPreset') }}
          </button>
          <button class="apply-button" :disabled="isResultActionDisabled" @click="handleApply">
            <i class="fa-solid fa-check" />
            {{ t('setup.aiGenerate.action.applyAndSend') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Schema } from '../../../../schema/schema';
import { useI18n } from '../../../i18n';
import { useSettingsStore } from '../../../stores/settings';
import { useSetupStore } from '../../../stores/setup';
import { useStatDataStore } from '../../../stores/statData';
import { cancelStandaloneMainApiRequest, requestStandaloneMainApiText } from '../../../utils/standaloneMainApi';
import DropdownWithCustomInput from './components/DropdownWithCustomInput.vue';
import SetupBackButton from './components/SetupBackButton.vue';
import SurvivalModeSelector from './components/SurvivalModeSelector.vue';
import WorldRulesInput from './components/WorldRulesInput.vue';
import WorldbookEntriesInput from './components/WorldbookEntriesInput.vue';
import type { AiGenerateFormData, AiGenerateModuleKey, LocalContentEntryInput } from './types/formData';
import {
  defaultFormData,
  defaultNpcModuleFormData,
  defaultPlayerModuleFormData,
  defaultWorldModuleFormData,
} from './types/formData';
import { META_COMMAND_PREFIX, getGeneratorTemplate } from './utils/generatorTemplate';
import { getModuleRulePrompt } from './utils/moduleRulePrompt';
import { buildPromptFromFormData, getMissingFieldSupplement, getModuleTitle } from './utils/promptBuilder';

const emit = defineEmits<{
  apply: [];
}>();

const setupStore = useSetupStore();
const settingsStore = useSettingsStore();
const statDataStore = useStatDataStore();
const { t, fieldMeta } = useI18n();

type AiGenerateTabKey = AiGenerateModuleKey | 'final';

const moduleKeys: AiGenerateModuleKey[] = ['world', 'player', 'npc'];

const moduleTabs = computed<Array<{ key: AiGenerateTabKey; title: string; icon: string; description: string }>>(() => [
  {
    key: 'world',
    title: t('setup.aiGenerate.tab.worldTitle'),
    icon: 'fa-solid fa-earth-asia',
    description: t('setup.aiGenerate.tab.worldDescription'),
  },
  {
    key: 'player',
    title: t('setup.aiGenerate.tab.playerTitle'),
    icon: 'fa-solid fa-id-card',
    description: t('setup.aiGenerate.tab.playerDescription'),
  },
  {
    key: 'npc',
    title: t('setup.aiGenerate.tab.npcTitle'),
    icon: 'fa-solid fa-user-group',
    description: t('setup.aiGenerate.tab.npcDescription'),
  },
  {
    key: 'final',
    title: t('setup.aiGenerate.tab.finalTitle'),
    icon: 'fa-solid fa-file-circle-check',
    description: t('setup.aiGenerate.tab.finalDescription'),
  },
]);

const worldTypeOptions = ['真实世界', '奇幻世界', '修仙世界', '科幻世界', '历史世界'];
const eraNameOptions = ['公元', '灵历', '星历', '第四纪元'];
const mainCurrencyOptions = ['人民币', '金币', '灵石', '星币'];

const activeTab = ref<AiGenerateTabKey>('world');
const worldOptionalExpanded = ref(false);
const playerOptionalExpanded = ref(false);

const formData = ref<AiGenerateFormData>({
  ...defaultFormData,
  world: {
    ...defaultWorldModuleFormData,
    survivalMode: statDataStore.data.设置?.生存系统模式 ?? defaultWorldModuleFormData.survivalMode,
  },
  player: { ...defaultPlayerModuleFormData },
  npc: { ...defaultNpcModuleFormData },
  localContentEntries: [],
});

const secondaryCurrencyName = ref('');
const secondaryCurrencyAmount = ref<number | null>(null);
const secondaryCurrencyRate = ref('');
const secondaryCurrencyUsage = ref('');

watch(
  [secondaryCurrencyName, secondaryCurrencyAmount, secondaryCurrencyRate, secondaryCurrencyUsage],
  ([name, amount, rate, usage]) => {
    if (name || amount !== null || rate || usage) {
      formData.value.player.secondaryCurrency = {
        name: name || '',
        amount,
        exchangeRate: rate || '',
        usage: usage || '',
      };
    } else {
      formData.value.player.secondaryCurrency = null;
    }
  },
);

watch(
  () => statDataStore.data.设置?.生存系统模式,
  mode => {
    if (mode && formData.value.world.survivalMode !== mode) {
      formData.value.world.survivalMode = mode;
    }
  },
  { immediate: true },
);

watch(
  () => formData.value.world.survivalMode,
  mode => {
    if (setupStore.config.设置.生存系统模式 !== mode) {
      setupStore.config.设置.生存系统模式 = mode;
    }
  },
  { immediate: true },
);

type ModuleState = {
  result: string;
  editableResult: string;
  error: string;
  isGenerating: boolean;
  generationId: string;
  stopRequested: boolean;
};

const moduleStates = reactive<Record<AiGenerateModuleKey, ModuleState>>({
  world: createEmptyModuleState(),
  player: createEmptyModuleState(),
  npc: createEmptyModuleState(),
});

const currentEditingModuleKey = computed<AiGenerateModuleKey>(() =>
  activeTab.value === 'final' ? 'world' : activeTab.value,
);
const currentModuleState = computed(() => moduleStates[currentEditingModuleKey.value]);
const currentTabTitle = computed(() => moduleTabs.value.find(module => module.key === activeTab.value)?.title ?? '');
const currentTabDescription = computed(
  () => moduleTabs.value.find(module => module.key === activeTab.value)?.description ?? '',
);
const rulesCount = computed(() => formData.value.world.worldRules.filter(rule => rule.trim() !== '').length);
const isAnyModuleGenerating = computed(() => moduleKeys.some(moduleKey => moduleStates[moduleKey].isGenerating));

type ModuleResolvedResult = {
  status: 'ready' | 'missing' | 'invalid';
  normalizedText: string;
  message: string;
};

type ModuleDependencyState = {
  ready: boolean;
  reason: string;
  contextPrompt: string;
};

const currentModuleDependencyHint = computed(() => {
  if (activeTab.value === 'final') {
    return '';
  }

  const dependencyState = getModuleDependencyState(currentEditingModuleKey.value);
  return dependencyState.ready ? '' : dependencyState.reason;
});

const currentModuleErrorMessages = computed(() => {
  const runtimeError = currentModuleState.value.error.trim();
  return runtimeError ? [runtimeError, ...getFriendlyValidationHints(runtimeError)] : [];
});

const finalAssemblyState = computed(() => assembleFinalPreset());
const finalResultPlaceholder = computed(() => t('setup.aiGenerate.result.finalPlaceholder'));
const isResultActionDisabled = computed(() => isAnyModuleGenerating.value || !finalAssemblyState.value.complete);
const finalValidationHints = computed(() => getFriendlyValidationHints(finalAssemblyState.value.validationError));

watch(
  finalAssemblyState,
  state => {
    setupStore.setAiGeneratedConfig(state.complete ? state.previewText : '');
  },
  { immediate: true },
);

function createEmptyModuleState(): ModuleState {
  return {
    result: '',
    editableResult: '',
    error: '',
    isGenerating: false,
    generationId: '',
    stopRequested: false,
  };
}

function toggleWorldOptionalSection() {
  worldOptionalExpanded.value = !worldOptionalExpanded.value;
}

function togglePlayerOptionalSection() {
  playerOptionalExpanded.value = !playerOptionalExpanded.value;
}

function getModuleDependencies(moduleKey: AiGenerateModuleKey): AiGenerateModuleKey[] {
  switch (moduleKey) {
    case 'world':
      return [];
    case 'player':
      return ['world'];
    case 'npc':
      return ['world', 'player'];
  }
}

function resolveModuleResult(moduleKey: AiGenerateModuleKey): ModuleResolvedResult {
  const raw = moduleStates[moduleKey].editableResult.trim();
  if (!raw) {
    return {
      status: 'missing',
      normalizedText: '',
      message: t('setup.aiGenerate.message.moduleResultMissing', { title: getModuleTitle(moduleKey) }),
    };
  }

  try {
    const payload = parseModulePayload(moduleKey, raw);
    return {
      status: 'ready',
      normalizedText: JSON.stringify(payload, null, 2),
      message: '',
    };
  } catch (error) {
    return {
      status: 'invalid',
      normalizedText: '',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildDependencyReason(
  moduleKey: AiGenerateModuleKey,
  dependencyKey: AiGenerateModuleKey,
  status: 'missing' | 'invalid',
): string {
  if (moduleKey === 'player') {
    return status === 'missing'
      ? t('setup.aiGenerate.dependency.playerNeedsWorldMissing')
      : t('setup.aiGenerate.dependency.playerNeedsWorldInvalid');
  }

  if (dependencyKey === 'world') {
    return status === 'missing'
      ? t('setup.aiGenerate.dependency.npcNeedsWorldMissing')
      : t('setup.aiGenerate.dependency.npcNeedsWorldInvalid');
  }

  return status === 'missing'
    ? t('setup.aiGenerate.dependency.npcNeedsPlayerMissing')
    : t('setup.aiGenerate.dependency.npcNeedsPlayerInvalid');
}

function getModuleDependencyState(moduleKey: AiGenerateModuleKey): ModuleDependencyState {
  const dependencies = getModuleDependencies(moduleKey);
  if (dependencies.length === 0) {
    return {
      ready: true,
      reason: '',
      contextPrompt: '',
    };
  }

  const contextBlocks: string[] = [];

  for (const dependencyKey of dependencies) {
    const resolved = resolveModuleResult(dependencyKey);
    if (resolved.status !== 'ready') {
      return {
        ready: false,
        reason: buildDependencyReason(moduleKey, dependencyKey, resolved.status),
        contextPrompt: '',
      };
    }

    contextBlocks.push(`## ${t('setup.aiGenerate.prompt.completedDependency', { title: getModuleTitle(dependencyKey) })}
${t('setup.aiGenerate.prompt.completedDependencyBody')}

\`\`\`json
${resolved.normalizedText}
\`\`\``);
  }

  return {
    ready: true,
    reason: '',
    contextPrompt: contextBlocks.join('\n\n'),
  };
}

function getModuleResultPlaceholder(moduleKey: AiGenerateModuleKey): string {
  switch (moduleKey) {
    case 'world':
      return t('setup.aiGenerate.result.worldPlaceholder');
    case 'player':
      return t('setup.aiGenerate.result.playerPlaceholder');
    case 'npc':
      return t('setup.aiGenerate.result.npcPlaceholder');
  }
}

function getModuleStatusLabel(moduleKey: AiGenerateModuleKey): string {
  const state = moduleStates[moduleKey];
  const dependencyState = getModuleDependencyState(moduleKey);

  if (state.isGenerating) {
    return t('setup.aiGenerate.status.generating');
  }

  if (state.error.trim()) {
    return t('setup.aiGenerate.status.issue');
  }

  if (state.result.trim()) {
    return t('setup.aiGenerate.status.generated');
  }

  if (!dependencyState.ready) {
    return t('setup.aiGenerate.status.waitingDependency');
  }

  return t('setup.aiGenerate.status.notGenerated');
}

function getTabStatusLabel(tabKey: AiGenerateTabKey): string {
  if (tabKey === 'final') {
    if (finalAssemblyState.value.complete) {
      return t('setup.aiGenerate.status.applicable');
    }

    if (finalAssemblyState.value.invalidModules.length > 0 || finalAssemblyState.value.validationError) {
      return t('setup.aiGenerate.status.needsReview');
    }

    return t('setup.aiGenerate.status.incomplete');
  }

  return getModuleStatusLabel(tabKey);
}

function getModuleStatusClass(moduleKey: AiGenerateModuleKey) {
  const state = moduleStates[moduleKey];
  const dependencyState = getModuleDependencyState(moduleKey);
  return {
    pending: !state.isGenerating && !state.result.trim() && !state.error.trim() && dependencyState.ready,
    waiting: !state.isGenerating && !state.result.trim() && !state.error.trim() && !dependencyState.ready,
    generating: state.isGenerating,
    success: !state.isGenerating && !!state.result.trim() && !state.error.trim(),
    danger: !!state.error.trim(),
  };
}

function canGenerateModule(moduleKey: AiGenerateModuleKey): boolean {
  if (moduleStates[moduleKey].isGenerating) {
    return false;
  }

  if (isAnyModuleGenerating.value) {
    return false;
  }

  return getModuleDependencyState(moduleKey).ready;
}

function handleModuleResultInput(moduleKey: AiGenerateModuleKey) {
  moduleStates[moduleKey].error = '';
}

function handleModuleResultBlur(moduleKey: AiGenerateModuleKey) {
  const moduleState = moduleStates[moduleKey];
  const raw = moduleState.editableResult.trim();

  if (!raw) {
    moduleState.result = '';
    moduleState.editableResult = '';
    moduleState.error = '';
    return;
  }

  try {
    const payload = parseModulePayload(moduleKey, raw);
    moduleState.result = JSON.stringify(payload, null, 2);
    moduleState.editableResult = moduleState.result;
    moduleState.error = '';
  } catch (error) {
    moduleState.error = error instanceof Error ? error.message : String(error);
  }
}

async function handleGenerate(moduleKey: AiGenerateModuleKey) {
  if (!canGenerateModule(moduleKey)) {
    const dependencyState = getModuleDependencyState(moduleKey);
    if (!dependencyState.ready) {
      moduleStates[moduleKey].error = dependencyState.reason;
      toastr.warning(dependencyState.reason);
    }
    return;
  }

  const moduleState = moduleStates[moduleKey];
  const dependencyState = getModuleDependencyState(moduleKey);
  if (!dependencyState.ready) {
    moduleState.error = dependencyState.reason;
    toastr.warning(dependencyState.reason);
    return;
  }

  const prompt = `${META_COMMAND_PREFIX}${getGeneratorTemplate(moduleKey)}

${getModuleRulePrompt(moduleKey)}

${
  dependencyState.contextPrompt
    ? `${dependencyState.contextPrompt}

`
    : ''
}## ${t('setup.aiGenerate.prompt.userRequirementTitle')}
${buildPromptFromFormData(moduleKey, formData.value)}

${getMissingFieldSupplement(moduleKey)}

${t('setup.aiGenerate.prompt.outputInstruction')}`;

  moduleState.isGenerating = true;
  moduleState.error = '';
  moduleState.stopRequested = false;
  const currentGenerationId = `ai-generate-${moduleKey}-${Date.now()}`;
  moduleState.generationId = currentGenerationId;

  try {
    const result = await requestStandaloneMainApiText({
      api: settingsStore.mainApi,
      requestId: currentGenerationId,
      prompt: buildStandaloneAiGeneratePrompt(moduleKey, prompt),
    });

    if (moduleState.generationId !== currentGenerationId || moduleState.stopRequested) {
      return;
    }

    ensureResponseOnlyContainsJson(result, moduleKey);
    const jsonContent = extractJsonFromResponse(result);
    if (!jsonContent.trim()) {
      moduleState.error = t('setup.aiGenerate.message.moduleReturnedEmpty', { title: getModuleTitle(moduleKey) });
      return;
    }

    const parsedPayload = parseModulePayload(moduleKey, jsonContent);
    const normalizedResult = JSON.stringify(parsedPayload, null, 2);
    moduleState.result = normalizedResult;
    moduleState.editableResult = normalizedResult;
    moduleState.error = '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (moduleState.stopRequested || /aborted|cancel|stopped/i.test(message)) {
      moduleState.error = t('setup.aiGenerate.message.moduleGenerationStopped', { title: getModuleTitle(moduleKey) });
      return;
    }

    console.error('[AiGenerate] 页面生成失败:', moduleKey, error);
    moduleState.error = t('setup.aiGenerate.message.moduleGenerationFailed', {
      title: getModuleTitle(moduleKey),
      message,
    });
    toastr.error(t('setup.aiGenerate.message.moduleGenerationFailed', { title: getModuleTitle(moduleKey), message }));
  } finally {
    moduleState.isGenerating = false;
    moduleState.generationId = '';
    moduleState.stopRequested = false;
  }
}

function handleStopGenerate(moduleKey: AiGenerateModuleKey) {
  const moduleState = moduleStates[moduleKey];
  if (!moduleState.isGenerating) {
    return;
  }

  moduleState.stopRequested = true;
  cancelStandaloneMainApiRequest(moduleState.generationId || undefined);
}

function buildStandaloneAiGeneratePrompt(moduleKey: AiGenerateModuleKey, userPrompt: string) {
  return {
    systemPrompt: [
      '你是《诸界穿越模拟器》开局配置生成器。',
      '',
      '你的唯一任务：根据用户提供的要求，只返回当前页面负责的 JSON 结果。',
      '',
      '硬性规则：',
      '1. 你只能输出当前页面负责的 JSON，绝对不能输出完整开局。',
      '2. 你只能返回一个 JSON 代码块，或直接返回纯 JSON 本体。前后不能有标题、解释、总结、备注。',
      '3. JSON 必须能直接被 JSON.parse 解析。只能使用双引号，不能有注释、尾逗号、undefined、NaN。',
      '4. 不允许输出任何当前页面边界之外的字段。',
      '5. 不允许输出内部维护字段或运行时字段，尤其不能输出以下划线或 $ 开头的字段。',
      '6. 如果信息不足，可以在当前页面允许范围内保守补全，但结构必须正确。',
      '7. 输出前自检：没有代码块外文字，没有解释文字，只有一个合法 JSON 结果。',
      '',
      `当前页面：${getModuleTitle(moduleKey)}`,
    ].join('\n'),
    userPrompt,
  };
}

function extractJsonFromResponse(response: string): string {
  const jsonMatch = response.match(/```(?:json|jsonc)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    let content = jsonMatch[1].trim();
    content = content.replace(/^\s*\/\/.*$/gm, '').trim();
    const firstBraceIndex = content.indexOf('{');
    if (firstBraceIndex > 0) {
      content = content.substring(firstBraceIndex);
    }
    return content;
  }

  const firstBraceIndex = response.indexOf('{');
  const lastBraceIndex = response.lastIndexOf('}');
  if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
    return response.substring(firstBraceIndex, lastBraceIndex + 1).trim();
  }

  return response.trim();
}

function ensureResponseOnlyContainsJson(response: string, moduleKey: AiGenerateModuleKey) {
  const trimmed = response.trim();
  if (!trimmed) {
    return;
  }

  if (/^```json\s*[\s\S]*?\s*```$/i.test(trimmed)) {
    return;
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return;
  }

  if (trimmed.includes('```')) {
    throw new Error(
      `${getModuleTitle(moduleKey)}页面返回格式不符合要求：必须只输出一个 JSON 代码块，代码块前后不能再写解释文字。`,
    );
  }

  throw new Error(
    `${getModuleTitle(moduleKey)}页面返回格式不符合要求：必须只返回 JSON，不能夹带标题、说明、总结或其他正文。`,
  );
}

function translateJsonParseError(moduleKey: AiGenerateModuleKey, error: unknown): string {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const title = getModuleTitle(moduleKey);

  if (/Expected property name or '}'/i.test(rawMessage)) {
    return `${title}页面结果不是合法 JSON：对象里的字段写法有问题，常见原因是最后一项后面多了逗号，或字段名没有用双引号包住。原始提示：${rawMessage}`;
  }

  if (/Expected ',' or ']'/i.test(rawMessage)) {
    return `${title}页面结果不是合法 JSON：数组里的标点写错了，常见原因是少了逗号、少了右方括号，或把说明文字混进数组里。原始提示：${rawMessage}`;
  }

  if (/Unexpected token/i.test(rawMessage)) {
    return `${title}页面结果不是合法 JSON：检测到非法字符或多余内容，常见原因是用了中文引号、单引号、注释、尾逗号，或在 JSON 外又写了解释文字。原始提示：${rawMessage}`;
  }

  if (/Unexpected end of JSON input/i.test(rawMessage)) {
    return `${title}页面结果不是合法 JSON：内容提前断掉了，通常是少了右大括号、右方括号，或生成中途停止。原始提示：${rawMessage}`;
  }

  return `${title}页面结果不是合法 JSON：${rawMessage}`;
}

function parseModulePayload(moduleKey: AiGenerateModuleKey, rawContent: string): Record<string, any> {
  let payload: unknown;

  try {
    payload = JSON.parse(rawContent);
  } catch (error) {
    throw new Error(translateJsonParseError(moduleKey, error));
  }

  if (!isPlainObject(payload)) {
    throw new Error(`${getModuleTitle(moduleKey)}页面结果必须是 JSON 对象。`);
  }

  validateModuleBoundary(moduleKey, payload);
  validateModuleSchema(moduleKey, payload);
  return payload;
}

function validateModuleBoundary(moduleKey: AiGenerateModuleKey, payload: Record<string, any>) {
  switch (moduleKey) {
    case 'world':
      validateWorldPayload(payload);
      return;
    case 'player':
      validatePlayerPayload(payload);
      return;
    case 'npc':
      validateNpcPayload(payload);
      return;
  }
}

function validateWorldPayload(payload: Record<string, any>) {
  assertNoInternalFields(payload, '世界页面');

  const allowedTopKeys = new Set(['设置', '世界']);
  assertAllowedKeys(payload, allowedTopKeys, '世界页面');

  if (!payload.设置 && !payload.世界) {
    throw new Error('世界页面至少要包含 设置 或 世界 其中之一。');
  }

  if (payload.设置) {
    ensurePlainObject(payload.设置, '世界页面中的 设置');
    assertAllowedKeys(payload.设置, new Set(['生存系统模式']), '世界页面中的 设置');
  }

  if (payload.世界) {
    ensurePlainObject(payload.世界, '世界页面中的 世界');
    assertAllowedKeys(
      payload.世界,
      new Set([
        '时间系统',
        '空间定位',
        '社会环境',
        '力量体系',
        '玩法侧重',
        '运行规则',
        '叙事玩法',
        '信息层级',
        '势力网络',
      ]),
      '世界页面中的 世界',
    );

    if (payload.世界.时间系统 !== undefined) {
      ensurePlainObject(payload.世界.时间系统, '世界页面中的 世界.时间系统');
      assertAllowedKeys(
        payload.世界.时间系统,
        new Set(['当前时间', '纪元名称', '当前天气']),
        '世界页面中的 世界.时间系统',
      );
    }

    if (payload.世界.空间定位 !== undefined) {
      ensurePlainObject(payload.世界.空间定位, '世界页面中的 世界.空间定位');
      assertAllowedKeys(payload.世界.空间定位, new Set(['当前位置', '区域特征']), '世界页面中的 世界.空间定位');
    }

    if (payload.世界.社会环境 !== undefined) {
      ensurePlainObject(payload.世界.社会环境, '世界页面中的 世界.社会环境');
      assertAllowedKeys(
        payload.世界.社会环境,
        new Set(['权力结构', '社会氛围', '主流价值观']),
        '世界页面中的 世界.社会环境',
      );
    }

    if (payload.世界.运行规则 !== undefined) {
      assertStringArray(payload.世界.运行规则, '世界页面中的 世界.运行规则');
    }

    if (payload.世界.信息层级 !== undefined) {
      ensurePlainObject(payload.世界.信息层级, '世界页面中的 世界.信息层级');
      assertAllowedKeys(
        payload.世界.信息层级,
        new Set(['全局重大事件', '势力动态', '区域事件', '本地消息', '圈内传闻']),
        '世界页面中的 世界.信息层级',
      );
      Object.entries(payload.世界.信息层级).forEach(([key, value]) => {
        if (typeof value !== 'string') {
          throw new Error(`世界页面中的 世界.信息层级.${key}必须是字符串。`);
        }
      });
    }

    if (payload.世界.势力网络 !== undefined) {
      assertRecordOfObjects(payload.世界.势力网络, '世界页面中的 世界.势力网络');
      Object.entries(payload.世界.势力网络).forEach(([forceName, forceValue]) => {
        assertAllowedKeys(forceValue, new Set(['影响力', '人数', '关系']), `世界页面中的 世界.势力网络.${forceName}`);
        if (forceValue.关系 !== undefined) {
          assertRecordOfObjects(forceValue.关系, `世界页面中的 世界.势力网络.${forceName}.关系`);
          Object.entries(forceValue.关系).forEach(([targetForce, relationValue]) => {
            assertAllowedKeys(
              relationValue,
              new Set(['关系值', '关系描述']),
              `世界页面中的 世界.势力网络.${forceName}.关系.${targetForce}`,
            );
          });
        }
      });
    }
  }
}

function validatePlayerPayload(payload: Record<string, any>) {
  assertNoInternalFields(payload, '玩家页面');

  const allowedTopKeys = new Set(['玩家']);
  assertAllowedKeys(payload, allowedTopKeys, '玩家页面');

  if (!payload.玩家) {
    throw new Error('玩家页面必须包含 玩家。');
  }

  ensurePlainObject(payload.玩家, '玩家页面中的 玩家');
  assertAllowedKeys(
    payload.玩家,
    new Set([
      '姓名',
      '年龄',
      '性别',
      '身份信息',
      '当前目标',
      '技能系统',
      '势力关系',
      '货币资源',
      '物品栏',
      '经营实体',
      '记事本',
    ]),
    '玩家页面中的 玩家',
  );

  if (payload.玩家.身份信息 !== undefined) {
    ensurePlainObject(payload.玩家.身份信息, '玩家页面中的 玩家.身份信息');
    assertAllowedKeys(
      payload.玩家.身份信息,
      new Set(['职业', '阶层', '所属组织', '特殊身份', '背景信息']),
      '玩家页面中的 玩家.身份信息',
    );
  }

  if (payload.玩家.技能系统 !== undefined) {
    assertRecordOfObjects(payload.玩家.技能系统, '玩家页面中的 玩家.技能系统');
    Object.entries(payload.玩家.技能系统).forEach(([skillName, skillValue]) => {
      assertAllowedKeys(skillValue, new Set(['品质', '描述', '类型']), `玩家页面中的 玩家.技能系统.${skillName}`);
    });
  }

  if (payload.玩家.势力关系 !== undefined) {
    assertRecordOfObjects(payload.玩家.势力关系, '玩家页面中的 玩家.势力关系');
    Object.entries(payload.玩家.势力关系).forEach(([forceName, forceValue]) => {
      assertAllowedKeys(
        forceValue,
        new Set(['声望值', '声望等级', '关系状态', '头衔列表', '近期互动']),
        `玩家页面中的 玩家.势力关系.${forceName}`,
      );
      if (forceValue.头衔列表 !== undefined) {
        assertStringArray(forceValue.头衔列表, `玩家页面中的 玩家.势力关系.${forceName}.头衔列表`);
      }
    });
  }

  if (payload.玩家.货币资源 !== undefined) {
    ensurePlainObject(payload.玩家.货币资源, '玩家页面中的 玩家.货币资源');
    assertAllowedKeys(payload.玩家.货币资源, new Set(['主货币', '次级货币']), '玩家页面中的 玩家.货币资源');

    if (payload.玩家.货币资源.主货币 !== undefined) {
      ensurePlainObject(payload.玩家.货币资源.主货币, '玩家页面中的 玩家.货币资源.主货币');
      assertAllowedKeys(payload.玩家.货币资源.主货币, new Set(['名称', '数量']), '玩家页面中的 玩家.货币资源.主货币');
    }

    if (payload.玩家.货币资源.次级货币 !== undefined) {
      assertRecordOfObjects(payload.玩家.货币资源.次级货币, '玩家页面中的 玩家.货币资源.次级货币');
      Object.entries(payload.玩家.货币资源.次级货币).forEach(([currencyName, currencyValue]) => {
        assertAllowedKeys(
          currencyValue,
          new Set(['数量', '兑换比例', '用途说明']),
          `玩家页面中的 玩家.货币资源.次级货币.${currencyName}`,
        );
      });
    }
  }

  if (payload.玩家.物品栏 !== undefined) {
    assertRecordOfObjects(payload.玩家.物品栏, '玩家页面中的 玩家.物品栏');
    Object.entries(payload.玩家.物品栏).forEach(([itemName, itemValue]) => {
      if (itemName.includes('.')) {
        throw new Error(`玩家页面中的 玩家.物品栏 出现非法物品名：${itemName}。物品名不能包含英文句点“.”。`);
      }
      assertAllowedKeys(
        itemValue,
        new Set(['数量', '类型', '品质', '有效期', '特殊属性', '备注']),
        `玩家页面中的 玩家.物品栏.${itemName}`,
      );
    });
  }

  if (payload.玩家.经营实体 !== undefined) {
    assertRecordOfObjects(payload.玩家.经营实体, '玩家页面中的 玩家.经营实体');
    Object.entries(payload.玩家.经营实体).forEach(([entityName, entityValue]) => {
      assertAllowedKeys(
        entityValue,
        new Set(['类型', '位置', '外观', '财务', '运营', '市场', '重要设施', '当前问题', '发展潜力', '备注']),
        `玩家页面中的 玩家.经营实体.${entityName}`,
      );

      if (entityValue.财务 !== undefined) {
        ensurePlainObject(entityValue.财务, `玩家页面中的 玩家.经营实体.${entityName}.财务`);
        assertAllowedKeys(
          entityValue.财务,
          new Set(['收入', '支出', '资产价值', '负债']),
          `玩家页面中的 玩家.经营实体.${entityName}.财务`,
        );
      }

      if (entityValue.运营 !== undefined) {
        ensurePlainObject(entityValue.运营, `玩家页面中的 玩家.经营实体.${entityName}.运营`);
        assertAllowedKeys(
          entityValue.运营,
          new Set(['运营状态', '人员数量']),
          `玩家页面中的 玩家.经营实体.${entityName}.运营`,
        );
      }

      if (entityValue.市场 !== undefined) {
        ensurePlainObject(entityValue.市场, `玩家页面中的 玩家.经营实体.${entityName}.市场`);
        assertAllowedKeys(
          entityValue.市场,
          new Set(['客户群体', '竞争态势', '特色优势']),
          `玩家页面中的 玩家.经营实体.${entityName}.市场`,
        );
      }

      if (entityValue.重要设施 !== undefined) {
        assertStringArray(entityValue.重要设施, `玩家页面中的 玩家.经营实体.${entityName}.重要设施`);
      }
    });
  }

  if (payload.玩家.记事本 !== undefined) {
    ensurePlainObject(payload.玩家.记事本, '玩家页面中的 玩家.记事本');
    assertAllowedKeys(payload.玩家.记事本, new Set(['潜在危机', '当前机遇', '待办事项']), '玩家页面中的 玩家.记事本');

    if (payload.玩家.记事本.潜在危机 !== undefined) {
      assertRecordOfObjects(payload.玩家.记事本.潜在危机, '玩家页面中的 玩家.记事本.潜在危机');
      Object.entries(payload.玩家.记事本.潜在危机).forEach(([entryName, entryValue]) => {
        assertAllowedKeys(
          entryValue,
          new Set(['严重程度', '预计影响时间', '应对措施']),
          `玩家页面中的 玩家.记事本.潜在危机.${entryName}`,
        );
      });
    }

    if (payload.玩家.记事本.当前机遇 !== undefined) {
      assertRecordOfObjects(payload.玩家.记事本.当前机遇, '玩家页面中的 玩家.记事本.当前机遇');
      Object.entries(payload.玩家.记事本.当前机遇).forEach(([entryName, entryValue]) => {
        assertAllowedKeys(
          entryValue,
          new Set(['时效性', '所需资源', '行动计划']),
          `玩家页面中的 玩家.记事本.当前机遇.${entryName}`,
        );
      });
    }

    if (payload.玩家.记事本.待办事项 !== undefined) {
      assertRecordOfObjects(payload.玩家.记事本.待办事项, '玩家页面中的 玩家.记事本.待办事项');
      Object.entries(payload.玩家.记事本.待办事项).forEach(([entryName, entryValue]) => {
        assertAllowedKeys(
          entryValue,
          new Set(['优先级', '截止时间', '状态']),
          `玩家页面中的 玩家.记事本.待办事项.${entryName}`,
        );
      });
    }
  }
}

function validateNpcPayload(payload: Record<string, any>) {
  assertNoInternalFields(payload, '人物档案页面');

  const allowedTopKeys = new Set(['人物档案']);
  assertAllowedKeys(payload, allowedTopKeys, '人物档案页面');

  if (!payload.人物档案) {
    throw new Error('人物档案页面必须包含 人物档案。');
  }

  ensurePlainObject(payload.人物档案, '人物档案页面中的 人物档案');
  assertSequentialNpcKeys(payload.人物档案, '人物档案页面中的 人物档案');

  Object.entries(payload.人物档案).forEach(([npcKey, npcValue]) => {
    ensurePlainObject(npcValue, `人物档案页面中的 人物档案.${npcKey}`);
    assertAllowedKeys(
      npcValue,
      new Set([
        '姓名',
        '种族',
        '性别',
        '年龄',
        '生存状态',
        '社会身份',
        '关系数据',
        '个人信息',
        '交互记忆',
        '重要NPC',
        '婚姻状态',
        '联系方式',
        '近期事件',
        '重要经历',
      ]),
      `人物档案页面中的 人物档案.${npcKey}`,
    );

    if (npcValue.生存状态 !== undefined) {
      ensurePlainObject(npcValue.生存状态, `人物档案页面中的 人物档案.${npcKey}.生存状态`);
      assertAllowedKeys(
        npcValue.生存状态,
        new Set(['血量', '体力值', '饥饿值', '口渴值']),
        `人物档案页面中的 人物档案.${npcKey}.生存状态`,
      );
    }

    if (npcValue.社会身份 !== undefined) {
      ensurePlainObject(npcValue.社会身份, `人物档案页面中的 人物档案.${npcKey}.社会身份`);
      assertAllowedKeys(
        npcValue.社会身份,
        new Set(['职业', '所属势力', '社会地位']),
        `人物档案页面中的 人物档案.${npcKey}.社会身份`,
      );
    }

    if (npcValue.关系数据 !== undefined) {
      ensurePlainObject(npcValue.关系数据, `人物档案页面中的 人物档案.${npcKey}.关系数据`);
      assertAllowedKeys(
        npcValue.关系数据,
        new Set(['好感度', '信任度', '关系类型', '印象标签', '核心锚点']),
        `人物档案页面中的 人物档案.${npcKey}.关系数据`,
      );

      if (npcValue.关系数据.印象标签 !== undefined) {
        assertStringArray(npcValue.关系数据.印象标签, `人物档案页面中的 人物档案.${npcKey}.关系数据.印象标签`);
      }

      if (npcValue.关系数据.核心锚点 !== undefined) {
        if (!Array.isArray(npcValue.关系数据.核心锚点)) {
          throw new Error(`人物档案页面中的 人物档案.${npcKey}.关系数据.核心锚点必须是对象数组。`);
        }

        npcValue.关系数据.核心锚点.forEach((anchorValue: unknown, index: number) => {
          ensurePlainObject(anchorValue, `人物档案页面中的 人物档案.${npcKey}.关系数据.核心锚点[${index}]`);
          assertAllowedKeys(
            anchorValue,
            new Set(['事件', '影响', '权重']),
            `人物档案页面中的 人物档案.${npcKey}.关系数据.核心锚点[${index}]`,
          );

          if (!anchorValue.事件 || !anchorValue.影响 || !anchorValue.权重) {
            throw new Error(
              `人物档案页面中的 人物档案.${npcKey}.关系数据.核心锚点[${index}]必须同时包含 事件、影响、权重。`,
            );
          }
        });
      }
    }

    if (npcValue.个人信息 !== undefined) {
      ensurePlainObject(npcValue.个人信息, `人物档案页面中的 人物档案.${npcKey}.个人信息`);
      assertAllowedKeys(
        npcValue.个人信息,
        new Set([
          '价值观',
          '执念与目标',
          '心理创伤',
          '外貌',
          '表性格',
          '里性格',
          '当前想法',
          '特殊能力',
          '当前穿着',
          '当前位置',
          '当前状态',
          '持有物品',
          '过往经历',
          '备注',
        ]),
        `人物档案页面中的 人物档案.${npcKey}.个人信息`,
      );

      if (npcValue.个人信息.价值观 !== undefined) {
        ensurePlainObject(npcValue.个人信息.价值观, `人物档案页面中的 人物档案.${npcKey}.个人信息.价值观`);
        assertAllowedKeys(
          npcValue.个人信息.价值观,
          new Set(['喜好', '厌恶', '雷区']),
          `人物档案页面中的 人物档案.${npcKey}.个人信息.价值观`,
        );

        if (npcValue.个人信息.价值观.喜好 !== undefined) {
          assertStringArray(npcValue.个人信息.价值观.喜好, `人物档案页面中的 人物档案.${npcKey}.个人信息.价值观.喜好`);
        }
        if (npcValue.个人信息.价值观.厌恶 !== undefined) {
          assertStringArray(npcValue.个人信息.价值观.厌恶, `人物档案页面中的 人物档案.${npcKey}.个人信息.价值观.厌恶`);
        }
      }

      if (npcValue.个人信息.过往经历 !== undefined) {
        assertStringArray(npcValue.个人信息.过往经历, `人物档案页面中的 人物档案.${npcKey}.个人信息.过往经历`);
      }
    }

    if (npcValue.交互记忆 !== undefined) {
      ensurePlainObject(npcValue.交互记忆, `人物档案页面中的 人物档案.${npcKey}.交互记忆`);
      assertAllowedKeys(
        npcValue.交互记忆,
        new Set(['未完成约定', '共同秘密', '赠礼记录']),
        `人物档案页面中的 人物档案.${npcKey}.交互记忆`,
      );

      if (npcValue.交互记忆.未完成约定 !== undefined) {
        assertStringArray(npcValue.交互记忆.未完成约定, `人物档案页面中的 人物档案.${npcKey}.交互记忆.未完成约定`);
      }
      if (npcValue.交互记忆.共同秘密 !== undefined) {
        assertStringArray(npcValue.交互记忆.共同秘密, `人物档案页面中的 人物档案.${npcKey}.交互记忆.共同秘密`);
      }
      if (npcValue.交互记忆.赠礼记录 !== undefined) {
        assertStringArray(npcValue.交互记忆.赠礼记录, `人物档案页面中的 人物档案.${npcKey}.交互记忆.赠礼记录`);
      }
    }

    if (npcValue.近期事件 !== undefined) {
      assertStringArray(npcValue.近期事件, `人物档案页面中的 人物档案.${npcKey}.近期事件`);
    }

    if (npcValue.重要经历 !== undefined) {
      assertStringArray(npcValue.重要经历, `人物档案页面中的 人物档案.${npcKey}.重要经历`);
      npcValue.重要经历.forEach((entry: string, index: number) => {
        if (entry.trim() !== '' && !/^\[[^\]]+\]\s*[^@]+@[^:]+:\s*.+$/.test(entry)) {
          throw new Error(
            `人物档案页面中的 人物档案.${npcKey}.重要经历[${index}]格式不正确，必须写成“[时间] 来源@地点: 事件”。`,
          );
        }
      });
    }
  });
}

function validateModuleSchema(moduleKey: AiGenerateModuleKey, payload: Record<string, any>) {
  const baseConfig = Schema.parse({});

  try {
    switch (moduleKey) {
      case 'world':
        applyWorldPayload(baseConfig, payload);
        break;
      case 'player':
        applyPlayerPayload(baseConfig, payload);
        break;
      case 'npc':
        applyModulePayload(baseConfig, moduleKey, payload);
        break;
    }

    Schema.parse(baseConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${getModuleTitle(moduleKey)}页面结构不符合当前开局结构要求：${message}`);
  }
}

function assertAllowedKeys(target: Record<string, any>, allowedKeys: Set<string>, scopeLabel: string) {
  const invalidKeys = Object.keys(target).filter(key => !allowedKeys.has(key));
  if (invalidKeys.length > 0) {
    throw new Error(`${scopeLabel}出现越界字段：${invalidKeys.join('、')}`);
  }
}

function assertNoInternalFields(value: unknown, scopeLabel: string) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoInternalFields(item, `${scopeLabel}[${index}]`));
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  Object.entries(value).forEach(([key, nestedValue]) => {
    if (key.startsWith('_') || key.startsWith('$')) {
      throw new Error(`${scopeLabel}出现内部维护字段：${key}`);
    }
    assertNoInternalFields(nestedValue, `${scopeLabel}.${key}`);
  });
}

function assertStringArray(value: unknown, label: string) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${label}必须是字符串数组。`);
  }
}

function assertRecordOfObjects(value: unknown, label: string): asserts value is Record<string, Record<string, any>> {
  ensurePlainObject(value, label);
  Object.entries(value).forEach(([key, itemValue]) => {
    ensurePlainObject(itemValue, `${label}.${key}`);
  });
}

function assertSequentialNpcKeys(target: Record<string, any>, scopeLabel: string) {
  const keys = Object.keys(target);
  const ids = keys.map(key => {
    const match = key.match(/^NPC_(\d+)$/);
    if (!match) {
      throw new Error(`${scopeLabel}的顶层键名必须使用 NPC_数字 格式，例如 NPC_1、NPC_2。当前发现：${key}`);
    }
    return Number(match[1]);
  });

  const sortedIds = [...ids].sort((a, b) => a - b);
  const hasGap = sortedIds.some((id, index) => id !== index + 1);
  if (hasGap) {
    throw new Error(`${scopeLabel}的 NPC 编号必须从 NPC_1 开始连续递增，不能跳号。`);
  }
}

function ensurePlainObject(value: unknown, label: string): asserts value is Record<string, any> {
  if (!isPlainObject(value)) {
    throw new Error(`${label}必须是对象。`);
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFriendlyValidationHints(errorText: string): string[] {
  const message = errorText.trim();
  if (!message) {
    return [];
  }

  const hints: string[] = [];

  if (
    /不是合法 JSON|Expected ',' or ']' after array element in JSON|Unexpected token.*JSON|JSON at position|对象里的字段写法有问题|数组里的标点写错了|非法字符或多余内容|内容提前断掉了/i.test(
      message,
    )
  ) {
    hints.push(t('setup.aiGenerate.hint.jsonPunctuation'));
  }

  if (/返回格式不符合要求/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.responseFormat'));
  }

  if (/页面结果必须是 JSON 对象|必须是对象/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.objectStructure'));
  }

  if (/出现越界字段/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.outOfScope'));
  }

  if (/出现内部维护字段/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.internalFields'));
  }

  if (
    /玩家.*记事本.*结构不符合|玩家.*记事本.*潜在危机.*实际接收 string|玩家.*记事本.*当前机遇.*实际接收 string|玩家.*记事本.*待办事项.*实际接收 string/.test(
      message,
    )
  ) {
    hints.push(t('setup.aiGenerate.hint.notebookObject'));
    hints.push(t('setup.aiGenerate.hint.notebookObjectExample'));
  }

  if (/核心锚点|人物档案.*结构不符合.*核心锚点/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.coreAnchors'));
  }

  if (/运行规则|信息层级/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.worldRulesAndInfo'));
  }

  if (/物品名不能包含英文句点|非法物品名/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.itemNameDot'));
  }

  if (
    /顶层键名必须使用 NPC_数字|NPC 编号必须从 NPC_1 开始连续递增|核心锚点必须是对象数组|重要经历\[\d+\]格式不正确/.test(
      message,
    )
  ) {
    hints.push(t('setup.aiGenerate.hint.npcSequentialKeys'));
  }

  if (/$time|_关注|_兑换比例|\$保底次数/.test(message)) {
    hints.push(t('setup.aiGenerate.hint.systemManagedFields'));
  }

  return _.uniq(hints);
}

function assembleFinalPreset() {
  const basePreset = createBasePreset();
  const requiredMissingModules: string[] = [];
  const optionalMissingModules: string[] = [];
  const invalidModules: string[] = [];
  let hasBlockingInvalidModule = false;

  const moduleOrder: AiGenerateModuleKey[] = ['world', 'player', 'npc'];

  moduleOrder.forEach(moduleKey => {
    const raw = moduleStates[moduleKey].editableResult.trim();
    if (!raw) {
      if (moduleKey === 'world') {
        requiredMissingModules.push(getModuleTitle(moduleKey));
      } else {
        optionalMissingModules.push(getModuleTitle(moduleKey));
      }
      return;
    }

    try {
      const payload = parseModulePayload(moduleKey, raw);
      applyModulePayload(basePreset.config, moduleKey, payload);
    } catch (error) {
      invalidModules.push(`${getModuleTitle(moduleKey)}：${error instanceof Error ? error.message : String(error)}`);
      if (moduleKey === 'world') {
        hasBlockingInvalidModule = true;
      }
    }
  });

  let validationError = '';
  try {
    basePreset.config = Schema.parse(basePreset.config);
  } catch (error) {
    validationError = error instanceof Error ? error.message : String(error);
  }

  const previewText = JSON.stringify(basePreset, null, 2);
  const complete = requiredMissingModules.length === 0 && !hasBlockingInvalidModule && !validationError;

  return {
    previewText,
    requiredMissingModules,
    optionalMissingModules,
    invalidModules,
    validationError,
    complete,
  };
}

function createBasePreset() {
  return {
    id: `ai-generated-${Date.now()}`,
    name: 'AI分模块生成预设',
    icon: '🎮',
    category: 'AI生成',
    tags: ['AI生成', '1980s'],
    description: '由世界、玩家、人物档案三页独立生成后自动拼接的开局预设',
    config: Schema.parse({}),
    localContentEntries: normalizeLocalContentEntries(formData.value.localContentEntries),
  };
}

function applyModulePayload(targetConfig: any, moduleKey: AiGenerateModuleKey, payload: Record<string, any>) {
  switch (moduleKey) {
    case 'world':
      applyWorldPayload(targetConfig, payload);
      return;
    case 'player':
      applyPlayerPayload(targetConfig, payload);
      return;
    case 'npc':
      targetConfig.人物档案 = payload.人物档案 ?? {};
      return;
  }
}

function applyWorldPayload(targetConfig: any, payload: Record<string, any>) {
  if (payload.设置) {
    targetConfig.设置 = {
      ...targetConfig.设置,
      生存系统模式: payload.设置.生存系统模式 ?? targetConfig.设置.生存系统模式,
    };
  }

  if (payload.世界) {
    const worldPayload = payload.世界;
    targetConfig.世界 = {
      ...targetConfig.世界,
      ...worldPayload,
      时间系统: {
        ...targetConfig.世界.时间系统,
        ...(worldPayload.时间系统 ?? {}),
      },
      空间定位: {
        ...targetConfig.世界.空间定位,
        ...(worldPayload.空间定位 ?? {}),
      },
      社会环境: {
        ...targetConfig.世界.社会环境,
        ...(worldPayload.社会环境 ?? {}),
      },
      信息层级: {
        ...targetConfig.世界.信息层级,
        ...(worldPayload.信息层级 ?? {}),
      },
      势力网络: worldPayload.势力网络 ?? targetConfig.世界.势力网络,
    };
  }
}

function applyPlayerPayload(targetConfig: any, payload: Record<string, any>) {
  if (!payload.玩家) {
    return;
  }

  const playerPayload = payload.玩家;
  targetConfig.玩家 = {
    ...targetConfig.玩家,
    ...playerPayload,
    身份信息: {
      ...targetConfig.玩家.身份信息,
      ...(playerPayload.身份信息 ?? {}),
    },
    技能系统: playerPayload.技能系统 ?? targetConfig.玩家.技能系统,
    势力关系: playerPayload.势力关系 ?? targetConfig.玩家.势力关系,
    货币资源: {
      ...targetConfig.玩家.货币资源,
      ...(playerPayload.货币资源 ?? {}),
      主货币: {
        ...targetConfig.玩家.货币资源.主货币,
        ...(playerPayload.货币资源?.主货币 ?? {}),
      },
      次级货币: playerPayload.货币资源?.次级货币 ?? targetConfig.玩家.货币资源.次级货币,
    },
    物品栏: playerPayload.物品栏 ?? targetConfig.玩家.物品栏,
    经营实体: playerPayload.经营实体 ?? targetConfig.玩家.经营实体,
    记事本: {
      ...targetConfig.玩家.记事本,
      ...(playerPayload.记事本 ?? {}),
      潜在危机: playerPayload.记事本?.潜在危机 ?? targetConfig.玩家.记事本.潜在危机,
      当前机遇: playerPayload.记事本?.当前机遇 ?? targetConfig.玩家.记事本.当前机遇,
      待办事项: playerPayload.记事本?.待办事项 ?? targetConfig.玩家.记事本.待办事项,
    },
  };
}

function handleDownload() {
  if (isResultActionDisabled.value) {
    return;
  }

  try {
    const jsonData = JSON.parse(finalAssemblyState.value.previewText);
    const fileName = jsonData.name || `ai-generated-preset-${Date.now()}`;
    const blob = new Blob([finalAssemblyState.value.previewText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastr.success(t('setup.aiGenerate.message.jsonDownloaded'));
  } catch (error) {
    toastr.error(t('setup.aiGenerate.message.downloadFailed'));
    console.error('[AiGenerate] 下载失败:', error);
  }
}

async function handleApply() {
  if (isResultActionDisabled.value) {
    return;
  }

  const success = await setupStore.applyAiGeneratedConfig(finalAssemblyState.value.previewText);
  if (success) {
    emit('apply');
  }
}

function normalizeLocalContentEntries(entries: LocalContentEntryInput[]): LocalContentEntryInput[] {
  return entries
    .filter(entry => entry.name.trim() !== '' && entry.content.trim() !== '')
    .map(entry => ({
      name: entry.name.trim(),
      content: entry.content.trim(),
      kind: entry.kind,
      route: entry.route,
    }));
}

function handleBack() {
  setupStore.goBack();
}
</script>

<style scoped>
@import './styles/setup-shared.css';

.ai-generate-page {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: var(--bg-primary);
  position: relative;
  padding: 20px;
  max-width: 960px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  padding: 40px 20px 20px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.tabs-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.module-tab {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.module-tab:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--accent-primary) 40%, var(--border-light));
}

.module-tab.active {
  border-color: var(--accent-primary);
  background: color-mix(in srgb, var(--accent-primary) 10%, var(--bg-card));
  box-shadow: 0 10px 24px rgba(147, 51, 234, 0.12);
}

.module-tab__icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--accent-primary) 14%, transparent);
  color: var(--accent-primary);
  flex-shrink: 0;
}

.module-tab__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.module-tab__title {
  font-size: 14px;
  font-weight: 700;
}

.module-tab__status {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.module-workbench {
  margin-bottom: 20px;
}

.form-section {
  margin-bottom: 16px;
}

.form-section-group {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.module-intro-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-header {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-header.optional {
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.section-header.optional:hover {
  color: var(--text-primary);
}

.section-header.optional:focus-visible,
button:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.section-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: -6px 0 0 0;
  line-height: 1.6;
}

.module-status-chip,
.final-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  white-space: nowrap;
}

.module-status-chip.pending,
.final-status-chip.warning {
  color: #a16207;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.25);
}

.module-status-chip.generating {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.24);
}

.module-status-chip.success,
.final-status-chip.success {
  color: #15803d;
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.24);
}

.module-status-chip.danger {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.24);
}

.form-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 769px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px 20px;
  }

  .form-field.full-width {
    grid-column: 1 / -1;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.form-field textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.6;
}

.optional-section {
  margin-top: 16px;
}

.optional-content {
  margin-top: 12px;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 1000px;
  opacity: 1;
}

.result-section,
.final-section {
  margin-bottom: 20px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.result-header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.final-result-header {
  margin-bottom: 16px;
}

.input-label {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.result-description {
  margin-top: 6px;
}

.retry-button,
.stop-button,
.download-button,
.apply-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button {
  border: none;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  color: white;
}

.retry-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(147, 51, 234, 0.25);
}

.stop-button {
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  color: var(--text-primary);
}

.stop-button:hover:not(:disabled) {
  border-color: var(--accent-danger);
  color: var(--accent-danger);
}

.stop-button--compact {
  min-width: 88px;
}

.retry-button:disabled,
.stop-button:disabled,
.download-button:disabled,
.apply-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.error-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-danger) 40%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-danger) 8%, var(--bg-card));
  color: var(--accent-danger);
  font-size: 13px;
  line-height: 1.5;
}

.warning-panel {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  background: rgba(245, 158, 11, 0.08);
  color: #a16207;
  font-size: 13px;
}

.warning-panel--danger {
  border-color: rgba(239, 68, 68, 0.24);
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}

.warning-panel__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  margin-bottom: 8px;
}

.warning-panel ul {
  margin: 0;
  padding-left: 18px;
}

.warning-panel p {
  margin: 0;
  line-height: 1.6;
}

.validation-hints-list {
  margin-top: 8px;
}

.result-editor {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.result-editor:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.result-editor--final {
  background: color-mix(in srgb, var(--bg-card) 92%, var(--accent-primary) 8%);
}

.apply-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}

.download-button {
  border: 1px solid var(--border-light);
  background: var(--bg-card);
  color: var(--text-primary);
}

.download-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.16);
}

.apply-button {
  border: none;
  background: var(--accent-success);
  color: white;
}

.apply-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28);
}

@media (max-width: 768px) {
  .ai-generate-page {
    padding: 16px;
  }

  .page-header {
    padding: 36px 16px 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .tabs-section {
    grid-template-columns: 1fr;
  }

  .module-intro-card,
  .result-header,
  .apply-row {
    flex-direction: column;
  }

  .result-header-actions {
    width: 100%;
    justify-content: stretch;
  }

  .retry-button,
  .stop-button,
  .download-button,
  .apply-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 32px 12px 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-subtitle {
    font-size: 12px;
  }
}
</style>
