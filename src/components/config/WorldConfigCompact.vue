<template>
  <div class="world-config-compact">
    <!-- 世界类型 -->
    <div class="input-group">
      <label>{{ t('config.world.worldType') }}</label>
      <div class="type-chips">
        <button
          v-for="type in worldTypes"
          :key="type.value"
          :class="{ active: worldType === type.value }"
          @click="selectWorldType(type.value)"
        >
          <i class="ti" :class="type.icon"></i>{{ type.label }}
        </button>
      </div>
    </div>

    <!-- 基础信息 -->
    <div class="input-row">
      <label>{{ field('世界.时间系统.纪元名称').label }}</label>
      <input
        v-model="config.世界.时间系统.纪元名称"
        class="underline-input"
        :placeholder="field('世界.时间系统.纪元名称').placeholder"
      />
      <label>{{ field('世界.时间系统.当前时间').label }}</label>
      <input
        v-model="config.世界.时间系统.当前时间"
        class="underline-input"
        :placeholder="field('世界.时间系统.当前时间').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('世界.空间定位.当前位置').label }}</label>
      <input
        v-model="config.世界.空间定位.当前位置"
        class="underline-input"
        :placeholder="field('世界.空间定位.当前位置').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('世界.社会环境.权力结构').label }}</label>
      <input
        v-model="config.世界.社会环境.权力结构"
        class="underline-input"
        :placeholder="field('世界.社会环境.权力结构').placeholder"
      />
      <label>{{ field('世界.社会环境.社会氛围').label }}</label>
      <input
        v-model="config.世界.社会环境.社会氛围"
        class="underline-input"
        :placeholder="field('世界.社会环境.社会氛围').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('世界.社会环境.主流价值观').label }}</label>
      <input
        v-model="config.世界.社会环境.主流价值观"
        class="underline-input"
        :placeholder="field('世界.社会环境.主流价值观').placeholder"
      />
    </div>

    <div class="input-row">
      <label>{{ field('世界.空间定位.区域特征').label }}</label>
      <input
        v-model="config.世界.空间定位.区域特征"
        class="underline-input"
        :placeholder="field('世界.空间定位.区域特征').placeholder"
      />
    </div>

    <!-- 力量体系与玩法侧重 -->
    <div class="input-row">
      <label>{{ field('世界.力量体系').label }}</label>
      <input v-model="config.世界.力量体系" class="underline-input" :placeholder="field('世界.力量体系').placeholder" />
      <label>{{ field('世界.玩法侧重').label }}</label>
      <select v-model="config.世界.玩法侧重" class="underline-select">
        <option value="自由探索">{{ enumDisplay('world.gameplayFocus', '自由探索') }}</option>
        <option value="战斗冒险">{{ enumDisplay('world.gameplayFocus', '战斗冒险') }}</option>
        <option value="经营模拟">{{ enumDisplay('world.gameplayFocus', '经营模拟') }}</option>
        <option value="社交恋爱">{{ enumDisplay('world.gameplayFocus', '社交恋爱') }}</option>
        <option value="剧情推进">{{ enumDisplay('world.gameplayFocus', '剧情推进') }}</option>
      </select>
    </div>

    <div class="input-group align-start">
      <label>{{ t('config.world.ruleList') }}</label>
      <div class="rule-list">
        <div v-for="(_rule, index) in config.世界.运行规则" :key="index" class="rule-item">
          <input
            v-model="config.世界.运行规则[index]"
            class="underline-input"
            :placeholder="field('世界.运行规则').placeholder"
          />
          <button class="rule-remove" @click="config.世界.运行规则.splice(index, 1)">×</button>
        </div>
        <button v-if="(config.世界.运行规则?.length || 0) < 10" class="add-mini" @click="config.世界.运行规则.push('')">
          <i class="ti ti-plus"></i> {{ t('config.world.addRule') }}
        </button>
      </div>
    </div>

    <div class="input-row">
      <label>{{ field('世界.叙事玩法').label }}</label>
      <input v-model="config.世界.叙事玩法" class="underline-input" :placeholder="field('世界.叙事玩法').placeholder" />
    </div>

    <!-- 特殊系统 -->
    <div class="input-group">
      <label>{{ t('config.world.specialSystems') }}</label>
      <div class="checkbox-inline">
        <label class="checkbox-mini">
          <input v-model="specialSystems.magic" type="checkbox" />
          <i class="ti ti-crystal-ball"></i>{{ enumDisplay('world.specialSystem', '魔法') }}
        </label>
        <label class="checkbox-mini">
          <input v-model="specialSystems.tech" type="checkbox" />
          <i class="ti ti-robot"></i>{{ enumDisplay('world.specialSystem', '科技') }}
        </label>
        <label class="checkbox-mini">
          <input v-model="specialSystems.special_ability" type="checkbox" />
          <i class="ti ti-sparkles"></i>{{ enumDisplay('world.specialSystem', '能力') }}
        </label>
      </div>
    </div>

    <!-- 经营重点 -->
    <div class="input-group">
      <label>{{ t('config.world.businessFocus') }}</label>
      <div class="checkbox-inline">
        <label class="checkbox-mini">
          <input v-model="businessFocus" type="checkbox" value="贸易" />
          <i class="ti ti-coins"></i>{{ enumDisplay('world.businessFocus', '贸易') }}
        </label>
        <label class="checkbox-mini">
          <input v-model="businessFocus" type="checkbox" value="生产" />
          <i class="ti ti-building-factory"></i>{{ enumDisplay('world.businessFocus', '生产') }}
        </label>
        <label class="checkbox-mini">
          <input v-model="businessFocus" type="checkbox" value="服务" />
          <i class="ti ti-heart-handshake"></i>{{ enumDisplay('world.businessFocus', '服务') }}
        </label>
        <label class="checkbox-mini">
          <input v-model="businessFocus" type="checkbox" value="探险" />
          <i class="ti ti-swords"></i>{{ enumDisplay('world.businessFocus', '探险') }}
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '../../i18n';

const config = defineModel<any>('config', { required: true });
const { t, enumDisplay, fieldMeta } = useI18n();

function field(path: string) {
  return fieldMeta(path);
}

const worldTypes = computed(() => [
  { value: '历史', label: enumDisplay('world.type', '历史'), icon: 'ti-building-monument' },
  { value: '现代', label: enumDisplay('world.type', '现代'), icon: 'ti-building-skyscraper' },
  { value: '奇幻', label: enumDisplay('world.type', '奇幻'), icon: 'ti-crystal-ball' },
  { value: '科幻', label: enumDisplay('world.type', '科幻'), icon: 'ti-rocket' },
  { value: '自定义', label: enumDisplay('world.type', '自定义'), icon: 'ti-settings' },
]);

// 从力量体系推断世界类型
const worldType = computed({
  get() {
    const powerSystem = config.value.世界?.力量体系 || '';
    if (powerSystem.includes('魔法') || powerSystem.includes('元素')) return '奇幻';
    if (powerSystem.includes('科技') || powerSystem.includes('义体')) return '科幻';
    if (powerSystem === '现实' || powerSystem.includes('灵力')) return '现代';
    return '历史';
  },
  set(value) {
    // 类型由力量体系决定，这里不直接设置
    void value;
  },
});

// 特殊系统的计算属性（从力量体系推断并可编辑）
const specialSystems = computed({
  get() {
    const powerSystem = config.value.世界?.力量体系 || '';
    return {
      magic:
        powerSystem.includes('魔法') ||
        powerSystem.includes('元素') ||
        powerSystem.includes('修真') ||
        powerSystem.includes('灵力'),
      tech: powerSystem.includes('科技') || powerSystem.includes('义体'),
      special_ability: powerSystem.includes('职业') || powerSystem.includes('能力') || powerSystem.includes('异能'),
    };
  },
  set(value: { magic: boolean; tech: boolean; special_ability: boolean }) {
    // 根据复选框状态更新力量体系描述
    const systems: string[] = [];
    if (value.magic) systems.push('魔法');
    if (value.tech) systems.push('科技');
    if (value.special_ability) systems.push('能力');

    // 如果没有选中任何系统，默认为"现实"
    config.value.世界.力量体系 = systems.length > 0 ? systems.join('+') : '现实';
  },
});

// 经营侧重的计算属性（从玩法侧重和叙事玩法推断并可编辑）
const businessFocus = computed({
  get() {
    const focus = config.value.世界?.玩法侧重 || '';
    const narrative = config.value.世界?.叙事玩法 || '';
    const result: string[] = [];
    if (focus.includes('经营') || narrative.includes('贸易') || narrative.includes('商业')) result.push('贸易');
    if (narrative.includes('生产') || narrative.includes('工坊')) result.push('生产');
    if (narrative.includes('服务')) result.push('服务');
    if (focus.includes('冒险') || focus.includes('战斗') || narrative.includes('探索')) result.push('探险');
    return result;
  },
  set(value: string[]) {
    // 根据复选框状态更新叙事玩法描述
    const focuses: string[] = [];
    if (value.includes('贸易')) focuses.push('商业竞争');
    if (value.includes('生产')) focuses.push('生产制造');
    if (value.includes('服务')) focuses.push('服务行业');
    if (value.includes('探险')) focuses.push('冒险探索');

    config.value.世界.叙事玩法 = focuses.length > 0 ? focuses.join(',') : '自由探索';
  },
});

function selectWorldType(type: string) {
  const defaults: Record<string, any> = {
    历史: {
      era_name: '公元',
      currency_name: '银两',
      power_system: '现实',
    },
    现代: {
      era_name: '公元',
      currency_name: '元',
      power_system: '现实',
    },
    奇幻: {
      era_name: '龙历',
      currency_name: '金币',
      power_system: '元素魔法',
    },
    科幻: {
      era_name: '星历',
      currency_name: '星币',
      power_system: '科技',
    },
  };

  if (defaults[type]) {
    config.value.世界.时间系统.纪元名称 = defaults[type].era_name;
    config.value.玩家.货币资源.主货币.名称 = defaults[type].currency_name;
    config.value.世界.力量体系 = defaults[type].power_system;
  }
}
</script>

<style scoped>
.world-config-compact {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.input-group.align-start {
  align-items: flex-start;
}

.input-group > label {
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-secondary);
  min-width: 40px;
  font-weight: 500;
}

/* 使用 global.css 中的通用表单样式 */

.type-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.type-chips button {
  padding: 4px 10px;
  border: 1px solid var(--border-light);
  background: transparent;
  border-radius: 12px;
  font-size: calc(12px * var(--ui-font-scale));
  cursor: pointer;
  transition: all 150ms;
  color: var(--text-primary);
}

.type-chips button:hover {
  border-color: var(--accent-primary);
}

.type-chips button.active {
  background: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}

.checkbox-inline {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: calc(12px * var(--ui-font-scale));
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.checkbox-mini input[type='checkbox'] {
  cursor: pointer;
}

.rule-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rule-item {
  display: flex;
  gap: 4px;
  align-items: center;
}

.rule-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: calc(13px * var(--ui-font-scale));
  border-radius: 4px;
  transition: all 150ms;
  flex-shrink: 0;
  color: var(--text-secondary);
}

.rule-remove:hover {
  background: var(--accent-danger);
  color: #fff;
}

.rule-list .add-mini {
  align-self: flex-start;
}

/* ===== 响应式适配 ===== */

@media (max-width: 768px) {
  .world-config-compact {
    gap: 6px;
  }

  .input-group,
  .input-row {
    gap: 6px;
    margin-bottom: 3px;
  }

  .input-group > label,
  .input-row label {
    font-size: calc(11px * var(--ui-font-scale));
    min-width: 36px;
  }

  .underline-input,
  .underline-select {
    font-size: calc(12px * var(--ui-font-scale));
  }

  .underline-input::placeholder {
    font-size: calc(11px * var(--ui-font-scale));
  }

  .type-chips button {
    padding: 3px 8px;
    font-size: calc(11px * var(--ui-font-scale));
  }

  .checkbox-mini {
    font-size: calc(11px * var(--ui-font-scale));
    gap: 3px;
  }
}

@media (max-width: 480px) {
  .world-config-compact {
    gap: 4px;
    padding: 2px 0;
  }

  .input-group,
  .input-row {
    gap: 4px;
    margin-bottom: 2px;
  }

  .input-group > label,
  .input-row label {
    font-size: calc(10px * var(--ui-font-scale));
    min-width: 32px;
  }

  .underline-input,
  .underline-select {
    font-size: calc(11px * var(--ui-font-scale));
    padding: 1px 2px;
  }

  .underline-input::placeholder {
    font-size: calc(10px * var(--ui-font-scale));
  }

  .type-chips {
    gap: 3px;
  }

  .type-chips button {
    padding: 2px 6px;
    font-size: calc(10px * var(--ui-font-scale));
    border-radius: 10px;
  }

  .checkbox-inline {
    gap: 8px;
  }

  .checkbox-mini {
    font-size: calc(10px * var(--ui-font-scale));
    gap: 2px;
  }
}
</style>
