export type RelationData = {
  好感度: number;
  信任度: number;
  关系类型: string;
  印象标签: string[];
};

export type SurvivalStatus = {
  血量: number;
  体力值: number;
  饥饿值: number;
  口渴值: number;
};

export type SocialIdentity = {
  职业: string;
  所属势力: string;
  社会地位: string;
};

export type PersonalInfo = {
  外貌: string;
  表性格: string;
  里性格: string;
  当前想法: string;
  特殊能力: string;
  当前穿着: string;
  当前位置: string;
  当前状态: string;
  持有物品: string;
  过往经历: string[];
  备注: string;
};

export type NpcBase = {
  姓名: string;
  性别: string;
  年龄: string;
  种族: string;
  婚姻状态: string;
  生存状态: SurvivalStatus;
  社会身份: SocialIdentity;
  关系数据: RelationData;
  个人信息: PersonalInfo;
  联系方式: string;
  重要NPC: boolean;
  _关注: boolean;
  近期事件: string[];
  重要经历: string[];
  $time?: number;
};

export type NpcRecord = Record<string, NpcBase>;

export function createNpcDraft(npc: Partial<NpcBase> = {}): NpcBase {
  return {
    姓名: npc.姓名 ?? '',
    性别: npc.性别 ?? '',
    年龄: npc.年龄 ?? '',
    种族: npc.种族 ?? '人类',
    婚姻状态: npc.婚姻状态 ?? '',
    生存状态: {
      血量: npc.生存状态?.血量 ?? 100,
      体力值: npc.生存状态?.体力值 ?? 100,
      饥饿值: npc.生存状态?.饥饿值 ?? 100,
      口渴值: npc.生存状态?.口渴值 ?? 100,
    },
    社会身份: {
      职业: npc.社会身份?.职业 ?? '',
      所属势力: npc.社会身份?.所属势力 ?? '',
      社会地位: npc.社会身份?.社会地位 ?? '',
    },
    关系数据: {
      好感度: npc.关系数据?.好感度 ?? 0,
      信任度: npc.关系数据?.信任度 ?? 0,
      关系类型: npc.关系数据?.关系类型 ?? '',
      印象标签: [...(npc.关系数据?.印象标签 ?? [])],
    },
    个人信息: {
      外貌: npc.个人信息?.外貌 ?? '',
      表性格: npc.个人信息?.表性格 ?? '',
      里性格: npc.个人信息?.里性格 ?? '',
      当前想法: npc.个人信息?.当前想法 ?? '',
      特殊能力: npc.个人信息?.特殊能力 ?? '',
      当前穿着: npc.个人信息?.当前穿着 ?? '',
      当前位置: npc.个人信息?.当前位置 ?? '',
      当前状态: npc.个人信息?.当前状态 ?? '',
      持有物品: npc.个人信息?.持有物品 ?? '',
      过往经历: [...(npc.个人信息?.过往经历 ?? [])],
      备注: npc.个人信息?.备注 ?? '',
    },
    联系方式: npc.联系方式 ?? '',
    重要NPC: npc.重要NPC ?? false,
    _关注: npc._关注 ?? false,
    近期事件: [...(npc.近期事件 ?? [])],
    重要经历: [...(npc.重要经历 ?? [])],
    $time: npc.$time,
  };
}

export function normalizeNpcDraft(draft: NpcBase): NpcBase {
  return createNpcDraft(draft);
}

export type NewNpcOptions = {
  重要NPC?: boolean;
  _关注?: boolean;
};

export function createNewNpc(
  name: string,
  relationType: string,
  description: string,
  options: NewNpcOptions = {},
): NpcBase {
  return createNpcDraft({
    姓名: name,
    种族: '人类',
    性别: '未知',
    年龄: '未知',
    婚姻状态: '未知',
    联系方式: '无',
    社会身份: {
      职业: '未知',
      所属势力: '无',
      社会地位: '平民',
    },
    关系数据: {
      好感度: 0,
      信任度: 0,
      关系类型: relationType,
      印象标签: [],
    },
    个人信息: {
      外貌: '待描述',
      表性格: '待描述',
      里性格: '未知',
      当前想法: '',
      特殊能力: '无',
      当前穿着: '待描述',
      当前位置: '未知',
      当前状态: '正常',
      持有物品: '',
      过往经历: ['未知'],
      备注: description || '',
    },
    重要NPC: options.重要NPC ?? false,
    _关注: options._关注 ?? false,
    近期事件: [],
    重要经历: [],
    $time: Date.now(),
  });
}
