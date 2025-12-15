<template>
  <view class="list-container">
    <scroll-view scroll-y class="scroll-box">
      <!-- 列表区域 -->
      <view v-if="addressList && addressList.length > 0">
        <view class="address-card" v-for="(item, index) in addressList" :key="index">
            
            <!-- 点击卡片：选中地址 (仅从下单页跳转来时有效) -->
            <view class="card-content" @click="choseAddress(item)">
                <view class="info-row">
                    <text class="name">{{ item.consignee }}</text>
                    <text class="phone">{{ item.phone }}</text>
                    <text class="tag" v-if="item.label">{{ item.label }}</text>
                </view>
<view class="address-row">
    <!-- 改为显示：地图选的点 + 门牌号 -->
    <text style="font-weight: bold; margin-right: 10rpx;">{{ item.districtName }}</text>
    <text>{{ item.detail }}</text>
</view>
            </view>

            <!-- 分割线 -->
            <view class="line"></view>

            <!-- 操作区域 -->
            <view class="action-bar">
                <!-- 设为默认按钮 -->
                <view class="radio-box" @click.stop="setDefault(item)">
                    <radio 
                        :checked="item.isDefault === 1" 
                        color="#00aaff" 
                        style="transform:scale(0.7)" 
                        @click.stop="setDefault(item)" 
                    />
                    <text>默认地址</text>
                </view>
                
                <!-- 编辑/删除按钮 -->
                <view class="btn-group">
                    <view class="action-btn" @click.stop="onEdit(item)">
                        <image src="../../static/icon/edit.png" class="icon"></image>
                        <text>编辑</text>
                    </view>
                    <view class="action-btn delete" @click.stop="onDelete(item)">
                        <image src="../../static/icon/delete.png" class="icon"></image>
                        <text>删除</text>
                    </view>
                </view>
            </view>

        </view>
      </view>
      
      <!-- 空状态 -->
      <Empty v-else textLabel="暂无收货地址"></Empty>
      
      <!-- 底部占位，防止被按钮遮挡 -->
      <view style="height: 120rpx;"></view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-fixed">
      <button class="add-btn" @click="onAdd">+ 新增收货地址</button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { deleteAddressAPI, getAddressListAPI, updateDefaultAddressAPI } from '@/api/address'
import type { Address } from '@/types/address'
import { useAddressStore } from '@/stores/modules/address'
import Empty from '@/components/empty/Empty.vue'

// ------ 1. 变量定义 ------
const store = useAddressStore()
const addressList = ref<Address[]>([])
const addressBackUrl = store.addressBackUrl
const isFromOrder = ref(false)

// ------ 2. 生命周期 ------
// 使用 onShow 保证每次返回页面都刷新数据（比如从编辑页回来）
onShow(() => {
  getAddressList()
})

// 2. 在 onLoad 里接收参数
onLoad((options) => {
    if (options.from === 'order') {
        isFromOrder.value = true
    }
})
// ------ 3. 核心方法 ------

// 获取地址列表
const getAddressList = async () => {
  try {
      const res = await getAddressListAPI()
      // 兼容 code=0 或 code=1，视你后端具体实现而定
      if (res.code === 1 || res.code === 0) {
        addressList.value = res.data || []
      }
  } catch (e) {
      console.error('获取列表失败', e)
      uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 新增跳转
const onAdd = () => {
  uni.navigateTo({
    url: '/pages/addOrEditAddress/addOrEditAddress'
  })
}

// 编辑跳转
const onEdit = (item: any) => {
  uni.navigateTo({
    url: '/pages/addOrEditAddress/addOrEditAddress?type=编辑&id=' + item.id
  })
}

// 删除地址
const onDelete = (item: any) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该地址吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
            const apiRes = await deleteAddressAPI(item.id)
            // 兼容不同的后端返回
            if (apiRes.code === 1 || apiRes.code === 0) {
                uni.showToast({ title: '删除成功', icon: 'none' })
                getAddressList() // 刷新列表
            } else {
                uni.showToast({ title: apiRes.msg || '删除失败', icon: 'none' })
            }
        } catch(e) {
            uni.showToast({ title: '删除出错', icon: 'none' })
        }
      }
    }
  })
}

// 设为默认
const setDefault = async (item: any) => {
  try {
      const res = await updateDefaultAddressAPI({ id: item.id })
      if (res.code === 1 || res.code === 0) {
        uni.showToast({ title: '设置成功', icon: 'none' })
        getAddressList() // 刷新列表，UI会自动更新选中状态
      }
  } catch (e) {
      console.error('设置默认失败', e)
  }
}

// 3. 修改 choseAddress 方法
const choseAddress = (item: any) => {
  // 如果不是从订单页来的，点击无效，或者是去编辑
  if (!isFromOrder.value) {
    // 这里可以选择什么都不做，或者去编辑页
    // onEdit(item); 
    return 
  }

  // 如果是从订单页来的：
  // A. 把选中的地址存入缓存
  uni.setStorageSync('select_address', item)
  
  // B. 返回上一页 ( submit 页 )
  uni.navigateBack({
      delta: 1
  })
}
</script>
<style lang="scss" scoped>
.list-container {
    height: 100vh;
    background-color: #f5f5f5;
    display: flex;
    flex-direction: column;
}

.scroll-box {
    flex: 1;
    overflow-y: auto;
    padding: 20rpx;
    box-sizing: border-box;
}

/* 地址卡片 */
.address-card {
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
}

.card-content {
    /* 点击区域大一点 */
    padding-bottom: 20rpx;
}

.info-row {
    margin-bottom: 16rpx;
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    
    .phone { margin-left: 20rpx; font-weight: normal; color: #666; font-size: 28rpx;}
    .tag { 
        font-size: 20rpx; 
        background: #e6f7ff; 
        color: #00aaff; 
        padding: 4rpx 10rpx; 
        border-radius: 6rpx; 
        margin-left: 10rpx;
        font-weight: normal;
        vertical-align: middle;
    }
}

.address-row {
    font-size: 28rpx;
    color: #555;
    line-height: 1.4;
    margin-bottom: 10rpx;
}

.line { height: 1rpx; background: #f0f0f0; margin: 10rpx 0 20rpx 0; }

.action-bar {
    height: 60rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 26rpx;
    color: #666;
}

.radio-box {
    display: flex;
    align-items: center;
    /* 扩大点击范围 */
    padding: 10rpx 20rpx 10rpx 0;
    
    text {
        font-size: 26rpx;
        color: #666;
        margin-left: 10rpx;
    }
}

.btn-group {
    display: flex;
}

.action-btn {
    display: flex;
    align-items: center;
    margin-left: 30rpx;
    padding: 10rpx;
    font-size: 26rpx;
    color: #666;
    
    .icon { width: 32rpx; height: 32rpx; margin-right: 6rpx; }
    &.delete { color: #ff4d4f; }
}

/* 底部按钮 */
.bottom-fixed {
    background: #fff;
    padding: 20rpx 40rpx;
    padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
    padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    box-shadow: 0 -4rpx 16rpx rgba(0,0,0,0.05);
    
    .add-btn {
        background: linear-gradient(90deg, #00c6ff, #007aff);
        color: #fff;
        border-radius: 50rpx;
        font-size: 32rpx;
        height: 88rpx;
        line-height: 88rpx;
        border: none;
    }
}
</style>