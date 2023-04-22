<script setup lang="ts">
// import { ref } from "vue";
import GenreChip from "./GenreChip.vue";
import { useAppStore } from "../pinia/store";

const store = useAppStore();
const pathArtistsIds = ["abcde", "abcdf"];
const currentPathArtist = { name: "Nipsey Hussle", id: "abcdef" };
const finalArtist = { name: "Drake", id: "final" };
</script>

<template>
  <div class="time-challenge">
    <div class="genre-chips">
      <GenreChip v-for="selectedGenre in store.selectedGenres" :text="selectedGenre" :active="true" :disabled="true" />
    </div>

    <div class="artists-in-play">
      <div class="artists-stack">
        <Artist v-for="artistId in pathArtistsIds" :spotifyId="artistId" />
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
