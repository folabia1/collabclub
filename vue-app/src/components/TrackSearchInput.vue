<script setup lang="ts">
import { useAppStore } from "../pinia/store";
import { ref, watch } from "vue";
import { storeToRefs } from "pinia";

// store and component state
const store = useAppStore();
const inputRef = ref<HTMLInputElement>();
const { currentPathArtist } = storeToRefs(store);
const lastTrackSubmission = ref<string>();

// component functions
const handleSubmit = () => {
  const trackGuess = inputRef.value?.value;
  if (!trackGuess) return;

  const searchWithoutFilters = lastTrackSubmission.value === trackGuess;
  store.suggestTracks(trackGuess, !searchWithoutFilters);
  lastTrackSubmission.value = trackGuess;
  if (searchWithoutFilters && inputRef.value) inputRef.value.value = "";
};

watch(currentPathArtist, () => {
  if (inputRef.value) inputRef.value.value = "";
});
</script>

<template>
  <div class="track-search-input">
    <div class="info">
      <i class="fa fa-circle-info" />
      <span>
        Search for a track with <b>{{ store.currentPathArtist?.name ?? "this artist" }}</b> and another artist.
      </span>
    </div>
    <div class="input-area">
      <input
        type="search"
        ref="inputRef"
        placeholder="Track name..."
        @keyup="(e) => (e.key === 'Enter' ? handleSubmit() : null)"
        :disabled="store.isLoadingNewArtists || store.isGameOver"
      />
      <button class="submit-btn btn-primary" @click="handleSubmit()">
        <i class="fa fa-magnifying-glass" />
      </button>
    </div>
  </div>
</template>

<style lang="scss">
.track-search-input {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;

  .input-area {
    display: flex;
    gap: 1.2rem;
  }

  input {
    flex-grow: 1;
    background-color: rgba(255, 255, 255, 0.8);

    border-radius: 8px;
    border-width: 2px;
    border-color: var(--button-primary);
    color: #242625;
    padding: 0.4rem;
    font-size: 1.2rem;
  }
}
</style>
