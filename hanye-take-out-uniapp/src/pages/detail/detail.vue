<template>
  <view class="container">
    <!-- 1. 顶部大图背景区域 -->
    <view class="header-banner">
      <!-- 菜品图片 -->
      <image
        v-if="dish"
        class="banner-img"
        :src="dish.pic || '/static/images/logo.png'"
        mode="aspectFill"
        lazy-load
        @error="handleImageError"
      />
      <image
        v-else-if="setmeal"
        class="banner-img"
        :src="setmeal.pic || '/static/images/logo.png'"
        mode="aspectFill"
        lazy-load
        @error="handleImageError"
      />
      <!-- 渐变遮罩，为了字看清楚 -->
      <view class="mask"></view>
    </view>

    <!-- 2. 内容卡片区域 (上浮) -->
    <view class="content-card">
      <!-- A. 菜品/套餐 基础信息 -->
      <view class="basic-info" v-if="dish || setmeal">
        <view class="name-row">
          <text class="dish-name">{{ dish ? dish.name : setmeal?.name }}</text>
        </view>
        <view class="desc-row">
          <text class="dish-desc">{{ dish ? dish.detail : setmeal?.detail }}</text>
        </view>

        <!-- 价格与操作行 -->
        <view class="price-action-row">
          <view class="price-box">
            <text class="symbol">¥</text>
            <text class="num">{{ dish ? dish.price : setmeal?.price }}</text>
          </view>

          <!-- 操作按钮组 -->
          <view class="action-box">
            <!-- 情况1：有多口味，选规格 -->
            <view
              v-if="dish && dish.flavors && dish.flavors.length > 0"
              class="spec-btn"
              @tap.stop="chooseNorm(dish as DishItem)"
            >
              选规格
              <view v-if="getCopies(dish) > 0" class="badge">{{ getCopies(dish) }}</view>
            </view>

            <!-- 情况2：无多口味，直接加减 -->
            <view v-else class="stepper">
              <view
                v-if="getCopies(dish || setmeal!) > 0"
                class="btn minus"
                @tap.stop="subDishAction(dish || setmeal!, dish ? '菜品' : '套餐')"
                >-</view
              >

              <text v-if="getCopies(dish || setmeal!) > 0" class="count">
                {{ getCopies(dish || setmeal!) }}
              </text>

              <view class="btn plus" @tap.stop="addDishAction(dish || setmeal!, dish ? '菜品' : '套餐')">+</view>
            </view>
          </view>
        </view>
      </view>

      <!-- B. 如果是套餐，展示包含的菜品 -->
      <view class="setmeal-list" v-if="setmeal && setmeal.setmealDishes && setmeal.setmealDishes.length > 0">
        <view class="section-title">套餐包含</view>
        <view class="sub-item" v-for="(item, index) in setmeal.setmealDishes" :key="index">
          <image class="sub-img" :src="item.pic" mode="aspectFill" lazy-load></image>
          <view class="sub-info">
            <text class="sub-name">{{ item.name }}</text>
            <text class="sub-count">x{{ item.copies }}</text>
            <text class="sub-desc">{{ item.detail || '暂无描述' }}</text>
          </view>
        </view>
      </view>

      <!-- 底部垫高，防止内容被遮挡 -->
      <view style="height: 160rpx"></view>
    </view>

    <!--
      FIXME: 移除了底部的悬浮购物车栏(.footer-bar)和购物车列表弹窗(.cart-popup)。
      原因：根据你的描述，这个组件只应该在外层（如菜单列表页）显示。
      详情页本身不应该再包含一个完整的购物车列表，避免了UI遮挡和逻辑混乱问题。
    -->

    <!-- 规格弹窗 (美化版) - 保留 -->
    <view class="popup-mask" v-if="visible" @click="visible = false">
      <view class="popup-content" @click.stop>
        <view class="popup-header">
          <text class="tit">选择规格</text>
          <text class="close" @click="visible = false">×</text>
        </view>

        <scroll-view scroll-y class="popup-scroll">
          <view class="flavor-group" v-for="flavor in flavors" :key="flavor.name">
            <view class="flavor-name">{{ flavor.name }}</view>
            <view class="flavor-tags">
              <view
                class="tag"
                :class="{active: chosedflavors.includes(item)}"
                v-for="(item, index) in JSON.parse(flavor.list)"
                :key="index"
                @tap="chooseFlavor(JSON.parse(flavor.list), item)"
              >
                {{ item }}
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="popup-footer">
          <view class="price">¥{{ dialogDish?.price }}</view>
          <view class="add-cart-btn" @tap="addToCart(dialogDish as DishToCartItem)">加入购物车</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type {CategoryItem} from '@/types/category'
import type {DishItem, FlavorItem, DishToCartItem} from '@/types/dish'
import type {SetmealItem, SetmealVOItem} from '@/types/setmeal'
import type {CartDTO, CartItem} from '@/types/cart'
import {getCategoryAPI} from '@/api/category'
import {addToCartAPI, subCartAPI, getCartAPI, cleanCartAPI} from '@/api/cart'
import {getDishByIdAPI} from '@/api/dish'
import {getSetmealAPI} from '@/api/setmeal'
import {onLoad, onShow} from '@dcloudio/uni-app'
import {ref} from 'vue'

// ------ data ------
// 分类列表
const categoryList = ref<CategoryItem[]>([])
// 菜品
const dish = ref<DishItem>()
// 套餐详情(含菜品)
const setmeal = ref<SetmealVOItem>()

// 购物车列表 (仍然需要获取，用于计算当前商品数量)
const cartList = ref<CartItem[]>([])
// 是否显示规格弹窗
const visible = ref(false)
// 弹窗中对应的菜品和口味数据，用于加入购物车
const dialogDish = ref<DishToCartItem>()
const flavors = ref<FlavorItem[]>([])
// 已选择的口味列表
const chosedflavors = ref<string[]>([])

// ------ method ------
onLoad(async (options) => {
  await getCartList() // 获取购物车列表，用于显示数量
  await getCategoryData() // 获取分类列表
  const dishId = options?.dishId !== undefined ? Number(options.dishId) : undefined
  const setmealId = options?.setmealId !== undefined ? Number(options.setmealId) : undefined

  if (dishId !== undefined && !Number.isNaN(dishId)) {
    console.log('dishId', dishId)
    await init(dishId, 'dishId')
    return
  }

  if (setmealId !== undefined && !Number.isNaN(setmealId)) {
    console.log('setmealId', setmealId)
    await init(setmealId, 'setmealId')
    return
  }

  uni.showToast({
    title: '参数错误，无法获取详情',
    icon: 'none',
  })
})

// 页面显示时，刷新购物车数据，确保数量正确
onShow(() => {
  setTimeout(() => {
    getCartList()
  }, 100)
})

const handleImageError = (e: any) => {
  console.error('图片加载失败', e)
  if (dish.value) {
    dish.value.pic = '/static/images/logo.png'
  } else if (setmeal.value) {
    setmeal.value.pic = '/static/images/logo.png'
  }
}

const init = async (id: number, type: string) => {
  try {
    let res
    console.log('init', id, type)
    if (type === 'dishId') {
      res = await getDishByIdAPI(id)
      // FIXME: 修复了API成功状态的判断，只接受 code 为 0 的情况
      if (res.code === 0) {
        dish.value = res.data
      } else {
        uni.showToast({
          title: res.msg || '获取菜品详情失败',
          icon: 'none',
        })
      }
    } else {
      res = await getSetmealAPI(id)
      // FIXME: 修复了API成功状态的判断，只接受 code 为 0 的情况
      if (res.code === 0) {
        setmeal.value = res.data
      } else {
        uni.showToast({
          title: res.msg || '获取套餐详情失败',
          icon: 'none',
        })
      }
    }
    console.log(res)
    console.log(dish.value)
    console.log(setmeal.value)
  } catch (e) {
    console.error('获取详情失败', e)
    uni.showToast({
      title: '获取详情失败，请重试',
      icon: 'none',
    })
  }
}

const getCategoryData = async () => {
  const res = await getCategoryAPI()
  categoryList.value = res.data
}

const getCartList = async () => {
  const res = await getCartAPI()
  console.log('刷新购物车列表', res)
  cartList.value = res.data
}

// 获取购物车中某个菜品的数量
const getCopies = (dish: DishItem | SetmealItem) => {
  if (dish && 'flavors' in dish) {
    return cartList.value.find((item) => item.dishId === dish.id)?.number || 0
  }
  return cartList.value.find((item) => item.setmealId === dish.id)?.number || 0
}

// 只有菜品才要选择规格/口味(多种口味规格数据处理)
const chooseNorm = async (dish: DishItem) => {
  flavors.value = dish.flavors
  const tmpdish = Object.assign({}, dish) as unknown as DishToCartItem
  delete tmpdish.flavors
  dialogDish.value = tmpdish
  const moreNormdata = dish.flavors.map((obj) => ({...obj, list: JSON.parse(obj.list)}))
  moreNormdata.forEach((item) => {
    if (item.list && item.list.length > 0) {
      chosedflavors.value.push(item.list[0])
    }
  })
  visible.value = true
}

// 选择菜品口味
const chooseFlavor = (obj: string[], flavor: string) => {
  let ind = -1
  let findst = obj.some((n) => {
    ind = chosedflavors.value.findIndex((o) => o == n)
    return ind != -1
  })
  const indexInChosed = chosedflavors.value.findIndex((it) => it == flavor)
  if (indexInChosed == -1 && !findst) {
    chosedflavors.value.push(flavor)
  } else if (indexInChosed == -1 && findst && ind >= 0) {
    chosedflavors.value.splice(ind, 1)
    chosedflavors.value.push(flavor)
  } else {
    chosedflavors.value.splice(indexInChosed, 1)
  }
  dialogDish.value!.flavors = chosedflavors.value.join(',')
}

// dialog中点击加入购物车(有口味必定是菜品dish)
const addToCart = async (dish: DishToCartItem) => {
  if (!chosedflavors.value || chosedflavors.value.length <= 0) {
    uni.showToast({
      title: '请选择规格',
      icon: 'none',
    })
    return false
  }
  const partialCart: Partial<CartDTO> = {dishId: dish.id, dishFlavor: chosedflavors.value.join(',')}
  await addToCartAPI(partialCart)
  await getCartList()
  chosedflavors.value = []
  visible.value = false
}

// "+"按钮
const addDishAction = async (item: any, form: string) => {
  if (form == '菜品') {
    const partialCart: Partial<CartDTO> = {dishId: dish.value!.id}
    await addToCartAPI(partialCart)
  } else {
    const partialCart: Partial<CartDTO> = {setmealId: setmeal.value!.id}
    await addToCartAPI(partialCart)
  }
  await getCartList()
}
// "-"按钮
const subDishAction = async (item: any, form: string) => {
  if (form == '菜品') {
    const partialCart: Partial<CartDTO> = {dishId: dish.value!.id}
    await subCartAPI(partialCart)
  } else {
    const partialCart: Partial<CartDTO> = {setmealId: setmeal.value!.id}
    await subCartAPI(partialCart)
  }
  await getCartList()
}
</script>

<style lang="scss" scoped>
/* 你的样式代码保持不变 */
.container {
  min-height: 100vh;
  background-color: #f8f8f8;
  position: relative;
}

/* 顶部大图 */
.header-banner {
  width: 100%;
  height: 480rpx;
  position: relative;

  .banner-img {
    width: 100%;
    height: 100%;
  }

  .mask {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.4));
  }
}

/* 内容卡片 (上浮) */
.content-card {
  position: relative;
  margin-top: -60rpx; /* 负边距实现上浮 */
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx 30rpx;
  min-height: 500rpx;
  z-index: 10;
}

/* 基础信息 */
.basic-info {
  .name-row {
    margin-bottom: 16rpx;
    .dish-name {
      font-size: 40rpx;
      font-weight: bold;
      color: #333;
    }
  }

  .desc-row {
    margin-bottom: 30rpx;
    .dish-desc {
      font-size: 26rpx;
      color: #999;
      line-height: 1.5;
    }
  }

  .price-action-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 30rpx;

    .price-box {
      color: #ff4d4f;
      .symbol {
        font-size: 28rpx;
        font-weight: bold;
      }
      .num {
        font-size: 48rpx;
        font-weight: bold;
      }
    }

    .action-box {
      .spec-btn {
        background: #00aaff;
        color: #fff;
        padding: 12rpx 30rpx;
        border-radius: 30rpx;
        font-size: 26rpx;
        font-weight: bold;
        position: relative;
        .badge {
          position: absolute;
          top: -10rpx;
          right: -10rpx;
          background: #ff4d4f;
          color: #fff;
          font-size: 20rpx;
          padding: 2rpx 10rpx;
          border-radius: 20rpx;
        }
      }

      .stepper {
        display: flex;
        align-items: center;
        .btn {
          width: 50rpx;
          height: 50rpx;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36rpx;
          font-weight: bold;
          &.minus {
            border: 2rpx solid #ddd;
            color: #666;
            background: #fff;
          }
          &.plus {
            background: #00aaff;
            color: #fff;
          }
        }
        .count {
          margin: 0 20rpx;
          font-size: 32rpx;
          font-weight: bold;
        }
      }
    }
  }
}

/* 套餐列表 */
.setmeal-list {
  margin-top: 40rpx;
  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    margin-bottom: 20rpx;
  }

  .sub-item {
    display: flex;
    margin-bottom: 24rpx;
    .sub-img {
      width: 120rpx;
      height: 120rpx;
      border-radius: 12rpx;
      margin-right: 20rpx;
      background: #f5f5f5;
    }
    .sub-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      .sub-name {
        font-size: 28rpx;
        font-weight: bold;
        color: #333;
      }
      .sub-count {
        font-size: 24rpx;
        color: #999;
        margin: 4rpx 0;
      }
      .sub-desc {
        font-size: 22rpx;
        color: #ccc;
      }
    }
  }
}

/* 通用弹窗遮罩 */
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 900;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* 规格弹窗 */
.popup-content {
  background: #fff;
  border-radius: 30rpx 30rpx 0 0;
  padding: 30rpx;

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    .tit {
      font-size: 32rpx;
      font-weight: bold;
    }
    .close {
      font-size: 40rpx;
      color: #999;
      padding: 10rpx;
    }
  }

  .popup-scroll {
    max-height: 60vh;
    .flavor-group {
      margin-bottom: 30rpx;
      .flavor-name {
        font-size: 28rpx;
        color: #666;
        margin-bottom: 16rpx;
      }
      .flavor-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 20rpx;
        .tag {
          padding: 10rpx 30rpx;
          border: 2rpx solid #ddd;
          border-radius: 8rpx;
          font-size: 26rpx;
          color: #333;
          &.active {
            border-color: #00aaff;
            background: #e6f7ff;
            color: #00aaff;
            font-weight: bold;
          }
        }
      }
    }
  }

  .popup-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 30rpx;
    border-top: 1rpx solid #eee;
    .price {
      color: #ff4d4f;
      font-size: 40rpx;
      font-weight: bold;
    }
    .add-cart-btn {
      background: #00aaff;
      color: #fff;
      padding: 16rpx 60rpx;
      border-radius: 40rpx;
      font-weight: bold;
    }
  }
}
</style>
