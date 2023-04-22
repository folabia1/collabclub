<script setup lang="ts">
import Home from "./components/Home.vue";
import TimeChallenge from "./components/TimeChallenge.vue";
import TitleBar from "./components/TitleBar.vue";
import { useAppStore } from "./pinia/store";

const store = useAppStore();
</script>

<template>
  <TitleBar />
  <Home v-if="store.screen === 'home'" />
  <TimeChallenge v-if="store.screen === 'time-challenge'" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
