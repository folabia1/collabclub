<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { Track, Artist, useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { onMounted, ref } from "vue";
import ArtistImage from "./ArtistImage.vue";
import TrackSearchInput from "./TrackSearchInput.vue";

// network requests
const getRandomStartingArtists = httpsCallable<
  { genreName: string | null | undefined },
  { genre: string; artists: Artist[] }
>(functions, "Spotify-getRandomStartingArtists");

// component & app state
const store = useAppStore();

const isLoading = ref(false);

// component functions
const refreshArtists = async () => {
  isLoading.value = true;
  store.setRandomCurrentGameGenreFromSelected();
  try {
    const artistsResponse = await getRandomStartingArtists({ genreName: store.currentGameGenre });
    store.resetPathArtistsToEmpty();
    store.setHasMadeAttempt(false);
    store.pushPathArtist(artistsResponse.data.artists[0]);
    store.setFinalArtist(artistsResponse.data.artists[1]);
    store.setCurrentGameGenre(artistsResponse.data.genre);
    isLoading.value = false;
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};

const handleClickArtist = (artist: Artist, track: Track) => {
  store.pushPathArtist({
    ...artist,
    track: { name: track.name, artistNames: track.artists.map((artist) => artist.name) },
  });
  store.setSuggestedTracks([]);
};

// lifecycle hooks
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

    <div class="main">
      <div class="artists">
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
      </div>

      <div class="results">
        <span v-if="store.isLoadingResults">Loading...</span>
        <span v-if="store.suggestedTracks.length === 0 && !store.isLoadingResults && store.hasMadeAttempt"
          >No results</span
        >
        <div v-for="track in store.suggestedTracks">
          <p>{{ track.name }}</p>
          <template v-for="artist in track.artists">
            <span v-if="artist.id == store.currentPathArtist?.id">{{ artist.name }}</span>
            <button v-else @click="() => handleClickArtist(artist, track)">{{ artist.name }}</button>
          </template>
        </div>
      </div>

      <div class="search-area">
        <button class="refresh-artists-btn" @click="refreshArtists" :disabled="isLoading">Refresh Artists</button>
        <TrackSearchInput v-if="store?.currentPathArtist?.name" :disabled="isLoading" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.time-challenge {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  height: 100%;
}

.genre-chips {
  display: flex;
  gap: 0.8rem;
}

.main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-grow: 1;
  gap: 1.2rem;
}

.artists {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  .artists-in-play {
    display: flex;
    justify-content: space-between;
    gap: 0.4rem;

    .artists-stack {
      display: flex;
      > :not(:first-child) {
        margin-left: -18vw;
      }
    }
  }

  .artist-names {
    display: flex;
    justify-content: space-between;
    font-weight: 500;
    gap: 2rem;
  }
}

.results {
  flex-grow: 1;
  flex-shrink: 1;
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  .refresh-artists-btn {
    align-self: flex-end;
    padding: 0.8rem;
  }
}
</style>
