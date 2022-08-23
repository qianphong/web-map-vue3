<script setup lang="ts">
import { AMap } from './AMap'

const container = $ref<HTMLDivElement>()

onMounted(() => {
  const amap = new AMap(container)
})
</script>

<template>
  <div class="map-container" ref="container"></div>
</template>

<style>
.map-container {
  height: 100vh;
  width: 100vw;
}
.map-container canvas {
  display: block;
}
</style>
