<template>
  <view class="navbar-wrap">
    <!-- 蓝色背景 -->
    <view class="navbar" :style="{paddingTop: safeAreaInsets?.top + 'px'}">
      <view class="logo">
        <!-- 如果没有logo图，可以用文字代替，或者保留你原有的image -->
        <text class="logo-text">寒夜外卖 · 启动</text>
      </view>
    </view>
    
    <!-- 餐厅信息卡片 -->
    <view class="info">
      <!-- 1. 状态与费用 -->
      <view class="info-row">
        <view class="status" :class="{ closed: !status }">{{ status ? '营业中' : '打烊中' }}</view>
        <view class="delivery">
             <text class="txt">配送费￥{{ config.deliveryStatus===1 ? config.deliveryFee : 0 }}</text>
             <text class="split">|</text>
             <text class="txt">￥{{ config.minOrderAmount }}起送</text>
        </view>
      </view>

      <!-- 2. 地址与电话 -->
      <view class="info-row border-bottom">
        <view class="address-box">
            <uni-icons type="location" size="14" color="#666"></uni-icons>
            <text class="address-text">{{ config.address }}</text>
        </view>
        <view class="phone-btn" @click="phone">
            <uni-icons type="phone-filled" size="18" color="#00aaff"></uni-icons>
        </view>
      </view>

      <!-- 3. 【新增】营业时间与公告 -->
      <view class="info-row small-text">
          <text>营业时间：{{ config.openingHours || '全天' }}</text>
      </view>
      <view class="info-row small-text" v-if="config.notice">
          <text class="notice-tag">公告</text>
          <text class="notice-content">{{ config.notice }}</text>
      </view>
    </view>
    
    <view class="blank"></view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'
import type { ShopConfig } from '@/types/shop'

const props = defineProps<{
  status: boolean
  shopConfig?: ShopConfig
}>()

const config = computed(() => {
  return props.shopConfig || {
    id: 1, name: '', address: '加载中...', phone: '',
    deliveryFee: 0, deliveryStatus: 1,
    packFee: 0, packStatus: 1,
    minOrderAmount: 0, 
    openingHours: '', notice: '',
    autoAccept: 0,
  }
})

const { safeAreaInsets } = uni.getSystemInfoSync()

const phone = () => {
  const phoneNumber = config.value.phone
  if(phoneNumber) uni.makePhoneCall({phoneNumber})
}
</script>

<style lang="less" scoped>
.navbar-wrap { width: 100%; background-color: #fff; position: relative; z-index: 10; }
.navbar {
  background-color: #00aaff;
  padding-bottom: 100rpx; /* 留空间给卡片 */
  .logo { height: 88rpx; display: flex; align-items: center; padding-left: 30rpx; 
    .logo-text { color: #fff; font-size: 32rpx; font-weight: bold; }
  }
}

.info {
  margin: -80rpx 20rpx 0 20rpx;
  position: relative; z-index: 100;
  padding: 30rpx;
  background-color: #fff;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06);
  
  .info-row {
      display: flex; align-items: center; margin-bottom: 16rpx;
      &.border-bottom { padding-bottom: 16rpx; border-bottom: 1rpx dashed #eee; margin-bottom: 16rpx;}
      
      .status {
        margin-right: 20rpx; padding: 4rpx 10rpx; border-radius: 6rpx;
        font-size: 20rpx; background-color: #39cf58; color: #fff;
        &.closed { background-color: #999; }
      }
      .delivery {
          font-size: 24rpx; color: #666;
          .split { margin: 0 10rpx; color: #ddd; }
      }
      .address-box {
          flex: 1; display: flex; align-items: center; overflow: hidden;
          .address-text { margin-left: 6rpx; font-size: 26rpx; color: #333; font-weight: bold; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      }
  }
  
  .small-text {
      font-size: 22rpx; color: #888; margin-bottom: 8rpx; align-items: flex-start;
      .notice-tag { background: #ffebd7; color: #ff6600; padding: 2rpx 6rpx; border-radius: 4rpx; margin-right: 10rpx; font-size: 20rpx;}
      .notice-content { flex: 1; line-height: 1.4;}
  }
}
.blank { height: 20rpx; background-color: #fff; }
</style>