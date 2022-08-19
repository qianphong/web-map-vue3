import {
  TILE_SIZE,
  getTileColAndRow,
  getPxFromMercator,
  getResolution,
  lngLat2Mercator,
  mercator2LngLat,
} from './index'
import type { Position, LngLat } from './index'

type QueryString<T extends string, U = T> = T extends U
  ? `${T}=${string}${[Exclude<U, T>] extends [never]
      ? ''
      : `&${QueryString<Exclude<U, T> & string>}`}`
  : ''
type TileCache = Record<string, Tile>
type CacheKey = QueryString<'x' | 'y' | 'z'>

export type Config = {
  zoom?: number
  center: LngLat
  draggable?: boolean
}

export class AMap {
  canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  // 缩放等级
  zoom: number = 16

  // 缓存瓦片
  tileCache: TileCache = {}
  // 当前需要渲染的瓦片，因为瓦片图片加载是异步的，所以需要提供此项，
  // 图片加载完成后瓦片根据此项判断是否还需要渲染到画布上
  currentTileCache: Record<string, boolean> = {}

  // 内部使用墨卡托坐标 [x, y]
  private position: Position = [0, 0]
  // 分辨率
  private resolution: number = getResolution(this.zoom)

  // 对象内部仅保存墨卡托投影坐标
  // set 设置经纬度将其转换成墨卡托坐标并存到 position 中
  // get 获取经纬度，经 position 转为经纬度
  set center(lntLat: LngLat) {
    this.position = lngLat2Mercator(lntLat)
  }
  get center() {
    return mercator2LngLat(this.position)
  }

  constructor(
    public target: HTMLElement,
    config: Config = {
      center: [120.005627, 31.790637],
      draggable: true,
    },
  ) {
    this.canvas = document.createElement('canvas')
    target.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!

    // 设置缩放和中心
    this.setZoom(config.zoom, false)
    this.setCenter(config.center, false)

    // 初始化拖拽
    if (config?.draggable) {
      this.initDrag()
    }
    target.addEventListener('wheel', e => {
      this.setZoom(e.deltaY > 0 ? --this.zoom : ++this.zoom)
    })
    window.addEventListener('resize', () => {
      this.resize()
    })
    this.resize()
  }

  private render() {
    console.log('render')

    // 中心点瓦片位置，相对于中心的偏移量
    const info = this.getCenterInfo()

    const { height, width } = this.canvas

    // 清空画布
    this.ctx.clearRect(0, 0, width, height)

    // col 和 row 数量
    const colCount = Math.ceil(width / TILE_SIZE / 2)
    const rowCount = Math.ceil(height / TILE_SIZE / 2)

    // 清空上次缓存
    this.currentTileCache = {}

    // 横轴和纵轴根据原点向分别向两侧循环
    // 横轴 -colCount ~ colCount
    for (let colIndex = -1 * colCount; colIndex <= colCount; colIndex++) {
      // 纵轴 -rowCount ~ rowCount
      for (let rowIndex = -1 * rowCount; rowIndex <= rowCount; rowIndex++) {
        const col = info.ColAndRow[0] + colIndex
        const row = info.ColAndRow[1] + rowIndex

        const position: Position = [
          colIndex * TILE_SIZE - info.offset[0],
          rowIndex * TILE_SIZE - info.offset[1],
        ]
        // 缓存key，使用queryString形式可以直接获取瓦片图片地址
        const key: CacheKey = `x=${col}&y=${row}&z=${this.zoom}`

        this.currentTileCache[key] = true

        if (this.tileCache[key]) {
          this.tileCache[key].updatePos(position)
        } else {
          this.tileCache[key] = new Tile(this.ctx, position, key, {
            shouldRender: key => {
              return this.currentTileCache[key]
            },
          })
        }
      }
    }
  }
  // 获取中心点瓦片位置，以及相对于中心的偏移量
  private getCenterInfo() {
    const pxPos = getPxFromMercator(
      this.position[0],
      this.position[1],
      this.resolution,
    )
    const tile = getTileColAndRow(pxPos[0], pxPos[1])
    return {
      offset: [pxPos[0] - tile[0] * TILE_SIZE, pxPos[1] - tile[1] * TILE_SIZE],
      ColAndRow: getTileColAndRow(pxPos[0], pxPos[1]),
    }
  }

  // 初始化拖拽
  initDrag() {
    let mouseFlag = false
    let lastPos: Position = [0, 0]

    this.target.onmousedown = e => {
      mouseFlag = true
      lastPos = [e.clientX, e.clientY]
    }

    this.target.onmousemove = useThrottleFn(e => {
      if (!mouseFlag) return
      const { clientX, clientY } = e
      const offsetX = clientX - lastPos[0]
      const offsetY = clientY - lastPos[1]
      // console.log(offsetX, offsetY)
      this.position = [this.position[0] - offsetX, this.position[1] + offsetY]
      this.render()
      lastPos = [clientX, clientY]
    }, 100)

    this.target.onmouseup = () => {
      mouseFlag = false
      lastPos = [0, 0]
    }
  }

  // 设置 center
  setCenter(center?: LngLat, render = true) {
    if (!center) return
    this.center = center
    render && this.render()
  }

  // 设置 缩放
  setZoom(zoom?: number, render = true) {
    if (zoom === undefined) return
    if (zoom < 3 || zoom > 18) {
      console.warn('zoom 取值范围在 3~18 之间')
      return
    }
    this.zoom = zoom
    this.resolution = getResolution(zoom)
    render && this.render()
  }

  // resize 函数
  resize() {
    const { clientHeight, clientWidth } = this.target
    this.canvas.height = clientHeight
    this.canvas.width = clientWidth
    this.ctx.translate(clientWidth / 2, clientHeight / 2)
    this.render()
  }
}

// 瓦片类
class Tile {
  private img = new Image()
  private loaded: boolean = false

  constructor(
    public ctx: CanvasRenderingContext2D,
    public position: Position,
    public key: CacheKey,
    public opts: {
      shouldRender(key: string): boolean
    },
  ) {
    this.load()
  }

  // 获取瓦片URL
  private getTileUrl() {
    // 因为浏览器对于同一域名同时请求的资源是有数量限制的
    const domainIndexList = [1, 2, 3, 4]
    const domainIndex =
      domainIndexList[Math.floor(Math.random() * domainIndexList.length)]
    return `https://webrd0${domainIndex}.is.autonavi.com/appmaptile?${this.key}&lang=zh_cn&size=1&scale=1&style=8`
  }

  // 加载图片
  private load() {
    this.img.src = this.getTileUrl()
    this.img.onload = () => {
      this.loaded = true
      this.render()
    }
  }

  // 将图片渲染到画布上
  render() {
    // 如果图片未加载完成，或者加载完成后但是已经不需要渲染直接返回
    if (!this.loaded || !this.opts.shouldRender(this.key)) {
      return
    }
    console.log('tile render')
    this.ctx.drawImage(this.img, this.position[0], this.position[1])
  }

  // 更新位置
  updatePos(position: Position) {
    this.position = position
    this.render()
  }
}
