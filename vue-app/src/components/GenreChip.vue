<script setup lang="ts">
import { useAppStore } from "../pinia/store";
import type { GenreName } from "../pinia/store";

const props = defineProps<{ text: GenreName; active: boolean; disabled: boolean }>();

const store = useAppStore();
const toggleSelected = () => store.toggleGenreSelected(props.text);
</script>

<template>
  <button :class="`genre-chip${active ? ' active' : ''}`" :disabled="disabled" @click="toggleSelected">
    {{ text }}
  </button>
</template>

<style lang="scss">
button.genre-chip {
  background-color: transparent;

  &.active {
    background-color: green;
  }

  &:disabled {
    background-color: black;
  }
}
</style>
