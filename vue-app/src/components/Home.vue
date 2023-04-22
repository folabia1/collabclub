<script setup lang="ts">
import { ref } from "vue";
import GenreChip from "./GenreChip.vue";

const genres = ref(["hip-hop", "afro-beats", "uk rap", "charts", "latinx", "old-school hip-hop"]);
</script>

<template>
  <div class="home">
    <div class="genre-chips">
      <GenreChip v-for="genre in genres" :text="genre" :active="true" :disabled="false" />
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
        <button>Play</button>
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
