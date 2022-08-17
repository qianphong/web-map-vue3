import { TILE_SIZE, getTileRowAndCol, getPxFromLngLat } from './index'
import { stringify } from 'qs'

// https://webrd01.is.autonavi.com/appmaptile?x=109280&y=53979&z=17&lang=zh_cn&size=1&scale=1&style=8

export type Config = {
  z: number
  lang: 'zh_cn'
  size: number
  style: number
  center: [number, number]
}

// 获取中心点瓦片坐标和偏移量
function getCenterTile(config: Config) {
  const [x, y] = config.center
  const pxPos = getPxFromLngLat(x, y, config.z)
  const tile = getTileRowAndCol(pxPos[0], pxPos[1])
  return {
    offset: [pxPos[0] - tile[0] * TILE_SIZE, pxPos[1] - tile[1] * TILE_SIZE],
    tile,
  }
}
// 根据 config 和坐标获取瓦片 img 地址
function getImgUrl(x: number, y: number, config: Config) {
  const domainIndexList = [1, 2, 3, 4]
  const domainIndex =
    domainIndexList[Math.floor(Math.random() * domainIndexList.length)]
  return `https://webrd0${domainIndex}.is.autonavi.com/appmaptile${stringify(
    { x, y, ...config },
    { addQueryPrefix: true },
  )}`
}

export function renderMap(
  canvas: HTMLCanvasElement,
  config: Config,
  size: { height: number; width: number },
) {
  const ctx = canvas.getContext('2d')
  const { height, width } = size
  canvas.height = height
  canvas.width = width
  ctx?.translate(width / 2, height / 2)

  const info = getCenterTile(config)

  const xCount = Math.ceil(innerWidth / TILE_SIZE / 2)
  const yCount = Math.ceil(innerHeight / TILE_SIZE / 2)
  for (let xIndex = -1 * xCount; xIndex <= xCount; xIndex++) {
    for (let yIndex = -1 * yCount; yIndex <= yCount; yIndex++) {
      console.log([xIndex, yIndex])
      const imgUrl = getImgUrl(
        info.tile[0] + xIndex,
        info.tile[1] + yIndex,
        config,
      )
      const img = new Image()
      img.src = imgUrl
      img.onload = () => {
        ctx?.drawImage(
          img,
          -info.offset[0] + xIndex * TILE_SIZE,
          -info.offset[1] + yIndex * TILE_SIZE,
        )
      }
    }
  }
}
