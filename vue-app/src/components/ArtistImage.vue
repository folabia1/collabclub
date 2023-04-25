<script setup lang="ts">
import { Artist } from "../pinia/store";

defineProps<{ artist: Artist }>();
</script>

<template>
  <img :src="artist.photoUrl" :alt="artist.name" />
</template>

<style>
img {
  width: 24vw;
  height: 24vw;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: -4px 2px 7px rgba(0, 0, 0, 0.4);
}
</style>
