<template>
  <button
    class="setup-back-button"
    :title="title"
    :aria-label="ariaLabel || title"
    type="button"
    @click="$emit('click')"
  >
    <i class="ti ti-arrow-left"></i>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  ariaLabel?: string;
}>();

defineEmits<{ click: [] }>();
</script>
