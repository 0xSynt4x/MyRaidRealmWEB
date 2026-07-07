import { variableUpdateRulesTemplate as rawVariableUpdateRules } from '../../../../assets/standalone-local-content';
import type { AiGenerateModuleKey } from '../types/formData';

const normalizedRuleSource = rawVariableUpdateRules.replace(/\r\n/g, '\n');

function extractRuleBlock(startMarker: string, endMarker?: string): string {
  const startIndex = normalizedRuleSource.indexOf(startMarker);
  if (startIndex === -1) {
    return '';
  }

  const sliceStart = startIndex;
  const sliceEnd = endMarker ? normalizedRuleSource.indexOf(endMarker, startIndex) : -1;
  const rawBlock =
    sliceEnd === -1 ? normalizedRuleSource.slice(sliceStart) : normalizedRuleSource.slice(sliceStart, sliceEnd);

  return cleanupRuleBlock(rawBlock);
}

function cleanupRuleBlock(block: string): string {
  return block
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed !== '' && !trimmed.startsWith('<%_') && !trimmed.startsWith('_%>');
    })
    .map(line => line.replace(/\t/g, '  ').replace(/\s+$/g, ''))
    .join('\n')
    .trim();
}

function joinRuleBlocks(blocks: string[]): string {
  return blocks.filter(Boolean).join('\n\n').trim();
}

const worldRuleExcerpt = extractRuleBlock('  世界:', '\n<%_ if (显示血量体力) { _%>');

const playerRuleExcerpt = joinRuleBlocks([
  '玩家:',
  extractRuleBlock('    姓名:', '\n    技能系统:'),
  extractRuleBlock('    技能系统:', '\n    势力关系:'),
  extractRuleBlock('    势力关系:', '\n    货币资源:'),
  extractRuleBlock('    货币资源:', '\n    物品栏:'),
  extractRuleBlock('    物品栏:', '\n    商业情报:'),
  extractRuleBlock('    经营实体:', '\n    记事本:'),
  extractRuleBlock('    记事本:', '\n  # ========================================'),
]);

const npcRuleExcerpt = extractRuleBlock('  人物档案:', '\n<%_ if (商城刷新触发) { _%>');

function renderRuleExcerpt(title: string, excerpt: string): string {
  return `### 规则原文相关片段（必须遵守，不是参考建议）\n以下内容是从通用规则中提取出的当前模块相关部分，目的是把结构、边界、字段要求直接带给你。\n\n\
\`\`\`yaml\n# ${title}\n${excerpt}\n\`\`\``;
}

const MODULE_RULE_PROMPTS: Record<AiGenerateModuleKey, string> = {
  world: `## 当前模块强制规则（世界）
${renderRuleExcerpt('世界模块', worldRuleExcerpt)}

### 本页额外封口规则（和当前页面边界一起强制执行）
- 这页只允许生成顶层“设置”“世界”。
- “设置”里只允许给出“生存系统模式”，不要输出积分系统、抽奖、刷新、保底等运行期开关。
- “世界”里只允许围绕：时间系统、空间定位、社会环境、力量体系、玩法侧重、运行规则、叙事玩法、信息层级、势力网络。
- 世界.势力网络只描述世界上的势力格局、势力之间的关系、势力的规模和影响力。
- 世界.运行规则必须是字符串数组；世界.信息层级必须是对象，且五个字段的值都必须是字符串。
- 世界.势力网络中的每个势力都必须是“势力名 -> 影响力 / 人数 / 关系”的对象；关系中的每个目标势力都必须是“目标势力 -> 关系值 / 关系描述”的对象。
- 任何以下写法都视为失败：把运行规则写成一句长文、把信息层级写成数组、在势力网络里混入不属于势力关系的数据、输出任何以“_”或“$”开头的内部字段。`,
  player: `## 当前模块强制规则（玩家）
${renderRuleExcerpt('玩家模块', playerRuleExcerpt)}

### 本页额外封口规则（和当前页面边界一起强制执行）
- 这页只允许生成顶层“玩家”。
- 玩家主体只允许围绕：姓名、年龄、性别、身份信息、当前目标、技能系统、势力关系、货币资源、物品栏、经营实体、记事本。
- 玩家.货币资源必须严格分层：主货币放在“主货币”里，其他货币放在“次级货币”里；不能平铺到玩家顶层。
- 玩家.物品栏必须是“物品名 -> 小对象”的映射；物品名不能包含英文句点“.”；每个物品只能写数量、类型、品质、有效期、特殊属性、备注。
- 玩家.经营实体必须是“实体名 -> 小对象”的映射；每个实体内部必须按“类型 / 位置 / 外观 / 财务 / 运营 / 市场 / 重要设施 / 当前问题 / 发展潜力 / 备注”组织，不能偷换成一句描述。
- 玩家.记事本必须严格分成三块：潜在危机、当前机遇、待办事项。三块都必须是“条目标题 -> 小对象”的映射，绝不能写成字符串、数组、或“标题: 一句话”。
- 绝对禁止输出任何以“_”或“$”开头的内部字段。`,
  npc: `## 当前模块强制规则（人物档案）
${renderRuleExcerpt('人物档案模块', npcRuleExcerpt)}

### 本页额外封口规则（和当前页面边界一起强制执行）
- 这页只允许生成顶层“人物档案”。
- 人物档案顶层的每个键都必须是“NPC_数字”格式，例如 NPC_1、NPC_2；同一批输出里不能重复编号，也不要用人名直接当键。
- 每个 NPC 只能围绕该人物自己的资料展开：基础信息、生存状态、社会身份、关系数据、个人信息、交互记忆、重要NPC、婚姻状态、联系方式、近期事件、重要经历。
- 关系数据.核心锚点必须是对象数组，每一项都必须同时包含“事件 / 影响 / 权重”；不能写成一句话，不能写成字符串数组。
- 重要经历如果填写，单条必须严格写成“[时间] 来源@地点: 事件”。缺少时间、来源、地点或事件正文中的任意一段，都算失败。
- 重要经历的安全策略只有两个：要么按标准格式写完整，要么直接输出空数组 []；绝对不要写半截自然语言句子去碰运气。
- 绝对禁止输出 _关注、$time 等内部维护字段。
- 如果信息不足，可以让近期事件、重要经历、交互记忆留空数组，但结构必须正确，不能把空数组偷换成空字符串。`,
};

export function getModuleRulePrompt(moduleKey: AiGenerateModuleKey): string {
  return MODULE_RULE_PROMPTS[moduleKey];
}
