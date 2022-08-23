export type Position = [x: number, y: number]
export type LngLat = [Lng: number, Lat: number]

export type Config = {
  zoom?: number
  center: LngLat
  draggable?: boolean
}
