<script setup lang="ts">
defineProps<{ text: string; active: boolean; disabled: boolean }>();

const toggleSelected = () => {};
</script>

<template>
  <button :class="`genre-chip${active ? ' active' : ''}`" :disabled="disabled" @click="toggleSelected">
    {{ text }}
  </button>
</template>
