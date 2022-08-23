import type { LngLat, Position } from './types'

/**
 * 地球半径
 */
const EARTH_RAD = 6378137

/**
 * 地球周长
 */
const EARTH_PERIMETER = 2 * Math.PI * EARTH_RAD

/**
 * 瓦片像素
 */
export const TILE_SIZE = 256
/**
 * 分辨率（每像素实际表示多少米）
 * @param z 层级
 * @returns 像素值
 */
export function getResolution(z: number) {
  const tileNums = Math.pow(2, z)
  const tileTotalPx = tileNums * TILE_SIZE
  return EARTH_PERIMETER / tileTotalPx
}

/**
 * 根据瓦片的像素坐标x,y 获取瓦片信息
 * @param x 瓦片像素x
 * @param y 瓦片像素y
 * @returns 瓦片坐标
 */
export function getTileColAndRow(
  x: number,
  y: number,
): [col: number, row: number] {
  return [Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE)]
}

/**
 * 根据经纬度坐标获取像素位置
 * @param lng 经度
 * @param lat 纬度
 * @param z 缩放
 * @returns 像素坐标[x,y]
 */
export function getPxFromLngLat(lng: number, lat: number, z: number): Position {
  let [x, y] = lngLat2Mercator(lng, lat)
  x = EARTH_PERIMETER / 2 + x
  y = EARTH_PERIMETER / 2 - y
  const resolution = getResolution(z)
  return [Math.floor(x / resolution), Math.floor(y / resolution)]
}

/**
 * 根据墨卡托坐标获取像素位置
 * @param x 经度
 * @param y 纬度
 * @param resolution 分辨率
 * @returns 像素坐标[x,y]
 */
export function getPxFromMercator(
  x: number,
  y: number,
  resolution: number,
): Position {
  x = EARTH_PERIMETER / 2 + x
  y = EARTH_PERIMETER / 2 - y
  return [Math.floor(x / resolution), Math.floor(y / resolution)]
}

/**
 * 角度转弧度
 * @param angle 角度
 * @returns 弧度
 */
export function angle2Rad(angle: number) {
  return angle * (Math.PI / 180)
}

/**
 * 弧度转角度
 * @param rad 弧度
 * @returns 角度
 */
export function rad2Angle(rad: number) {
  return rad * (180 / Math.PI)
}

/**
 * 经纬度（EPSG:4326）转 墨卡托投影（EPSG:3857）
 * @param pos [lng,lat] 经纬度
 * @returns [x, y] 坐标
 */
export function lngLat2Mercator(lngLat: LngLat): Position

/**
 * 经纬度（EPSG:4326）转 墨卡托投影（EPSG:3857）
 * @param lng 经度
 * @param lat 纬度
 * @returns [x, y] 坐标
 */
export function lngLat2Mercator(lng: number, lat: number): Position

export function lngLat2Mercator() {
  let lng: number, lat: number
  if (Array.isArray(arguments[0])) {
    lng = arguments[0][0]
    lat = arguments[0][1]
  } else {
    lng = arguments[0]
    lat = arguments[1]
  }
  // 经度先转弧度，然后因为 弧度 = 弧长 / 半径，得到 弧长 = 弧度 * 半径
  const x = angle2Rad(lng) * EARTH_RAD
  const rad = angle2Rad(lat)
  const sin = Math.sin(rad)
  const y = (EARTH_RAD / 2) * Math.log((1 + sin) / (1 - sin))
  return [x, y]
}

/**
 * 墨卡托投影（EPSG:3857）转 经纬度（EPSG:4326）
 * @param pos [x, y] 经纬度
 * @returns [lng,lat] 坐标
 */
export function mercator2LngLat(pos: Position): LngLat

/**
 * 墨卡托投影（EPSG:3857）转 经纬度（EPSG:4326）
 * @param x x 坐标
 * @param y y 坐标
 * @returns [lng,lat] 经纬度
 */
export function mercator2LngLat(x: number, y: number): LngLat

export function mercator2LngLat() {
  let x: number, y: number
  if (Array.isArray(arguments[0])) {
    x = arguments[0][0]
    y = arguments[0][1]
  } else {
    x = arguments[0]
    y = arguments[1]
  }
  const lng = rad2Angle(x) / EARTH_RAD
  const lat = rad2Angle(2 * Math.atan(Math.exp(y / EARTH_RAD)) - Math.PI / 2)
  return [lng, lat]
}
