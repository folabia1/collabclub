<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useAppStore } from "../pinia/store";
import { storeToRefs } from "pinia";

const store = useAppStore();
const { streak } = storeToRefs(store);
let timeoutId = ref<NodeJS.Timer>();
let timerBarRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (timerBarRef.value) timerBarRef.value.classList.add("start");
  timeoutId.value = setTimeout(() => store.setIsGameOver(true), 10000);
});

watch(streak, (currentStreak, prevStreak) => {
  if (currentStreak > prevStreak) {
    clearTimeout(timeoutId.value);
    timeoutId.value = setTimeout(() => store.setIsGameOver(true), 10000);
  }

  if (timerBarRef.value) timerBarRef.value.classList.remove("start");
  // add tiny delay between removing and addnig back the class to ensure animation is triggered
  setTimeout(() => (timerBarRef.value ? timerBarRef.value.classList.add("start") : null), 100);
});

onBeforeUnmount(() => clearTimeout(timeoutId.value));
</script>

<template>
  <div ref="timerBarRef" class="timer-bar" />
</template>

<style lang="scss" scoped>
.timer-bar {
  background-color: var(--accent);
  width: 100%;
  padding-block: 0.4rem;
  border-radius: 12px;

  &.start {
    animation-name: countdown;
    animation-duration: 0s;
    animation-fill-mode: normal;
    animation-delay: 0ms;
  }
}

@keyframes countdown {
  from {
    background-color: var(--accent);
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
