<template>
  <div class="character-panel">
    <div class="character-grid">
      <div
        v-for="npc in sortedCharacters"
        :key="npc.id"
        :class="['npc-card', { pulsing: isCharacterCardChanged(npc.id) }]"
        @mouseenter="dismissCharacterCardChanged(npc.id)"
        @click="handleNpcCardClick(npc.id, npc)"
      >
        <!-- 删除按钮 -->
        <button
          class="card-delete-btn"
          :title="t('character.deleteCharacter')"
          @click.stop="openDeleteConfirm(npc.id, npc.姓名)"
        >
          ×
        </button>
        <span class="card-gender-emoji">{{ getGenderEmoji(npc.性别) }}</span>
        <div class="npc-name-row">
          <!-- 关注按钮 -->
          <button
            class="follow-btn"
            :class="{ active: npc._关注 }"
            :title="npc._关注 ? t('character.unfollow') : t('character.follow')"
            @click.stop="toggleFollow(npc.id)"
          >
            {{ npc._关注 ? '⭐' : '☆' }}
          </button>
          <div class="npc-name">{{ npc.姓名 }}</div>
        </div>
        <div class="npc-job-row">
          <div class="npc-job">{{ npc.社会身份?.职业 || '' }}</div>
        </div>
        <div class="npc-unit">{{ npc.社会身份?.所属势力 || '' }}</div>
        <div class="npc-favor-container">
          <div :class="['npc-favor-text', getFavorClass(npc.关系数据?.好感度 || 0)]">
            ❤️ {{ npc.关系数据?.好感度 || 0 }}
          </div>
          <div class="npc-favor-bar">
            <div class="favor-fill" :style="{ width: getFavorPercent(npc.关系数据?.好感度 || 0) + '%' }"></div>
          </div>
        </div>
        <div class="npc-trust-container">
          <div :class="['npc-trust-text', getTrustClass(npc.关系数据?.信任度 || 0)]">
            🤝 {{ npc.关系数据?.信任度 || 0 }}
          </div>
          <div class="npc-trust-bar">
            <div class="trust-fill" :style="{ width: getTrustPercent(npc.关系数据?.信任度 || 0) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- 招聘按钮卡片 -->
      <div class="npc-card recruit-card" @click="openRecruitDialog">
        <span class="recruit-icon">➕</span>
        <div class="recruit-text">{{ t('character.recruitCharacter') }}</div>
        <div class="recruit-hint">{{ t('character.recruitHint') }}</div>
      </div>
    </div>

    <!-- Dashboard风格对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog-content detail-dialog" @click.stop>
        <!-- 头部 -->
        <div class="dashboard-header">
          <div class="header-left">
            <div class="avatar-circle">
              <span class="avatar-text">{{ editedNpc.姓名?.charAt(0) || '?' }}</span>
            </div>
            <div class="header-info">
              <h3 class="person-name">{{ editedNpc.姓名 }}</h3>
              <div class="person-tags">
                <span class="tag">{{ editedNpc.社会身份?.职业 }}</span>
                <span class="tag">{{ editedNpc.社会身份?.所属势力 }}</span>
              </div>
            </div>
          </div>
          <button class="dialog-close" @click="closeDialog">✕</button>
        </div>

        <div class="detail-tabs" role="tablist" :aria-label="t('character.detailTabsAria')">
          <button
            v-for="tab in detailTabs"
            :key="tab.key"
            type="button"
            class="detail-tab"
            :class="{ active: activeDetailTab === tab.key }"
            @click="activeDetailTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- 主体内容 -->
        <div ref="detailDialogBody" class="dialog-body" @input="handleDetailDialogInput">
          <!-- 概览 -->
          <div v-show="activeDetailTab === 'overview'" class="top-row-sections">
            <!-- 基本信息组 -->
            <div class="info-section">
              <div class="section-title">
                <span class="section-icon">👤</span>
                <span>{{ t('character.basicInfo') }}</span>
              </div>
              <div class="excel-style">
                <div class="excel-row detail-text-row">
                  <span class="excel-label">{{ t('character.name') }}</span>
                  <textarea v-model="editedNpc.姓名" class="excel-textarea npc-detail-textarea" rows="1"></textarea>
                </div>
                <div class="excel-row detail-text-row">
                  <span class="excel-label">{{ t('character.gender') }}</span>
                  <textarea v-model="editedNpc.性别" class="excel-textarea npc-detail-textarea" rows="1"></textarea>
                </div>
                <div class="excel-row detail-text-row">
                  <span class="excel-label">{{ t('character.race') }}</span>
                  <textarea v-model="editedNpc.种族" class="excel-textarea npc-detail-textarea" rows="1"></textarea>
                </div>
                <div class="excel-row detail-text-row">
                  <span class="excel-label">{{ t('character.age') }}</span>
                  <textarea v-model="editedNpc.年龄" class="excel-textarea npc-detail-textarea" rows="1"></textarea>
                </div>
                <div class="excel-row detail-text-row">
                  <span class="excel-label">{{ t('character.maritalStatus') }}</span>
                  <textarea v-model="editedNpc.婚姻状态" class="excel-textarea npc-detail-textarea" rows="1"></textarea>
                </div>
              </div>
            </div>

            <!-- 关系数据组 -->
            <div class="info-section">
              <div class="section-title">
                <span class="section-icon">📊</span>
                <span>{{ t('character.relationshipData') }}</span>
              </div>
              <div class="favor-dashboard-compact">
                <div class="favor-gauge">
                  <div class="gauge-label">{{ t('character.favor') }}</div>
                  <div class="gauge-value" :class="getFavorClass(editedNpc.关系数据?.好感度 || 0)">
                    {{ editedNpc.关系数据?.好感度 || 0 }}
                  </div>
                  <div class="gauge-bar">
                    <div
                      class="gauge-fill"
                      :style="{ width: getFavorPercent(editedNpc.关系数据?.好感度 || 0) + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="favor-gauge">
                  <div class="gauge-label">{{ t('character.trust') }}</div>
                  <div :class="['gauge-value', getTrustClass(editedNpc.关系数据?.信任度 || 0)]">
                    {{ editedNpc.关系数据?.信任度 || 0 }}
                  </div>
                  <div class="gauge-bar">
                    <div
                      class="trust-fill-gauge"
                      :style="{ width: getTrustPercent(editedNpc.关系数据?.信任度 || 0) + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="excel-style">
                  <div class="excel-row detail-text-row">
                    <span class="excel-label">{{ t('character.relationType') }}</span>
                    <textarea
                      v-model="editedNpc.关系数据.关系类型"
                      class="excel-textarea npc-detail-textarea"
                      rows="1"
                    ></textarea>
                  </div>
                  <div class="excel-row">
                    <span class="excel-label">{{ t('character.keyNpc') }}</span>
                    <div class="toggle-container">
                      <label class="toggle-switch">
                        <input v-model="editedNpc.重要NPC" type="checkbox" />
                        <span class="toggle-slider"></span>
                      </label>
                      <span class="toggle-label">{{ editedNpc.重要NPC ? t('common.yes') : t('common.no') }}</span>
                    </div>
                  </div>
                  <div class="excel-row impression-tags-row">
                    <span class="excel-label">{{ t('character.impressionTags') }}</span>
                    <div class="impression-tags-editor">
                      <textarea
                        v-model="relationTagsText"
                        class="excel-textarea impression-tags-textarea"
                        rows="1"
                        :placeholder="t('character.impressionTagsPlaceholder')"
                      ></textarea>
                      <div v-if="editedNpc.关系数据?.印象标签?.length" class="impression-tags-preview">
                        <span v-for="tag in editedNpc.关系数据.印象标签" :key="tag" class="impression-tag-chip">
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 生存状态组（仅当生存系统开启时显示） -->
          <div
            v-if="survivalMode !== '关闭'"
            v-show="activeDetailTab === 'overview'"
            class="info-section survival-section"
          >
            <div class="section-title">
              <span class="section-icon">❤️</span>
              <span>{{ t('character.survivalStatus') }}</span>
              <button
                class="follow-toggle-btn"
                :class="{ active: editedNpc._关注 }"
                @click="editedNpc._关注 = !editedNpc._关注"
              >
                {{ editedNpc._关注 ? t('character.followed') : t('character.followAction') }}
              </button>
            </div>
            <div class="survival-grid">
              <!-- 血量 - 始终显示 -->
              <div class="survival-item">
                <span class="survival-label">❤️ {{ t('survival.health') }}</span>
                <div class="survival-bar-container">
                  <div class="survival-bar hp-bar" :style="{ width: (editedNpc.生存状态?.血量 || 100) + '%' }"></div>
                </div>
                <span class="survival-value">{{ editedNpc.生存状态?.血量 || 100 }}</span>
              </div>
              <!-- 体力 - 始终显示 -->
              <div class="survival-item">
                <span class="survival-label">⚡ {{ t('survival.stamina') }}</span>
                <div class="survival-bar-container">
                  <div
                    class="survival-bar stamina-bar"
                    :style="{ width: (editedNpc.生存状态?.体力值 || 100) + '%' }"
                  ></div>
                </div>
                <span class="survival-value">{{ editedNpc.生存状态?.体力值 || 100 }}</span>
              </div>
              <!-- 饥饿 - 仅生存模式显示 -->
              <div v-if="survivalMode === '生存模式'" class="survival-item">
                <span class="survival-label">🍖 {{ t('survival.hunger') }}</span>
                <div class="survival-bar-container">
                  <div
                    class="survival-bar hunger-bar"
                    :style="{ width: (editedNpc.生存状态?.饥饿值 || 100) + '%' }"
                  ></div>
                </div>
                <span class="survival-value">{{ editedNpc.生存状态?.饥饿值 || 100 }}</span>
              </div>
              <!-- 口渴 - 仅生存模式显示 -->
              <div v-if="survivalMode === '生存模式'" class="survival-item">
                <span class="survival-label">💧 {{ t('survival.thirst') }}</span>
                <div class="survival-bar-container">
                  <div
                    class="survival-bar thirst-bar"
                    :style="{ width: (editedNpc.生存状态?.口渴值 || 100) + '%' }"
                  ></div>
                </div>
                <span class="survival-value">{{ editedNpc.生存状态?.口渴值 || 100 }}</span>
              </div>
            </div>
          </div>

          <!-- 社会身份组 -->
          <div v-show="activeDetailTab === 'profile'" class="info-section">
            <div class="section-title">
              <span class="section-icon">💼</span>
              <span>{{ t('character.socialIdentity') }}</span>
            </div>
            <div class="excel-style">
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.job') }}</span>
                <textarea
                  v-model="editedNpc.社会身份.职业"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.affiliatedFaction') }}</span>
                <textarea
                  v-model="editedNpc.社会身份.所属势力"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.socialStatus') }}</span>
                <textarea
                  v-model="editedNpc.社会身份.社会地位"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 个人信息组 -->
          <div v-show="activeDetailTab === 'profile'" class="info-section">
            <div class="section-title">
              <span class="section-icon">✨</span>
              <span>{{ t('character.personalInfo') }}</span>
            </div>
            <div class="excel-style">
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.appearance') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.外貌"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.appearancePlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.outerPersonality') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.表性格"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.outerPersonalityPlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.innerPersonality') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.里性格"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.innerPersonalityPlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.currentThoughts') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.当前想法"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.currentThoughtsPlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.specialAbility') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.特殊能力"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.currentOutfit') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.当前穿着"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.currentOutfitPlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.currentLocation') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.当前位置"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.currentLocationPlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.currentStatus') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.当前状态"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.heldItems') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.持有物品"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.heldItemsPlaceholder')"
                ></textarea>
              </div>
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.notes') }}</span>
                <textarea
                  v-model="editedNpc.个人信息.备注"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.notesPlaceholder')"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 过往经历组 -->
          <div v-show="activeDetailTab === 'events'" class="info-section">
            <div class="section-title">
              <span class="section-icon">📜</span>
              <span>{{ t('character.pastExperiences') }}</span>
            </div>
            <div class="events-container">
              <div v-for="(event, index) in editedNpc.个人信息.过往经历" :key="`history-${index}`" class="event-row">
                <span class="event-number">{{ Number(index) + 1 }}</span>
                <textarea
                  v-model="editedNpc.个人信息.过往经历[index]"
                  class="event-textarea"
                  :placeholder="t('character.pastExperiencePlaceholder')"
                  rows="1"
                ></textarea>
                <button class="icon-btn danger" :title="t('common.delete')" @click="removeHistory(index)">🗑️</button>
              </div>
              <button v-if="(editedNpc.个人信息.过往经历?.length || 0) < 5" class="add-event-btn" @click="addHistory">
                <span class="add-icon">+</span>
                <span>{{ t('character.addPastExperience') }}</span>
              </button>
            </div>
          </div>

          <!-- 其他信息组 -->
          <div v-show="activeDetailTab === 'events'" class="info-section">
            <div class="section-title">
              <span class="section-icon">📞</span>
              <span>{{ t('character.otherInfo') }}</span>
            </div>
            <div class="excel-style">
              <div class="excel-row detail-text-row">
                <span class="excel-label">{{ t('character.contactInfo') }}</span>
                <textarea
                  v-model="editedNpc.联系方式"
                  class="excel-textarea npc-detail-textarea"
                  rows="1"
                  :placeholder="t('character.contactPlaceholder')"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- 近期事件组 -->
          <div v-show="activeDetailTab === 'events'" class="info-section">
            <div class="section-title">
              <span class="section-icon">📝</span>
              <span>{{ t('character.recentEvents') }}</span>
            </div>
            <div class="events-container">
              <div v-for="(event, index) in editedNpc.近期事件" :key="`recent-${index}`" class="event-row">
                <span class="event-number">{{ Number(index) + 1 }}</span>
                <textarea
                  v-model="editedNpc.近期事件[index]"
                  class="event-textarea"
                  :placeholder="t('character.eventPlaceholder')"
                  rows="1"
                ></textarea>
                <button class="icon-btn danger" :title="t('common.delete')" @click="removeEvent(index)">🗑️</button>
              </div>
              <button class="add-event-btn" @click="addEvent">
                <span class="add-icon">+</span>
                <span>{{ t('character.addEvent') }}</span>
              </button>
            </div>
          </div>

          <!-- 重要经历组 -->
          <div v-show="activeDetailTab === 'events'" class="info-section">
            <div class="section-title">
              <span class="section-icon">🏆</span>
              <span>{{ t('character.majorExperiences') }}</span>
            </div>
            <div class="events-container">
              <div v-for="(event, index) in editedNpc.重要经历" :key="`major-${index}`" class="event-row">
                <span class="event-number">{{ Number(index) + 1 }}</span>
                <textarea
                  v-model="editedNpc.重要经历[index]"
                  class="event-textarea"
                  :placeholder="t('character.majorExperiencePlaceholder')"
                  rows="1"
                ></textarea>
                <button class="icon-btn danger" :title="t('common.delete')" @click="removeMajorEvent(index)">🗑️</button>
              </div>
              <button v-if="(editedNpc.重要经历?.length || 0) < 10" class="add-event-btn" @click="addMajorEvent">
                <span class="add-icon">+</span>
                <span>{{ t('character.addMajorExperience') }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 底部操作栏 -->
        <div class="dialog-footer">
          <button class="footer-btn cancel" @click="closeDialog">{{ t('common.cancel') }}</button>
          <button class="footer-btn save" @click="saveNPC">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <!-- 招聘对话框 -->
    <div v-if="showRecruitDialog" class="dialog-overlay" @click="closeRecruitDialog">
      <div class="dialog-content recruit-dialog" @click.stop>
        <!-- 头部 -->
        <div class="dashboard-header recruit-header">
          <div class="header-left">
            <div class="avatar-circle">
              <span class="avatar-text">➕</span>
            </div>
            <div class="header-info">
              <h3 class="person-name">{{ t('character.recruitNewCharacter') }}</h3>
            </div>
          </div>
          <button class="dialog-close" @click="closeRecruitDialog">✕</button>
        </div>

        <!-- 主体 -->
        <div class="dialog-body">
          <div class="info-section">
            <div class="section-title">
              <span class="section-icon">👤</span>
              <span>{{ t('character.characterInfo') }}</span>
            </div>
            <div class="excel-style">
              <div class="excel-row recruit-name-row">
                <span class="excel-label">{{ t('character.name') }}</span>
                <div class="input-wrapper">
                  <div v-if="nameInputFocused" class="input-hint">{{ t('character.recruitNameHint') }}</div>
                  <input
                    v-model="recruitForm.name"
                    type="text"
                    class="excel-input"
                    :placeholder="t('character.recruitNamePlaceholder')"
                    @input="checkNameExists"
                    @focus="nameInputFocused = true"
                    @blur="nameInputFocused = false"
                  />
                </div>
              </div>
              <div v-if="nameExistsWarning" class="warning-text">{{ t('character.nameExistsWarning') }}</div>
              <div class="excel-row">
                <span class="excel-label">{{ t('character.relationship') }}</span>
                <select v-model="recruitForm.relationType" class="excel-input relation-select">
                  <option v-for="type in relationTypes" :key="type" :value="type">
                    {{ enumDisplay('npc.relationType', type, type) }}
                  </option>
                </select>
                <input
                  v-model="recruitForm.customRelationType"
                  type="text"
                  class="excel-input custom-input"
                  :placeholder="t('character.customRelationPlaceholder')"
                />
              </div>
              <div class="excel-row">
                <span class="excel-label">{{ t('character.description') }}</span>
                <input
                  v-model="recruitForm.description"
                  type="text"
                  class="excel-input"
                  :placeholder="t('character.descriptionPlaceholder')"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="dialog-footer">
          <button class="footer-btn cancel" @click="closeRecruitDialog">{{ t('common.cancel') }}</button>
          <button class="footer-btn save" :disabled="!recruitForm.name.trim() || nameExistsWarning" @click="recruitNPC">
            {{ t('character.confirmRecruit') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { useI18n } from '../../i18n';
import { useDelete } from '../../composables/useDelete';
import { useBadgeStore } from '../../stores/badge';
import { useLayoutStore } from '../../stores/layout';
import { useStatDataStore } from '../../stores/statData';
import { useStatDataActions } from '../../stores/statDataActions';
import { getGenderEmoji } from '../../utils/emoji';
import { createNewNpc, createNpcDraft, normalizeNpcDraft, type NpcBase, type NpcRecord } from '../../utils/npcFactory';
import { getFavorClass, getRelationPercent, getTrustClass } from '../../utils/npcMetrics';

const store = useStatDataStore();
const statDataActions = useStatDataActions();
const { data } = storeToRefs(store);

const survivalMode = computed(() => data.value.设置?.生存系统模式 ?? '关闭');
const { deleteItem } = useDelete();
const layoutStore = useLayoutStore();
const { pendingNpcId } = storeToRefs(layoutStore);
const badgeStore = useBadgeStore();
const { t, enumDisplay } = useI18n();

const showDialog = ref(false);
const currentNpcId = ref('');
const editedNpc = ref<NpcBase>(createNpcDraft({}));
const relationTagsText = ref('');
const detailDialogBody = ref<HTMLElement | null>(null);

const detailTabs = [
  { key: 'overview', label: t('character.tab.overview') },
  { key: 'profile', label: t('character.tab.profile') },
  { key: 'events', label: t('character.tab.events') },
] as const;

type DetailTabKey = (typeof detailTabs)[number]['key'];
const activeDetailTab = ref<DetailTabKey>('overview');

// 关系类型选项
const relationTypes = [
  '陌生人',
  '熟人',
  '朋友',
  '好友',
  '挚友',
  '同事',
  '上司',
  '下属',
  '合作伙伴',
  '竞争对手',
  '恋人',
  '配偶',
  '家人',
  '亲戚',
  '敌人',
  '仇人',
] as const;

type RelationType = (typeof relationTypes)[number];

type RecruitForm = {
  name: string;
  relationType: RelationType;
  customRelationType: string;
  description: string;
};

function getNpcRecords(): NpcRecord {
  return (data.value.人物档案 || {}) as NpcRecord;
}

// 招聘对话框状态
const showRecruitDialog = ref(false);
const recruitForm = ref<RecruitForm>({
  name: '',
  relationType: relationTypes[0],
  customRelationType: '',
  description: '',
});
const nameExistsWarning = ref(false);
const nameInputFocused = ref(false);

const sortedCharacters = computed(() => {
  const npcRecords = (data.value.人物档案 || {}) as NpcRecord;
  return _(npcRecords)
    .entries()
    .map(([id, npc]) => ({ id, ...npc }))
    .sortBy(npc => -(npc.关系数据?.好感度 || 0))
    .value();
});

function getFavorPercent(favor: number): number {
  return getRelationPercent(favor);
}

function getTrustPercent(trust: number): number {
  return getRelationPercent(trust);
}

async function toggleFollow(npcId: string) {
  const npc = getNpcRecords()[npcId];
  if (!npc) {
    return;
  }

  await statDataActions.updateStatDataAtPath('npc.toggle-follow', `人物档案.${npcId}._关注`, !npc._关注);
}

function parseRelationTags(value: string): string[] {
  return value
    .split(/[，,、\n]+/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

watchEffect(() => {
  relationTagsText.value = (editedNpc.value.关系数据?.印象标签 ?? []).join('，');
});

watch(relationTagsText, value => {
  editedNpc.value.关系数据.印象标签 = parseRelationTags(value);
});

function openEditDialog(npcId: string, npc: NpcBase) {
  currentNpcId.value = npcId;
  editedNpc.value = createNpcDraft(npc);
  activeDetailTab.value = 'overview';
  showDialog.value = true;
  void nextTick(resizeDetailTextareas);
}

function isCharacterCardChanged(npcId: string): boolean {
  return badgeStore.isChangedKey('characters', npcId);
}

function dismissCharacterCardChanged(npcId: string) {
  badgeStore.dismissChangedKey('characters', npcId);
}

function handleNpcCardClick(npcId: string, npc: NpcBase) {
  dismissCharacterCardChanged(npcId);
  openEditDialog(npcId, npc);
}

function closeDialog() {
  showDialog.value = false;
  currentNpcId.value = '';
  editedNpc.value = createNpcDraft({});
  activeDetailTab.value = 'overview';
}

function addEvent() {
  editedNpc.value.近期事件.push('');
  void nextTick(resizeDetailTextareas);
}

function removeEvent(index: string | number) {
  const idx = typeof index === 'string' ? parseInt(index) : index;
  editedNpc.value.近期事件.splice(idx, 1);
  void nextTick(resizeDetailTextareas);
}

function addHistory() {
  editedNpc.value.个人信息.过往经历.push('');
  void nextTick(resizeDetailTextareas);
}

function removeHistory(index: string | number) {
  const idx = typeof index === 'string' ? parseInt(index) : index;
  editedNpc.value.个人信息.过往经历.splice(idx, 1);
  void nextTick(resizeDetailTextareas);
}

function addMajorEvent() {
  editedNpc.value.重要经历.push('');
  void nextTick(resizeDetailTextareas);
}

function removeMajorEvent(index: string | number) {
  const idx = typeof index === 'string' ? parseInt(index) : index;
  editedNpc.value.重要经历.splice(idx, 1);
  void nextTick(resizeDetailTextareas);
}

function resizeTextareaElement(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function resizeDetailTextareas() {
  const container = detailDialogBody.value;
  if (!container) {
    return;
  }

  const textareas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
  textareas.forEach(resizeTextareaElement);
}

function handleDetailDialogInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }

  resizeTextareaElement(target);
}

async function saveNPC() {
  const npcId = currentNpcId.value;
  if (!npcId) {
    return;
  }

  const existingNpc = getNpcRecords()[npcId];
  const nextNpc = {
    ...existingNpc,
    ...normalizeNpcDraft(editedNpc.value),
  };

  await statDataActions.updateStatDataAtPath('npc.save', `人物档案.${npcId}`, nextNpc);
  toastr.success(t('character.saveSuccess'));
  closeDialog();
}

function openRecruitDialog() {
  recruitForm.value = { name: '', relationType: relationTypes[0], customRelationType: '', description: '' };
  nameExistsWarning.value = false;
  showRecruitDialog.value = true;
}

function closeRecruitDialog() {
  showRecruitDialog.value = false;
}

function checkNameExists() {
  const name = recruitForm.value.name.trim();
  if (!name) {
    nameExistsWarning.value = false;
    return;
  }
  const npcRecords = getNpcRecords();
  nameExistsWarning.value = Object.values(npcRecords).some(npc => npc.姓名 === name);
}

// 删除NPC（使用统一删除函数）
function openDeleteConfirm(npcId: string, npcName: string) {
  deleteItem({
    typeName: t('character.recruitCharacter'),
    displayName: npcName,
    onDelete: () => statDataActions.removeStatDataAtPath('npc.delete', `人物档案.${npcId}`),
  });
}

function allocateNpcId(records: NpcRecord): string {
  const npcPattern = /^NPC_(\d+)$/;
  const usedIds = new Set<number>();

  for (const key of Object.keys(records)) {
    const match = key.match(npcPattern);
    if (!match) continue;
    usedIds.add(Number(match[1]));
  }

  let nextId = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) + 1 : 1;
  while (usedIds.has(nextId)) {
    nextId += 1;
  }

  return `NPC_${nextId}`;
}

async function recruitNPC() {
  const name = recruitForm.value.name.trim();
  if (!name || nameExistsWarning.value) return;

  const description = recruitForm.value.description.trim();
  const relationType = recruitForm.value.customRelationType.trim() || recruitForm.value.relationType;

  const npcRecords = getNpcRecords();
  const npcId = allocateNpcId(npcRecords);
  const nextNpc = createNewNpc(name, relationType, description, {
    重要NPC: true,
    _关注: true,
  });

  await statDataActions.updateStatDataAtPath('npc.recruit', `人物档案.${npcId}`, nextNpc);
  toastr.success(t('character.addedCharacter', { name }));
  closeRecruitDialog();
}

watch(
  pendingNpcId,
  npcId => {
    if (!npcId) return;

    const npcRecords = getNpcRecords();
    const npc = npcRecords[npcId];
    if (!npc) {
      layoutStore.clearPendingNpcId();
      return;
    }

    openEditDialog(npcId, npc);
    layoutStore.clearPendingNpcId();
  },
  { immediate: true },
);

watch([showDialog, activeDetailTab], async ([isOpen]) => {
  if (!isOpen) {
    return;
  }

  await nextTick();
  resizeDetailTextareas();
});
</script>

<style scoped>
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.npc-card {
  background: var(--card-bg);
  backdrop-filter: var(--glass-blur-light);
  -webkit-backdrop-filter: var(--glass-blur-light);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  box-shadow: var(--card-shadow);
  transition:
    box-shadow var(--motion-normal),
    border-color var(--motion-normal),
    transform var(--motion-normal);
  position: relative;
  overflow: visible;
  border: 1px solid var(--card-border);
  border-top: 3px solid var(--accent-primary);
}

/* 卡片删除按钮 - 组件级覆盖 (基础样式来自 delete-button.css) */
.card-delete-btn {
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  font-size: 12px;
  z-index: 3;
}

.npc-card:hover .card-delete-btn {
  opacity: 1;
}

.card-gender-emoji {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 20px;
  z-index: 1;
}

.npc-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

/* 职业行样式 */
.npc-job-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}

/* 关注按钮样式 */
.follow-btn {
  width: auto;
  height: auto;
  border: none;
  background: none;
  background-color: transparent;
  font-size: 16px;
  cursor: pointer;
  color: color-mix(in srgb, var(--text-primary) 65%, var(--accent-warning) 35%);
  opacity: 0.62;
  transition: all 200ms ease;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  outline: none;
  box-shadow: none;
}

.follow-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.follow-btn.active {
  color: var(--accent-warning);
  opacity: 1;
}

.follow-btn:focus {
  outline: none;
}

/* 详情页关注切换按钮 */
.follow-toggle-btn {
  margin-left: auto;
  padding: 4px 10px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-primary);
  font-size: 11px;
  cursor: pointer;
  transition: all 200ms ease;
  color: var(--text-secondary);
}

.follow-toggle-btn:hover {
  border-color: var(--accent-warning);
  color: var(--accent-warning);
}

.follow-toggle-btn.active {
  background: rgba(var(--accent-warning-rgb), 0.16);
  border-color: rgba(var(--accent-warning-rgb), 0.3);
  color: var(--accent-warning);
}

/* 生存状态区域样式 */
.survival-section {
  background: linear-gradient(135deg, rgba(var(--accent-danger-rgb), 0.05), rgba(var(--accent-success-rgb), 0.05));
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
}

.survival-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.survival-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.survival-label {
  font-size: 11px;
  color: var(--text-secondary);
  width: 50px;
  flex-shrink: 0;
}

.survival-bar-container {
  flex: 1;
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
}

.survival-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 300ms ease;
}

.hp-bar {
  background: linear-gradient(90deg, rgba(var(--accent-danger-rgb), 0.94), rgba(var(--accent-danger-rgb), 0.62));
}

.stamina-bar {
  background: linear-gradient(90deg, rgba(var(--accent-warning-rgb), 0.94), rgba(var(--accent-warning-rgb), 0.62));
}

.hunger-bar {
  background: linear-gradient(90deg, rgba(var(--accent-warning-rgb), 0.98), rgba(var(--accent-danger-rgb), 0.62));
}

.thirst-bar {
  background: linear-gradient(90deg, rgba(var(--accent-primary-rgb), 0.94), rgba(var(--accent-primary-rgb), 0.62));
}

.survival-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  width: 24px;
  text-align: right;
}

.npc-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
}

.npc-card.pulsing {
  animation: cardHeartbeat 1.15s ease-in-out infinite;
  box-shadow:
    var(--card-shadow-hover),
    inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.16);
}

.npc-name {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0;
}

.npc-job {
  font-size: var(--text-xs);
  color: color-mix(in srgb, var(--text-primary) 72%, var(--text-secondary) 28%);
  margin-bottom: 2px;
}

.npc-unit {
  font-size: var(--text-xs);
  color: color-mix(in srgb, var(--text-primary) 72%, var(--text-secondary) 28%);
  margin-bottom: 8px;
}

.npc-favor-container,
.npc-trust-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.npc-trust-container {
  margin-top: 4px;
}

.npc-favor-text,
.npc-trust-text {
  font-size: var(--text-xs);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.npc-favor-text.favor-high {
  color: var(--accent-success);
}
.npc-favor-text.favor-medium {
  color: var(--accent-primary);
}
.npc-favor-text.favor-neutral {
  color: var(--accent-warning);
}
.npc-favor-text.favor-low {
  color: var(--accent-danger);
}

.npc-trust-text.trust-high {
  color: var(--accent-success);
}
.npc-trust-text.trust-medium {
  color: var(--accent-primary);
}
.npc-trust-text.trust-neutral {
  color: var(--accent-warning);
}
.npc-trust-text.trust-low {
  color: var(--accent-danger);
}

.npc-favor-bar,
.npc-trust-bar {
  height: 4px;
  background: var(--bg-primary);
  border-radius: 2px;
  overflow: hidden;
}

.favor-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-danger), var(--accent-warning), var(--accent-success));
  transition: width 300ms ease;
}

.trust-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-danger),
    var(--accent-warning),
    var(--accent-primary),
    var(--accent-success)
  );
  transition: width 300ms ease;
}

/* 角色对话框样式 */

.detail-dialog {
  display: flex;
  flex-direction: column;
  width: min(100%, 760px);
  max-height: 100%;
  min-height: 0;
}

.detail-dialog .dashboard-header,
.detail-tabs,
.detail-dialog .dialog-footer {
  flex-shrink: 0;
}

.detail-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto;
  overflow-y: hidden;
  min-height: 44px;
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch;
}

.detail-dialog .person-tags .tag {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(14, 22, 38, 0.34);
  color: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.detail-tab {
  border: 1px solid color-mix(in srgb, var(--border-light) 65%, var(--text-primary) 35%);
  background: color-mix(in srgb, var(--bg-card) 88%, rgba(255, 255, 255, 0.12) 12%);
  color: color-mix(in srgb, var(--text-primary) 72%, var(--text-secondary) 28%);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: var(--text-xs);
  white-space: nowrap;
  cursor: pointer;
  flex: 0 0 auto;
  min-height: 28px;
  line-height: 1.2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition:
    background-color var(--motion-fast),
    color var(--motion-fast),
    border-color var(--motion-fast),
    box-shadow var(--motion-fast),
    transform var(--motion-fast);
}

.detail-tab.active {
  color: color-mix(in srgb, var(--accent-primary) 82%, white 18%);
  border-color: rgba(var(--accent-primary-rgb), 0.52);
  background: rgba(var(--accent-primary-rgb), 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 0 0 1px rgba(var(--accent-primary-rgb), 0.12);
}

:global(body[data-theme='steelcool']) .detail-dialog .person-tags .tag,
:global(body.theme-steelcool) .detail-dialog .person-tags .tag {
  border-color: rgba(173, 216, 230, 0.34);
  background: rgba(9, 18, 32, 0.58);
  color: rgba(240, 248, 255, 0.98);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

:global(body[data-theme='steelcool']) .detail-tab,
:global(body.theme-steelcool) .detail-tab {
  border-color: rgba(173, 216, 230, 0.26);
  background: rgba(10, 20, 35, 0.78);
  color: rgba(224, 236, 248, 0.92);
}

:global(body[data-theme='steelcool']) .detail-tab.active,
:global(body.theme-steelcool) .detail-tab.active {
  border-color: rgba(120, 196, 255, 0.56);
  background: rgba(73, 145, 214, 0.2);
  color: rgba(246, 251, 255, 0.98);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 0 0 1px rgba(120, 196, 255, 0.16);
}

@media (max-width: 768px) {
  .detail-dialog {
    width: 100%;
    max-height: 100%;
    border-radius: 12px;
  }

  .detail-tabs {
    padding: 8px;
    gap: 4px;
  }

  .detail-tab {
    padding: 6px 10px;
  }
}

.top-row-sections {
  display: grid;
  grid-template-columns: 0.35fr 0.65fr;
  gap: 8px;
  margin-bottom: 8px;
}

/* 手机端响应式：基本信息和关系数据改为单列布局 */
@media (max-width: 480px) {
  .top-row-sections {
    grid-template-columns: 1fr;
  }
}

/* 行内输入框 */

.inline-input {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  font-family: var(--font-base);
  font-size: var(--text-xs);
  color: var(--text-primary);
  background: var(--bg-card);
}

.inline-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.favor-dashboard-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.favor-gauge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gauge-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
}

.gauge-value {
  font-size: 20px;
  font-weight: 700;
  flex-shrink: 0;
  white-space: nowrap;
  text-align: center;
}

.gauge-value.favor-high,
.gauge-value.trust-high {
  color: var(--accent-success);
}
.gauge-value.favor-medium,
.gauge-value.trust-medium {
  color: var(--accent-primary);
}
.gauge-value.favor-neutral,
.gauge-value.trust-neutral {
  color: var(--accent-warning);
}
.gauge-value.favor-low,
.gauge-value.trust-low {
  color: var(--accent-danger);
}

.gauge-bar {
  flex: 1;
  min-width: 0;
  height: 8px;
  background: var(--bg-card);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-light);
}

.gauge-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-danger), var(--accent-warning), var(--accent-success));
  transition: width 300ms ease;
}

.trust-fill-gauge {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--accent-danger),
    var(--accent-warning),
    var(--accent-primary),
    var(--accent-success)
  );
  transition: width 300ms ease;
}

.events-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.event-textarea {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  font-family: var(--font-base);
  font-size: var(--text-xs);
  color: var(--text-primary);
  background: var(--bg-card);
  resize: vertical;
  min-height: 40px;
  line-height: 1.4;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.event-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.event-number {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-primary);
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.icon-btn {
  width: max(28px, var(--touch-target-min));
  height: max(28px, var(--touch-target-min));
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--control-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 12px;
  background: var(--control-bg);
  transition: all var(--motion-fast);
}

.icon-btn.danger:hover {
  background: var(--accent-danger);
  transform: scale(1.1);
}

.add-event-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  background: var(--accent-success);
  color: white;
  border: none;
  border-radius: 4px;
  font-family: var(--font-base);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms ease;
  margin-top: 2px;
}

.add-event-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.add-icon {
  font-size: 18px;
  font-weight: 700;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

.empty-text {
  font-size: var(--text-base);
  margin: 0;
}

/* 招聘卡片样式 */
.recruit-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 2px dashed rgba(var(--accent-success-rgb), 0.35);
  border-top: 3px solid var(--accent-success);
  background: var(--card-bg-strong);
  transition:
    transform var(--motion-fast),
    box-shadow var(--motion-fast),
    border-color var(--motion-fast);
}

.recruit-card:hover {
  border-color: rgba(var(--accent-success-rgb), 0.6);
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-1px);
}

.recruit-icon {
  font-size: 28px;
  margin-bottom: 8px;
  opacity: 0.7;
}

.recruit-text {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.recruit-hint {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 招聘对话框样式 */
.recruit-dialog {
  width: min(100%, 420px);
  max-width: 420px;
  max-height: 100%;
}

.recruit-header {
  background: linear-gradient(135deg, rgba(var(--accent-success-rgb), 0.96), rgba(var(--accent-success-rgb), 0.72));
}

.warning-text {
  color: var(--accent-warning);
  font-size: var(--text-xs);
  padding: 4px 8px;
  background: rgba(var(--accent-warning-rgb), 0.1);
  border-radius: 4px;
  margin-top: 4px;
}

.relation-select {
  flex: 0 0 auto;
  min-width: 100px;
}

.custom-input {
  flex: 1;
  min-width: 80px;
}

/* 开关样式 */
.toggle-container {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-light);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: var(--text-secondary);
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
  background-color: var(--bg-card-solid);
}

.toggle-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

/* 印象标签 */
.impression-tags-row {
  align-items: flex-start;
}

.detail-text-row {
  align-items: flex-start;
}

.detail-text-row .excel-label {
  padding-top: 6px;
}

.npc-detail-textarea {
  min-height: 30px;
  resize: none;
  overflow-y: hidden;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.impression-tags-textarea,
.event-textarea {
  resize: none;
  overflow-y: hidden;
}

.impression-tags-textarea {
  min-height: 30px;
}

.impression-tags-editor {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.impression-tags-textarea {
  min-height: 30px;
}

.impression-tags-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.impression-tag-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 8px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.24);
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--accent-primary);
  font-size: 11px;
  line-height: 1.4;
  word-break: break-all;
}

@media (max-width: 480px) {
  .impression-tags-row {
    flex-direction: column;
    gap: 6px;
  }

  .impression-tags-editor {
    width: 100%;
  }
}

/* 招聘对话框输入提示样式 */
.recruit-name-row {
  position: relative;
}

.input-wrapper {
  position: relative;
  flex: 1;
}

.input-hint {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 4px;
  padding: 6px 10px;
  background: rgba(var(--accent-primary-rgb), 0.94);
  color: var(--bg-card-solid);
  font-size: 11px;
  line-height: 1.3;
  border-radius: 4px;
  box-shadow: var(--shadow-md);
  z-index: 10;
  animation: slideDown 0.2s ease-out;
}

.input-hint::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 20px;
  border: 5px solid transparent;
  border-top-color: rgba(var(--accent-primary-rgb), 0.94);
}

@keyframes cardHeartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.01);
  }
  60% {
    transform: scale(0.996);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .npc-card.pulsing {
    animation: none !important;
  }
}
</style>
