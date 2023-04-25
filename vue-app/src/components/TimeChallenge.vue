<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { Track, Artist, useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import ArtistImage from "./ArtistImage.vue";
import TrackSearchInput from "./TrackSearchInput.vue";
import TimerBar from "./TimerBar.vue";
import { onMounted } from "vue";

// network requests
const getArtistWithPhotoUrl = httpsCallable<{ artistId: string | undefined }, Artist>(
  functions,
  "Spotify-getArtistWithPhotoUrl"
);

// component & app state
const store = useAppStore();

// component functions
async function handleClickArtist(artist: Artist, track: Track) {
  try {
    const fullArtist = (await getArtistWithPhotoUrl({ artistId: artist.id })).data;
    store.pushPathArtist({
      name: fullArtist.name,
      id: fullArtist.id,
      photoUrl: fullArtist.photoUrl,
      track: { name: track.name, artistNames: track.artists.map((artist) => artist.name) },
    });
    store.setSuggestedTracks([]);
  } catch {}
}

// lifecycle hooks
onMounted(() => store.refreshArtists());
// TODO: add a check for whether the last artist on the left side is the same as the artist on the right side
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

        <TimerBar />
      </div>

      <div class="results">
        <span v-if="store.resultsMessage">{{ store.resultsMessage }}</span>
        <div v-for="track in store.suggestedTracks">
          <p>{{ track.name }}</p>
          <div class="track-artists">
            <template v-for="artist in track.artists">
              <span v-if="artist.id == store.currentPathArtist?.id">{{ artist.name }}</span>
              <button class="select-artist" v-else @click="() => handleClickArtist(artist, track)">
                {{ artist.name }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="search-area">
        <button
          class="refresh-artists-btn btn-primary"
          @click="store.refreshArtists"
          :disabled="store.isLoadingNewArtists"
        >
          Refresh Artists
        </button>
        <TrackSearchInput v-if="store?.currentPathArtist?.name" :disabled="store.isLoadingNewArtists" />
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
  height: 0;
  overflow-y: auto;

  .track-artists {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  .refresh-artists-btn {
    align-self: flex-end;
    padding: 0.8rem;
    @media (prefers-color-scheme: dark) {
      background-color: var(--text-primary);
      color: var(--background-primary);
    }
  }
}
</style>
