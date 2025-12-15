import { http } from '@/utils/http'
import type { ShopConfig } from '@/types/shop'

/**
 * 查询店铺状态
 */
export const getStatusAPI = () => {
  return http({
    method: 'GET',
    url: '/user/shop/status',
  })
}

/**
 * 获取店铺配置
 */
export const getShopConfigAPI = () => {
  return http<ShopConfig>({
    method: 'GET',
    url: '/user/shop/config',
  })
}
