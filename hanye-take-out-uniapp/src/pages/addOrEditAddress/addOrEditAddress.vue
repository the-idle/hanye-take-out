<template>
  <view class="page-container">
    <view class="card-box">
      <!-- 联系人 -->
      <view class="form-row">
        <view class="label">联系人</view>
        <view class="input-box">
          <input
            class="uni-input"
            placeholder-class="placeholder"
            v-model="form.consignee"
            placeholder="请填写收货人"
          />
          <view class="gender-radio">
            <view
              class="radio-tag"
              :class="{active: form.gender === item.value}"
              v-for="(item, index) in items"
              :key="index"
              @click="form.gender = item.value"
            >
              {{ item.name }}
            </view>
          </view>
        </view>
      </view>

      <!-- 手机号 -->
      <view class="form-row">
        <view class="label">手机号</view>
        <input class="uni-input" type="number" v-model="form.phone" placeholder="请填写收货手机号" :maxlength="11" />
      </view>

      <!-- 地图选点 (存入 districtName) -->
      <view class="form-row map-row" @click="chooseLocationFromMap">
        <view class="label">收货地址</view>
        <view class="map-box">
          <image src="../../static/icon/location.png" class="map-icon" mode="aspectFit"></image>
          <view class="map-text-box">
            <!-- 显示 districtName 作为地图定位点 -->
            <text v-if="form.districtName && form.districtName !== '已定位'" class="addr-text">{{
              form.districtName
            }}</text>
            <text v-else class="placeholder">点击定位收货地址</text>
          </view>
          <text class="arrow">></text>
        </view>
      </view>

      <!-- 门牌号 (存入 detail) -->
      <view class="form-row no-border">
        <view class="label">门牌号</view>
        <input class="uni-input" v-model="form.detail" placeholder="例：8号楼 502室" />
      </view>

      <!-- 标签 -->
      <view class="form-row tag-row">
        <view class="label">标签</view>
        <view class="tag-list">
          <view
            class="tag-item"
            :class="{active: form.label === item.name}"
            v-for="item in options"
            :key="item.name"
            @click="form.label = item.name"
          >
            {{ item.name }}
          </view>
        </view>
      </view>
    </view>

    <view class="footer-btn">
      <button class="btn-save" @click="saveAddress">保存地址</button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
import {addAddressAPI, deleteAddressAPI, getAddressByIdAPI, updateAddressAPI} from '@/api/address'
import {onLoad, onShow, onUnload} from '@dcloudio/uni-app'
import {reactive} from 'vue'
import type {Address} from '@/types/address'

// 自己实现的省市区选择器
let fullLocationCode: [string, string, string] = ['', '', '']
const pickerChange: UniHelper.RegionPickerOnChange = (ev) => {
  console.log(ev)
  // 修改前端界面
  address.value = ev.detail.value.join(' ')
  console.log(address.value)
  // 提交后端更新
  fullLocationCode = ev.detail.code!
  console.log(fullLocationCode)
  // 拆分省市区编码给三个变量，后端需要
  // form.provinceCode = fullLocationCode[0]
  // form.cityCode = fullLocationCode[1]
  // form.districtCode = fullLocationCode[2]
}
const SHOP_LAT = 24.3301616
const SHOP_LNG = 109.409511
const MAX_DISTANCE = 5

const platform = ref('ios')
const showDel = ref(false)
const items = [
  {
    value: 1,
    name: '男士',
  },
  {
    value: 0,
    name: '女士',
  },
]
const options = [
  {
    name: '公司',
  },
  {
    name: '家',
  },
  {
    name: '学校',
  },
]
const form = reactive({
  id: 0,
  consignee: '',
  phone: '',
  label: '家',
  gender: 1,

  // 逻辑拆分：
  provinceName: '已定位', // 默认值，防止后端校验
  cityName: '已定位', // 默认值
  districtName: '', // 【重点】用来存地图选点的“建筑名”
  detail: '', // 【重点】用来存用户填写的“门牌号”

  latitude: '',
  longitude: '',
})
// 联动省市县
// 弹框的初始值
const cityPickerValueDefault = [0, 0, 1]
const pickerText = ref('')
// 初始值
const address = ref('')
// 保存将要删除的
const delId = ref<number>()

// 计算属性：判断是否已选点
const hasLocation = computed(() => {
  return form.latitude && form.longitude && address.value
})

onLoad(async (opt) => {
  const id = opt?.id !== undefined ? Number(opt.id) : undefined
  if (id !== undefined && !Number.isNaN(id)) {
    uni.setNavigationBarTitle({title: '修改收货地址'})
    const res = await getAddressByIdAPI(id)
    if (res.code === 1 || res.code === 0) {
      Object.assign(form, res.data)
      // 回显修正：如果之前没存districtName，可以给个默认
      if (!form.districtName) form.districtName = ''
    }
  } else {
    uni.setNavigationBarTitle({title: '新增收货地址'})
  }
})
onUnload(() => {
  uni.removeStorage({
    key: 'edit',
  })
})
const statusBarHeight = () => {
  return uni.getSystemInfoSync().statusBarHeight + 'px'
}
const init = () => {
  const res = uni.getSystemInfoSync()
  platform.value = res.platform
}
const goBack = () => {
  uni.redirectTo({
    url: '/pages/address/address',
  })
}
// 查询地址详情接口
const queryAddressBookById = async (id: number) => {
  const res = await getAddressByIdAPI(id)
  if (res.code === 0) {
    const newForm = {
      provinceCode: res.data.provinceCode,
      cityCode: res.data.cityCode,
      districtCode: res.data.districtCode,
      phone: res.data.phone,
      consignee: res.data.consignee,
      gender: res.data.gender,
      label: res.data.label,
      detail: res.data.detail,
      id: res.data.id,
    }
    Object.assign(form, newForm)
    if (res.data.provinceName && res.data.cityName && res.data.districtName) {
      address.value = res.data.provinceName + '-' + res.data.cityName + '-' + res.data.districtName
    }
  }
}
// 标签的事件
const getTextOption = (item: any) => {
  console.log('点击了标签', item)
  form.label = item.name
}
// const bindTextAreaBlur = (e: any) => {
//   console.log(e.detail.value)
// }
// const radioChange = (e: any) => {
//   if (e.detail.value === 'man') {
//     form.radio = 0
//   } else {
//     form.radio = 1
//   }
// }
const sexChangeHandle = (val: number) => {
  form.gender = val
  console.log(form.gender)
}

// 地图选点
const chooseLocationFromMap = () => {
  uni.chooseLocation({
    success: (res) => {
      console.log('选点结果', res)

      form.latitude = String(res.latitude)
      form.longitude = String(res.longitude)

      // 【核心修改】
      // 将地图选的大地点（如：柳州市政府）存入 districtName
      // res.name 是建筑名，res.address 是省市区街道
      form.districtName = res.name || res.address

      // 确保省市不为空
      form.provinceName = '已定位'
      form.cityName = '已定位'

      // 注意：不要覆盖 form.detail，让用户自己填门牌号
    },
  })
}

// 保存逻辑
const saveAddress = async () => {
  // 【修改】强校验
  if (!form.consignee) return uni.showToast({title: '请填写联系人', icon: 'none'})
  if (!form.phone) return uni.showToast({title: '请填写手机号', icon: 'none'})
  if (!/^1[3-9]\d{9}$/.test(form.phone)) return uni.showToast({title: '手机号格式错误', icon: 'none'})

  // 校验：必须选地图
  if (!form.districtName || form.districtName === '已定位') {
    return uni.showToast({title: '请点击选择收货地址', icon: 'none'})
  }
  // 校验：必须填门牌号
  if (!form.detail) {
    return uni.showToast({title: '请填写门牌号', icon: 'none'})
  }

  // 门牌号追加
  // 最终提交的 detail = 地图选点名 + 用户填写的门牌号
  // 注意：这里为了防止重复拼接，逻辑可以灵活处理，比如后端有两个字段，或者前端拼接好传给后端
  // 简单做法：不做拼接，直接传。但为了回显方便，建议把 res.name 和 用户输入 分开存，这里暂且直接提交

  const api = form.id ? updateAddressAPI : addAddressAPI
  const res = await api(form)

  if (res.code === 1 || res.code === 0) {
    uni.showToast({title: '保存成功'})
    setTimeout(() => uni.navigateBack(), 800)
  } else {
    uni.showToast({title: res.msg || '保存失败', icon: 'none'})
  }
}

// 2. 计算距离函数 (Haversine公式)
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const radLat1 = (lat1 * Math.PI) / 180.0
  const radLat2 = (lat2 * Math.PI) / 180.0
  const a = radLat1 - radLat2
  const b = (lng1 * Math.PI) / 180.0 - (lng2 * Math.PI) / 180.0
  let s =
    2 *
    Math.asin(
      Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)),
    )
  s = s * 6378.137 // 地球半径，单位公里
  s = Math.round(s * 10000) / 10000
  return s
}

// 3. 校验逻辑
const checkDistance = (lat: number, lng: number) => {
  const distance = getDistance(lat, lng, SHOP_LAT, SHOP_LNG)
  console.log('当前距离:', distance)

  if (distance > MAX_DISTANCE) {
    uni.showModal({
      title: '超出配送范围',
      content: `当前距离店铺 ${distance.toFixed(2)}km，超过了${MAX_DISTANCE}km配送范围，请重新选择。`,
      showCancel: false,
      success: () => {
        // 清空无效地址
        form.detail = ''
        form.latitude = ''
        form.longitude = ''
        address.value = '请选择所在地区'
      },
    })
    return false
  }
  uni.showToast({title: `距离店铺 ${distance.toFixed(1)}km`, icon: 'none'})
  return true
}
// 新增地址
const addAddress = async () => {
  // 1、先校验
  if (form.consignee === '') {
    return uni.showToast({
      title: '联系人不能为空',
      duration: 1000,
      icon: 'none',
    })
  } else if (form.phone === '') {
    return uni.showToast({
      title: '手机号不能为空',
      duration: 1000,
      icon: 'none',
    })
  } else if (form.label === '') {
    return uni.showToast({
      title: '所属标签不能为空',
      duration: 1000,
      icon: 'none',
    })
  } else if (form.detail === '') {
    return uni.showToast({
      title: '详细地址不能为空',
      duration: 1000,
      icon: 'none',
    })
  }
  if (form.phone) {
    const reg = /^(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}$/
    if (!reg.test(form.phone)) {
      return uni.showToast({
        title: '手机号输入有误',
        duration: 1000,
        icon: 'none',
      })
    }
  }
  let pName = '',
    cName = '',
    dName = ''
  if (address.value.includes(' ')) {
    const arr = address.value.split(' ')
    pName = arr[0] || ''
    cName = arr[1] || ''
    dName = arr[2] || ''
  } else {
    // 如果是地图选点，address.value 可能是 "地图定位..."
    // 我们可以从 detail 截取，或者直接填“已定位”
    pName = '已定位'
    cName = '已定位'
    dName = '已定位'
  }
  // 2、再拼接参数params
  const params = {
    ...(form as {id?: number}),
    // provinceName: address.value.split(' ')[0],
    // cityName: address.value.split(' ')[1],
    // districtName: address.value.split(' ')[2],
    provinceName: pName,
    cityName: cName,
    districtName: dName,
  }
  // 3、编辑 or 新增 地址
  if (showDel.value) {
    console.log('update params !!!', params)
    const res = await updateAddressAPI(params)
    if (res.code === 0) {
      uni.redirectTo({
        url: '/pages/address/address',
      })
    }
  } else {
    delete params.id
    console.log('add params with label!', params)
    const res = await addAddressAPI(params)
    if (res.code === 0) {
      uni.redirectTo({
        url: '/pages/address/address',
      })
    }
  }
}
// 删除地址
const deleteAddress = async () => {
  if (delId.value === -1 || !delId.value) {
    return uni.showToast({
      title: '删除失败',
      duration: 1000,
      icon: 'none',
    })
  }
  const res = await deleteAddressAPI(delId.value)
  if (res.code === 0) {
    uni.redirectTo({
      url: '/pages/address/address',
    })
    uni.showToast({
      title: '地址删除成功',
      duration: 1000,
      icon: 'none',
    })
    form.consignee = ''
    form.phone = ''
    // form.address = ''
    form.label = ''
    // form.radio = 0
    // form.provinceCode = '110000'
    // form.cityCode = '110100'
    // form.districtCode = '110102'
  }
}
</script>

<style lang="scss" scoped>
/* 页面背景 */
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

/* 卡片容器 */
.card-box {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
}

/* 表单行 */
.form-row {
  display: flex;
  align-items: flex-start; /* 顶部对齐 */
  padding: 36rpx 0;
  border-bottom: 1rpx solid #eeeeee;

  &.no-border {
    border-bottom: none;
  }

  &.tag-row {
    align-items: center;
  }

  .label {
    width: 140rpx;
    font-size: 30rpx;
    color: #333;
    font-weight: bold;
    padding-top: 4rpx; /* 微调对齐 */
  }

  .input-box {
    flex: 1;
  }

  .uni-input {
    flex: 1;
    font-size: 30rpx;
    color: #333;
  }

  .placeholder {
    color: #ccc;
    font-size: 28rpx;
  }

  /* 地址展示 */
  .address-display {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .addr-text {
      flex: 1;
      font-size: 30rpx;
      line-height: 1.4;
      padding-right: 20rpx;
    }
    .icon-arrow {
      color: #ccc;
      font-size: 32rpx;
    }
  }
}

/* 性别选择胶囊 */
.gender-radio {
  display: flex;
  margin-top: 24rpx;

  .radio-tag {
    padding: 10rpx 40rpx;
    margin-right: 20rpx;
    border: 1rpx solid #e5e5e5;
    border-radius: 40rpx;
    font-size: 26rpx;
    color: #666;
    background: #fff;

    &.active {
      background: rgba(0, 170, 255, 0.1);
      border-color: #00aaff;
      color: #00aaff;
      font-weight: bold;
    }
  }
}

/* 标签列表 */
.tag-list {
  display: flex;
  .tag-item {
    width: 100rpx;
    height: 56rpx;
    line-height: 56rpx;
    text-align: center;
    border: 1rpx solid #e5e5e5;
    border-radius: 8rpx;
    margin-right: 20rpx;
    font-size: 26rpx;
    color: #666;

    &.active {
      background: #00aaff;
      border-color: #00aaff;
      color: #fff;
    }
  }
}

/* 底部按钮区 */
.footer-btn {
  margin-top: 60rpx;

  .btn-save {
    background: linear-gradient(90deg, #00c6ff, #007aff);
    color: #fff;
    border-radius: 50rpx;
    font-size: 32rpx;
    height: 90rpx;
    line-height: 90rpx;
    box-shadow: 0 10rpx 20rpx rgba(0, 122, 255, 0.2);

    &:active {
      opacity: 0.9;
    }
  }

  .btn-del {
    text-align: center;
    margin-top: 30rpx;
    color: #ff4d4f;
    font-size: 28rpx;
    background: #fff;
    padding: 20rpx;
    border-radius: 50rpx;
  }
}

/* 只列出新增/修改部分，其他的沿用之前的 */
.map-row {
  .map-box {
    flex: 1;
    display: flex;
    align-items: center;
    background: #f9f9f9; /* 浅灰背景，像个按钮 */
    padding: 20rpx;
    border-radius: 12rpx;
  }

  .map-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 16rpx;
  }

  .map-text-box {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .addr-text {
    font-size: 28rpx;
    color: #333;
    font-weight: bold;
  }
}
.page-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

/* 卡片容器 */
.card-box {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 0 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.03);
}

/* 表单行 */
.form-row {
  display: flex;
  align-items: flex-start; /* 顶部对齐 */
  padding: 36rpx 0;
  border-bottom: 1rpx solid #eeeeee;

  &.no-border {
    border-bottom: none;
  }
  &.tag-row {
    align-items: center;
  }
  .label {
    width: 140rpx;
    font-size: 30rpx;
    color: #333;
    font-weight: bold;
    padding-top: 4rpx;
  }
  .input-box {
    flex: 1;
  }
  .uni-input {
    flex: 1;
    font-size: 30rpx;
    color: #333;
  }
  .placeholder {
    color: #ccc;
    font-size: 28rpx;
  }
}

/* 地图选点样式 */
.map-row {
  .map-box {
    flex: 1;
    display: flex;
    align-items: center;
    /* background: #f9f9f9; */
    /* padding: 10rpx; */
    border-radius: 8rpx;
  }
  .map-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 16rpx;
  }
  .map-text-box {
    flex: 1;
  }
  .addr-text {
    font-size: 30rpx;
    color: #333;
    font-weight: bold;
  }
  .arrow {
    color: #ccc;
    font-size: 32rpx;
    margin-left: 10rpx;
  }
}

/* 性别选择胶囊 */
.gender-radio {
  display: flex;
  margin-top: 24rpx;
  .radio-tag {
    padding: 10rpx 40rpx;
    margin-right: 20rpx;
    border: 1rpx solid #e5e5e5;
    border-radius: 40rpx;
    font-size: 26rpx;
    color: #666;
    background: #fff;
    &.active {
      background: rgba(0, 170, 255, 0.1);
      border-color: #00aaff;
      color: #00aaff;
      font-weight: bold;
    }
  }
}

/* 标签列表 */
.tag-list {
  display: flex;
  .tag-item {
    width: 100rpx;
    height: 56rpx;
    line-height: 56rpx;
    text-align: center;
    border: 1rpx solid #e5e5e5;
    border-radius: 8rpx;
    margin-right: 20rpx;
    font-size: 26rpx;
    color: #666;
    &.active {
      background: #00aaff;
      border-color: #00aaff;
      color: #fff;
    }
  }
}

/* 底部按钮区 */
.footer-btn {
  margin-top: 60rpx;
  .btn-save {
    background: linear-gradient(90deg, #00c6ff, #007aff);
    color: #fff;
    border-radius: 50rpx;
    font-size: 32rpx;
    height: 90rpx;
    line-height: 90rpx;
    box-shadow: 0 10rpx 20rpx rgba(0, 122, 255, 0.2);
    &:active {
      opacity: 0.9;
    }
  }
}
</style>
