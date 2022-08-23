import Konva from 'konva'
import { animate } from 'popmotion'
import type { Position, LngLat, Config } from './types'
import Tile from './Tile'
import {
  TILE_SIZE,
  getTileColAndRow,
  getPxFromMercator,
  getResolution,
  lngLat2Mercator,
  mercator2LngLat,
} from './utils'

export class AMap {
  stage: Konva.Stage
  layer: Konva.Layer
  // 缩放等级
  zoom: number = 16
  // 缓存瓦片
  tileCache: Record<string, Tile> = {}
  // 当前需要渲染的瓦片，因为瓦片图片加载是异步的，所以需要提供此项，
  // 图片加载完成后瓦片根据此项判断是否还需要渲染到画布上
  currentTileCache: Record<string, boolean> = {}
  // 内部使用墨卡托坐标 [x, y]
  private position: Position = [0, 0]
  // 分辨率
  private resolution: number = getResolution(this.zoom)
  // 对象内部仅保存墨卡托投影坐标
  // set 设置经纬度将其转换成墨卡托坐标并存到 position 中
  set center(lntLat: LngLat) {
    this.position = lngLat2Mercator(lntLat)
  }
  // get 获取经纬度，经 position 转为经纬度
  get center() {
    return mercator2LngLat(this.position)
  }
  constructor(
    public container: HTMLDivElement,
    config: Config = {
      center: [120.005627, 31.790637],
    },
  ) {
    this.stage = new Konva.Stage({
      container,
    })
    this.layer = new Konva.Layer()
    this.stage.add(this.layer)

    // 设置缩放和中心
    this.setZoom(config.zoom, false)
    this.setCenter(config.center, false)

    // 初始化拖拽
    this.initDrag()
    this.initScale()

    window.addEventListener('resize', () => {
      this.resize()
    })
    this.resize()
  }
  // 渲染函数
  private render() {
    // console.log('render')
    this.layer.removeChildren()
    // 中心点瓦片位置，相对于中心的偏移量
    const info = this.getCenterInfo()
    const { height, width } = this.stage.getSize()
    // 清空画布

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
        const key: string = `x=${col}&y=${row}&z=${this.zoom}`

        this.currentTileCache[key] = true
        if (this.tileCache[key]) {
          this.tileCache[key].updatePos(position)
        } else {
          this.tileCache[key] = new Tile(this.layer, position, key, {
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
  private initDrag(flag?: boolean) {
    if (flag === false) {
      return
    }
    let mouseFlag = false
    this.stage.on('mousedown', () => {
      mouseFlag = true
    })
    this.stage.on('mousemove', ({ evt }) => {
      if (!mouseFlag) return
      const { movementX, movementY } = evt
      this.position = [
        this.position[0] - movementX * this.resolution,
        this.position[1] + movementY * this.resolution,
      ]
      this.render()
    })
    this.stage.on('mouseup', () => {
      mouseFlag = false
    })
  }
  // 初始化缩放
  private initScale(flag?: boolean) {
    if (flag === false) {
      return
    }
    this.stage.on('wheel', ({ evt }) => {
      const { offsetX, offsetY, deltaY } = evt
      const { clientHeight, clientWidth } = this.container

      // 目的保证缩放比例切换后，鼠标下坐标保持不变
      // 记录鼠标滚动坐标
      const dx = clientWidth / 2 - offsetX
      const dy = clientHeight / 2 - offsetY

      // 鼠标滚动时墨卡托坐标位置
      const pos = [
        this.position[0] - dx * this.resolution,
        this.position[1] + dy * this.resolution,
      ]
      this.setZoom(deltaY > 0 ? this.zoom - 1 : this.zoom + 1, false)
      // 根据上面记录的坐标 和 zoom变更后的分辨率重新设置中心点，保证位置一致
      this.position = [
        pos[0] + dx * this.resolution,
        pos[1] - dy * this.resolution,
      ]
      this.render()
    })
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
    const { clientHeight, clientWidth } = this.container
    this.stage.setSize({ height: clientHeight, width: clientWidth })
    this.layer.setSize({ height: clientHeight, width: clientWidth })
    this.layer.position({ x: clientWidth / 2, y: clientHeight / 2 })
    this.render()
  }
}
