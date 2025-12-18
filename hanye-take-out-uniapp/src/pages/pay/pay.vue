<template>
  <view class="pay_box">
    <view class="time" v-if="countdownStore.showM == 0 && countdownStore.showS == 0">订单已超时</view>
    <view class="time" v-else>
      支付剩余时间
      <uni-countdown
        color="#888"
        :show-day="false"
        :show-hour="false"
        :minute="countdownStore.showM"
        :second="countdownStore.showS"
        @timeup="timeup()"
      >
      </uni-countdown>
    </view>
    <view class="price">￥{{ orderAmount }}</view>
    <view class="shop">{{ orderNumber }}</view>
    <view class="bottom">
      <button class="comfirm_btn" type="primary" :plain="true" @click="toSuccess()">确认下单</button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {getOrderAPI, payOrderAPI, cancelOrderAPI} from '@/api/order'
import {onLoad, onShow, onUnload} from '@dcloudio/uni-app'
import {useCountdownStore} from '@/stores/modules/countdown'
import {ref, onBeforeUnmount} from 'vue'
import {http} from '@/utils/http'

const countdownStore = useCountdownStore()

const orderId = ref(0) // 订单id
const orderNumber = ref('') // 订单号
const orderAmount = ref(0) // 订单金额
const orderTime = ref<string | Date>() // 订单时间

const countdownRef = ref(null)

const timeup = () => {
  clearTimer()
  countdownStore.showM = -1
  countdownStore.showS = -1
}

onLoad(async (options: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('支付页加载', options)
  }
  orderId.value = options.orderId
  orderNumber.value = options.orderNumber
  orderAmount.value = options.orderAmount
  // 处理订单时间，确保格式正确
  const timeStr = options.orderTime
  orderTime.value = typeof timeStr === 'string' ? timeStr.replace(' ', 'T') : timeStr

  // 如果是从订单详情页跳转过来的，需要重新获取订单信息以确保时间准确
  if (!orderTime.value) {
    try {
      const res = await getOrderAPI(orderId.value)
      if (res.data && res.data.orderTime) {
        orderTime.value = res.data.orderTime
      }
    } catch (e) {
      console.error('获取订单信息失败', e)
    }
  }

  // 启动倒计时（基于订单创建时间）
  initCountdown()
})

// 防抖：避免重复提交
let isSubmitting = false

// 支付成功
const toSuccess = async () => {
  // 如果正在提交，直接返回
  if (isSubmitting) {
    return
  }

  // 若订单已超时，跳转到订单已取消页面
  if (countdownStore.showM == -1 && countdownStore.showS == -1) {
    uni.redirectTo({
      url: '/pages/orderDetail/orderDetail?orderId=' + orderId.value,
    })
    return
  }

  isSubmitting = true
  uni.showLoading({title: '提交中...'})

  try {
    // 1. 构造参数
    const payDTO = {
      orderNumber: orderNumber.value,
      payMethod: 1,
    }

    // 2. 使用http工具统一调用
    const res = await http({
      url: '/user/order/payment/mock',
      method: 'PUT',
      data: payDTO,
    })

    if (res.code === 0) {
      // 关闭定时器
      clearTimer()

      // 跳转成功页
      uni.redirectTo({
        url:
          '/pages/submit/success?orderId=' +
          orderId.value +
          '&orderNumber=' +
          orderNumber.value +
          '&orderAmount=' +
          orderAmount.value +
          '&orderTime=' +
          orderTime.value,
      })
    } else {
      uni.showToast({title: res.msg || '支付失败', icon: 'none'})
    }
  } catch (err: any) {
    console.error('支付失败', err)
    uni.showToast({title: err.msg || '网络请求失败', icon: 'none'})
  } finally {
    isSubmitting = false
    uni.hideLoading()
  }
}

// 清理定时器
const clearTimer = () => {
  if (countdownStore.timer !== undefined) {
    clearInterval(countdownStore.timer)
    countdownStore.timer = undefined
  }
}

// 页面卸载时清理定时器
onUnload(() => {
  clearTimer()
})

onBeforeUnmount(() => {
  clearTimer()
})

// 初始化倒计时 - 基于订单创建时间，而不是每次进入都重新开始
const initCountdown = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('初始化倒计时，订单时间:', orderTime.value)
  }

  // 如果 timer 已经存在，先清除它
  clearTimer()

  // 立即计算一次剩余时间
  const updateCountdown = () => {
    if (!orderTime.value) {
      console.error('订单时间为空，无法计算倒计时')
      return
    }

    // 将订单时间转换为时间戳
    let buyTime: number
    if (typeof orderTime.value === 'string') {
      // 处理时间字符串格式
      const timeStr = orderTime.value.replace(' ', 'T')
      buyTime = new Date(timeStr).getTime()
    } else {
      buyTime = new Date(orderTime.value as Date).getTime()
    }

    // 计算剩余时间（15分钟 = 900000毫秒）
    const time = buyTime + 15 * 60 * 1000 - new Date().getTime()

    if (time > 0) {
      // 计算剩余的分钟和秒数
      const m = Math.floor((time / 1000 / 60) % 60)
      const s = Math.floor((time / 1000) % 60)

      countdownStore.showM = m
      countdownStore.showS = s
    } else {
      // 订单已超时
      if (process.env.NODE_ENV === 'development') {
        console.log('订单已超时！')
      }
      clearTimer()
      countdownStore.showM = -1
      countdownStore.showS = -1
      // 取消订单
      cancelOrder()
    }
  }

  // 立即执行一次
  updateCountdown()

  // 每秒更新一次
  countdownStore.timer = setInterval(updateCountdown, 1000) as unknown as number
}

// 超时要取消订单
const cancelOrder = async () => {
  await cancelOrderAPI(orderId.value)
  // uni.redirectTo({
  //   url: '/pages/orderDetail/orderDetail?orderId=' + orderId.value,
  // })
}
</script>

<style lang="less" scoped>
.pay_box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #333;
  .time {
    display: flex;
    margin-top: 100rpx;
    color: #888;
    font-size: 28rpx;
  }
  .price {
    font-size: 80rpx;
    font-weight: bold;
    margin-top: 20rpx;
  }
  .shop {
    display: flex;
    margin-top: 20rpx;
    font-size: 28rpx;
    color: #888;
  }
}

.bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  .comfirm_btn {
    position: absolute;
    bottom: 30rpx;
    width: 600rpx;
    height: 80rpx;
    line-height: 80rpx;
    border-radius: 40rpx;
    background: #00aaff;
    border: none;
    color: #fff;
    font-size: 30rpx;
    text-align: center;
  }
}
</style>

<style>
page {
  background-color: #f8f8f8;
}
</style>
