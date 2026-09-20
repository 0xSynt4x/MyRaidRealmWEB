<template>
  <i class="ti gender-icon" :class="iconClass" :title="gender || ''" aria-hidden="true"></i>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** 性别文本：含「女」→ 女性符号，含「男」→ 男性符号，其余 → 中性符号 */
  gender?: string;
}>();

const iconClass = computed(() => {
  const value = props.gender || '';
  if (value.includes('女')) return 'ti-gender-female';
  if (value.includes('男')) return 'ti-gender-male';
  return 'ti-gender-genderless';
});
</script>
