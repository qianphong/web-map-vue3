<script setup lang="ts">
import { type Config, renderMap } from './utils/renderMap'
import { AMap } from './utils/AMap'
const config: Config = {
  lang: 'zh_cn',
  z: 15, // 3 ~ 18
  size: 1,
  style: 8,
  center: [120.005627, 31.790637],
}

const container = $ref<HTMLDivElement>()

onMounted(() => {
  const amap = new AMap(container, { zoom: 15 })
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
