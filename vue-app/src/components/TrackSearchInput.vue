<script setup lang="ts">
import { Track, Artist, useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { ref } from "vue";

const props = defineProps<{ artistName: string }>();

type SearchQuery = { trackName: string; artistName: string; strictMode: boolean };
const searchForTracksFeaturingArtistByTrackName = httpsCallable<SearchQuery, Track[]>(
  functions,
  "searchForTracksFeaturingArtistByTrackName"
);

const store = useAppStore();
let suggestedTracks = ref([] as Track[]);

const handleInputChange = (e: Event) => {
  if (!(e.target instanceof HTMLInputElement)) return;
  const trackGuess = e.target.value;
  if (!trackGuess) return;

  suggestTracksFeaturingArtist(trackGuess);
};
const handleClickArtist = (artist: Artist, track: Track) => {
  store.pushPathArtist({
    ...artist,
    track: { name: track.name, artistNames: track.artists.map((artist) => artist.name) },
  });
  suggestedTracks.value = [];
};

async function suggestTracksFeaturingArtist(trackGuess: string) {
  try {
    const tracksResponse = await searchForTracksFeaturingArtistByTrackName({
      trackName: trackGuess,
      artistName: props.artistName,
      strictMode: false,
    });
    // display tracks for user to choose from
    suggestedTracks.value = [...tracksResponse.data];
  } catch (error) {}
}
</script>

<template>
  <div>
    <i clas="fa fa-info-circle" />
    <p>Search for a track with {{ artistName }} and another artist.</p>
  </div>
  <input type="search" @keyup="handleInputChange" />
  <div v-for="track in suggestedTracks">
    <p>{{ track.name }}</p>
    <template v-for="artist in track.artists">
      <span v-if="artist.name == artistName">{{ artist.name }}</span>
      <button v-else @click="() => handleClickArtist(artist, track)">{{ artist.name }}</button>
    </template>
  </div>
</template>
