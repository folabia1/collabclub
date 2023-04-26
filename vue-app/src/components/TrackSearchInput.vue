<script setup lang="ts">
import { useAppStore } from "../pinia/store";
import { ref } from "vue";

defineProps<{ disabled: boolean }>();
// store and component state
const store = useAppStore();
const inputRef = ref<HTMLInputElement>();

// component functions

const handleSubmit = () => {
  const trackGuess = inputRef.value?.value;
  if (!trackGuess) return;

  store.suggestTracks(trackGuess);
};
</script>

<template>
  <div class="track-search-input">
    <div class="info">
      <i clas="fa fa-info-circle" />
      <p>
        Search for a track with <b>{{ store.currentPathArtist?.name ?? "this artist" }}</b> and another artist.
      </p>
    </div>
    <div class="input-area">
      <input
        type="search"
        ref="inputRef"
        placeholder="Track name..."
        @keyup="(e) => (e.key === 'Enter' ? handleSubmit() : null)"
        :disabled="disabled"
      />
      <button class="submit-btn btn-primary" @click="handleSubmit()">Search</button>
    </div>
  </div>
</template>

<style lang="scss">
.track-search-input {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  .input-area {
    display: flex;
    gap: 0.4rem;
  }

  input {
    flex-grow: 1;
    background-color: rgba(255, 255, 255, 0.8);

    border-radius: 16px;
    border-width: 2px;
    border-color: var(--button-primary);
    color: #242625;
    padding: 0.4rem;
    font-size: 1.2rem;
  }
}
</style>
