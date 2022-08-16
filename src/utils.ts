/**
 * 地球半径
 */
const EARTH_RAD = 6378137

/**
 * 角度转弧度
 * @param angle 角度
 * @returns 弧度
 */
function angle2Rad(angle: number) {
  return angle * (Math.PI / 180)
}

/**
 * 弧度转角度
 * @param rad 弧度
 * @returns 角度
 */
function rad2Angle(rad: number) {
  return rad * (180 / Math.PI)
}

/**
 * 经纬度（EPSG:4326）转 墨卡托投影（EPSG:3857）
 * @param lng 经度
 * @param lat 纬度
 * @returns [x, y] 坐标
 */
function lngLat2Mercator(lng: number, lat: number) {
  // 经度先转弧度，然后因为 弧度 = 弧长 / 半径，得到 弧长 = 弧度 * 半径
  const x = angle2Rad(lng) * EARTH_RAD
  const rad = angle2Rad(lat)
  const sin = Math.sin(rad)
  const y = (EARTH_RAD / 2) * Math.log((1 + sin) / (1 - sin))
  return [x, y] as const
}

/**
 * 墨卡托投影（EPSG:3857）转 经纬度（EPSG:4326）
 * @param x x 坐标
 * @param y y 坐标
 * @returns [lng,lat] 经纬度
 */
function mercator2LngLat(x: number, y: number) {
  const lng = rad2Angle(x) / EARTH_RAD
  const lat = rad2Angle(2 * Math.atan(Math.exp(y / EARTH_RAD)) - Math.PI / 2)
  return [lng, lat] as const
}
