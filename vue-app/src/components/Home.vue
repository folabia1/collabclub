<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { useAppStore } from "../pinia/store";
import { onMounted } from "vue";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator, httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase-config";

// network requests
const getAvailableGenreSeeds = httpsCallable<undefined, string[]>(functions, "Spotify-getAvailableGenreSeeds");

// component & app state
const store = useAppStore();

// lifecycle hooks
onMounted(async () => {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
  try {
    const availableGenres = await getAvailableGenreSeeds();
    store.setAvailableGenres(availableGenres.data);
  } catch {}
});
</script>

<template>
  <div class="home">
    <div class="genre-chips-container">
      <p>Select Genres</p>
      <div class="genre-chips">
        <!-- TODO: move this to a computed property in the script -->
        <GenreChip
          v-for="[genreName, isSelected] in Object.entries(store.genres).sort((genreA, genreB) => {
            if (store.genres[genreA[0]] && !store.genres[genreB[0]]) return -1;
            else if (!store.genres[genreA[0]] && store.genres[genreB[0]]) return 1;
            else return 0;
          })"
          :text="genreName"
          :active="isSelected"
          :disabled="false"
        />
      </div>
    </div>

    <div class="game-modes">
      <div class="card time-challenge">
        <div class="card__title">
          <i class="fa fa-bomb" />
          <h2 class="card__title-text">Time Challenge</h2>
        </div>
        <p>
          Race against the clock in this fun time challenge! See how well you know artist features - you'll be given two
          artists and you need to construct a path between them using features!
        </p>
        <button @click="store.goToScreen('time-challenge')">Play</button>
      </div>

      <div class="card multiplayer">
        <div class="card__title">
          <i class="fa fa-bomb" />
          <h2 class="card__title-text">Multi-player</h2>
        </div>
        <p>
          Race against the clock in this fun time challenge! See how well you know artist features - you'll be given two
          artists and you need to construct a path between them using features!
        </p>
        <button>Play</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home {
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.2rem;
  height: 100%;
  max-width: 40rem;
  margin: 0 auto;

  @media (min-width: 720px) {
    max-width: 80rem;
    justify-content: flex-start;
  }
}

.genre-chips-container {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
  height: 0;
  @media (min-width: 720px) {
    flex-grow: 0;
    height: auto;
  }

  p {
    font-weight: 500;
  }
}

.genre-chips {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  @media (min-width: 720px) {
    flex-wrap: nowrap;
  }

  overflow-y: auto;
}

.game-modes {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  align-items: center;
  @media (min-width: 720px) {
    flex-direction: row;
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.8rem;
    border-radius: 4px;
    padding: 1.6rem;

    &.time-challenge {
      background-color: var(--secondary);
      color: #242625;
    }

    &.multiplayer {
      background-color: var(--text-primary);
      color: var(--background-primary);
    }

    .card__title {
      font-size: 1.8rem;
      font-weight: 700;
      line-height: 1;
    }

    p {
      font-size: 1.2rem;
      line-height: 1.4rem;
    }

    button {
      font-size: 1.4rem;
      font-weight: 500;
    }
  }
}
</style>
