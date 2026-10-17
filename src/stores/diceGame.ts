// ===== Farkle 骰子游戏 - 状态管理 =====

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { aiMakeDecision } from '../game/farkle/ai';
import {
  calculateSelectedScore,
  getDiceAssignment,
  isFarkle,
  markScoringDice,
  resetDieIdCounter,
  rollDice,
} from '../game/farkle/engine';
import {
  BetType,
  DICE_TYPE_INFO,
  DiceType,
  FARKLE_ITEMS,
  FARKLE_COIN_PER_SCORE,
  FarkleItemEffect,
  FarkleItemKind,
  GAME_CONSTANTS,
  GamePhase,
  HOT_DICE_REWARD_MULTIPLIER,
  PlayerType,
  TARGET_TIERS,
  TIER_BET_RATIOS,
  TurnPhase,
  getFarkleItemDef,
  type BetConfig,
  type BetItem,
  type Die,
  type GameLogEntry,
  type GameResult,
  type NpcConfig,
  type PlayerState,
  type TargetTier,
} from '../game/farkle/types';
import { useStatDataStore } from './statData';
import { useStatDataActions } from './statDataActions';
import { useFarkleStore } from './farkle';

/** 永久骰子道具 id → 骰子类型（反查「某类型还剩多少份额」用） */
const PERMANENT_ITEM_BY_DICE: Partial<Record<DiceType, string>> = {
  [DiceType.Lucky]: 'lucky_dice',
  [DiceType.Blessed]: 'blessed_dice',
};

export const useDiceGameStore = defineStore('dice-game', () => {
  const statDataStore = useStatDataStore();
  const statDataActions = useStatDataActions();
  const farkleStore = useFarkleStore();

  // ===== 游戏可见性 =====
  const visible = ref(false);

  // ===== 帮助面板 =====
  const showHelp = ref(false);

  // ===== 游戏阶段 =====
  const gamePhase = ref<GamePhase>(GamePhase.Setup);

  // ===== 选择的NPC =====
  const selectedNpc = ref<NpcConfig | null>(null);

  // ===== 目标档位 =====
  const targetTier = ref<TargetTier>(TARGET_TIERS[0]);

  /** 本局目标分数：由选定档位决定 */
  const targetScore = computed(() => targetTier.value);

  // ===== 本局已使用的临时道具（每局限一次，整局内用完即灰） =====
  const usedConsumables = ref<string[]>([]);

  /** 本局触发的热骰次数（结算返还按此累乘） */
  const hotDiceCount = ref(0);

  // ===== 赌注配置 =====
  const betConfig = ref<BetConfig>({ bets: [] });

  // ===== 玩家状态 =====
  const player = ref<PlayerState>({
    type: PlayerType.Human,
    name: '你',
    totalScore: 0,
    diceType: DiceType.Normal,
  });

  const npc = ref<PlayerState>({
    type: PlayerType.NPC,
    name: 'NPC',
    totalScore: 0,
    diceType: DiceType.Normal,
  });

  // ===== 回合状态 =====
  const currentTurn = ref<PlayerType>(PlayerType.Human); // 谁的回合
  const turnPhase = ref<TurnPhase>(TurnPhase.Rolling);
  const turnScore = ref(0); // 当前回合累积分数
  const turnNumber = ref(0);
  const isLastRound = ref(false); // 是否是最后一回合
  const lastRoundTrigger = ref<PlayerType | null>(null); // 谁触发了最后一回合

  // ===== 骰子状态 =====
  const dice = ref<Die[]>([]);
  const availableDiceCount = ref<number>(GAME_CONSTANTS.DICE_COUNT);

  // ===== 游戏日志 =====
  const gameLog = ref<GameLogEntry[]>([]);

  // ===== NPC 行动状态提示 =====
  const npcActionText = ref('');
  const isNpcTurn = computed(() => currentTurn.value === PlayerType.NPC);

  // ===== 上下文提示 =====
  const contextHint = computed(() => {
    if (gamePhase.value !== GamePhase.Playing) return '';

    if (isNpcTurn.value) {
      return '👁️ 观看对手行动中...';
    }

    switch (turnPhase.value) {
      case TurnPhase.Rolling: {
        const heldCount = dice.value.filter(d => d.held).length;
        if (heldCount === 0 && turnScore.value === 0) {
          return '💡 点击「掷骰」开始你的回合，掷出全部6颗骰子';
        }
        return `💡 剩余 ${availableDiceCount.value} 颗骰子可掷，点击「掷骰」继续冒险`;
      }
      case TurnPhase.Animating:
        return '🎲 骰子滚动中...';
      case TurnPhase.Selecting: {
        const selected = dice.value.filter(d => !d.held && d.scoring && !d.justRolled);
        if (selected.length === 0) {
          return '💡 绿色高亮的是得分骰子，点击至少选择1颗保留';
        }
        return `💡 「继续掷骰」冒险追分（但可能 Farkle 清零）；「存分」安全保住 ${turnScore.value} 分`;
      }
      case TurnPhase.Farkled:
        return '❌ Farkle！所有骰子都不得分，本回合累积分数全部清零';
      default:
        return '';
    }
  });

  // ===== 游戏结果 =====
  const gameResult = ref<GameResult | null>(null);

  // ===== 结算明细（结算页展示） =====
  const coinsEarned = ref(0);
  /** 热骰累乘倍率（展示用，如 1.331） */
  const hotDiceMultiplier = ref(1);

  // ===== 是否有赌注（用于退出逻辑判断） =====
  const hasBets = computed(() => betConfig.value.bets.length > 0);

  // ===== 骰子分配信息 =====
  const diceAssignment = computed(() => {
    if (!selectedNpc.value) return null;
    return getDiceAssignment(selectedNpc.value.trust);
  });

  // ===== 可用 NPC 列表 =====
  const availableNpcs = computed(() => {
    const 人物档案 = statDataStore.data.人物档案 || {};
    const npcs: NpcConfig[] = [];

    for (const [id, npcData] of Object.entries(人物档案)) {
      npcs.push({
        id,
        name: (npcData as any).姓名 || '未知',
        favor: (npcData as any).关系数据?.好感度 ?? 0,
        trust: (npcData as any).关系数据?.信任度 ?? 0,
        socialStatus: (npcData as any).社会身份?.社会地位 || '平民',
        gender: (npcData as any).性别 || '未知',
      });
    }

    return npcs;
  });

  // ===== 玩家货币信息 =====
  const playerCurrency = computed(() => {
    return {
      name: statDataStore.data.玩家?.货币资源?.主货币?.名称 || '金币',
      amount: statDataStore.data.玩家?.货币资源?.主货币?.数量 || 0,
    };
  });

  // ===== 操作方法 =====

  /** 打开游戏 */
  function openGame() {
    visible.value = true;
    showHelp.value = false;
    resetToSetup();
  }

  /** 关闭游戏 */
  function closeGame() {
    visible.value = false;
    showHelp.value = false;
    resetToSetup();
  }

  /** 切换帮助面板 */
  function toggleHelp() {
    showHelp.value = !showHelp.value;
  }

  /** 重置到设置阶段 */
  function resetToSetup() {
    gamePhase.value = GamePhase.Setup;
    selectedNpc.value = null;
    betConfig.value = { bets: [] };
    player.value = { type: PlayerType.Human, name: '你', totalScore: 0, diceType: DiceType.Normal };
    npc.value = { type: PlayerType.NPC, name: 'NPC', totalScore: 0, diceType: DiceType.Normal };
    currentTurn.value = PlayerType.Human;
    turnPhase.value = TurnPhase.Rolling;
    turnScore.value = 0;
    turnNumber.value = 0;
    isLastRound.value = false;
    lastRoundTrigger.value = null;
    dice.value = [];
    availableDiceCount.value = GAME_CONSTANTS.DICE_COUNT;
    gameLog.value = [];
    npcActionText.value = '';
    gameResult.value = null;
    usedConsumables.value = [];
    hotDiceCount.value = 0;
    coinsEarned.value = 0;
    hotDiceMultiplier.value = 1;
    resetDieIdCounter();
  }

  /** 选择 NPC 对手 */
  function selectNpc(npcConfig: NpcConfig) {
    selectedNpc.value = npcConfig;
  }

  /** 设置赌注 */
  function setBets(bets: BetItem[]) {
    betConfig.value = { bets };
  }

  /** 检查NPC是否愿意赌博 */
  function canNpcGamble(npcConfig: NpcConfig): { canGamble: boolean; reason: string } {
    if (npcConfig.favor < GAME_CONSTANTS.MIN_FAVOR_TO_GAMBLE) {
      return { canGamble: false, reason: `${npcConfig.name}对你充满敌意，拒绝与你赌博` };
    }
    return { canGamble: true, reason: '' };
  }

  /** 获取赌注上限 */
  function getBetLimits(npcConfig: NpcConfig) {
    const isReduced = npcConfig.favor < GAME_CONSTANTS.REDUCED_BET_FAVOR_THRESHOLD;
    const currencyAmount = playerCurrency.value.amount;

    // 目标分数越高，允许押的主货币比例越大（4000 档 1/10 → 20000 档 1/2）
    const maxCurrency = Math.floor(currencyAmount * TIER_BET_RATIOS[targetTier.value]);
    const maxFavor = Math.min(GAME_CONSTANTS.BET.MAX_FAVOR, npcConfig.favor - GAME_CONSTANTS.BET.FAVOR_FLOOR);
    const maxTrust = Math.min(GAME_CONSTANTS.BET.MAX_TRUST, npcConfig.trust - GAME_CONSTANTS.BET.TRUST_FLOOR);

    return {
      currency: {
        min: GAME_CONSTANTS.BET.MIN_CURRENCY,
        max: isReduced ? Math.floor(maxCurrency / 2) : maxCurrency,
      },
      favor: {
        min: GAME_CONSTANTS.BET.MIN_FAVOR,
        max: isReduced ? Math.floor(Math.max(0, maxFavor) / 2) : Math.max(0, maxFavor),
      },
      trust: {
        min: GAME_CONSTANTS.BET.MIN_TRUST,
        max: isReduced ? Math.floor(Math.max(0, maxTrust) / 2) : Math.max(0, maxTrust),
      },
    };
  }

  /** 选择目标档位 */
  function setTargetTier(tier: TargetTier) {
    targetTier.value = tier;
  }

  /** 玩家本局 6 颗骰子的类型（含永久道具替换结果，开局前可手动调整） */
  const playerDiceTypes = ref<DiceType[]>(Array.from({ length: GAME_CONSTANTS.DICE_COUNT }, () => DiceType.Normal));

  /**
   * 本局全局骰子：NPC 按信任度分配的那类骰子（也就是「全局概率」的载体）。
   * 玩家每颗骰子的最终概率 = 全局偏置 × 该颗自身偏置（叠乘归一化）。
   */
  const globalPlayerDice = ref<DiceType>(DiceType.Normal);

  /**
   * 按永久道具库存自动铺满 6 颗骰子：
   * 买了 n 件永久骰子就把前 n 颗换成那款，其余保持普通。
   * 留在开局前由玩家手动替换用。
   */
  function autoFillPlayerDice() {
    const next: DiceType[] = Array.from({ length: GAME_CONSTANTS.DICE_COUNT }, () => DiceType.Normal);
    for (const itemId of farkleStore.permanentItems) {
      const def = getFarkleItemDef(itemId);
      if (!def || def.kind !== FarkleItemKind.Permanent || !def.diceType) continue;
      const empty = next.findIndex(t => t === DiceType.Normal);
      if (empty !== -1) next[empty] = def.diceType;
    }
    playerDiceTypes.value = next;
  }

  /**
   * 开局前手动替换某颗骰子类型。
   * 特殊骰子只能按「已购买的件数」装备：库存 - 已装备 = 剩余可用份额，
   * 把某个槽位从特殊骰子改回普通骰子会释放份额（stock 与它无关，只看永久道具购买数）。
   * @param index 骰子序号（0-5）
   * @param diceType 目标类型
   * @returns 是否替换成功
   */
  function replacePlayerDice(index: number, diceType: DiceType): boolean {
    if (index < 0 || index >= GAME_CONSTANTS.DICE_COUNT) return false;

    const next = [...playerDiceTypes.value];
    const current = next[index];
    if (current === diceType) return true;

    if (diceType !== DiceType.Normal) {
      // 目标类型的剩余份额 = 库存 - 已装备数（把本来就是这个类型的槽位换成本类型不占新份额）
      const stock = itemStock(PERMANENT_ITEM_BY_DICE[diceType] ?? '');
      const equipped = playerDiceTypes.value.filter(t => t === diceType).length;
      if (stock - equipped <= 0) return false;
    }

    next[index] = diceType;
    playerDiceTypes.value = next;
    return true;
  }

  /** 当前生效的永久骰子道具：把骰子类型覆盖成更好的那一款 */
  const permanentDice = computed<DiceType | null>(() => {
    let best: DiceType | null = null;
    let bestScore = -Infinity;

    for (const itemId of farkleStore.permanentItems) {
      const def = getFarkleItemDef(itemId);
      if (!def || def.kind !== FarkleItemKind.Permanent || !def.diceType) continue;
      const info = DICE_TYPE_INFO[def.diceType];
      const score = Math.max(info.bias1, info.bias5);
      if (score > bestScore) {
        bestScore = score;
        best = def.diceType;
      }
    }

    return best;
  });

  /** 商店道具列表（界面直接用） */
  const itemCatalog = computed(() => FARKLE_ITEMS);

  /** 玩家币余额（界面直接用） */
  const coins = computed(() => farkleStore.coins);

  /** 已拥有的永久道具 id 列表 */
  const permanentItems = computed(() => farkleStore.permanentItems);

  /** 一件道具当前库存：临时道具看消耗计数，永久道具看购买件数 */
  function itemStock(itemId: string): number {
    const consumable = farkleStore.consumableItems[itemId] ?? 0;
    if (consumable > 0) return consumable;
    return farkleStore.permanentItems.filter(id => id === itemId).length;
  }

  /** 买道具：永久/临时分别走账本；成功返回 true */
  function buyItem(itemId: string): boolean {
    const def = getFarkleItemDef(itemId);
    if (!def) return false;

    const ok =
      def.kind === FarkleItemKind.Permanent
        ? farkleStore.buyPermanent(itemId, def.price)
        : farkleStore.buyConsumable(itemId, def.price);

    if (ok) {
      addLog(`购买了「${def.name}」`);
    }
    return ok;
  }

  /** 一件临时道具现在能不能用（有库存、本局没消耗过、当前是对局中选择阶段） */
  function canUseConsumable(itemId: string): boolean {
    if (gamePhase.value !== GamePhase.Playing) return false;
    if (currentTurn.value !== PlayerType.Human) return false;
    if (usedConsumables.value.includes(itemId)) return false;
    if (!farkleStore.hasStock(itemId)) return false;
    // 换骰需要指定骰子，只在选择阶段开放；其余同理
    return turnPhase.value === TurnPhase.Selecting || turnPhase.value === TurnPhase.Farkled;
  }

  /** 使用临时道具：扣库存 + 记本局已用 */
  function useConsumable(itemId: string): boolean {
    if (!canUseConsumable(itemId)) return false;
    if (!farkleStore.consumeItem(itemId)) return false;

    usedConsumables.value = [...usedConsumables.value, itemId];
    const def = getFarkleItemDef(itemId);
    if (def) addLog(`使用了道具「${def.name}」`);

    if (def?.effect === FarkleItemEffect.RerollAll) {
      rerollUnheld();
    }
    return true;
  }

  /** 指定骰：把一颗未保留骰子的点数直接改成 1（每局限一次） */
  function forceSingleDie(dieId: number): boolean {
    const forceId = FARKLE_ITEMS.find(item => item.effect === FarkleItemEffect.ForceOne)?.id;
    if (!forceId) return false;
    if (!canUseConsumable(forceId)) return false;

    const die = dice.value.find(d => d.id === dieId);
    if (!die || die.held) return false;

    if (!farkleStore.consumeItem(forceId)) return false;
    usedConsumables.value = [...usedConsumables.value, forceId];

    die.value = 1;
    die.justRolled = false;

    dice.value = markScoringDice(dice.value);
    turnPhase.value = TurnPhase.Selecting;
    addLog('使用了道具「指定骰」');
    return true;
  }

  /** 重掷骰：当前未保留骰子整组重掷一次（每颗按自身类型掷） */
  function rerollUnheld() {
    const unheldCount = dice.value.filter(d => !d.held).length;
    if (unheldCount === 0) return;

    const held = dice.value.filter(d => d.held);
    const types = dice.value.filter(d => !d.held).map(d => d.diceType ?? DiceType.Normal);
    const fresh = rollDice(unheldCount, types, globalPlayerDice.value);
    dice.value = [...held, ...fresh];

    const unheldValues = fresh.map(d => d.value);
    if (isFarkle(unheldValues)) {
      turnPhase.value = TurnPhase.Farkled;
    } else {
      dice.value = markScoringDice(dice.value);
      for (const d of dice.value) {
        if (!d.held) d.justRolled = false;
      }
      turnPhase.value = TurnPhase.Selecting;
    }
  }

  /** 开局：先把永久骰子铺进 6 颗骰子，再开始对局 */
  async function startGame() {
    if (!selectedNpc.value) return;

    // 立即扣除赌注
    await deductBets();

    autoFillPlayerDice();

    const assignment = getDiceAssignment(selectedNpc.value.trust);
    globalPlayerDice.value = assignment.playerDice;

    player.value = {
      type: PlayerType.Human,
      name: '你',
      totalScore: 0,
      diceType: assignment.playerDice,
    };

    npc.value = {
      type: PlayerType.NPC,
      name: selectedNpc.value.name,
      totalScore: 0,
      diceType: assignment.npcDice,
    };

    gamePhase.value = GamePhase.Playing;
    currentTurn.value = PlayerType.Human;
    turnPhase.value = TurnPhase.Rolling;
    turnScore.value = 0;
    turnNumber.value = 1;
    dice.value = [];
    availableDiceCount.value = GAME_CONSTANTS.DICE_COUNT;
    gameLog.value = [];
    usedConsumables.value = [];
    hotDiceCount.value = 0;
    coinsEarned.value = 0;
    hotDiceMultiplier.value = 1;

    addLog(`游戏开始！目标 ${targetScore.value} 分，你先手`);
  }

  /** 扣除赌注 - 在游戏开始时立即执行 */
  async function deductBets() {
    if (betConfig.value.bets.length === 0) return;

    await statDataActions.mutateStatData('dice-game.deduct-bets', draft => {
      for (const bet of betConfig.value.bets) {
        switch (bet.type) {
          case BetType.Currency:
            if (draft.玩家?.货币资源?.主货币) {
              draft.玩家.货币资源.主货币.数量 -= bet.amount;
            }
            break;
          case BetType.Favor:
            if (selectedNpc.value) {
              const npcData = (draft.人物档案 as any)?.[selectedNpc.value.id];
              if (npcData?.关系数据) {
                npcData.关系数据.好感度 = Math.max(-100, npcData.关系数据.好感度 - bet.amount);
              }
            }
            break;
          case BetType.Trust:
            if (selectedNpc.value) {
              const npcData = (draft.人物档案 as any)?.[selectedNpc.value.id];
              if (npcData?.关系数据) {
                npcData.关系数据.信任度 = Math.max(-100, npcData.关系数据.信任度 - bet.amount);
              }
            }
            break;
        }
      }
    });
  }

  /** 玩家掷骰 */
  function playerRoll() {
    if (currentTurn.value !== PlayerType.Human || turnPhase.value !== TurnPhase.Rolling) return;

    turnPhase.value = TurnPhase.Animating;

    // 保留已选中的骰子，掷出剩余的（每颗按自身类型掷）
    const heldDice = dice.value.filter(d => d.held);
    // 类型跟着骰子本身走：先扣掉已留住骰子占用的类型，剩下的才发给新骰子
    const remainingTypes = [...playerDiceTypes.value];
    for (const d of heldDice) {
      const idx = remainingTypes.indexOf(d.diceType ?? DiceType.Normal);
      if (idx !== -1) remainingTypes.splice(idx, 1);
    }
    const newDice = rollDice(availableDiceCount.value, remainingTypes, globalPlayerDice.value);

    dice.value = [...heldDice, ...newDice];

    // 短暂延迟后检查结果
    setTimeout(() => {
      const unheldValues = dice.value.filter(d => !d.held).map(d => d.value);

      if (isFarkle(unheldValues)) {
        // 保底符：本回合 Farkle 时不清零本回合累积分，也不结束回合
        if (usedConsumables.value.includes(FARKLE_ITEMS.find(i => i.effect === FarkleItemEffect.BankGuard)!.id)) {
          turnPhase.value = TurnPhase.Selecting;
          addLog('🛡️ 保底符生效！Farkle 被挡下，本回合累积分保留');
          return;
        }
        turnPhase.value = TurnPhase.Farkled;
        addLog(`Farkle！没有得分骰子，本回合 ${turnScore.value} 分全部清零`, 0);
        turnScore.value = 0;
      } else {
        // 标记得分骰子
        dice.value = markScoringDice(dice.value);
        // 新掷出的骰子先自动全选：玩家看到的就是「这一把能拿多少分」
        for (const d of dice.value) {
          if (!d.held) d.justRolled = false;
        }
        turnPhase.value = TurnPhase.Selecting;
      }
    }, GAME_CONSTANTS.ROLL_ANIMATION_DURATION);
  }

  /** 玩家切换骰子选中状态 */
  function toggleDieHold(dieId: number) {
    if (turnPhase.value !== TurnPhase.Selecting || currentTurn.value !== PlayerType.Human) return;

    const die = dice.value.find(d => d.id === dieId);
    if (!die || die.held) return; // 已保留的不能取消
    if (!die.scoring) return; // 非得分骰子不能选

    die.justRolled = !die.justRolled; // 复用 justRolled 作为"本轮新选中"标记
  }

  /** 玩家确认选择并继续掷骰 */
  function playerContinue() {
    if (turnPhase.value !== TurnPhase.Selecting || currentTurn.value !== PlayerType.Human) return;

    // 获取新选中的骰子（scoring 且 justRolled 被切换的）
    const newlySelected = dice.value.filter(d => !d.held && d.scoring && !d.justRolled);

    if (newlySelected.length === 0) return; // 必须至少选一颗

    // 计算选中骰子的得分
    const selectedValues = newlySelected.map(d => d.value);
    const score = calculateSelectedScore(selectedValues);
    if (score === 0) return; // 无效选择

    turnScore.value += score;

    // 标记为已保留
    for (const d of newlySelected) {
      d.held = true;
    }

    // 检查热骰
    const unheldCount = dice.value.filter(d => !d.held).length;
    if (unheldCount === 0) {
      // 热骰！重置所有骰子
      dice.value = [];
      availableDiceCount.value = GAME_CONSTANTS.DICE_COUNT;
      hotDiceCount.value += 1;
      hotDiceMultiplier.value = Math.pow(HOT_DICE_REWARD_MULTIPLIER, hotDiceCount.value);
      addLog(`🔥 热骰！所有骰子都得分，+${score}分，重掷全部6颗（结算奖励 ×${hotDiceMultiplier.value.toFixed(3)}）`);
    } else {
      availableDiceCount.value = unheldCount;
    }

    // 直接接着掷下一把，省掉「继续掷骰 → 再点掷骰」的中间步骤
    turnPhase.value = TurnPhase.Rolling;
    playerRoll();
  }

  /** 玩家存分结束回合 */
  function playerBank() {
    if (turnPhase.value !== TurnPhase.Selecting || currentTurn.value !== PlayerType.Human) return;

    // 先确认选中的骰子
    const newlySelected = dice.value.filter(d => !d.held && d.scoring && !d.justRolled);
    if (newlySelected.length > 0) {
      const selectedValues = newlySelected.map(d => d.value);
      const score = calculateSelectedScore(selectedValues);
      if (score > 0) {
        turnScore.value += score;
      }
    }

    player.value.totalScore += turnScore.value;
    addLog(`存入 ${turnScore.value} 分`, turnScore.value, player.value.totalScore);

    // 检查是否达到目标
    checkGameEnd(PlayerType.Human);
  }

  /** Farkle 后结束回合 */
  function endFarkledTurn() {
    if (turnPhase.value !== TurnPhase.Farkled) return;
    checkGameEnd(currentTurn.value);
  }

  /** 检查游戏是否结束并切换回合 */
  function checkGameEnd(justPlayed: PlayerType) {
    const playerScore = justPlayed === PlayerType.Human ? player.value.totalScore : npc.value.totalScore;

    // 检查是否触发最后一回合
    if (!isLastRound.value && playerScore >= targetScore.value) {
      isLastRound.value = true;
      lastRoundTrigger.value = justPlayed;
      addLog(`${justPlayed === PlayerType.Human ? '你' : npc.value.name}达到目标分数！对方还有最后一回合`);
    }

    // 检查是否游戏结束
    if (isLastRound.value && justPlayed !== lastRoundTrigger.value) {
      // 最后一回合的反方刚打完，游戏结束
      endGame();
      return;
    }

    // 切换到对方回合
    switchTurn();
  }

  /** 切换回合 */
  function switchTurn() {
    if (currentTurn.value === PlayerType.Human) {
      currentTurn.value = PlayerType.NPC;
      turnNumber.value++;
    } else {
      currentTurn.value = PlayerType.Human;
      turnNumber.value++;
    }

    turnScore.value = 0;
    dice.value = [];
    availableDiceCount.value = GAME_CONSTANTS.DICE_COUNT;
    turnPhase.value = TurnPhase.Rolling;

    // 如果是NPC回合，自动开始
    if (currentTurn.value === PlayerType.NPC) {
      setTimeout(() => npcTurn(), GAME_CONSTANTS.NPC_ACTION_DELAY);
    }
  }

  /** NPC 自动回合 */
  async function npcTurn() {
    if (!selectedNpc.value) return;

    npcActionText.value = `${npc.value.name} 正在思考...`;

    // NPC 循环：掷骰 → 决策 → 掷骰...
    let continuePlaying = true;
    let currentAvailable: number = GAME_CONSTANTS.DICE_COUNT;
    let currentTurnScore = 0;

    while (continuePlaying) {
      // 掷骰
      await delay(GAME_CONSTANTS.NPC_ACTION_DELAY);
      const newDice = rollDice(currentAvailable, npc.value.diceType);
      const diceValues = newDice.map(d => d.value);

      // 更新显示
      dice.value = newDice;
      turnPhase.value = TurnPhase.Animating;

      await delay(GAME_CONSTANTS.ROLL_ANIMATION_DURATION);

      // 检查 Farkle
      if (isFarkle(diceValues)) {
        npcActionText.value = `${npc.value.name} Farkle了！没有得分骰子，${currentTurnScore}分全部清零`;
        turnPhase.value = TurnPhase.Farkled;
        turnScore.value = 0;
        addLog(`${npc.value.name} Farkle！没有得分骰子，${currentTurnScore}分清零`, 0);

        await delay(GAME_CONSTANTS.NPC_ACTION_DELAY);
        checkGameEnd(PlayerType.NPC);
        return;
      }

      // AI 决策
      const decision = aiMakeDecision({
        diceValues,
        turnScore: currentTurnScore,
        totalDice: currentAvailable,
        npcTotalScore: npc.value.totalScore,
        playerTotalScore: player.value.totalScore,
        npc: selectedNpc.value,
      });

      npcActionText.value = decision.description;
      currentTurnScore += decision.score;
      turnScore.value = currentTurnScore;

      // 标记选中的骰子
      const selectedCopy = [...decision.selectedDice];
      dice.value = dice.value.map(d => {
        const idx = selectedCopy.indexOf(d.value);
        if (idx !== -1) {
          selectedCopy.splice(idx, 1);
          return { ...d, held: true, scoring: true };
        }
        return { ...d, scoring: false };
      });
      turnPhase.value = TurnPhase.Selecting;

      await delay(GAME_CONSTANTS.NPC_ACTION_DELAY);

      if (!decision.shouldContinue) {
        // 存分
        npc.value.totalScore += currentTurnScore;
        addLog(`${npc.value.name} 存入 ${currentTurnScore} 分`, currentTurnScore, npc.value.totalScore);
        npcActionText.value = `${npc.value.name} 存入 ${currentTurnScore} 分（总分: ${npc.value.totalScore}）`;
        continuePlaying = false;
      } else {
        // 继续掷骰
        const unheldCount = currentAvailable - decision.selectedDice.length;
        if (unheldCount === 0) {
          // 热骰
          currentAvailable = GAME_CONSTANTS.DICE_COUNT;
          dice.value = [];
          addLog(`🔥 ${npc.value.name} 热骰！所有骰子得分，重掷全部6颗`);
        } else {
          currentAvailable = unheldCount;
          dice.value = dice.value.filter(d => d.held);
        }
      }
    }

    await delay(GAME_CONSTANTS.NPC_ACTION_DELAY);
    checkGameEnd(PlayerType.NPC);
  }

  /** 结束游戏 - 赌注已在开始时扣除，此处计算返还 */
  function endGame() {
    gamePhase.value = GamePhase.Result;

    const playerWins = player.value.totalScore > npc.value.totalScore;
    const isDraw = player.value.totalScore === npc.value.totalScore;

    // 热骰累乘倍率：玩家每触发一次热骰，结算返还 ×1.1，整局累乘
    const multiplier = Math.pow(HOT_DICE_REWARD_MULTIPLIER, hotDiceCount.value);
    hotDiceMultiplier.value = multiplier;

    // 计算返还金额：
    // 胜利 → 返还 2×赌注（净赚1倍）
    // 平局 → 返还 1×赌注（退还）
    // 败北 → 不返还（已扣除）
    let currencyChange = 0;
    let favorChange = 0;
    let trustChange = 0;

    for (const bet of betConfig.value.bets) {
      // 热骰倍率乘在返还上：只按玩家自己的热骰次数累乘
      const returnAmount = Math.floor((playerWins ? bet.amount * 2 : isDraw ? bet.amount : 0) * multiplier);
      switch (bet.type) {
        case BetType.Currency:
          currencyChange = returnAmount;
          break;
        case BetType.Favor:
          favorChange = returnAmount;
          break;
        case BetType.Trust:
          trustChange = returnAmount;
          break;
      }
    }

    // 超出目标分数的部分折算成 Farkle 币（10 分 = 1 币），进独立账本
    const overshoot = Math.max(0, player.value.totalScore - targetScore.value);
    const earnedCoins = Math.floor(overshoot / FARKLE_COIN_PER_SCORE);
    coinsEarned.value = earnedCoins;
    if (earnedCoins > 0) {
      farkleStore.addCoins(earnedCoins);
    }

    gameResult.value = {
      winner: isDraw ? PlayerType.Human : playerWins ? PlayerType.Human : PlayerType.NPC,
      playerScore: player.value.totalScore,
      npcScore: npc.value.totalScore,
      npcId: selectedNpc.value?.id || '',
      npcName: npc.value.name,
      currencyChange,
      favorChange,
      trustChange,
    };

    // 执行返还结算
    if (currencyChange > 0 || favorChange > 0 || trustChange > 0) {
      void settleGame(gameResult.value);
    }
  }

  /** 执行结算 - 返还赌注到本地状态 */
  async function settleGame(result: GameResult) {
    await statDataActions.mutateStatData('dice-game.settle', draft => {
      // 返还主货币
      if (result.currencyChange > 0 && draft.玩家?.货币资源?.主货币) {
        draft.玩家.货币资源.主货币.数量 += result.currencyChange;
      }

      // 返还好感度
      if (result.favorChange > 0 && result.npcId) {
        const npcData = (draft.人物档案 as any)?.[result.npcId];
        if (npcData?.关系数据) {
          npcData.关系数据.好感度 = Math.max(-100, Math.min(100, npcData.关系数据.好感度 + result.favorChange));
        }
      }

      // 返还信任度
      if (result.trustChange > 0 && result.npcId) {
        const npcData = (draft.人物档案 as any)?.[result.npcId];
        if (npcData?.关系数据) {
          npcData.关系数据.信任度 = Math.max(-100, Math.min(100, npcData.关系数据.信任度 + result.trustChange));
        }
      }
    });
  }

  /** 强制退出游戏 - 不返还赌注 */
  function forceQuitGame() {
    // 赌注已在 startGame 时扣除，此处直接重置状态
    resetToSetup();
  }

  /** 再来一局 */
  function playAgain() {
    if (!selectedNpc.value) {
      resetToSetup();
      return;
    }

    // 刷新 NPC 数据（好感度/信任度可能已变化）
    const npcData = (statDataStore.data.人物档案 as any)?.[selectedNpc.value.id];
    if (npcData) {
      selectedNpc.value = {
        ...selectedNpc.value,
        favor: npcData.关系数据?.好感度 ?? selectedNpc.value.favor,
        trust: npcData.关系数据?.信任度 ?? selectedNpc.value.trust,
      };
    }

    // 重置游戏状态但保留NPC和赌注选择
    const savedNpc = selectedNpc.value;
    const savedBets = betConfig.value;

    player.value = { type: PlayerType.Human, name: '你', totalScore: 0, diceType: DiceType.Normal };
    npc.value = { type: PlayerType.NPC, name: 'NPC', totalScore: 0, diceType: DiceType.Normal };
    currentTurn.value = PlayerType.Human;
    turnPhase.value = TurnPhase.Rolling;
    turnScore.value = 0;
    turnNumber.value = 0;
    isLastRound.value = false;
    lastRoundTrigger.value = null;
    dice.value = [];
    availableDiceCount.value = GAME_CONSTANTS.DICE_COUNT;
    gameLog.value = [];
    npcActionText.value = '';
    gameResult.value = null;
    usedConsumables.value = [];
    hotDiceCount.value = 0;
    coinsEarned.value = 0;
    hotDiceMultiplier.value = 1;
    resetDieIdCounter();

    selectedNpc.value = savedNpc;
    betConfig.value = savedBets;
    gamePhase.value = GamePhase.Setup;
  }

  // ===== 工具函数 =====

  function addLog(action: string, score?: number, totalAfter?: number) {
    gameLog.value.push({
      turn: turnNumber.value,
      player: currentTurn.value,
      action,
      score,
      totalAfter,
    });
  }

  function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return {
    // 状态
    visible,
    showHelp,
    gamePhase,
    selectedNpc,
    betConfig,
    hasBets,
    player,
    npc,
    currentTurn,
    turnPhase,
    turnScore,
    turnNumber,
    isLastRound,
    lastRoundTrigger,
    dice,
    availableDiceCount,
    gameLog,
    npcActionText,
    isNpcTurn,
    contextHint,
    gameResult,
    diceAssignment,
    availableNpcs,
    playerCurrency,
    // Farkle 币与道具
    targetTier,
    targetScore,
    permanentDice,
    playerDiceTypes,
    globalPlayerDice,
    autoFillPlayerDice,
    replacePlayerDice,
    itemCatalog,
    coins,
    permanentItems,
    itemStock,
    usedConsumables,
    hotDiceCount,
    hotDiceMultiplier,
    coinsEarned,
    // 方法
    openGame,
    closeGame,
    toggleHelp,
    resetToSetup,
    selectNpc,
    setBets,
    setTargetTier,
    canNpcGamble,
    getBetLimits,
    startGame,
    forceQuitGame,
    playerRoll,
    toggleDieHold,
    playerContinue,
    playerBank,
    endFarkledTurn,
    playAgain,
    buyItem,
    useConsumable,
    canUseConsumable,
    forceSingleDie,
  };
});
