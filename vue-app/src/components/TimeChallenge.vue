<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { useAppStore } from "../pinia/store";
import ArtistImage from "./ArtistImage.vue";
import TrackSearchInput from "./TrackSearchInput.vue";
import TimerBar from "./TimerBar.vue";
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import GameOverModal from "./GameOverModal.vue";

const store = useAppStore();

onMounted(() => store.refreshArtists(false));
const { currentPathArtist, finalArtist } = storeToRefs(store);

watch([currentPathArtist, finalArtist], () => {
  if (currentPathArtist.value?.id === finalArtist.value?.id) store.refreshArtists(true);
});
</script>

<template>
  <div class="time-challenge">
    <div class="genre-chips">
      <GenreChip v-if="store.currentGameGenre" :text="store.currentGameGenre" :active="true" :disabled="true" />
      <GenreChip
        v-for="selectedGenre in store.selectedGenres.filter((genre) => genre !== store.currentGameGenre)"
        :text="selectedGenre"
        :active="false"
        :disabled="true"
      />
    </div>

    <div class="main">
      <div class="artists">
        <div class="artists-in-play">
          <div class="artists-stack">
            <ArtistImage v-for="artist in store.pathArtists" :artist="artist" />
          </div>

          <i v-if="store.finalArtist" class="fa fa-2xl fa-arrow-right" />

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
              <span
                v-if="
                  artist.id == store.currentPathArtist?.id ||
                  !track.artists.map((artist) => artist.id).includes(store.currentPathArtist?.id ?? '')
                "
                >{{ artist.name }}</span
              >
              <button
                class="select-artist btn-primary"
                v-else
                @click="() => store.handleUserSelectsArtist(artist, track)"
              >
                {{ artist.name }}
              </button>
            </template>
          </div>
        </div>
      </div>

      <div class="search-area">
        <Streak />
        <button
          class="refresh-artists-btn btn-primary"
          @click="() => store.refreshArtists(false)"
          :disabled="store.isLoadingNewArtists"
        >
          Skip
          <i class="fa fa-forward" />
        </button>
        <TrackSearchInput v-if="store?.currentPathArtist?.name" />
      </div>
    </div>
  </div>
  <GameOverModal />
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
  overflow-x: auto;
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
    align-items: center;
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

  .select-artist {
    background-color: var(--secondary);
    color: #242625;
    padding: 0rem 0.8rem;
    &:hover {
      opacity: 0.9;
    }
  }
}

.search-area {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  align-items: flex-end;
  .refresh-artists-btn {
    padding: 0.8rem;
    border: 1px solid var(--text-primary);
    @media (prefers-color-scheme: dark) {
      background-color: var(--text-primary);
      color: var(--background-primary);
    }
  }
}
</style>
