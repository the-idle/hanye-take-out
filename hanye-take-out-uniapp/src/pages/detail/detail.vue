<template>
  <view class="container">
    
    <!-- 1. 顶部大图背景区域 -->
    <view class="header-banner">
      <!-- 菜品图片 -->
      <image v-if="dish" class="banner-img" :src="dish.pic" mode="aspectFill" />
      <image v-else-if="setmeal" class="banner-img" :src="setmeal.pic" mode="aspectFill" />
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
              >-</view>
              
              <text v-if="getCopies(dish || setmeal!) > 0" class="count">
                {{ getCopies(dish || setmeal!) }}
              </text>
              
              <view 
                class="btn plus" 
                @tap.stop="addDishAction(dish || setmeal!, dish ? '菜品' : '套餐')"
              >+</view>
            </view>
          </view>
        </view>
      </view>

      <!-- B. 如果是套餐，展示包含的菜品 -->
      <view class="setmeal-list" v-if="setmeal && setmeal.setmealDishes && setmeal.setmealDishes.length > 0">
        <view class="section-title">套餐包含</view>
        <view class="sub-item" v-for="(item, index) in setmeal.setmealDishes" :key="index">
          <image class="sub-img" :src="item.pic" mode="aspectFill"></image>
          <view class="sub-info">
            <text class="sub-name">{{ item.name }}</text>
            <text class="sub-count">x{{ item.copies }}</text>
            <text class="sub-desc">{{ item.detail || '暂无描述' }}</text>
          </view>
        </view>
      </view>
      
      <!-- 底部垫高 -->
      <view style="height: 160rpx;"></view>
    </view>

    <!-- 3. 底部悬浮购物车栏 (保持你原有的逻辑，只改样式) -->
    <view class="footer-bar">
      <!-- 空购物车 -->
      <view class="cart-box empty" v-if="cartList.length === 0">
        <view class="icon-wrap">
          <image src="../../static/images/cart_empty.png" class="icon"></image>
        </view>
        <view class="tips">未选购商品</view>
        <view class="btn disabled">¥0起送</view>
      </view>
      
      <!-- 有商品 -->
      <view class="cart-box active" v-else @click="openCartList = !openCartList">
        <view class="icon-wrap">
          <image src="../../static/images/cart_active.png" class="icon"></image>
          <view class="badge">{{ CartAllNumber }}</view>
        </view>
        <view class="price-info">
          <view class="total">¥<text class="big">{{ parseFloat((Math.round(CartAllPrice * 100) / 100).toFixed(2)) }}</text></view>
          <view class="delivery">预估配送费</view>
        </view>
        <view class="btn submit" @click.stop="submitOrder">去结算</view>
      </view>
    </view>

    <!-- 4. 规格弹窗 (美化版) -->
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
                :class="{ active: chosedflavors.includes(item) }"
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

    <!-- 5. 购物车列表弹窗 (保持逻辑，微调样式) -->
    <view class="popup-mask cart-mask" v-show="openCartList" @click="openCartList = false">
      <view class="cart-popup" @click.stop>
        <view class="cart-header">
          <text class="tit">购物车</text>
          <view class="clear-btn" @click="clearCart">
            <image src="../../static/icon/clear.png" class="icon"></image>
            <text>清空</text>
          </view>
        </view>
        <scroll-view scroll-y class="cart-scroll">
          <view class="cart-item" v-for="(obj, index) in cartList" :key="index">
            <image class="item-img" :src="obj.pic" mode="aspectFill"></image>
            <view class="item-info">
              <view class="name">{{ obj.name }}</view>
              <view class="flavor" v-if="obj.dishFlavor">{{ obj.dishFlavor }}</view>
              <view class="row-bottom">
                <view class="price">¥{{ obj.amount }}</view>
                <view class="stepper">
                  <image src="../../static/icon/sub.png" class="btn" @click.stop="subDishAction(obj, '购物车')"></image>
                  <text class="num">{{ obj.number }}</text>
                  <image src="../../static/icon/add.png" class="btn" @click.stop="addDishAction(obj, '购物车')"></image>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
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

// 是否打开底部购物车列表
const openCartList = ref(false)
// 购物车列表
const cartList = ref<CartItem[]>([])
const CartAllNumber = ref(0)
const CartAllPrice = ref(0)
// 是否显示弹窗
const visible = ref(false)
// 弹窗中对应的菜品和口味数据，用于加入购物车
const dialogDish = ref<DishToCartItem>()
const flavors = ref<FlavorItem[]>([])
// 已选择的口味列表
const chosedflavors = ref<string[]>([])

// ------ method ------
onLoad(async (options) => {
  // 初始化时关闭购物车弹窗
  openCartList.value = false
  await getCartList() // 获取购物车列表(一开始为空)
  await getCategoryData() // 获取分类列表
  if (options && 'dishId' in options) {
    console.log('dishId', options.dishId)
    init(options.dishId, 'dishId')
  } else {
    console.log('setmealId', options?.setmealId)
    init(options?.setmealId, 'setmealId')
  }
})

// 页面显示时关闭购物车弹窗（防止从其他页面返回时弹窗还开着）
onShow(() => {
  openCartList.value = false
  // 刷新购物车数据
  getCartList()
})

const init = async (id: number, type: string) => {
  // dishId.value = id
  let res
  console.log('init', id, type)
  if (type === 'dishId') {
    res = await getDishByIdAPI(id)
    dish.value = res.data
  } else {
    res = await getSetmealAPI(id)
    setmeal.value = res.data
  }
  console.log(res)
  // Object.assign(form, category.data.data)
  console.log(dish.value)
  console.log(setmeal.value)
}

const getCategoryData = async () => {
  const res = await getCategoryAPI()
  console.log(res)
  categoryList.value = res.data
  console.log('categoryList', categoryList.value)
}

const getCartList = async () => {
  const res = await getCartAPI()
  console.log('初始化购物车列表', res)
  cartList.value = res.data
  CartAllNumber.value = cartList.value.reduce((acc, cur) => acc + cur.number, 0)
  CartAllPrice.value = cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0)
  console.log('CartAllNumber', CartAllNumber.value)
  console.log('CartAllPrice', CartAllPrice.value)
  // 如果减少菜品导致购物车为空，关闭购物车列表
  if (cartList.value.length === 0) {
    openCartList.value = false
  }
}

// 获取购物车中某个菜品的数量
const getCopies = (dish: DishItem | SetmealItem) => {
  console.log('getCopies', dish)
  // 有可能是菜品/套餐，所以要判断
  const sort = categoryList.value.find((item) => item.id === dish.categoryId)?.sort
  console.log('category？', sort)
  if (sort && sort < 20) {
    return cartList.value.find((item) => item.dishId === dish.id)?.number || 0
  } else {
    return cartList.value.find((item) => item.setmealId === dish.id)?.number || 0
  }
}

// 只有菜品才要选择规格/口味(多种口味规格数据处理)
const chooseNorm = async (dish: DishItem) => {
  console.log('点击了选择规格chooseNorm，得到了该菜品的所有口味数据', dish.flavors)
  // 所有口味数据放到flavors中
  flavors.value = dish.flavors
  // dish -> dialogDish, flavor涉及类型转换(所有flavors -> 已选的flavors)，需要绕过ts校验
  const tmpdish = Object.assign({}, dish) as unknown as DishToCartItem
  // 删除临时对象中的 'flavors' 属性
  delete tmpdish.flavors
  dialogDish.value = tmpdish
  // 对 dish.flavors 数组中的每种口味进行映射，将list字段用 JSON.parse 转为数组，其他数据不动
  const moreNormdata = dish.flavors.map((obj) => ({...obj, list: JSON.parse(obj.list)}))
  // 有口味的菜品，初始化选择每行的第一个口味，作为已选口味数据
  moreNormdata.forEach((item) => {
    if (item.list && item.list.length > 0) {
      chosedflavors.value.push(item.list[0])
    }
  })
  visible.value = true
}

// 选择菜品口味 obj: 当前行的所有口味数据，flavor: 当前点击的口味
// 每行口味只能选择0或1个口味
const chooseFlavor = (obj: string[], flavor: string) => {
  console.log('chooseFlavor', flavor)
  let ind = -1
  // 判断所有已选过口味(多个口味list中选过口味的集合)中，有没有口味属于当前行下
  // 外层：遍历当前行所有口味n，内层：遍历已选择的口味列表，查找是否存在n，存在则(!=-1)返回true
  // ind表示"当前行选择的口味"在已选口味列表中的位置，-1表示之前没选过当前行的口味
  let findst = obj.some((n) => {
    ind = chosedflavors.value.findIndex((o) => o == n)
    return ind != -1
  })
  // 查询"当前口味"在已选口味列表中的位置（-1表示之前没选过）
  const indexInChosed = chosedflavors.value.findIndex((it) => it == flavor)
  console.log('ind', ind)
  console.log('indexInChosed', indexInChosed)
  // 1、如果当前口味没选过，且当前行没有选过口味，直接添加
  if (indexInChosed == -1 && !findst) {
    console.log('1、当前口味没选过，且当前行没选过口味')
    chosedflavors.value.push(flavor)
  }
  // 2、如果当前口味没选过，但当前行选过口味，替换掉当前行选过的口味（确保每行只能选一个口味）
  else if (indexInChosed == -1 && findst && ind >= 0) {
    console.log('2、当前口味没选过，但当前行选过口味，替换掉当前行选过的口味')
    chosedflavors.value.splice(ind, 1) // 当前行上次选过的口味对应的索引是ind
    chosedflavors.value.push(flavor)
  }
  // 3、如果当前口味选过，进行反选操作，也就是直接删除（即当前行不选择口味了）
  else {
    console.log('3、当前口味选过，进行反选操作，也就是直接删除')
    chosedflavors.value.splice(indexInChosed, 1)
  }
  // 选择的口味列表，先拼接成字符串，再赋值给dialogDish.flavors字段
  dialogDish.value!.flavors = chosedflavors.value.join(',')
  // 我确定不可能为空！因为打开dialog触发的chooseNorm函数中，已经为dialogDish赋值过了
  console.log('选好口味后，看看带口味字符串的，dialog中的菜品长什么样？ dialogDish', dialogDish.value)
}

// dialog中点击加入购物车(有口味必定是菜品dish)
const addToCart = async (dish: DishToCartItem) => {
  console.log('dialog中点击加入购物车addToCart, dialogdish:', dish)
  // dialog中必定是菜品且有口味，需要判断是否有选择口味，必须有口味才能发送给后端
  if (!chosedflavors.value || chosedflavors.value.length <= 0) {
    uni.showToast({
      title: '请选择规格',
      icon: 'none',
    })
    return false
  }
  // 菜品需要拼接口味list，转为string，作为dishFlavor字段发送给后端
  const partialCart: Partial<CartDTO> = {dishId: dish.id, dishFlavor: chosedflavors.value.join(',')}
  await addToCartAPI(partialCart)
  // 数据库更新，所以拿到新的购物车列表(cartList)，页面才能跟着刷新
  await getCartList()
  // 请求发送成功后，清空已选择的口味数据，并关闭dialog弹窗
  chosedflavors.value = []
  visible.value = false
}

// "+"按钮，form: 购物车/普通视图中的按钮
const addDishAction = async (item: any, form: string) => {
  console.log('点击了 “+” 添加菜品数量按钮', item, form)
  if (form == '购物车') {
    // 1、直接数量-1，传的参数是cartItem类型，dishId、setmealId必是一个null 一个不null，所以直接全传
    console.log('addCart', item)
    const partialCart: Partial<CartDTO> = {
      dishId: item.dishId,
      setmealId: item.setmealId,
      dishFlavor: item.dishFlavor,
    }
    await addToCartAPI(partialCart)
  } else if (form == '菜品') {
    // 2、添加的是菜品
    const partialCart: Partial<CartDTO> = {dishId: dish.value!.id}
    await addToCartAPI(partialCart)
  } else {
    // 3、添加的是套餐
    const partialCart: Partial<CartDTO> = {setmealId: setmeal.value!.id}
    await addToCartAPI(partialCart)
  }
  // 数据库更新，所以拿到新的购物车列表(cartList)，页面才能跟着刷新
  await getCartList()
}
// "-"按钮，form: 购物车/普通视图中的按钮
const subDishAction = async (item: any, form: string) => {
  console.log('点击了减少菜品数量按钮subDishAction--------------------', item, form)
  if (form == '购物车') {
    // 1、直接数量-1，传的参数是cartItem类型，dishId、setmealId必是一个null 一个不null，所以直接全传
    console.log('subCart', item)
    const partialCart: Partial<CartDTO> = {
      dishId: item.dishId,
      setmealId: item.setmealId,
      dishFlavor: item.dishFlavor,
    }
    await subCartAPI(partialCart)
  } else if (form == '菜品') {
    // 2、菜品
    const partialCart: Partial<CartDTO> = {dishId: dish.value!.id}
    await subCartAPI(partialCart)
  } else {
    // 3、套餐
    const partialCart: Partial<CartDTO> = {setmealId: setmeal.value!.id}
    await subCartAPI(partialCart)
  }
  // 数据库更新，所以拿到新的购物车列表(cartList)，页面才能跟着刷新
  await getCartList()
}

// 清空购物车
const clearCart = async () => {
  await cleanCartAPI()
  await getCartList()
  openCartList.value = false
}

const submitOrder = () => {
  console.log('submitOrder')
  // 跳转到订单确认页面
  uni.navigateTo({
    url: '/pages/submit/submit',
  })
}
</script>

<style lang="scss" scoped>
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
      top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4));
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
      .dish-name { font-size: 40rpx; font-weight: bold; color: #333; }
    }
    
    .desc-row {
      margin-bottom: 30rpx;
      .dish-desc { font-size: 26rpx; color: #999; line-height: 1.5; }
    }
    
    .price-action-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 30rpx;
      
      .price-box {
        color: #ff4d4f;
        .symbol { font-size: 28rpx; font-weight: bold; }
        .num { font-size: 48rpx; font-weight: bold; }
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
            position: absolute; top: -10rpx; right: -10rpx;
            background: #ff4d4f; color: #fff;
            font-size: 20rpx; padding: 2rpx 10rpx;
            border-radius: 20rpx;
          }
        }
        
        .stepper {
          display: flex;
          align-items: center;
          .btn {
            width: 50rpx; height: 50rpx;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 36rpx; font-weight: bold;
            &.minus { border: 2rpx solid #ddd; color: #666; background: #fff;}
            &.plus { background: #00aaff; color: #fff; }
          }
          .count { margin: 0 20rpx; font-size: 32rpx; font-weight: bold; }
        }
      }
    }
  }
  
  /* 套餐列表 */
  .setmeal-list {
    margin-top: 40rpx;
    .section-title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; }
    
    .sub-item {
      display: flex;
      margin-bottom: 24rpx;
      .sub-img {
        width: 120rpx; height: 120rpx;
        border-radius: 12rpx;
        margin-right: 20rpx;
        background: #f5f5f5;
      }
      .sub-info {
        flex: 1;
        display: flex; flex-direction: column; justify-content: center;
        .sub-name { font-size: 28rpx; font-weight: bold; color: #333; }
        .sub-count { font-size: 24rpx; color: #999; margin: 4rpx 0; }
        .sub-desc { font-size: 22rpx; color: #ccc; }
      }
    }
  }
  
  /* 底部悬浮购物车 */
  .footer-bar {
    position: fixed;
    bottom: 40rpx;
    left: 30rpx; right: 30rpx;
    height: 100rpx;
    z-index: 99;
    
    .cart-box {
      display: flex; align-items: center;
      background: #333;
      border-radius: 50rpx;
      height: 100%;
      box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.2);
      position: relative;
      
      .icon-wrap {
        width: 100rpx; height: 100rpx;
        background: #444;
        border-radius: 50%;
        position: absolute; left: 0; bottom: 0;
        display: flex; align-items: center; justify-content: center;
        border: 8rpx solid #333; /* 模拟镂空 */
        
        .icon { width: 60rpx; height: 60rpx; }
        .badge {
          position: absolute; top: 0; right: 0;
          background: #ff4d4f; color: #fff;
          font-size: 20rpx; padding: 4rpx 10rpx;
          border-radius: 20rpx;
        }
      }
      
      &.active .icon-wrap { background: #00aaff; }
      
      /* 空状态 */
      &.empty {
        .tips { margin-left: 120rpx; color: #999; font-size: 28rpx; }
        .btn { margin-left: auto; width: 200rpx; background: #444; color: #999; }
      }
      
      /* 有货状态 */
      &.active {
        .price-info {
          margin-left: 120rpx;
          flex: 1;
          .total { color: #fff; font-size: 28rpx; .big { font-size: 36rpx; font-weight: bold; } }
          .delivery { color: #999; font-size: 20rpx; }
        }
        .btn { margin-left: auto; width: 200rpx; background: #00aaff; color: #fff; }
      }
      
      .btn {
        height: 100%;
        border-radius: 0 50rpx 50rpx 0;
        display: flex; align-items: center; justify-content: center;
        font-weight: bold; font-size: 30rpx;
      }
    }
  }
  
  /* 通用弹窗遮罩 */
  .popup-mask {
    position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
    background: rgba(0,0,0,0.5); z-index: 900;
    display: flex; flex-direction: column; justify-content: flex-end;
  }
  
  /* 规格弹窗 */
  .popup-content {
    background: #fff;
    border-radius: 30rpx 30rpx 0 0;
    padding: 30rpx;
    
    .popup-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 30rpx;
      .tit { font-size: 32rpx; font-weight: bold; }
      .close { font-size: 40rpx; color: #999; padding: 10rpx; }
    }
    
    .popup-scroll {
      max-height: 60vh;
      .flavor-group {
        margin-bottom: 30rpx;
        .flavor-name { font-size: 28rpx; color: #666; margin-bottom: 16rpx; }
        .flavor-tags {
          display: flex; flex-wrap: wrap; gap: 20rpx;
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
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 30rpx; border-top: 1rpx solid #eee;
      .price { color: #ff4d4f; font-size: 40rpx; font-weight: bold; }
      .add-cart-btn {
        background: #00aaff; color: #fff;
        padding: 16rpx 60rpx; border-radius: 40rpx;
        font-weight: bold;
      }
    }
  }
  
  /* 购物车列表弹窗 */
  .cart-popup {
    background: #fff;
    border-radius: 30rpx 30rpx 0 0;
    padding-bottom: 160rpx; /* 避开底部条 */
    
    .cart-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 30rpx; background: #f9f9f9;
      .tit { font-weight: bold; }
      .clear-btn {
        display: flex; align-items: center; color: #999; font-size: 24rpx;
        .icon { width: 30rpx; height: 30rpx; margin-right: 6rpx; }
      }
    }
    
    .cart-scroll {
      max-height: 50vh;
      padding: 0 30rpx;
      .cart-item {
        display: flex; padding: 24rpx 0; border-bottom: 1rpx solid #f5f5f5;
        .item-img { width: 100rpx; height: 100rpx; border-radius: 10rpx; margin-right: 20rpx; background: #eee;}
        .item-info {
          flex: 1;
          .name { font-weight: bold; font-size: 28rpx; }
          .flavor { font-size: 22rpx; color: #999; margin: 4rpx 0; }
          .row-bottom {
            display: flex; justify-content: space-between; align-items: center; margin-top: 10rpx;
            .price { color: #ff4d4f; font-weight: bold; }
            .stepper {
              display: flex; align-items: center;
              .btn { width: 40rpx; height: 40rpx; }
              .num { margin: 0 16rpx; font-size: 28rpx; }
            }
          }
        }
      }
    }
  }
  </style>