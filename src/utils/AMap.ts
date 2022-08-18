import {
  TILE_SIZE,
  getTileRowAndCol,
  getPxFromLngLat,
  getResolution,
  lngLat2Mercator,
  mercator2LngLat,
} from './index'

export type Config = {
  zoom: number
  center?: [number, number]
  draggable?: boolean
}

export class AMap {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  center: [number, number] = [120.005627, 31.790637]
  zoom: number = 12
  resolution: number = getResolution(this.zoom)

  constructor(public target: HTMLElement, config?: Config) {
    this.canvas = document.createElement('canvas')
    target.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!

    this.setZoom(config?.zoom)
    this.setCenter(config?.center)

    window.addEventListener('resize', () => {
      this.resize()
    })
    this.resize()

    // if (config?.draggable) {
    //   target.onmousedown
    // }

    let mouseFlag = false
    let lastPos: [number, number] = [0, 0]
    target.onmousedown = e => {
      mouseFlag = true
      lastPos = [e.clientX, e.clientY]
    }

    target.onmousemove = useThrottleFn(e => {
      if (!mouseFlag) return
      const { clientX, clientY } = e
      const offsetX = clientX - lastPos[0]
      const offsetY = clientY - lastPos[1]
      console.log(offsetX, offsetY)
      // 经纬度转墨卡托坐标
      const [x, y] = lngLat2Mercator(this.center)
      // 根据偏移值计算出新的墨卡托坐标，再根据墨卡托坐标获得经纬度
      this.setCenter(mercator2LngLat(x - offsetX, y + offsetY))
      lastPos = [clientX, clientY]
    }, 200)
    target.onmouseup = () => {
      mouseFlag = false
      lastPos = [0, 0]
    }
  }

  private render() {
    const info = this.getCenterTile()

    const xCount = Math.ceil(innerWidth / TILE_SIZE / 2)
    const yCount = Math.ceil(innerHeight / TILE_SIZE / 2)

    for (let xIndex = -1 * xCount; xIndex <= xCount; xIndex++) {
      for (let yIndex = -1 * yCount; yIndex <= yCount; yIndex++) {
        // console.log([xIndex, yIndex])
        const imgUrl = this.getTileImg(
          info.tile[0] + xIndex,
          info.tile[1] + yIndex,
          this.zoom,
        )
        const img = new Image()
        img.src = imgUrl
        img.onload = () => {
          this.ctx.drawImage(
            img,
            -info.offset[0] + xIndex * TILE_SIZE,
            -info.offset[1] + yIndex * TILE_SIZE,
          )
        }
      }
    }
  }

  private getCenterTile() {
    const [x, y] = this.center
    const pxPos = getPxFromLngLat(x, y, this.zoom)
    const tile = getTileRowAndCol(pxPos[0], pxPos[1])
    return {
      offset: [pxPos[0] - tile[0] * TILE_SIZE, pxPos[1] - tile[1] * TILE_SIZE],
      tile,
    }
  }

  private getTileImg(x: number, y: number, zoom: number) {
    const domainIndexList = [1, 2, 3, 4]
    const domainIndex =
      domainIndexList[Math.floor(Math.random() * domainIndexList.length)]
    return `https://webrd0${domainIndex}.is.autonavi.com/appmaptile?x=${x}&y=${y}&z=${zoom}&lang=zh_cn&size=1&scale=1&style=8`
  }

  setCenter(center?: [number, number]) {
    if (!center) return
    this.center = center
    this.render()
  }

  setZoom(zoom?: number) {
    if (zoom === undefined) return
    if (zoom < 3 || zoom > 18) {
      console.warn('zoom 取值范围在 3~18 之间')
      return
    }
    this.zoom = zoom
    this.resolution = getResolution(zoom)
    this.render()
  }

  resize() {
    const { clientHeight, clientWidth } = this.target
    this.canvas.height = clientHeight
    this.canvas.width = clientWidth
    this.ctx.translate(clientWidth / 2, clientHeight / 2)
    this.render()
  }
}

class Tile {}
