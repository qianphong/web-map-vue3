import Konva from 'konva'
import { TILE_SIZE } from './utils'
import type { Position } from './types'

// 瓦片类
export default class Tile {
  private img?: Konva.Image
  private opacity = 0
  constructor(
    public layer: Konva.Layer,
    public position: Position,
    public key: string,
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
    const image = new Image()
    image.src = this.getTileUrl()
    image.onload = () => {
      this.img = new Konva.Image({
        image,
        width: TILE_SIZE,
        height: TILE_SIZE,
        opacity: this.opacity,
      })
      this.render()
    }
  }

  // 将图片渲染到画布上
  render(fadeIn = false) {
    // 如果图片未加载完成，或者加载完成后但是已经不需要渲染直接返回
    if (!this.img || !this.opts.shouldRender(this.key)) {
      return
    }
    this.img.x(this.position[0]).y(this.position[1])
    this.layer.add(this.img)
    this.fadeIn()
    // console.log('tile render')
  }

  fadeIn() {
    if (this.opacity >= 1 || !this.img) {
      return
    }
    let base = this.opacity
    const animation = new Konva.Animation(frame => {
      if (frame) {
        this.opacity = (frame.time / 400) * 1 + base
        this.img?.opacity(this.opacity)
        if (this.opacity >= 1) {
          animation.stop()
        }
      }
    }, this.layer)
    animation.start()
  }

  // 更新位置
  updatePos(position: Position) {
    this.position = position
    this.render()
  }
}
