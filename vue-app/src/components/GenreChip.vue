<script setup lang="ts">
import { useAppStore } from "../pinia/store";

const props = defineProps<{ text: string; active: boolean; disabled: boolean }>();

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

  &:disabled {
    background-color: darkgray;
  }

  &.active {
    background-color: green;
    &:disabled {
      background-color: blue;
    }
  }
}
</style>
