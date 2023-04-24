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
}
</style>
