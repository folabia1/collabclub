<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { onMounted } from "vue";

const getRandomStartingArtists = httpsCallable(functions, "getRandomStartingArtists");

const store = useAppStore();
const pathArtists = ["abcde", "abcdf"];
const currentPathArtist = { name: "Nipsey Hussle", id: "abcdef" };
const finalArtist = { name: "Drake", id: "final" };

const refreshArtists = async () => {
  store.resetPathArtistsToEmpty();
  store.setRandomGameGenreFromSelected();
  try {
    const artistsResponse = await getRandomStartingArtists({ genreName: store.currentGameGenre });
    store.pushPathArtist(artistsResponse.data[0]);
    store.setFinalArtist(artistsResponse.data[1]);
  }
};

onMounted(refreshArtists);
</script>

<template>
  <div class="time-challenge">
    <div class="genre-chips">
      <GenreChip v-for="selectedGenre in store.selectedGenres" :text="selectedGenre" :active="true" :disabled="true" />
    </div>

    <div class="artists-in-play">
      <div class="artists-stack">
        <ArtistImage v-for="artist in pathArtists" :spotifyId="artist" />
      </div>

      <i class="fa fa-arrow-right" />

      <Artist :spotifyId="finalArtist.id" />
    </div>

    <div class="artist-names">
      <p>{{ currentPathArtist.name }}</p>
      <p>{{ finalArtist.name }}</p>
    </div>
  </div>
</template>

<style scoped>
.time-challenge {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.genre-chips {
  display: flex;
  gap: 0.8rem;
}

.game-modes {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
</style>
