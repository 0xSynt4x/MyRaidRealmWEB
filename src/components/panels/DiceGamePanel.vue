<template>
  <div class="dice-game-panel">
    <DiceGameSetup v-if="gamePhase === GamePhase.Setup" />
    <DiceGameBoard v-else-if="gamePhase === GamePhase.Playing" />
    <DiceGameResult v-else-if="gamePhase === GamePhase.Result" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { GamePhase } from '../../game/farkle/types';
import { useDiceGameStore } from '../../stores/diceGame';
import DiceGameBoard from '../game/DiceGameBoard.vue';
import DiceGameResult from '../game/DiceGameResult.vue';
import DiceGameSetup from '../game/DiceGameSetup.vue';

const store = useDiceGameStore();
const gamePhase = computed(() => store.gamePhase);

// 面板打开时，确保游戏状态初始化
onMounted(() => {
  if (!store.visible) {
    store.openGame();
  }
});
</script>

<style scoped>
.dice-game-panel {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
