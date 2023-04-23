<script setup lang="ts">
import { Track, Artist, useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { ref } from "vue";

const props = defineProps<{ artistName: string; disabled: boolean }>();

type SearchQuery = {
  trackName: string;
  artistName: string;
  requireMultipleArtists: boolean;
  requireThisArtist: boolean;
  strictMode: boolean;
};
const searchForTracks = httpsCallable<SearchQuery, Track[]>(functions, "searchForTracks");
async function suggestTracks(trackGuess: string) {
  isCheckingAnswer.value = true;
  hasMadeAttempt.value = true;
  try {
    const tracksResponse = await searchForTracks({
      trackName: trackGuess,
      artistName: props.artistName,
      requireMultipleArtists: true,
      requireThisArtist: true,
      strictMode: false,
    });
    // display tracks for user to choose from
    suggestedTracks.value = [...tracksResponse.data];
  } finally {
    isCheckingAnswer.value = false;
  }
}

const store = useAppStore();
let suggestedTracks = ref([] as Track[]);
let isCheckingAnswer = ref(false);
let hasMadeAttempt = ref(false);

const handleInputChange = (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  const trackGuess = e.target.value;
  if (!trackGuess) return;

  suggestTracks(trackGuess);
};
const handleClickArtist = (artist: Artist, track: Track) => {
  store.pushPathArtist({
    ...artist,
    track: { name: track.name, artistNames: track.artists.map((artist) => artist.name) },
  });
  suggestedTracks.value = [];
};
</script>

<template>
  <div>
    <i clas="fa fa-info-circle" />
    <p>Search for a track with {{ artistName }} and another artist.</p>
  </div>
  <input type="search" @change="(e) => handleInputChange(e)" :disabled="disabled" />
  <span v-if="suggestedTracks.length === 0 && !isCheckingAnswer && hasMadeAttempt">No results</span>
  <span v-if="isCheckingAnswer">Loading...</span>
  <div v-for="track in suggestedTracks">
    <p>{{ track.name }}</p>
    <template v-for="artist in track.artists">
      <span v-if="artist.name == artistName">{{ artist.name }}</span>
      <button v-else @click="() => handleClickArtist(artist, track)">{{ artist.name }}</button>
    </template>
  </div>
</template>
