/**
 * 店铺配置类型定义
 */
export type ShopConfig = {
  id: number
  name: string
  address: string
  latitude: string
  longitude: string
  phone: string
  avatar?: string
  deliveryFee: number
  deliveryStatus: number // 1开启 0关闭
  packFee: number
  packStatus: number // 1开启 0关闭
  minOrderAmount: number
  openingHours: string
  notice: string
  autoAccept: number
  updateTime?: string
}

