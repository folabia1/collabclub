<script setup lang="ts">
import { useAppStore } from "../pinia/store";

const store = useAppStore();
</script>

<template>
  <div class="title-bar">
    <button v-if="store.screen === 'time-challenge'" @click="store.goToScreen('home')" class="menu-button btn-primary">
      <i class="fa fa-chevron-left fa-sm" />
      <span>Back</span>
    </button>
    <div v-else class="spacer" />
    <h1 class="title" @click="store.goToScreen('home')">Collab Club</h1>
    <div class="spacer" />
    <div class="shadow" />
  </div>
</template>

<style lang="scss" scoped>
.title-bar {
  display: flex;
  justify-content: space-between;
  position: relative;
  align-items: center;
  padding-block: 0.8rem;

  .menu-button,
  .spacer {
    flex: 0 0 6rem;
  }

  .menu-button {
    display: flex;
    justify-content: flex-start;
    padding-left: 2rem;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.2rem;
    span {
      margin-bottom: 1px;
    }
  }

  .title {
    flex-grow: 1;
    text-align: center;
  }

  .shadow {
    position: absolute;
    width: 100%;
    height: 10px;
    bottom: -10px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent);
  }
}
</style>
