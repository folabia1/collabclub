<script setup lang="ts">
import { useAppStore } from "../pinia/store";
const store = useAppStore();
</script>

<template>
  <Teleport v-if="store.isGameOver" to="body">
    <div class="modal-wrapper">
      <div class="game-over-modal">GAME OVER</div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.modal-wrapper {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background-color: rgba(0, 0, 0, 0.4);
}
.game-over-modal {
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 10;
  width: min(90%, 50rem);
  height: min(90%, 50rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 3.2rem;
  border-radius: 8px;
}
</style>
