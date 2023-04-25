<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { useAppStore } from "../pinia/store";
import { storeToRefs } from "pinia";

const store = useAppStore();
const { initialPathArtist, finalArtist } = storeToRefs(store);

// setup a watcher function for when the initial pathArtist or finalPathArtist changes
// should reset the timeout (and the animation) on artist change
let timeoutId = ref<NodeJS.Timer>();
let timerBarRef = ref<HTMLElement | null>(null);
const didTriggerArtistRefresh = ref(false);
watch([initialPathArtist, finalArtist], () => {
  clearTimeout(timeoutId.value);
  timeoutId.value = setTimeout(() => {
    didTriggerArtistRefresh.value = true;
    store.refreshArtists();
  }, 30000);

  if (timerBarRef.value) {
    timerBarRef.value.classList.remove("start");
    setTimeout(() => timerBarRef.value?.classList.add("start"), 100);
  }
});

// onMounted(() => {
//   timeout.value = setTimeout(() => store.refreshArtists(), 3000);
// });

onBeforeUnmount(() => clearTimeout(timeoutId.value));
</script>

<template>
  <div ref="timerBarRef" class="timer-bar" />
</template>

<style lang="scss" scoped>
.timer-bar {
  background-color: green;
  width: 100%;
  padding-block: 0.4rem;
  border-radius: 12px;

  &.start {
    animation-name: countdown;
    animation-duration: 30s;
    animation-fill-mode: normal;
    animation-delay: 0ms;
  }
}

@keyframes countdown {
  from {
    background-color: green;
    width: 100%;
  }
  50% {
    background-color: yellow;
  }
  95% {
    background-color: red;
  }
  to {
    width: 0px;
  }
}
</style>
