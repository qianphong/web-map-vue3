<script setup lang="ts">
import { type Config, renderMap } from './utils/renderMap'

const config: Config = {
  lang: 'zh_cn',
  z: 16,
  size: 1,
  style: 8,
  center: [120.005627, 31.790637],
}

const canvas = $ref<HTMLCanvasElement>()

onMounted(() => {
  const { width, height } = useWindowSize()
  throttledWatch(
    [width, height],
    () => {
      renderMap(canvas, config, { height: height.value, width: width.value })
    },
    { throttle: 100, immediate: true },
  )
})
</script>

<template>
  <div class="map-container">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<style>
.map-container canvas {
  display: block;
}
</style>
