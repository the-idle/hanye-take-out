<template>
  <view class="order_content">
    <scroll-view class="order_content_box" scroll-y scroll-top="0rpx">
      <!-- 地址栏 -->
      <view class="new_address">
        <!-- 上部：点击跳转地址选择 -->
        <view class="top" @click="goAddress">
          <!-- 情况1：没有地址ID时显示提示 -->
          <view v-if="!addressId" class="address_name_disabled"> 请选择收货地址 </view>

          <!-- 情况2：有地址ID时显示详情 -->
          <view v-else class="address_name">
            <view class="address">
              <!-- 标签 -->
              <text class="tag" v-if="label" :class="'tag' + trans(label)"> {{ label }} </text>
              <!-- 核心：显示计算后的地址字符串 -->
              <text class="word">{{ detailAddressStr }}</text>
            </view>
            <view class="name">
              <text class="name_1">{{ consignee }}</text>
              <text class="name_2">{{ phoneNumber }}</text>
            </view>
          </view>

          <!-- 右侧箭头图标 -->
          <view class="address_image">
            <image class="to_right" src="../../static/icon/toRight.png"></image>
          </view>
        </view>

        <!-- 下部：送达时间 -->
        <view class="bottom" @click="openTimePicker">
          <view class="time-label">送达时间</view>
          <view class="time-select">
            <text class="blue-text">{{ selectedTimeLabel }}</text>
            <text class="arrow">></text>
          </view>
        </view>
      </view>

      <!-- 订单内容区 -->
      <view class="order_list_cont">
        <!-- 1、订单菜品列表 -->
        <view class="order_list">
          <view class="word_text">
            <text class="word_style">订单明细</text>
          </view>
          <view class="order-type">
            <view class="type_item" v-for="(obj, index) in cartList" :key="index">
              <view class="dish_img">
                <image
                  mode="aspectFill"
                  :src="obj.pic ? obj.pic : '/static/default_dish.png'"
                  class="dish_img_url"
                ></image>
              </view>
              <view class="dish_info">
                <view class="dish_name"> {{ obj.name }} </view>
                <view v-if="obj.dishFlavor" class="dish_flavor"> {{ obj.dishFlavor }} </view>
                <view class="dish_amount">
                  <text v-if="obj.number && obj.number > 0" class="dish_number">x {{ obj.number }}</text>
                </view>
                <view class="dish_price"> <text class="ico">￥</text> {{ obj.amount }} </view>
              </view>
            </view>
            <view class="word_text">
              <view class="word_left">打包费</view>
              <view class="word_right">￥{{ packTotalPrice }}</view>
            </view>
            <view class="word_text">
              <view class="word_left">配送费</view>
              <view class="word_right">￥{{ deliveryTotalPrice }}</view>
            </view>
            <view class="all_price">
              <text class="word_right">总价 ￥{{ CartAllPrice }}</text>
            </view>
          </view>
        </view>

        <!-- 2、备注+餐具份数+发票 -->
        <view class="order_list">
          <view class="bottom_text" @click="goRemark">
            <view class="text_left">备注</view>
            <view class="text_right">{{ remark || '选择口味等' }}</view>
            <view class="right_image">
              <image class="to_right" src="../../static/icon/toRight.png"></image>
            </view>
          </view>
          <view class="bottom_text" @click="chooseCooker">
            <view class="text_left">餐具份数</view>
            <view class="text_right">{{ getCookerInfo() }}</view>
            <view class="right_image">
              <image class="to_right" src="../../static/icon/toRight.png"></image>
            </view>
          </view>
          <view class="bottom_text">
            <view class="text_left">发票</view>
            <view class="text_right">本店不支持线上发票，请致电商家提供</view>
          </view>
        </view>
      </view>
      <view class="blank"></view>
    </scroll-view>

    <!-- 底部购物车 -->
    <view class="footer_order_buttom order_form">
      <view class="order_number">
        <image src="../../static/images/cart_active.png" class="order_number_icon"></image>
        <view class="order_dish_num"> {{ CartAllNumber }} </view>
      </view>
      <view class="order_price">
        <text class="ico">￥ </text> {{ parseFloat((Math.round(CartAllPrice * 100) / 100).toFixed(2)) }}</view
      >
      <view class="order_but">
        <view class="order_but_rit" @click="payOrderHandle()"> 去支付 </view>
      </view>
    </view>
    <view class="mask-box"></view>

    <!-- 选择餐具遮罩层 -->
    <view class="pop_mask" v-show="openCooker" @click="openCooker = !openCooker">
      <view class="cook_pop" @click.stop="openCooker = openCooker">
        <view class="top_title">
          <view class="title"> 选择餐具份数 </view>
          <view class="tips"> 应监管条例要求，商家不能主动提供一次性餐具 </view>
          <view class="close" @click="closeMask">
            <image src="../../static/icon/close.png" class="close_img" />
          </view>
        </view>
        <picker-view class="picker" indicator-style="height: 50px;" :value="cookers" @change="pickerChange">
          <picker-view-column>
            <view v-for="item in cookers" :key="item" style="line-height: 50px; text-align: center">
              {{ item === -1 ? '无需餐具' : item === 0 ? '商家依据餐量提供' : item === 11 ? '10份以上' : item + '份' }}
            </view>
          </picker-view-column>
        </picker-view>
        <view class="comfirm">
          <view class="after_action">
            <label class="checkbox">
              <radio class="radio" color="#00aaff" value="cb" :checked="radioStatus" @click="radioChange" />
              {{ cookerNum === -2 || cookerNum === -1 ? '以后都无需餐具' : '以后都需要餐具，商家依据餐量提供' }}
            </label>
            <button class="comfirm_btn" @click="openCooker = !openCooker">确定</button>
          </view>
        </view>
      </view>
    </view>
    <view class="pop_mask" v-show="showTimePopup" @click="showTimePopup = false">
      <view class="cook_pop" @click.stop>
        <view class="top_title">
          <view class="title">选择送达时间</view>
        </view>
        <scroll-view scroll-y style="height: 500rpx">
          <view class="time-item" v-for="(item, index) in timeSlots" :key="index" @click="selectTime(item)">
            <text :class="{active: selectedTimeLabel === item}">{{ item }}</text>
            <text v-if="selectedTimeLabel === item" class="check">✔</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {getDefaultAddressAPI} from '@/api/address'
import {getCartAPI} from '@/api/cart'
import {submitOrderAPI, getUnPayOrderAPI} from '@/api/order'
import {getShopConfigAPI} from '@/api/shop'
import type {CartItem} from '@/types/cart'
import type {ShopConfig} from '@/types/shop'
import {useAddressStore} from '@/stores/modules/address'
import {onLoad, onShow} from '@dcloudio/uni-app'
import {ref, computed} from 'vue'

// store
const store = useAddressStore()

// 购物车列表
const cartList = ref<CartItem[]>([])
const CartAllNumber = ref(0)
const CartAllPrice = ref(0)

// 店铺配置
const shopConfig = ref<ShopConfig>({
  id: 1,
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  phone: '',
  deliveryFee: 0,
  deliveryStatus: 1,
  packFee: 0,
  packStatus: 1,
  minOrderAmount: 0,
  openingHours: '',
  notice: '',
  autoAccept: 0,
})

// 收货地址信息
const address = ref('')
const label = ref('')
const consignee = ref('')
const phoneNumber = ref('')

// 预计送达时间
const arrivalTime = ref('')
// --- 时间相关变量 ---
const showTimePopup = ref(false)
const selectedTimeLabel = ref('立即送出')
const timeSlots = ref<string[]>([])
const estimatedDeliveryTime = ref('') // 最终传给后端的格式

// 用于显示的地址详情对象 (省市区+门牌号)
const selectedAddrObj = ref<any>({})
const addressId = ref(0)

// 生成时间段逻辑 (当前时间往后推，每15分钟一个格)
const generateTimeSlots = () => {
  const slots = ['立即送出']
  const now = new Date()
  // 从当前时间+30分钟开始算，每15分钟一档
  let start = new Date(now.getTime() + 30 * 60000)
  // 取整到15分刻度
  const remainder = start.getMinutes() % 15
  start.setMinutes(start.getMinutes() + (15 - remainder))

  // 生成直到晚上23:00的时间段
  while (start.getHours() < 23) {
    const h = start.getHours().toString().padStart(2, '0')
    const m = start.getMinutes().toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    start.setMinutes(start.getMinutes() + 15)
  }
  timeSlots.value = slots
}
// 打开弹窗
const openTimePicker = () => {
  generateTimeSlots()
  showTimePopup.value = true
}
// 选中时间
const selectTime = (timeStr: string) => {
  selectedTimeLabel.value = timeStr
  showTimePopup.value = false

  // 计算传给后端的实际时间格式 (yyyy-MM-dd HH:mm:ss)
  const now = new Date()
  if (timeStr === '立即送出') {
    // 立即送出 = 当前时间 + 45分钟(大概)
    now.setTime(now.getTime() + 45 * 60000)
  } else {
    // 选中了具体时间，如 12:30
    const [h, m] = timeStr.split(':')
    now.setHours(Number(h))
    now.setMinutes(Number(m))
  }
  // 转成 ISO 格式或其他后端能认的格式
  estimatedDeliveryTime.value = DateToStr(now)
}

// 【核心修复】计算属性：自动处理“已定位”垃圾文字
const detailAddressStr = computed(() => {
  if (!addressId.value) return ''
  const addr = selectedAddrObj.value
  // 过滤 '已定位' 占位符
  const p = !addr.provinceName || addr.provinceName === '已定位' ? '' : addr.provinceName
  const c = !addr.cityName || addr.cityName === '已定位' ? '' : addr.cityName
  const d = !addr.districtName || addr.districtName === '已定位' ? '' : addr.districtName
  const detail = addr.detail || ''
  // 返回：建筑名 + 门牌号
  return `${p}${c}${d} ${detail}`.trim()
})

const platform = ref('ios')
const openCooker = ref(false)
const cookerNum = ref(-2)
const cookers = ref([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
const radioStatus = ref(false)
const remark = ref('')

// 查询获取购物车列表
const getCartList = async () => {
  // 1. 先获取店铺配置（获取最新的费用标准）
  try {
    const configRes = await getShopConfigAPI()
    if (configRes.code === 0 || configRes.code === 1) {
      shopConfig.value = configRes.data
    }
  } catch (e) {
    console.error('获取店铺配置失败', e)
  }

  // 2. 获取购物车
  const res = await getCartAPI()
  // console.log('初始化购物车列表', res)
  if (res.data) {
    cartList.value = res.data

    // 计算商品总数量
    CartAllNumber.value = cartList.value.reduce((acc, cur) => acc + cur.number, 0)

    // ---【核心计算逻辑修改】---

    // 1. 计算纯菜品总价
    const goodsPrice = cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0)

    // 2. 计算打包费（如果开启）
    let packPrice = 0
    if (shopConfig.value.packStatus === 1) {
      packPrice = CartAllNumber.value * Number(shopConfig.value.packFee)
    }

    // 3. 计算配送费（如果开启）
    let deliveryPrice = 0
    if (shopConfig.value.deliveryStatus === 1) {
      deliveryPrice = Number(shopConfig.value.deliveryFee)
    }

    // 4. 总价 = 菜品 + 打包 + 配送
    CartAllPrice.value = goodsPrice + packPrice + deliveryPrice
  }
}

// 计算打包费总额（用于显示）
const packTotalPrice = computed(() => {
  if (shopConfig.value.packStatus === 1) {
    return (CartAllNumber.value * Number(shopConfig.value.packFee)).toFixed(2)
  }
  return '0.00'
})

// 计算配送费（用于显示）
const deliveryTotalPrice = computed(() => {
  if (shopConfig.value.deliveryStatus === 1) {
    return Number(shopConfig.value.deliveryFee).toFixed(2)
  }
  return '0.00'
})

// 【修复逻辑】onLoad 只负责初始化和接收参数
onLoad(async (options: any) => {
  // ... 购物车和地址逻辑 ...
  await getCartList()
  getHarfAnOur()
  // ...

  // 【核心修复】读取餐具默认配置
  // 假设缓存里存的是：0 (商家提供) 或 -1 (无需)
  const defaultCooker = uni.getStorageSync('default_cooker_type')

  // 如果缓存有值 (注意 0 也是值，不能简单的 if(defaultCooker))
  if (defaultCooker !== '' && defaultCooker !== null && defaultCooker !== undefined) {
    cookerNum.value = Number(defaultCooker) // 设置当前选择
    radioStatus.value = true // 自动勾选“以后都需要”
  } else {
    // 没有缓存，默认未选择
    cookerNum.value = -2
    radioStatus.value = false
  }
})

// 【修复逻辑】onShow 负责处理地址回显（缓存优先）
onShow(async () => {
  // 1. 检查是否有从地址页带回来的缓存地址
  const cacheAddr = uni.getStorageSync('select_address')
  if (cacheAddr) {
    fillAddress(cacheAddr)
    uni.removeStorageSync('select_address') // 选完即删，防止重复读取
  } else {
    // 2. 如果没有缓存且当前页面也没有地址ID（首次进入），才加载默认地址
    if (!addressId.value) {
      await getAddressBookDefault()
    }
  }
  // 3. 【核心修复】检查是否有备注缓存 (从备注页回来)
  const cacheRemark = uni.getStorageSync('order_remark')
  if (cacheRemark) {
    remark.value = cacheRemark // 把缓存里的备注赋值给页面的变量
    uni.removeStorageSync('order_remark') // 读完就删，防止影响下次
    console.log('读取到备注:', remark.value) // 调试日志
  }

  // 3. 刷新购物车（防止在其他页面修改了）
  await getCartList()
})

// 初始化平台：ios/android
const initPlatform = () => {
  const res = uni.getSystemInfoSync()
  platform.value = res.platform
}

// 日期转字符串格式
const DateToStr = (date: Date) => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  const second = date.getSeconds().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${min}:${second}`
}
// 获取一小时以后的时间
const getHarfAnOur = () => {
  const date = new Date()
  date.setTime(date.getTime() + 3600000)
  const formattedDate = DateToStr(date)
  estimatedDeliveryTime.value = formattedDate
  let hours = date.getHours()
  let minutes = date.getMinutes()
  if (hours < 10) hours = parseInt('0' + hours)
  if (minutes < 10) minutes = parseInt('0' + minutes)
  arrivalTime.value = hours + ':' + minutes
}
// 默认地址查询
const getAddressBookDefault = async () => {
  const res = await getDefaultAddressAPI()
  if (res.code === 0 && res.data) {
    fillAddress(res.data)
  }
}

// 标签文字转数字
const trans = (item: string) => {
  if (item === '公司') return '1'
  if (item === '家') return '2'
  if (item === '学校') return '3'
  return '4'
}

// 去地址页面
const goAddress = () => {
  store.addressBackUrl = '/pages/submit/submit'
  uni.navigateTo({
    url: '/pages/address/address?from=order',
  })
}

// 去备注页面
const goRemark = () => {
  uni.navigateTo({
    url: `/pages/remark/remark?remark=${remark.value}`,
  })
}
// --- 餐具逻辑 ---
const chooseCooker = () => {
  openCooker.value = true
  // 打开时，如果当前是“未选择”，给个默认引导到“商家提供”
  if (cookerNum.value === -2) {
    cookerNum.value = 0
  }
}
// 餐具对应信息
const getCookerInfo = () => {
  if (cookerNum.value === -2) return '请依据实际情况填写，避免浪费'
  else if (cookerNum.value === -1) return '无需餐具'
  else if (cookerNum.value === 0) return '商家依据餐量提供'
  else if (cookerNum.value === 11) return '10份以上'
  else return cookerNum.value + '份'
}
const pickerChange = (ev: any) => {
  const index = ev.detail.value[0]
  const selectedVal = cookers.value[index]

  cookerNum.value = selectedVal

  // 【关键】如果当前“记住偏好”是勾选的，每次滚动改变都要更新缓存
  if (radioStatus.value) {
    uni.setStorageSync('default_cooker_type', selectedVal)
  }
}
// 改变radio状态
const radioChange = () => {
  radioStatus.value = !radioStatus.value

  if (radioStatus.value) {
    // A. 勾选了：保存当前的选择到缓存
    // 如果当前还没选(是-2)，强制设为 0 (商家依据餐量)
    if (cookerNum.value === -2) {
      cookerNum.value = 0
    }
    // 保存到本地缓存 (持久化)
    uni.setStorageSync('default_cooker_type', cookerNum.value)
    uni.showToast({title: '已记住您的偏好', icon: 'none'})
  } else {
    // B. 取消勾选：清除缓存
    uni.removeStorageSync('default_cooker_type')
  }
}
const closeMask = () => {
  openCooker.value = false
}

// 支付下单
const payOrderHandle = async () => {
  // 1. 检查未支付订单
  const unPayRes = await getUnPayOrderAPI()
  if (unPayRes.data !== 0) {
    return uni.showToast({title: '有未支付订单，请先处理！', icon: 'none'})
  }

  // 2. 检查地址
  if (!addressId.value) {
    return uni.showToast({title: '请选择收货地址', icon: 'none'})
  }

  // 3. 检查餐具
  if (cookerNum.value === -2) {
    return uni.showToast({title: '请选择餐具份数', icon: 'none'})
  }

  const params = {
    payMethod: 1,
    addressId: addressId.value,
    remark: remark.value,
    deliveryStatus: selectedTimeLabel.value === '立即送出' ? 1 : 0,
    estimatedDeliveryTime: estimatedDeliveryTime.value,
    tablewareNumber: cookerNum.value,
    tablewareStatus: cookerNum.value === 0 ? 1 : 0,
    packAmount: CartAllNumber.value,
    amount: CartAllPrice.value,
  }
  console.log('提交订单参数:', JSON.stringify(params, null, 2))

  const res = await submitOrderAPI(params)
  if (res.code === 0 || res.code === 1) {
    // 跳转支付
    uni.redirectTo({
      url: `/pages/pay/pay?orderId=${res.data.id}&orderAmount=${res.data.orderAmount}&orderNumber=${res.data.orderNumber}&orderTime=${res.data.orderTime}`,
    })
  } else {
    uni.showToast({title: res.msg || '下单失败', icon: 'none'})
  }
}

// 统一填充地址的方法
const fillAddress = (addr: any) => {
  if (!addr) return
  addressId.value = addr.id
  consignee.value = addr.consignee
  phoneNumber.value = addr.phone
  label.value = addr.label
  selectedAddrObj.value = addr // 保存整个对象用于 computed 计算显示
}
</script>

<style lang="less" scoped>
.order_content {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0 0 0;
  position: relative;
  background-color: #cceeff;
  .order_content_box {
    width: 100%;
    height: 100%;
    // 不知道为啥要加这个，才有底部的padding出现
    .blank {
      height: 1rpx;
    }
  }
  box-sizing: border-box;
  .restaurant_info_box {
    position: relative;
    width: 100%;
    height: 160rpx;
    // 注释掉背景色
    .restaurant_info {
      position: absolute;
      z-index: 9;
      left: 30rpx;
      // transform: translateX(-50%);
      display: flex;
      width: calc(100% - 60rpx);
      // margin:0 auto;
      background: rgba(255, 255, 255, 0.97);
      box-shadow: 0px 4rpx 10rpx 0px rgba(69, 69, 69, 0.1);
      border-radius: 16rpx;
      padding: 40rpx;
      box-sizing: border-box;
      .left_info {
        flex: 1;
        .title {
          font-size: 36rpx;
        }
        .position {
          font-size: 36rpx;
        }
      }
      .restaurant_logo {
        .restaurant_logo_img {
          display: block;
          width: 320rpx;
          height: 120rpx;
          border-radius: 16rpx;
        }
      }
    }
  }

  // 地址栏
  .new_address {
    width: 730rpx;
    height: 240rpx;
    background-color: #fff;
    margin: 0 auto;
    border-radius: 12rpx;
    z-index: 10;
    margin-bottom: 20rpx;
    display: flex;
    flex-direction: column;

    // 上部
    .top {
      margin: 0 22rpx 0 30rpx;
      flex: 1;
      display: flex;
      // align-items: center;
      .address_name {
        flex: 1;
        // display: flex;
        // flex-direction: column;
        overflow: hidden;
        .address {
          // flex: 1;
          height: 50rpx;
          line-height: 50rpx;
          margin-top: 22rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          // 标签
          .tag {
            display: inline-block;
            width: 70rpx;
            height: 45rpx;
            border-radius: 4rpx;
            margin-right: 20rpx;
            font-size: 25rpx;
            line-height: 45rpx;
            color: #333333;
            text-align: center;
            background: #e1f1fe;
          }

          .tag2 {
            background: #fef8e7;
          }

          .tag3 {
            background: #e7fef8;
          }

          .tag4 {
            background: #fee7e7;
          }
          .word {
            vertical-align: middle;
            opacity: 1;
            font-size: 32rpx;
            font-family: PingFangSC, PingFangSC-Medium;
            font-weight: 550;
            color: #20232a;
          }
        }
        .name {
          // flex: 1;
          height: 34rpx;
          line-height: 34rpx;
          margin-top: 8rpx;
          .name_1,
          .name_2 {
            opacity: 1;
            font-size: 26rpx;
            font-family: PingFangSC, PingFangSC-Regular;
            font-weight: 400;
            text-align: center;
            color: #333333;
          }
          .name_2 {
            margin-left: 10rpx;
          }
        }
      }
      .address_name_disabled {
        flex: 1;
        font-size: 32rpx;
        font-family: PingFangSC, PingFangSC-Regular;
        font-weight: 400;
        color: #bdbdbd;
        align-self: center;
      }
      .address_image {
        width: 80rpx;
        height: 100%;
        position: relative;
        .to_right {
          width: 30rpx;
          height: 30rpx;
          vertical-align: middle;
          margin-bottom: 10rpx;
          position: absolute;
          top: 50%;
          right: 6rpx;
          transform: translateY(-50%);
        }
      }
    }
    // 下部
    .bottom {
      margin: 0 28rpx;
      height: 94rpx;
      // line-height: 94rpx;
      border-top: 1px dashed #ebebeb;
      box-sizing: border-box;
      .word_bottom {
        opacity: 1;
        font-size: 26rpx;
        font-family: PingFangSC, PingFangSC-Regular;
        font-weight: 400;
        text-align: left;
        color: #333333;
        height: 34rpx;
        line-height: 34rpx;
        margin-top: 24rpx;
        display: inline-block;
      }
    }
  }

  // 订单container，包括订单明细+备注
  .order_list_cont {
    width: 730rpx;
    margin: 0 auto;
    // 订单明细/备注 的白色圆角矩形容器
    .order_list {
      border-radius: 15rpx;
      background-color: #fff;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      position: relative;
      margin-bottom: 20rpx;
      &:last-child {
        margin-bottom: 176rpx;
      }
      // 菜品列表
      .order-type {
        padding: 40rpx 0 10rpx 0;
        // 菜品列表的每个元素
        .type_item {
          display: flex;
          margin-bottom: 30rpx;
          .dish_img {
            width: 100rpx;
            margin: 0 20rpx 0 32rpx;
            .dish_img_url {
              display: block;
              width: 100rpx;
              height: 100rpx;
              border-radius: 8rpx;
            }
          }
          .dish_info {
            position: relative;
            flex: 1;
            margin-right: 20rpx;
            // margin: 0 20rpx 20rpx 0;
            // margin-bottom: 200rpx;
            .dish_name {
              font-size: 30rpx;
              font-weight: bold;
              color: #20232a;
            }
            .dish_flavor {
              font-size: 24rpx;
              color: #818693;
              height: 30rpx;
              line-height: 30rpx;
              margin-top: 10rpx;
            }
            .dish_amount {
              font-size: 24rpx;
              color: #818693;
              height: 30rpx;
              line-height: 30rpx;
              margin-top: 10rpx;
              .ico {
                font-size: 24rpx;
              }
              .dish_number {
                padding: 10rpx 0;
                font-size: 24rpx;
              }
            }
            .dish_price {
              position: absolute;
              right: 20rpx;
              bottom: 40rpx;
              display: flex;
              font-size: 32rpx;
              color: #e94e3c;
              font-family: DIN, DIN-Medium;
              font-weight: 500;
              .ico {
                line-height: 42rpx;
                font-size: 24rpx;
              }
            }
          }
        }
      }
      .seize_seat {
        width: 100%;
        height: 98rpx;
      }
      .word_text {
        display: flex;
        align-items: center;
        margin: 0 20rpx 0 30rpx;
        border-bottom: 1px solid #efefef;
        height: 120rpx;
        line-height: 120rpx;
        .word_left {
          width: 50%;
          height: 44rpx;
          opacity: 1;
          font-size: 32rpx;
          text-align: left;
          color: #333333;
          line-height: 44rpx;
          letter-spacing: 0px;
        }
        .word_right {
          width: 50%;
          height: 44rpx;
          opacity: 1;
          font-size: 32rpx;
          text-align: right;
          color: #333333;
          line-height: 44rpx;
          letter-spacing: 0px;
          padding-right: 20rpx;
        }
      }
      .all_price {
        margin: 0 16rpx 0 22rpx;
        height: 120rpx;
        line-height: 120rpx;
        .word_right {
          height: 44rpx;
          opacity: 1;
          font-size: 32rpx;
          text-align: left;
          color: #333333;
          line-height: 44rpx;
          letter-spacing: 0px;
          padding-left: 500rpx;
        }
      }
      .bottom_text {
        display: flex;
        align-items: center;
        margin: 0 20rpx 0 30rpx;
        height: 100rpx;
        line-height: 100rpx;
        .text_left {
          width: 30%;
          height: 44rpx;
          opacity: 1;
          font-size: 32rpx;
          text-align: left;
          color: #333333;
          line-height: 44rpx;
          letter-spacing: 0px;
        }
        .text_right {
          width: 70%;
          height: 44rpx;
          font-size: 24rpx;
          text-align: right;
          color: #666666;
          line-height: 44rpx;
          letter-spacing: 0px;
          padding-right: 20rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .right_image {
          width: 30rpx;
          height: 100%;
          position: relative;
          .to_right {
            width: 30rpx;
            height: 30rpx;
            vertical-align: middle;
            margin-bottom: 10rpx;
            position: absolute;
            top: 50%;
            right: 6rpx;
            transform: translateY(-50%);
          }
        }
      }
    }
  }
  .footer_order_buttom {
    position: fixed;
    display: flex;
    bottom: 48rpx;
    width: calc(100% - 60rpx);
    height: 88rpx;
    margin: 0 auto;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 50rpx;
    box-shadow: 0px 6rpx 10rpx 0px rgba(0, 0, 0, 0.25);
    z-index: 999;
    padding: 0rpx 10rpx;
    box-sizing: border-box;
    .order_number {
      position: relative;
      width: 120rpx;
      .order_number_icon {
        position: absolute;
        display: block;
        width: 120rpx;
        height: 118rpx;
        left: 12rpx;
        bottom: 0px;
      }
      .order_dish_num {
        position: absolute;
        display: inline-block;
        z-index: 9;
        // width: 36rpx;
        min-width: 12rpx;
        height: 36rpx;
        line-height: 36rpx;
        padding: 0 12rpx;
        left: 92rpx;
        font-size: 24rpx;
        top: -8rpx;
        // text-align: center;
        border-radius: 20rpx;
        background-color: #e94e3c;
        color: #fff;
        font-weight: 500;
      }
    }
    .order_price {
      flex: 1;
      text-align: left;
      color: #fff;
      line-height: 88rpx;
      padding-left: 34rpx;
      box-sizing: border-box;
      font-size: 36rpx;
      font-weight: bold;
      .ico {
        font-size: 24rpx;
      }
    }
    .order_but {
      // background-color: #d8d8d8;
      // width: 364rpx;
      height: 72rpx;
      line-height: 72rpx;
      border-radius: 72rpx;
      text-align: center;
      margin-top: 8rpx;
      display: flex;
      .order_but_left {
        flex: 1;
        background-color: #473d26;
        color: #ffb302;
        border-radius: 72rpx 0 0 72rpx;
      }
      .order_but_rit {
        // flex: 1;
        width: 200rpx;
        border-radius: 72rpx;
        background: #22bbff;
        font-size: 30rpx;
        font-family: PingFangSC, PingFangSC-Medium;
        font-weight: 500;
        color: #fff;
      }
    }
  }
  .pop_mask {
    position: fixed;
    width: 100%;
    height: 100vh;
    top: 0;
    left: 0;
    z-index: 999;
    background-color: rgba(0, 0, 0, 0.4);
    .cook_pop {
      width: 100%;
      height: 60vh;
      position: absolute;
      bottom: 0;
      left: 0;
      background-color: #fff;
      border-radius: 20rpx 20rpx 0 0;
      padding: 20rpx 30rpx 30rpx 30rpx;
      box-sizing: border-box;

      .top_title {
        // display: flex;
        // flex-direction: row;
        position: relative;
        // justify-content: space-between;
        border-bottom: solid 1px #ebeef5;
        padding-bottom: 20rpx;

        .title {
          width: 100%;
          text-align: center;
          font-size: 30rpx;
          line-height: 50rpx;
          font-weight: bold;
          color: #20232a;
        }
        .tips {
          width: 100%;
          text-align: center;
          font-size: 20rpx;
          line-height: 40rpx;
          color: #999999;
        }
        .close {
          position: absolute;
          top: 20rpx;
          right: 0;

          .close_img {
            width: 40rpx;
            height: 40rpx;
          }
        }
      }
      .picker {
        width: 100%;
        height: 400rpx;
      }
      .comfirm {
        display: flex;
        justify-content: space-between;
        align-items: center;
        // margin-top: 20rpx;
        width: 600rpx;
        margin: 20rpx auto;
        background-color: #fea;
        border-radius: 10rpx 10rpx 30rpx 30rpx;
        .after_action {
          // height: 200rpx;
          font-size: 24rpx;
          line-height: 60rpx;
          color: #999999;
          .checkbox {
            padding: 10rpx;
            radio .wx-radio-input {
              width: 30rpx;
              height: 30rpx;
              border-radius: 50%;
            }
          }
          .comfirm_btn {
            width: 600rpx;
            height: 80rpx;
            line-height: 80rpx;
            border-radius: 40rpx;
            background: #00aaff;
            color: #fff;
            font-size: 30rpx;
            text-align: center;
            letter-spacing: 0px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
      }
    }
  }
  .mask-box {
    position: absolute;
    height: 176rpx;
    width: 100%;
    bottom: 0;
    background-color: #f6f6f6;
    opacity: 0.5;
  }
}

.dish_detail_pop {
  width: calc(100vw - 160rpx);
  box-sizing: border-box;
  position: relative;
  top: 50%;
  left: 50%;
  padding: 40rpx;
  transform: translateX(-50%) translateY(-50%);
  background: #fff;
  border-radius: 20rpx;

  .div_big_image {
    width: 100%;
    height: 320rpx;
    border-radius: 10rpx;
  }

  .title {
    font-size: 40rpx;
    line-height: 80rpx;
    text-align: center;
    font-weight: bold;
  }

  .dish_items {
    height: 60vh;
  }

  .but_item {
    display: flex;
    position: relative;
    flex: 1;

    .price {
      text-align: left;
      color: #e94e3c;
      line-height: 88rpx;
      box-sizing: border-box;
      font-size: 48rpx;
      font-weight: bold;

      .ico {
        font-size: 28rpx;
      }
    }

    .active {
      position: absolute;
      right: 0rpx;
      bottom: 20rpx;
      display: flex;

      .dish_add,
      .dish_red {
        display: block;
        width: 72rpx;
        height: 72rpx;
      }

      .dish_number {
        padding: 0 10rpx;
        line-height: 72rpx;
        font-size: 30rpx;
        font-family: PingFangSC, PingFangSC-Medium;
        font-weight: 500;
      }

      .dish_card_add {
        width: 200rpx;
        line-height: 60rpx;
        text-align: center;
        font-weight: 500;
        font-size: 28rpx;
        opacity: 1;
        background: #ffc200;
        border-radius: 30rpx;
      }
    }
  }
}

.more_norm_pop {
  width: calc(100vw - 160rpx);
  box-sizing: border-box;
  position: relative;
  top: 50%;
  left: 50%;
  padding: 40rpx;
  transform: translateX(-50%) translateY(-50%);
  background: #fff;
  border-radius: 20rpx;

  .div_big_image {
    width: 100%;
    border-radius: 10rpx;
  }

  .title {
    font-size: 40rpx;
    line-height: 80rpx;
    text-align: center;
    font-weight: bold;
  }

  .items_cont {
    display: flex;
    flex-wrap: wrap;
    margin-left: -14rpx;
    max-height: 50vh;

    .item_row {
      .flavor_name {
        height: 40rpx;
        opacity: 1;
        font-size: 28rpx;
        font-family: PingFangSC, PingFangSC-Regular;
        font-weight: 400;
        text-align: left;
        color: #666666;
        line-height: 40rpx;
        padding-left: 10rpx;
        padding-top: 20rpx;
      }

      .flavor_item {
        display: flex;
        flex-wrap: wrap;

        .item {
          border: 1px solid #ffb302;
          border-radius: 12rpx;
          margin: 20rpx 10rpx;
          padding: 0 26rpx;
          height: 60rpx;
          line-height: 60rpx;
          font-family: PingFangSC, PingFangSC-Regular;
          font-weight: 400;
          color: #333333;
        }

        .act {
          // background: linear-gradient(144deg, #ffda05 18%, #ffb302 80%);
          background: #ffc200;
          border: 1px solid #ffc200;
          font-family: PingFangSC, PingFangSC-Medium;
          font-weight: 500;
        }
      }
    }
  }

  .but_item {
    display: flex;
    position: relative;
    flex: 1;
    padding-left: 10rpx;
    margin: 34rpx 0 -20rpx 0;

    .price {
      text-align: left;
      color: #e94e3c;
      line-height: 88rpx;
      box-sizing: border-box;
      font-size: 48rpx;
      font-family: DIN, DIN-Medium;
      font-weight: 500;

      .ico {
        font-size: 28rpx;
      }
    }

    .active {
      position: absolute;
      right: 0rpx;
      bottom: 20rpx;
      display: flex;

      .dish_add,
      .dish_red {
        display: block;
        width: 72rpx;
        height: 72rpx;
      }

      .dish_number {
        line-height: 72rpx;
        font-size: 24rpx;
        font-family: PingFangSC, PingFangSC-Medium;
        font-weight: 500;
      }

      .dish_card_add {
        width: 200rpx;
        height: 60rpx;
        line-height: 60rpx;
        text-align: center;
        font-weight: 500;
        font-size: 28rpx;
        opacity: 1;
        // background: linear-gradient(144deg, #ffda05 18%, #ffb302 80%);
        background: #ffc200;
        border-radius: 30rpx;
      }
    }
  }
}

.lodding {
  position: relative;
  top: 40%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;

  .lodding_ico {
    width: 160rpx;
    height: 160rpx;
    border-radius: 100%;
  }
}
.bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30rpx; /* 调整 padding */
  .time-label {
    font-weight: bold;
    color: #333;
    font-size: 28rpx;
  }
  .time-select {
    display: flex;
    align-items: center;
    .blue-text {
      color: #00aaff;
      font-weight: bold;
      margin-right: 10rpx;
    }
    .arrow {
      color: #ccc;
    }
  }
}

.time-item {
  padding: 30rpx;
  border-bottom: 1rpx solid #f5f5f5;
  display: flex;
  justify-content: space-between;
  .active {
    color: #00aaff;
    font-weight: bold;
  }
  .check {
    color: #00aaff;
  }
}
</style>
