<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { useAppStore } from "../pinia/store";
import { onMounted } from "vue";
// import { connectFirestoreEmulator } from "firebase/firestore";
// import { connectFunctionsEmulator } from "firebase/functions";
// import { db } from "../firebase-config";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";

const getAvailableGenreSeeds = httpsCallable<undefined, string[]>(functions, "Spotify-getAvailableGenreSeeds");
const store = useAppStore();

onMounted(async () => {
  // connectFirestoreEmulator(db, "localhost", 8080);
  // connectFunctionsEmulator(functions, "localhost", 5001);
  try {
    const availableGenres = await getAvailableGenreSeeds();
    store.setAvailableGenres(availableGenres.data);
    store.toggleAllGenresSelected(false);
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
          v-for="[genreName, isSelected] in store.sortedGenresArray"
          :text="genreName"
          :active="isSelected"
          :disabled="false"
        />
      </div>
    </div>

    <div class="game-modes">
      <div class="card time-challenge">
        <div class="card-text">
          <div class="card__title">
            <i class="fa fa-clock" />
            <h2 class="card__title-text">Time Challenge</h2>
          </div>
          <p>
            Race against the clock in this fun time challenge! See how well you know artist features - you'll be given
            two artists and you need to construct a path between them using features!
          </p>
        </div>
        <button class="btn-primary" @click="store.goToScreen('time-challenge')">Play</button>
      </div>

      <div class="card multiplayer">
        <div class="card-text">
          <div class="card__title">
            <i class="fa fa-users" />
            <h2 class="card__title-text">Multi-player</h2>
          </div>
          <p>
            Grab your friends and play together to get as many points as possible, or compete to see who has the best
            music knowledge.
          </p>
        </div>
        <button class="btn-primary" disabled>Coming Soon</button>
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
  gap: 4rem;
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
    justify-content: space-between;
    gap: 0.8rem;
    border-radius: 4px;
    padding: 1.6rem;
    flex: 1;
    height: 100%;

    &.time-challenge {
      background-color: var(--secondary);
      color: #242625;
    }

    &.multiplayer {
      background-color: var(--text-primary);
      color: var(--background-primary);
    }

    .card-text {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .card__title {
      font-size: 1.8rem;
      font-weight: 700;
      line-height: 1;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    p {
      font-size: 1.2rem;
      line-height: 1.4rem;
    }

    button {
      font-size: 1.4rem;
      font-weight: 500;
      &:disabled {
        cursor: not-allowed;
      }
    }
  }
}
</style>
