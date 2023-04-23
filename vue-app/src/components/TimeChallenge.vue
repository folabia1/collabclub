<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { Artist, useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { onMounted } from "vue";
import ArtistImage from "./ArtistImage.vue";
import TrackSearchInput from "./TrackSearchInput.vue";

const getRandomStartingArtists = httpsCallable<
  { genreName: string | null | undefined },
  { genre: string; artists: Artist[] }
>(functions, "getRandomStartingArtists");

const store = useAppStore();

const refreshArtists = async () => {
  store.resetPathArtistsToEmpty();
  store.setRandomCurrentGameGenreFromSelected();
  try {
    const artistsResponse = await getRandomStartingArtists({ genreName: store.currentGameGenre });
    store.pushPathArtist(artistsResponse.data.artists[0]);
    store.setFinalArtist(artistsResponse.data.artists[1]);
    store.setCurrentGameGenre(artistsResponse.data.genre);
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  if (!store.selectedGenres.length) {
    store.selectDefaultGenres();
  }
  refreshArtists();
});
</script>

<template>
  <div class="time-challenge">
    <div class="genre-chips">
      <GenreChip
        v-for="selectedGenre in store.selectedGenres"
        :text="selectedGenre"
        :active="selectedGenre === store.currentGameGenre"
        :disabled="true"
      />
    </div>

    <div class="artists-in-play">
      <div class="artists-stack">
        <ArtistImage v-for="artist in store.pathArtists" :artist="artist" />
      </div>

      <i class="fa fa-arrow-right" />

      <ArtistImage v-if="store.finalArtist" :artist="store.finalArtist" />
    </div>

    <div class="artist-names" v-if="store.currentPathArtist && store.finalArtist">
      <p>{{ store.currentPathArtist.name }}</p>
      <p>{{ store.finalArtist.name }}</p>
    </div>

    <button @click="refreshArtists">Refresh Artists</button>

    <TrackSearchInput v-if="store?.currentPathArtist?.name" :artist-name="store.currentPathArtist.name" />
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
