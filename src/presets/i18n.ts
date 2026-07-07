import type { PresetConfig, PresetI18nText } from './types';
import { presetI18nEn, presetValueTranslations } from './preset-i18n';

function cloneConfig(config: PresetConfig['config']): PresetConfig['config'] {
  return JSON.parse(JSON.stringify(config)) as PresetConfig['config'];
}

const PRESERVE_CHINESE_VALUE_PATHS = new Set(['设置.生存系统模式']);

const PRESERVE_CHINESE_VALUES = new Set(['普通', '精良', '稀有', '史诗', '传说']);

const FIXED_CONFIG_KEYS = new Set([
  '设置',
  '生存系统模式',
  '积分系统',
  '商城刷新',
  '抽奖触发',
  '$保底次数',
  '保底触发',
  '抽奖次数',
  '上次签到日期',
  '_兑换比例',
  '世界',
  '时间系统',
  '当前时间',
  '纪元名称',
  '当前天气',
  '空间定位',
  '当前位置',
  '区域特征',
  '社会环境',
  '权力结构',
  '社会氛围',
  '主流价值观',
  '力量体系',
  '玩法侧重',
  '运行规则',
  '叙事玩法',
  '信息层级',
  '全局重大事件',
  '势力动态',
  '区域事件',
  '本地消息',
  '圈内传闻',
  '势力网络',
  '影响力',
  '人数',
  '关系',
  '关系值',
  '关系描述',
  '玩家',
  '生存状态',
  '血量',
  '体力值',
  '饥饿值',
  '口渴值',
  '姓名',
  '年龄',
  '性别',
  '身份信息',
  '职业',
  '阶层',
  '所属组织',
  '特殊身份',
  '背景信息',
  '当前目标',
  '技能系统',
  '品质',
  '描述',
  '类型',
  '势力关系',
  '声望值',
  '声望等级',
  '关系状态',
  '头衔列表',
  '近期互动',
  '货币资源',
  '主货币',
  '名称',
  '数量',
  '次级货币',
  '兑换比例',
  '用途说明',
  '物品栏',
  '有效期',
  '特殊属性',
  '备注',
  '商业情报',
  '内容',
  '可靠度',
  '获取时间',
  '时效性',
  '库存详情',
  '单位',
  '存放地点',
  '品质状况',
  '进货价',
  '预计售价',
  '经营实体',
  '位置',
  '外观',
  '财务',
  '收入',
  '支出',
  '资产价值',
  '负债',
  '运营',
  '运营状态',
  '人员数量',
  '市场',
  '客户群体',
  '竞争态势',
  '特色优势',
  '重要设施',
  '当前问题',
  '发展潜力',
  '记事本',
  '潜在危机',
  '严重程度',
  '预计影响时间',
  '应对措施',
  '当前机遇',
  '所需资源',
  '行动计划',
  '待办事项',
  '优先级',
  '截止时间',
  '状态',
  '人物档案',
  '种族',
  '社会身份',
  '社会地位',
  '关系数据',
  '好感度',
  '信任度',
  '关系类型',
  '印象标签',
  '核心锚点',
  '事件',
  '影响',
  '权重',
  '个人信息',
  '价值观',
  '喜好',
  '厌恶',
  '雷区',
  '执念与目标',
  '心理创伤',
  '表性格',
  '里性格',
  '当前想法',
  '特殊能力',
  '当前穿着',
  '当前状态',
  '持有物品',
  '过往经历',
  '交互记忆',
  '未完成约定',
  '共同秘密',
  '赠礼记录',
  '婚姻状态',
  '联系方式',
  '近期事件',
  '重要经历',
  '重要NPC',
  '_关注',
  '$time',
  '商城',
  '物品',
  '价格',
  '库存',
  '技能',
]);

const COMMON_VALUE_TRANSLATIONS: Record<string, string> = {
  '': '',
  无: 'None',
  现实: 'Reality',
  修仙: 'Cultivation',
  修真: 'Cultivation',
  科幻: 'Sci-Fi',
  奇幻: 'Fantasy',
  历史: 'Historical',
  特殊: 'Special',
  半现实: 'Semi-Reality',
  关闭: 'Disabled',
  基础模式: 'Basic Mode',
  生存模式: 'Survival Mode',
  都市: 'Urban',
  校园: 'Campus',
  经营: 'Management',
  生存: 'Survival',
  探索: 'Exploration',
  自由探索: 'Free exploration',
  角色扮演: 'Roleplay',
  战斗: 'Combat',
  社交: 'Social',
  生活: 'Life',
  专业: 'Professional',
  通用: 'General',
  商业: 'Business',
  成长: 'Growth',
  晴: 'Clear',
  阴: 'Overcast',
  多云: 'Cloudy',
  小雨: 'Light rain',
  大雨: 'Heavy rain',
  雷暴: 'Thunderstorm',
  雪: 'Snow',
  公元: 'CE',
  中立: 'Neutral',
  友好: 'Friendly',
  敌对: 'Hostile',
  冷淡: 'Distant',
  盟友: 'Ally',
  待计算: 'To be calculated',
  陌生: 'Stranger',
  陌生人: 'Stranger',
  未知: 'Unknown',
  未开始: 'Not started',
  进行中: 'In progress',
  计划中: 'Planned',
  已完成: 'Completed',
  重要: 'Important',
  紧急: 'Urgent',
  极高: 'Very high',
  较高: 'Relatively high',
  中高: 'Medium-high',
  高: 'High',
  中: 'Medium',
  中等: 'Medium',
  低: 'Low',
  近期: 'Soon',
  短期: 'Short-term',
  短期有效: 'Valid short-term',
  中期有效: 'Valid mid-term',
  长期: 'Long-term',
  长期有效: 'Valid long-term',
  随时: 'Anytime',
  今天: 'Today',
  今日: 'Today',
  本周: 'This week',
  本月: 'This month',
  永久: 'Permanent',
  人民币: 'RMB',
  元: 'yuan',
  证件: 'Document',
  装备: 'Equipment',
  工具: 'Tool',
  材料: 'Material',
  消耗品: 'Consumable',
  杂物: 'Miscellaneous',
  武器: 'Weapon',
  书籍: 'Book',
  普通: 'Common',
  精良: 'Fine',
  稀有: 'Rare',
  史诗: 'Epic',
  传说: 'Legendary',
  完好: 'Intact',
  全新: 'Brand new',
  男: 'Male',
  女: 'Female',
  人类: 'Human',
  平民: 'Civilian',
  学生: 'Student',
  大学生: 'College student',
  幸存者: 'Survivor',
  竞争对手: 'Competitor',
  单身: 'Single',
  已婚: 'Married',
  未婚: 'Unmarried',
  离异: 'Divorced',
  丧偶: 'Widowed',
  美元: 'US dollars',
  金币: 'Gold coins',
  银两: 'Silver taels',
  铜钱: 'Copper coins',
  单位: 'unit',
  箱: 'box',
  套: 'set',
};

const FIELD_LABELS: Record<string, string> = {
  当前时间: 'current time',
  纪元名称: 'era name',
  当前天气: 'current weather',
  当前位置: 'current location',
  区域特征: 'area features',
  权力结构: 'power structure',
  社会氛围: 'social atmosphere',
  主流价值观: 'mainstream values',
  力量体系: 'power system',
  玩法侧重: 'gameplay focus',
  运行规则: 'operating rule',
  叙事玩法: 'narrative gameplay',
  全局重大事件: 'global event',
  势力动态: 'faction dynamics',
  区域事件: 'regional event',
  本地消息: 'local news',
  圈内传闻: 'inside rumor',
  职业: 'occupation',
  阶层: 'social class',
  所属组织: 'organization',
  特殊身份: 'special identity',
  背景信息: 'backstory',
  当前目标: 'current goal',
  关系描述: 'relationship description',
  关系状态: 'relationship status',
  近期互动: 'recent interaction',
  名称: 'name',
  类型: 'type',
  品质: 'quality',
  有效期: 'valid period',
  特殊属性: 'special attribute',
  备注: 'note',
  用途说明: 'usage note',
  兑换比例: 'exchange rate',
  严重程度: 'severity',
  预计影响时间: 'expected impact time',
  应对措施: 'response measure',
  时效性: 'timeliness',
  所需资源: 'required resources',
  行动计划: 'action plan',
  状态: 'status',
  描述: 'description',
  姓名: 'name',
  性别: 'gender',
  年龄: 'age',
  种族: 'species',
  社会身份: 'social identity',
  所属势力: 'affiliated faction',
  外貌: 'appearance',
  当前想法: 'current thought',
};

function hasChinese(value: string): boolean {
  return /[\u3400-\u9fff]/.test(value);
}

function resolveFieldLabel(path: string[]): string {
  for (let idx = path.length - 1; idx >= 0; idx -= 1) {
    const label = FIELD_LABELS[path[idx]];
    if (label) {
      return label;
    }
  }
  return 'setting detail';
}

function fallbackEnglishValue(path: string[], en: PresetI18nText): string {
  const label = resolveFieldLabel(path);
  return `${en.name} ${label}`;
}

function translateConfigValue(value: unknown, path: string[], en: PresetI18nText, presetId: string): unknown {
  if (typeof value === 'string') {
    const pathKey = path.join('.');
    if (PRESERVE_CHINESE_VALUE_PATHS.has(pathKey) || PRESERVE_CHINESE_VALUES.has(value)) {
      return value;
    }

    const translated = COMMON_VALUE_TRANSLATIONS[value];
    if (translated !== undefined) {
      return translated;
    }

    const presetTranslated = presetValueTranslations[presetId]?.[value];
    if (presetTranslated !== undefined) {
      return presetTranslated;
    }

    if (!hasChinese(value)) {
      return value;
    }

    return fallbackEnglishValue(path, en);
  }

  if (Array.isArray(value)) {
    return value.map(item => translateConfigValue(item, path, en, presetId));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const translatedKey = translateConfigKey(key, presetId);
      output[translatedKey] = translateConfigValue(item, [...path, key], en, presetId);
    }
    return output;
  }

  return value;
}

function translateConfigKey(key: string, presetId: string): string {
  if (FIXED_CONFIG_KEYS.has(key) || /^NPC_\d+$/.test(key) || key.startsWith('$') || key.startsWith('_')) {
    return key;
  }

  return presetValueTranslations[presetId]?.[key] ?? COMMON_VALUE_TRANSLATIONS[key] ?? key;
}

function createEnglishConfig(preset: PresetConfig, en: PresetI18nText): PresetConfig['config'] {
  const configEn = translateConfigValue(cloneConfig(preset.config), [], en, preset.id) as PresetConfig['config'];
  const identity = configEn.玩家?.身份信息;

  if (identity) {
    identity.职业 = identity.职业 || 'Protagonist';
    identity.阶层 = identity.阶层 || 'To be determined';
    identity.所属组织 = identity.所属组织 || 'None';
    identity.特殊身份 = `${en.name} protagonist`;
    identity.背景信息 = en.description;
  }

  if (configEn.玩家) {
    configEn.玩家.当前目标 = `Begin the story in the setting of ${en.name}, establish the character's situation, and choose the first course of action.`;
  }

  return configEn;
}

export function applyPresetI18n(presets: PresetConfig[]): PresetConfig[] {
  return presets.map(preset => {
    const en = preset.i18n?.en ?? presetI18nEn[preset.id];
    if (!en) {
      return preset;
    }

    const configEn = en.configEn ?? createEnglishConfig(preset, en);

    return {
      ...preset,
      i18n: {
        ...preset.i18n,
        en: {
          ...en,
          configEn,
        },
      },
    };
  });
}
