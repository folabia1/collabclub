<script setup lang="ts">
import { Track, useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { ref } from "vue";

defineProps<{ disabled: boolean }>();

type SearchQuery = {
  trackName: string;
  artistId: string;
  requireMultipleArtists: boolean;
  requireThisArtist: boolean;
  strictMode: boolean;
};
const searchForTracksInArtistDiscography = httpsCallable<SearchQuery, Track[]>(
  functions,
  "Spotify-searchForTracksInArtistDiscography"
);
async function suggestTracks(trackGuess: string) {
  store.setIsLoadingResults(true);
  store.setHasMadeAttempt(true);
  try {
    const tracksResponse = await searchForTracksInArtistDiscography({
      trackName: trackGuess,
      artistId: store.currentPathArtist?.id ?? "",
      requireMultipleArtists: true,
      requireThisArtist: true,
      strictMode: false,
    });
    // display tracks for user to choose from
    store.setSuggestedTracks([...tracksResponse.data]);
  } finally {
    store.setIsLoadingResults(false);
  }
}

const store = useAppStore();
let isLoadingResults = ref(false);

const handleInputChange = (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  const trackGuess = e.target.value;
  if (!trackGuess) return;

  suggestTracks(trackGuess);
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
    <input type="search" placeholder="Track name..." @change="(e) => handleInputChange(e)" :disabled="disabled" />
    <span v-if="isLoadingResults">Loading...</span>
  </div>
</template>

<style lang="scss">
.track-search-input {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  input {
    background-color: rgba(255, 255, 255, 0.8);

    border-radius: 4px;
    border-width: 2px;
    border-color: var(--button-primary);
    padding: 0.2rem;
    font-size: 1.2rem;
  }
}
</style>
