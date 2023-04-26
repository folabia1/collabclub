<script setup lang="ts">
import { useAppStore } from "../pinia/store";
const props = defineProps<{ text: string; active: boolean; disabled: boolean }>();
const store = useAppStore();
</script>

<template>
  <button
    :class="`genre-chip${active ? ' active' : ''}`"
    :disabled="disabled"
    @click="() => store.toggleGenreSelected(props.text)"
  >
    {{ text }}
  </button>
</template>

<style lang="scss">
button.genre-chip {
  border-radius: 12px;
  padding: 0.2rem 0.6rem;
  white-space: nowrap;
  border: 1px var(--accent) solid;
  background-color: transparent;
  font-weight: 700;
  @media (prefers-color-scheme: dark) {
    color: var(--accent);
  }

  &:disabled {
    border-color: var(--disabled);
    background-color: transparent;
    @media (prefers-color-scheme: dark) {
      color: var(--disabled);
    }
  }

  &.active {
    border-color: var(--accent);
    background-color: var(--accent);
    @media (prefers-color-scheme: dark) {
      color: var(--background-primary);
    }
  }

  &:disabled.active {
    border-color: var(--disabled);
    background-color: var(--disabled);
  }
}
</style>
