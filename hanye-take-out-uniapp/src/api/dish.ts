import type {DishItem} from '@/types/dish'
import {http} from '@/utils/http'

/**
 * 根据菜品分类id获取菜品列表
 */
export const getDishListAPI = (id: number) => {
  return http<DishItem[]>({
    method: 'GET',
    url: `/user/dish/list/${id}`,
  })
}

/**
 * 根据菜品id获取菜品详情
 */
export const getDishByIdAPI = (id: number) => {
  return http<DishItem>({
    method: 'GET',
    url: `/user/dish/${id}`,
  })
}
