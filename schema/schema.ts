import { z } from 'zod';

export const Schema = z.object({
  // ===== 系统设置 =====
  设置: z
    .object({
      生存系统模式: z.enum(['关闭', '基础模式', '生存模式']).prefault('关闭'),

      // === 积分系统（前端设置，AI回复后重置触发变量） ===
      积分系统: z
        .object({
          // === 触发变量（前端设置，AI回复后重置） ===
          商城刷新: z.boolean().prefault(false),
          抽奖触发: z.boolean().prefault(false),
          $保底次数: z.coerce.number().prefault(0), // 前端专用，AI不可见
          保底触发: z.boolean().prefault(false), // 是否触发保底

          // === 持久化状态变量 ===
          抽奖次数: z.coerce.number().prefault(0), // 本次抽奖次数，抽奖后重置为0
          上次签到日期: z.string().prefault(''), // 格式: "YYYY-MM-DD"
          _兑换比例: z.coerce.number().prefault(100), // X 主货币 = 100 积分，0表示禁用兑换（只读）
        })
        .prefault({}),
    })
    .prefault({}),

  // ===== 世界系统 =====
  世界: z
    .object({
      时间系统: z
        .object({
          当前时间: z.string().prefault(''),
          纪元名称: z.string().prefault(''), // 如: 公元/灵历/星历
          当前天气: z.string().prefault(''), // 如: 晴/多云/阴/小雨/大雨/雷暴/雪 等
        })
        .prefault({}),

      空间定位: z
        .object({
          当前位置: z.string().prefault(''),
          区域特征: z.string().prefault(''), // 该区域的特殊属性
        })
        .prefault({}),

      社会环境: z
        .object({
          权力结构: z.string().prefault(''), // 政治体制/魔法议会/公司联盟等
          社会氛围: z.string().prefault(''),
          主流价值观: z.string().prefault(''),
        })
        .prefault({}),

      // 世界规则与玩法
      力量体系: z.string().prefault(''), // 描述该世界的力量/能力体系
      玩法侧重: z.string().prefault(''), // 战斗/经营/社交/探索等
      运行规则: z
        .array(z.string())
        .transform(arr => arr.slice(-6))
        .prefault([]), // 世界运行规则，采用并列多行格式，最多6条
      叙事玩法: z.string().prefault(''), // 当前叙事玩法重点

      信息层级: z
        .object({
          全局重大事件: z.string().prefault(''),
          势力动态: z.string().prefault(''), // 主要势力的行动
          区域事件: z.string().prefault(''),
          本地消息: z.string().prefault(''),
          圈内传闻: z.string().prefault(''), // 行业/圈子内的小道消息
        })
        .prefault({}),

      势力网络: z
        .record(
          z.string().describe('势力名称'),
          z.object({
            影响力: z.coerce
              .number()
              .transform(v => _.clamp(v, 0, 100))
              .prefault(10), // 0~100，势力在世界中的综合影响程度
            人数: z.coerce
              .number()
              .transform(v => Math.max(0, v))
              .prefault(0), // 势力成员/追随者数量
            关系: z
              .record(
                z.string().describe('目标势力'),
                z.object({
                  关系值: z.coerce
                    .number()
                    .transform(v => _.clamp(v, -100, 100))
                    .prefault(0), // -100=死敌, 0=中立, 100=紧密同盟
                  关系描述: z.string().prefault(''),
                }),
              )
              .prefault({}),
          }),
        )
        .prefault({}),
    })
    .prefault({}),

  // ===== 玩家系统 =====
  玩家: z
    .object({
      // ===== 生存状态 =====
      生存状态: z
        .object({
          血量: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 100))
            .prefault(100),
          体力值: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 100))
            .prefault(100),
          饥饿值: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 100))
            .prefault(100),
          口渴值: z.coerce
            .number()
            .transform(v => _.clamp(v, 0, 100))
            .prefault(100),
        })
        .prefault({}),

      // ===== 基本信息 =====
      姓名: z.string().prefault(''),
      年龄: z.union([z.coerce.number(), z.string()]).prefault(''),
      性别: z.string().prefault(''),

      身份信息: z
        .object({
          职业: z.string().prefault(''),
          阶层: z.string().prefault(''), // 贵族/平民/奴隶/公民等级等
          所属组织: z.string().prefault(''),
          特殊身份: z.string().prefault(''), // 如:通缉犯/贵族后裔/觉醒者等
          背景信息: z.string().prefault(''), // 玩家背景经历
        })
        .prefault({}),

      当前目标: z.string().prefault(''), // 玩家当前目标

      技能系统: z
        .record(
          z.string().describe('技能名称'),
          z.object({
            品质: z.enum(['普通', '精良', '稀有', '史诗', '传说']),
            描述: z.string().prefault(''),
            类型: z.string().prefault(''), // 战斗/生活/商业/社交/专业等
          }),
        )
        .prefault({}),

      势力关系: z
        .record(
          z.string().describe('势力名称'),
          z.object({
            声望值: z.coerce
              .number()
              .transform(v => _.clamp(v, -100, 100))
              .prefault(0),
            声望等级: z.string().or(z.literal('待计算')).prefault(''),
            关系状态: z.string().prefault(''), // 敌对/冷淡/中立/友好/盟友
            头衔列表: z.array(z.string()).prefault([]), // 该势力授予的所有头衔或称号
            近期互动: z.string().prefault(''),
          }),
        )
        .prefault({}),

      货币资源: z
        .object({
          主货币: z
            .object({
              名称: z.string().prefault(''),
              数量: z.coerce
                .number()
                .transform(v => Math.max(0, v))
                .prefault(500),
            })
            .prefault({}),

          次级货币: z
            .record(
              z.string().describe('货币名称'),
              z.object({
                数量: z.coerce.number().prefault(0),
                兑换比例: z.string().prefault(''), // 与主货币的兑换关系
                用途说明: z.string().prefault(''),
              }),
            )
            .prefault({}),
        })
        .prefault({}),

      物品栏: z
        .record(
          z.string().describe('物品名称'),
          z.object({
            数量: z.coerce.number().prefault(0),
            类型: z.string().prefault(''), // 证件/消耗品/装备/材料等
            品质: z.enum(['普通', '精良', '稀有', '史诗', '传说']).prefault('普通'),
            有效期: z.string().prefault(''),
            特殊属性: z.string().prefault(''),
            备注: z.string().prefault(''),
          }),
        )
        .transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0))
        .prefault({}),

      商业情报: z
        .record(
          z.string().describe('情报编号或简述'),
          z.object({
            类型: z.string().prefault(''),
            内容: z.string().prefault(''),
            可靠度: z.string().prefault(''),
            获取时间: z.string().prefault(''),
            时效性: z.string().prefault(''),
            $time: z.coerce.number().prefault(() => Date.now()),
          }),
        )
        .transform(data => {
          const entries = _(data).entries().sortBy('[1].$time').value();
          return entries.length > 15 ? _.fromPairs(entries.slice(-15)) : data;
        })
        .prefault({}),

      库存详情: z
        .record(
          z.string().describe('货物名称'),
          z.object({
            数量: z.coerce
              .number()
              .transform(v => Math.max(0, v))
              .prefault(0),
            单位: z.string().prefault(''),
            存放地点: z.string().prefault(''),
            品质状况: z.string().prefault(''),
            进货价: z.coerce.number().prefault(0),
            预计售价: z.coerce.number().prefault(0),
            备注: z.string().prefault(''),
          }),
        )
        .transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0))
        .prefault({}),

      经营实体: z
        .record(
          z.string().describe('实体名称'),
          z.object({
            // === 基础信息 ===
            类型: z.string().prefault(''), // 商铺/工坊/飞船/灵田等
            位置: z.string().prefault(''),
            外观: z.string().prefault(''), // 新增: 一句话描述外观

            // === 财务数据 ===
            财务: z
              .object({
                收入: z.coerce.number().prefault(0), // 周期性收入
                支出: z.coerce.number().prefault(0), // 周期性支出
                资产价值: z.coerce.number().prefault(0), // 实体估值
                负债: z.coerce.number().prefault(0), // 贷款/欠款
              })
              .prefault({}),

            // === 运营管理 ===
            运营: z
              .object({
                运营状态: z.string().prefault(''),
                人员数量: z.coerce.number().prefault(0),
              })
              .prefault({}),

            // === 市场表现 ===
            市场: z
              .object({
                客户群体: z.string().prefault(''), // 目标客户描述
                竞争态势: z.string().prefault(''), // 竞争对手/市场地位
                特色优势: z.string().prefault(''), // 独特卖点
              })
              .prefault({}),
            // === 特殊设施 ===
            重要设施: z.array(z.string()).prefault([]),

            // === 风险与机遇 ===
            当前问题: z.string().prefault(''), // 面临的主要问题
            发展潜力: z.string().prefault(''), // 未来发展方向
            备注: z.string().prefault(''),
          }),
        )
        .prefault({}),

      记事本: z
        .object({
          潜在危机: z
            .record(
              z.string().describe('危机简述'),
              z.object({
                严重程度: z.string().prefault(''),
                预计影响时间: z.string().prefault(''),
                应对措施: z.string().prefault(''),
                $time: z.coerce.number().prefault(() => Date.now()),
              }),
            )
            .transform(data => {
              const entries = _(data).entries().sortBy('[1].$time').value();
              return entries.length > 10 ? _.fromPairs(entries.slice(-10)) : data;
            })
            .prefault({}),

          当前机遇: z
            .record(
              z.string().describe('机遇简述'),
              z.object({
                时效性: z.string().prefault(''),
                所需资源: z.string().prefault(''),
                行动计划: z.string().prefault(''),
                $time: z.coerce.number().prefault(() => Date.now()),
              }),
            )
            .transform(data => {
              const entries = _(data).entries().sortBy('[1].$time').value();
              return entries.length > 10 ? _.fromPairs(entries.slice(-10)) : data;
            })
            .prefault({}),

          待办事项: z
            .record(
              z.string().describe('事项描述'),
              z.object({
                优先级: z.string().prefault(''),
                截止时间: z.string().prefault(''),
                状态: z.string().prefault(''),
                $time: z.coerce.number().prefault(() => Date.now()),
              }),
            )
            .transform(data => {
              const entries = _(data).entries().sortBy('[1].$time').value();
              if (entries.length <= 15) return data;

              // 分离已完成/已取消的和其他状态的
              const completed = entries.filter(([, v]) => v.状态 === '已完成' || v.状态 === '已取消');
              const active = entries.filter(([, v]) => v.状态 !== '已完成' && v.状态 !== '已取消');

              // 如果活跃项已经超过15条，只保留最新的15条活跃项
              if (active.length >= 15) {
                return _.fromPairs(active.slice(-15));
              }

              // 否则保留所有活跃项 + 最新的已完成项（总共15条）
              const remainingSlots = 15 - active.length;
              const keptCompleted = completed.slice(-remainingSlots);
              return _.fromPairs([...keptCompleted, ...active]);
            })
            .prefault({}),
        })
        .prefault({}),
    })
    .prefault({}),

  // ===== 人际关系系统 =====
  人物档案: z
    .record(
      z.string().describe('人物ID - 仅可使用 NPC_数字 格式（如"NPC_1","NPC_2"），数字键在同一批导入内必须不重复且自增'),
      z.object({
        姓名: z.string().prefault(''),
        种族: z.string().prefault(''), // 支持人类/精灵/机器人/外星人等
        性别: z.string().prefault(''),
        年龄: z.union([z.coerce.number(), z.string()]).prefault(''),

        // 新增：生存状态（与玩家相同结构）
        生存状态: z
          .object({
            血量: z.coerce
              .number()
              .transform(v => _.clamp(v, 0, 100))
              .prefault(100),
            体力值: z.coerce
              .number()
              .transform(v => _.clamp(v, 0, 100))
              .prefault(100),
            饥饿值: z.coerce
              .number()
              .transform(v => _.clamp(v, 0, 100))
              .prefault(100),
            口渴值: z.coerce
              .number()
              .transform(v => _.clamp(v, 0, 100))
              .prefault(100),
          })
          .prefault({}),

        社会身份: z
          .object({
            职业: z.string().prefault(''),
            所属势力: z.string().prefault(''),
            社会地位: z.string().prefault(''),
          })
          .prefault({}),

        关系数据: z
          .object({
            好感度: z.coerce
              .number()
              .transform(v => _.clamp(v, -100, 100))
              .prefault(0),
            信任度: z.coerce
              .number()
              .transform(v => _.clamp(v, -100, 100))
              .prefault(0),
            关系类型: z.string().prefault(''), // 陌生人/熟人/朋友/盟友/敌人等
            // 新增：印象标签（动态演化的短期认知）
            印象标签: z.array(z.string()).prefault([]),
            // 核心记忆锚点：必须为对象数组，禁止写成 string 或 string[]
            // 元素固定结构：{ 事件: string, 影响: string, 权重: string }（建议权重使用“低/中/高”）
            核心锚点: z
              .array(
                z.object({
                  事件: z.string(),
                  影响: z.string(),
                  权重: z.string(),
                }),
              )
              .prefault([]),
          })
          .prefault({}),

        个人信息: z
          .object({
            // 新增：好恶/价值观（长期互动的过滤器）
            价值观: z
              .object({
                喜好: z.array(z.string()).prefault([]),
                厌恶: z.array(z.string()).prefault([]),
                雷区: z.string().prefault(''),
              })
              .prefault({}),

            // 新增：深层心理（驱动长期行为的内在动力）
            执念与目标: z.string().prefault(''),
            心理创伤: z.string().prefault(''),

            外貌: z.string().prefault(''),
            表性格: z.string().prefault(''), // 外在表现的性格
            里性格: z.string().prefault(''), // 内在真实的性格
            当前想法: z.string().prefault(''), // 新增：放在特殊能力之前
            特殊能力: z.string().prefault(''),
            当前穿着: z.string().prefault(''), // 用50字内描述穿着
            当前位置: z.string().prefault(''), // NPC当前所在位置
            当前状态: z.string().prefault(''),
            持有物品: z.string().prefault(''), // 仅记录所持的重要物品
            过往经历: z
              .array(z.string())
              .transform(arr => arr.slice(-5))
              .prefault([]), // 遭遇主角前的背景经历，最多5条
            备注: z.string().prefault(''), // 长期提示词用
          })
          .prefault({}),

        // 新增：契约与交互（记录未完成的长期循环）
        交互记忆: z
          .object({
            未完成约定: z.array(z.string()).prefault([]),
            共同秘密: z.array(z.string()).prefault([]),
            赠礼记录: z.array(z.string()).prefault([]),
          })
          .prefault({}),

        重要NPC: z.boolean().prefault(false), // 为true时不得删除此NPC
        _关注: z.boolean().prefault(false), // 是否被关注（前端控制，AI不更新）
        婚姻状态: z.string().prefault(''), // 保留在顶层
        联系方式: z.string().prefault(''),
        近期事件: z
          .array(z.string())
          .transform(arr => arr.slice(-5)) // 只保留最后5条
          .prefault([]),
        重要经历: z
          .array(z.string())
          .transform(arr => {
            if (arr.length <= 10) return arr;
            // 超过10条时，将最早3条合并
            const merged = arr.slice(0, 3).join('；');
            return [merged, ...arr.slice(3)].slice(-10);
          })
          .prefault([]),

        $time: z.coerce.number().prefault(() => Date.now()),
      }),
    )
    .transform(data => {
      const upperNpcPattern = /^NPC_(\d+)$/;
      const lowerNpcPattern = /^npc_(\d+)$/;
      const pureNumberPattern = /^\d+$/;

      const normalizedArchive: Record<string, (typeof data)[string]> = {};
      const usedIds = new Set<number>();
      const pending: Array<{ key: string; value: (typeof data)[string]; preferredId?: number }> = [];

      // 第一轮：保留合法 NPC_数字 键
      for (const [key, value] of Object.entries(data)) {
        const upperMatch = key.match(upperNpcPattern);
        if (upperMatch) {
          const id = Number(upperMatch[1]);
          if (id > 0 && Number.isInteger(id) && !usedIds.has(id)) {
            usedIds.add(id);
            normalizedArchive[`NPC_${id}`] = value;
            continue;
          }
        }

        const lowerMatch = key.match(lowerNpcPattern);
        if (lowerMatch) {
          pending.push({ key, value, preferredId: Number(lowerMatch[1]) });
          continue;
        }

        if (pureNumberPattern.test(key)) {
          pending.push({ key, value, preferredId: Number(key) });
          continue;
        }

        // 人名键或其他历史格式
        pending.push({ key, value });
      }

      const maxReservedId = usedIds.size > 0 ? Math.max(...Array.from(usedIds)) : 0;
      let nextId = maxReservedId + 1;

      const allocateNextId = () => {
        while (usedIds.has(nextId)) {
          nextId += 1;
        }
        const allocated = nextId;
        usedIds.add(allocated);
        nextId += 1;
        return allocated;
      };

      // 第二轮：按原顺序稳定分配剩余键
      for (const item of pending) {
        const preferredId = item.preferredId;
        let targetId: number;

        if (
          typeof preferredId === 'number' &&
          Number.isInteger(preferredId) &&
          preferredId > 0 &&
          !usedIds.has(preferredId)
        ) {
          targetId = preferredId;
          usedIds.add(targetId);
          if (targetId >= nextId) {
            nextId = targetId + 1;
          }
        } else {
          targetId = allocateNextId();
        }

        normalizedArchive[`NPC_${targetId}`] = item.value;
      }

      // === 20个NPC上限 ===
      const entries = _(normalizedArchive).entries().value();
      if (entries.length <= 20) return normalizedArchive;

      // 分离重要NPC和普通NPC
      const important = entries.filter(([, v]) => v.重要NPC === true);
      const normal = entries.filter(([, v]) => v.重要NPC !== true);

      // 如果重要NPC已经超过20个，只保留重要NPC（按时间排序取最新20个）
      if (important.length >= 20) {
        const kept = _(important).sortBy('[1].$time').takeRight(20).value();
        return _.fromPairs(kept);
      }

      // 保留所有重要NPC + 最新的普通NPC（总共20个）
      const remainingSlots = 20 - important.length;
      const keptNormal = _(normal).sortBy('[1].$time').takeRight(remainingSlots).value();
      return _.fromPairs([...important, ...keptNormal]);
    })
    .prefault({}),

  // ===== 商城系统（由AI生成和更新） =====
  商城: z
    .object({
      物品: z
        .record(
          z.string().describe('物品名称'),
          z.object({
            价格: z.coerce
              .number()
              .transform(v => Math.max(0, v))
              .prefault(0), // 积分价格
            库存: z.coerce
              .number()
              .transform(v => Math.floor(v))
              .prefault(-1), // -1表示无限库存
            数量: z.coerce.number().prefault(1),
            类型: z.string().prefault(''),
            品质: z.enum(['普通', '精良', '稀有', '史诗', '传说']).prefault('普通'),
            有效期: z.string().prefault(''),
            特殊属性: z.string().prefault(''),
            备注: z.string().prefault(''),
          }),
        )
        .prefault({}),

      技能: z
        .record(
          z.string().describe('技能名称'),
          z.object({
            价格: z.coerce
              .number()
              .transform(v => Math.max(0, v))
              .prefault(0), // 积分价格
            库存: z.coerce
              .number()
              .transform(v => Math.floor(v))
              .prefault(-1), // -1表示无限库存
            品质: z.enum(['普通', '精良', '稀有', '史诗', '传说']).prefault('普通'),
            描述: z.string().prefault(''),
            类型: z.string().prefault(''),
          }),
        )
        .prefault({}),
    })
    .prefault({}),
});
