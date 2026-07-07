<template>
  <div class="center-content">
    <ContentText />
  </div>
</template>

<script setup lang="ts">
import ContentText from '../common/ContentText.vue';
</script>

<style scoped>
.center-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-primary);
  width: 100%;
  height: 100%;
}
</style>
