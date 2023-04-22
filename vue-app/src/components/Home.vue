<script setup lang="ts">
import GenreChip from "./GenreChip.vue";
import { GenreName, useAppStore } from "../pinia/store";
import { onMounted } from "vue";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import { db, functions } from "../firebase-config";

const store = useAppStore();

onMounted(() => {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
});
</script>

<template>
  <div class="home">
    <div class="genre-chips">
      <GenreChip
        v-for="[genreName, isSelected] in Object.entries(store.genres)"
        :text="genreName as GenreName"
        :active="isSelected"
        :disabled="false"
      />
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

      <div class="card time-challenge">
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

<style scoped>
.home {
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
