import type {
  AiGenerateFormData,
  AiGenerateModuleKey,
  NpcModuleFormData,
  PlayerModuleFormData,
  WorldModuleFormData,
} from '../types/formData';

const MODULE_TITLES: Record<AiGenerateModuleKey, string> = {
  world: '世界',
  player: '玩家',
  npc: '人物档案',
};

const MISSING_FIELD_SUPPLEMENTS: Record<AiGenerateModuleKey, string> = {
  world: `## 缺失信息时的补全原则
- 如果用户没有把世界信息填满，你可以按“当前页面允许出现的字段”做保守补全，让世界舞台能落地。
- 优先补足：时间系统、空间定位、社会环境、力量体系、玩法侧重、运行规则、叙事玩法、信息层级、势力网络。
- 补全时要保持自洽。
- 如果某块信息明显不足，宁可写成简洁、可继续扩展的基础版本。`,
  player: `## 缺失信息时的补全原则
- 如果用户没有把玩家信息填满，你可以按“当前页面允许出现的字段”做保守补全，让玩家初始状态可直接使用。
- 优先补足：身份信息、当前目标、技能系统、势力关系、货币资源、物品栏、经营实体、记事本。
- 补全时应围绕“玩家本人”和“玩家手上的东西”。
- 如果某一块缺少足够信息，先给出基础可运行版本。`,
  npc: `## 缺失信息时的补全原则
- 如果用户没有把人物要求填满，你可以按“当前页面允许出现的字段”做保守补全，生成一批结构正确的人物档案。
- 优先补足：人物基础信息、生存状态、社会身份、关系数据、个人信息、交互记忆、近期事件、重要经历。
- 补全时要让人物之间和玩家可能存在合理联系。
- 如果缺少足够信息，允许减少人物数量、简化事件密度，或把可留空的数组字段输出为空数组，只要结构保持正确。`,
};

export function getModuleTitle(moduleKey: AiGenerateModuleKey): string {
  return MODULE_TITLES[moduleKey];
}

export function getMissingFieldSupplement(moduleKey: AiGenerateModuleKey): string {
  return MISSING_FIELD_SUPPLEMENTS[moduleKey];
}

export function buildPromptFromFormData(moduleKey: AiGenerateModuleKey, formData: AiGenerateFormData): string {
  switch (moduleKey) {
    case 'world':
      return buildWorldPrompt(formData.world);
    case 'player':
      return buildPlayerPrompt(formData.player);
    case 'npc':
      return buildNpcPrompt(formData.npc);
  }
}

function buildWorldPrompt(moduleData: WorldModuleFormData): string {
  const sections: string[] = [];
  const worldRules = moduleData.worldRules.filter(rule => rule.trim() !== '');

  sections.push('## 这一页要做什么');
  sections.push('你现在只负责搭建世界舞台。');
  sections.push('你只能填写顶层“设置”和“世界”。');
  sections.push('这一页的目标，是把世界边界、运行逻辑、信息层级、势力网络写清楚。');
  sections.push('');

  sections.push('## 用户填写');
  sections.push(`- 世界类型：${fallback(moduleData.worldType)}`);
  sections.push(`- 纪元名称：${fallback(moduleData.eraName)}`);
  sections.push(`- 生存系统模式：${fallback(moduleData.survivalMode)}`);
  sections.push('- 世界规则输入：');
  if (worldRules.length > 0) {
    worldRules.forEach((rule, index) => {
      sections.push(`  ${index + 1}. ${rule}`);
    });
  } else {
    sections.push('  - 未填写；你可以在世界页允许范围内保守补足。');
  }
  sections.push(`- 世界侧势力网络要求：${fallback(moduleData.worldOrganizationNetwork)}`);
  sections.push(`- 世界自由描述：${fallback(moduleData.additionalRequirement)}`);
  sections.push('');

  sections.push('## 这页必须守住的边界');
  sections.push(
    '- 只允许出现：设置、生存系统模式、世界、时间系统、空间定位、社会环境、力量体系、玩法侧重、运行规则、叙事玩法、信息层级、势力网络。',
  );
  sections.push('- 势力网络只写世界上的势力和势力之间的联系。');
  sections.push('');

  sections.push('## 这页的结构硬要求');
  sections.push('- 设置只能出现“生存系统模式”，不要加积分系统、抽奖、刷新、保底之类内部运行内容。');
  sections.push('- 世界.时间系统必须是对象，里面只放：当前时间、纪元名称、当前天气。');
  sections.push('- 世界.空间定位必须是对象，里面只放：当前位置、区域特征。');
  sections.push('- 世界.社会环境必须是对象，里面只放：权力结构、社会氛围、主流价值观。');
  sections.push('- 世界.力量体系是字符串。');
  sections.push('- 世界.玩法侧重是字符串。');
  sections.push('- 世界.运行规则必须是字符串数组，最多 10 条，每条单独成句，不能写成对象，不能写成一整段说明。');
  sections.push('- 世界.叙事玩法是字符串。');
  sections.push(
    '- 世界.信息层级必须是对象，且必须保留五个固定槽位：全局重大事件、势力动态、区域事件、本地消息、圈内传闻；每个槽位的值都必须是字符串。',
  );
  sections.push('- 世界.势力网络必须是“势力名 -> 小对象”的映射；每个势力对象只能有：影响力、人数、关系。');
  sections.push(
    '- 世界.势力网络.某势力.关系 也必须是“目标势力名 -> 小对象”的映射；每个关系对象只能有：关系值、关系描述。',
  );
  sections.push('- 影响力应控制在 0~100，关系值应控制在 -100~100。');
  sections.push('');

  sections.push('## 输出前自检');
  sections.push('- 运行规则是不是数组。');
  sections.push('- 信息层级是不是对象，而且五格都装字符串。');
  sections.push('- 势力网络是不是势力之间的关系结构。');

  return sections.join('\n');
}

function buildPlayerPrompt(moduleData: PlayerModuleFormData): string {
  const sections: string[] = [];

  sections.push('## 这一页要做什么');
  sections.push('你现在只负责“玩家本人”和“玩家手上的东西”。');
  sections.push('这一页最重要的是：玩家主体、货币资源、物品栏、经营实体、记事本三块结构必须写对。');
  sections.push('');

  sections.push('## 用户填写');
  sections.push(`- 玩家姓名：${fallback(moduleData.playerName)}`);
  sections.push(`- 玩家年龄：${fallback(moduleData.playerAge)}`);
  sections.push(`- 玩家性别：${fallback(moduleData.playerGender)}`);
  sections.push(`- 玩家身份：${fallback(moduleData.playerIdentity)}`);
  sections.push(`- 玩家目标：${fallback(moduleData.playerGoal)}`);
  sections.push(`- 玩家技能：${fallback(moduleData.playerSkills)}`);
  sections.push(`- 主货币名称：${fallback(moduleData.mainCurrencyName)}`);
  sections.push(`- 初始资金：${moduleData.initialFunds ?? '未填写'}`);
  sections.push(`- 玩家和势力关系方向：${fallback(moduleData.factionRelationship)}`);
  if (moduleData.secondaryCurrency) {
    sections.push(
      `- 次级货币：名称=${fallback(moduleData.secondaryCurrency.name)}；数量=${moduleData.secondaryCurrency.amount ?? '未填写'}；兑换比例=${fallback(moduleData.secondaryCurrency.exchangeRate)}；用途=${fallback(moduleData.secondaryCurrency.usage)}`,
    );
  } else {
    sections.push('- 次级货币：未填写');
  }
  sections.push(`- 初始物品：${fallback(moduleData.inventory)}`);
  sections.push(`- 玩家记事本：${fallback(moduleData.notebook)}`);
  sections.push(`- 经营实体：${fallback(moduleData.businessEntity)}`);
  sections.push(`- 玩家自由描述：${fallback(moduleData.additionalRequirement)}`);
  sections.push('');

  sections.push('## 这页必须守住的边界');
  sections.push('- 顶层只允许有“玩家”。');
  sections.push('- 玩家和组织的关系写在“玩家.势力关系”。');
  sections.push('- 货币、物品、经营实体、记事本都挂在“玩家”下面。');
  sections.push('');

  sections.push('## 这页的结构硬要求');
  sections.push(
    '- 玩家顶层只允许：姓名、年龄、性别、身份信息、当前目标、技能系统、势力关系、货币资源、物品栏、经营实体、记事本。',
  );
  sections.push('- 玩家.身份信息必须是对象，只允许：职业、阶层、所属组织、特殊身份、背景信息。');
  sections.push('- 玩家.技能系统必须是“技能名 -> 小对象”的映射，不能写成数组；每个技能对象只能有：品质、描述、类型。');
  sections.push('- 技能品质只能是：普通、精良、稀有、史诗、传说。不能写第六种品质。');
  sections.push(
    '- 玩家.势力关系必须是“势力名 -> 小对象”的映射；每个对象只能有：声望值、声望等级、关系状态、头衔列表、近期互动。',
  );
  sections.push('- 头衔列表必须是字符串数组。');
  sections.push('- 玩家.货币资源必须是对象，并严格分成“主货币”和“次级货币”两层。');
  sections.push('- 玩家.货币资源.主货币必须是对象，只能有：名称、数量。');
  sections.push('- 玩家.货币资源.次级货币必须是“货币名 -> 小对象”的映射；每个对象只能有：数量、兑换比例、用途说明。');
  sections.push(
    '- 玩家.物品栏必须是“物品名 -> 小对象”的映射，不能写成数组；每个物品对象只能有：数量、类型、品质、有效期、特殊属性、备注。',
  );
  sections.push('- 物品品质只能是：普通、精良、稀有、史诗、传说。不能写第六种品质。');
  sections.push('- 物品名称绝对不能包含英文句点“.”。');
  sections.push(
    '- 玩家.经营实体必须是“实体名 -> 小对象”的映射；每个实体对象只能有：类型、位置、外观、财务、运营、市场、重要设施、当前问题、发展潜力、备注。',
  );
  sections.push('- 财务必须是对象，只能有：收入、支出、资产价值、负债。');
  sections.push('- 运营必须是对象，只能有：运营状态、人员数量。');
  sections.push('- 市场必须是对象，只能有：客户群体、竞争态势、特色优势。');
  sections.push('- 重要设施必须是字符串数组。');
  sections.push('- 玩家.记事本必须是对象，并且只能分成：潜在危机、当前机遇、待办事项 三块。');
  sections.push('- 这三块都必须是“条目标题 -> 小对象”的映射，绝对不能写成字符串、字符串数组、或“标题: 一句话说明”。');
  sections.push('- 潜在危机的每条只允许：严重程度、预计影响时间、应对措施。');
  sections.push('- 当前机遇的每条只允许：时效性、所需资源、行动计划。');
  sections.push('- 待办事项的每条只允许：优先级、截止时间、状态。');
  sections.push('');

  sections.push('## 输出前自检');
  sections.push('- 记事本三块是不是都保持“标题 -> 小对象”，而不是偷懒写成一句话。');
  sections.push('- 技能和物品的品质是不是只用了五个固定等级。');
  sections.push('- 物品名称里有没有英文句点“.”。');

  return sections.join('\n');
}

function buildNpcPrompt(moduleData: NpcModuleFormData): string {
  const sections: string[] = [];

  sections.push('## 这一页要做什么');
  sections.push('你负责人物档案卡。');
  sections.push('你只能填写顶层“人物档案”。');
  sections.push('这一页最重要的是：档案编号格式、人物内部栏目结构。');
  sections.push('');

  sections.push('## 用户填写');
  sections.push(`- 重要人物要求：${fallback(moduleData.importantNPCs)}`);
  sections.push(`- 角色数量倾向：${fallback(moduleData.npcCountPreference)}`);
  sections.push(`- 身份与职业要求：${fallback(moduleData.identityAndProfession)}`);
  sections.push(`- 性格、状态、关系、目标：${fallback(moduleData.personalityAndStatus)}`);
  sections.push(`- 玩家与人物关系方向：${fallback(moduleData.playerRelationshipDirection)}`);
  sections.push(`- 人物自由描述：${fallback(moduleData.additionalRequirement)}`);
  sections.push('');

  sections.push('## 这页必须守住的边界');
  sections.push('- 顶层只允许有“人物档案”。');
  sections.push('');

  sections.push('## 这页的结构硬要求');
  sections.push('- 人物档案顶层必须是“NPC_数字 -> 小对象”的映射，例如 NPC_1、NPC_2。');
  sections.push('- 编号必须从 NPC_1 开始连续递增，不能跳号，不能重复，不能直接用人名做键。');
  sections.push(
    '- 每个 NPC 小对象只允许：姓名、种族、性别、年龄、生存状态、社会身份、关系数据、个人信息、交互记忆、重要NPC、婚姻状态、联系方式、近期事件、重要经历。',
  );
  sections.push('- 生存状态必须是对象，只允许：血量、体力值、饥饿值、口渴值。');
  sections.push('- 社会身份必须是对象，只允许：职业、所属势力、社会地位。');
  sections.push('- 关系数据必须是对象，只允许：好感度、信任度、关系类型、印象标签、核心锚点。');
  sections.push('- 印象标签必须是字符串数组。');
  sections.push('- 核心锚点必须是对象数组；每一项都必须同时有：事件、影响、权重。不能写成字符串，不能写成字符串数组。');
  sections.push(
    '- 个人信息必须是对象，只允许：价值观、执念与目标、心理创伤、外貌、表性格、里性格、当前想法、特殊能力、当前穿着、当前位置、当前状态、持有物品、过往经历、备注。',
  );
  sections.push('- 价值观必须是对象，只允许：喜好、厌恶、雷区；其中喜好和厌恶必须是字符串数组。');
  sections.push('- 当前想法必须是字符串，尽量写成该人物此刻的内心想法。');
  sections.push('- 过往经历必须是字符串数组。');
  sections.push('- 交互记忆必须是对象，只允许：未完成约定、共同秘密、赠礼记录；三者都必须是字符串数组。');
  sections.push('- 近期事件必须是字符串数组。');
  sections.push('- 重要经历必须是字符串数组；如果填写，单条格式必须写成“[时间] 来源@地点: 事件”。');
  sections.push('- 绝对禁止输出 _关注、$time 这类内部维护字段。');
  sections.push('');

  sections.push('## 输出前自检');
  sections.push('- 键名是不是 NPC_1、NPC_2 这种格式，而且没有跳号。');
  sections.push('- 核心锚点是不是对象数组，而不是一句话清单。');

  return sections.join('\n');
}

function fallback(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '未填写';
  }

  const trimmed = value.trim();
  return trimmed === '' ? '未填写' : trimmed;
}
