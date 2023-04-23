<script setup lang="ts">
import { useAppStore } from "../pinia/store";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";

const store = useAppStore();

const doSomething = () => {};
</script>

<template>
  <input type="search" @change="doSomething" />
</template>
