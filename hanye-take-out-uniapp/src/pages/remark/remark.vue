<template>
  <view class="uni-textarea">
    <textarea
      class="remark_text"
      placeholder-class="textarea-placeholder"
      v-model="remark"
      :maxlength="50"
      placeholder="请输入您需要备注的信息"
    />
    <view class="fifty">{{ remark.length }} / 50</view>
  </view>
  <view class="add_address">
    <button class="add_btn" :plain="true" @click="returnToSubmit()">完成</button>
  </view>
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app' // 【确保引入 onLoad】

const remark = ref('')

// 【关键修改】在 onLoad 中读取参数，实现回显
onLoad((options) => {
  if (options && options.remark) {
    remark.value = options.remark // 如果有传参过来，就回显
  }
})
onShow(async () => {
    // ...
    const cacheRemark = uni.getStorageSync('order_remark') // Key 必须也是 'order_remark'
    if (cacheRemark) {
        remark.value = cacheRemark // 赋值给 submit.vue 里的 remark 变量
        uni.removeStorageSync('order_remark') // 读完就删
    }
})
// 返回提交页面，把备注信息传递给store
const returnToSubmit = () => {
  console.log('remark', remark.value)
    // 1. 存入缓存，供订单页读取
    uni.setStorageSync('order_remark', remark.value)
    
    // 2. 返回上一级 (订单页)
    uni.navigateBack({
        delta: 1
    })
}
</script>

<style lang="less" scoped>
// 添加的备注
.uni-textarea {
  margin: 30rpx;
  padding-left: 30rpx;
  box-sizing: border-box;
  width: 690rpx;
  height: 300rpx;
  opacity: 1;
  background: #eee;
  border-radius: 12rpx;
  padding-top: 20rpx;
  font-size: 26rpx;
  .remark_text {
    line-height: 60rpx;
    height: 200rpx;
  }
  .fifty {
    color: #bbbbbb;
  }
}

.add_address {
  position: fixed;
  bottom: 0rpx;
  left: 0;
  margin: 0 auto;
  background: #ffffff;
  height: 136rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 750rpx;

  .add_btn {
    width: 668rpx;
    height: 72rpx;
    line-height: 72rpx;
    border-radius: 72rpx;
    background: #ffc200;
    border: 1px solid #ffc200;
    opacity: 1;
    font-size: 30rpx;
    font-family: PingFangSC, PingFangSC-Medium;
    font-weight: 500;
    text-align: center;
    color: #333333;
    letter-spacing: 0px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
