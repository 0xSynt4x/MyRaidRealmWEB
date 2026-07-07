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
  DiceType,
  GAME_CONSTANTS,
  GamePhase,
  PlayerType,
  TurnPhase,
  type BetConfig,
  type BetItem,
  type Die,
  type GameLogEntry,
  type GameResult,
  type NpcConfig,
  type PlayerState,
} from '../game/farkle/types';
import { useStatDataStore } from './statData';
import { useStatDataActions } from './statDataActions';

export const useDiceGameStore = defineStore('dice-game', () => {
  const statDataStore = useStatDataStore();
  const statDataActions = useStatDataActions();

  // ===== 游戏可见性 =====
  const visible = ref(false);

  // ===== 帮助面板 =====
  const showHelp = ref(false);

  // ===== 游戏阶段 =====
  const gamePhase = ref<GamePhase>(GamePhase.Setup);

  // ===== 选择的NPC =====
  const selectedNpc = ref<NpcConfig | null>(null);

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

    const maxCurrency = Math.floor(currencyAmount * GAME_CONSTANTS.BET.MAX_CURRENCY_RATIO);
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

  /** 开始游戏 - 先扣除赌注再进入 */
  async function startGame() {
    if (!selectedNpc.value) return;

    // 立即扣除赌注
    await deductBets();

    const assignment = getDiceAssignment(selectedNpc.value.trust);

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

    addLog('游戏开始！你先手');
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

    // 保留已选中的骰子，掷出剩余的
    const heldDice = dice.value.filter(d => d.held);
    const newDice = rollDice(availableDiceCount.value, player.value.diceType);

    dice.value = [...heldDice, ...newDice];

    // 短暂延迟后检查结果
    setTimeout(() => {
      const unheldValues = dice.value.filter(d => !d.held).map(d => d.value);

      if (isFarkle(unheldValues)) {
        turnPhase.value = TurnPhase.Farkled;
        addLog(`Farkle！没有得分骰子，本回合 ${turnScore.value} 分全部清零`, 0);
        turnScore.value = 0;
      } else {
        // 标记得分骰子
        dice.value = markScoringDice(dice.value);
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
      addLog(`🔥 热骰！所有骰子都得分，+${score}分，重掷全部6颗`);
    } else {
      availableDiceCount.value = unheldCount;
    }

    turnPhase.value = TurnPhase.Rolling;
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
    if (!isLastRound.value && playerScore >= GAME_CONSTANTS.TARGET_SCORE) {
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

    // 计算返还金额：
    // 胜利 → 返还 2×赌注（净赚1倍）
    // 平局 → 返还 1×赌注（退还）
    // 败北 → 不返还（已扣除）
    let currencyChange = 0;
    let favorChange = 0;
    let trustChange = 0;

    for (const bet of betConfig.value.bets) {
      const returnAmount = playerWins ? bet.amount * 2 : isDraw ? bet.amount : 0;
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
    // 方法
    openGame,
    closeGame,
    toggleHelp,
    resetToSetup,
    selectNpc,
    setBets,
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
  };
});
