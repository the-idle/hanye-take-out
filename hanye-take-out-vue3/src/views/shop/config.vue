<template>
    <div class="dashboard-container">
      <div class="app-container">
        
        <!-- 顶部操作栏 -->
        <el-card class="box-card header-card">
          <div class="header-box">
            <div class="title-info">
              <el-icon class="title-icon"><Shop /></el-icon>
              <div class="texts">
                <span class="main-title">店铺运营配置</span>
                <span class="sub-title">管理店铺的基础信息、配送规则及接单设置</span>
              </div>
            </div>
            <el-button type="primary" size="large" @click="handleSave" :loading="loading" icon="Select">
              保存修改
            </el-button>
          </div>
        </el-card>
  
        <!-- 主要内容区 -->
        <el-form :model="form" label-position="top" class="config-form" :rules="rules" ref="formRef">
          <el-row :gutter="24">
            
            <!-- 左列：基础信息 -->
            <el-col :span="12" :xs="24">
              <el-card class="box-card section-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><House /></el-icon> <span>基础信息</span>
                  </div>
                </template>
  
                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="店铺名称" prop="name">
                      <el-input v-model="form.name" placeholder="例如：XX餐厅(总店)" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="联系电话" prop="phone">
                      <el-input v-model="form.phone" placeholder="顾客可见的联系电话" />
                    </el-form-item>
                  </el-col>
                </el-row>
  
                <el-form-item label="营业时间" prop="openingHours">
                  <el-input v-model="form.openingHours" placeholder="例如：09:00 - 22:00">
                    <template #prefix><el-icon><Timer /></el-icon></template>
                  </el-input>
                </el-form-item>
  
                <el-form-item label="店铺公告">
                  <el-input 
                    type="textarea" 
                    :rows="3" 
                    v-model="form.notice" 
                    placeholder="请输入滚动显示的店铺公告..." 
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>
  
                <el-divider border-style="dashed">位置设置</el-divider>
  
                <el-form-item label="详细地址" prop="address">
                  <el-input v-model="form.address" placeholder="请输入店铺详细地址" />
                </el-form-item>
  
                <el-form-item label="经纬度坐标 (用于计算配送距离)">
                  <div class="location-box">
                    <el-input v-model="form.latitude" placeholder="纬度 (Lat)" style="width: 40%;" />
                    <span class="split">-</span>
                    <el-input v-model="form.longitude" placeholder="经度 (Lng)" style="width: 40%;" />
                    <el-tooltip content="点击跳转腾讯地图拾取坐标" placement="top">
                      <a href="https://lbs.qq.com/getPoint/" target="_blank" class="map-link">
                        <el-icon><LocationInformation /></el-icon> 拾取
                      </a>
                    </el-tooltip>
                  </div>
                </el-form-item>
              </el-card>
            </el-col>
  
            <!-- 右列：费用与设置 -->
            <el-col :span="12" :xs="24">
              <el-card class="box-card section-card">
                <template #header>
                  <div class="card-header">
                    <el-icon><Money /></el-icon> <span>费用设置</span>
                  </div>
                </template>
  
                <div class="setting-item">
                  <div class="setting-label">
                    <span>配送费</span>
                    <el-tag v-if="form.deliveryStatus" type="success" size="small" effect="dark">已开启</el-tag>
                    <el-tag v-else type="info" size="small">已关闭</el-tag>
                  </div>
                  <div class="setting-control">
                    <el-switch v-model="form.deliveryStatus" :active-value="1" :inactive-value="0" />
                  </div>
                </div>
                <transition name="el-zoom-in-top">
                  <div v-if="form.deliveryStatus" class="setting-input-box">
                    <el-input-number v-model="form.deliveryFee" :precision="2" :step="1" :min="0" controls-position="right" />
                    <span class="unit">元 / 单</span>
                  </div>
                </transition>
  
                <el-divider />
  
                <div class="setting-item">
                  <div class="setting-label">
                    <span>打包费</span>
                    <el-tag v-if="form.packStatus" type="success" size="small" effect="dark">已开启</el-tag>
                    <el-tag v-else type="info" size="small">已关闭</el-tag>
                  </div>
                  <div class="setting-control">
                    <el-switch v-model="form.packStatus" :active-value="1" :inactive-value="0" />
                  </div>
                </div>
                <transition name="el-zoom-in-top">
                  <div v-if="form.packStatus" class="setting-input-box">
                    <el-input-number v-model="form.packFee" :precision="2" :step="0.5" :min="0" controls-position="right" />
                    <span class="unit">元 / 份</span>
                  </div>
                </transition>
  
                <el-divider />
  
                <el-form-item label="起送金额">
                   <el-input-number v-model="form.minOrderAmount" :precision="2" :step="5" :min="0" controls-position="right" class="w-100" />
                   <span class="tips-text">低于此金额将无法提交订单</span>
                </el-form-item>
              </el-card>
  
              <!-- <el-card class="box-card section-card mt-20">
                <template #header>
                  <div class="card-header">
                    <el-icon><Setting /></el-icon> <span>高级功能</span>
                  </div>
                </template>
                
                <div class="setting-item">
                  <div class="setting-info">
                    <span class="label">自动接单</span>
                    <span class="desc">开启后，用户付款成功即自动接单，无需人工点击</span>
                  </div>
                  <el-switch v-model="form.autoAccept" :active-value="1" :inactive-value="0" inline-prompt active-text="开" inactive-text="关"/>
                </div>
              </el-card> -->
            </el-col>
          </el-row>
        </el-form>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { getConfigAPI, saveConfigAPI } from '@/api/shop'
  // 引入图标
  import { Shop, House, Money, Setting, Timer, LocationInformation, Select } from '@element-plus/icons-vue'
  
  const loading = ref(false)
  const formRef = ref()
  
  // 初始化数据（防止页面闪烁空白）
  const form = ref({
    id: 1,
    name: '',
    address: '',
    phone: '',
    deliveryFee: 0,
    deliveryStatus: 1,
    packFee: 0,
    packStatus: 1,
    minOrderAmount: 0,
    openingHours: '',
    notice: '',
    autoAccept: 0,
    latitude: '',
    longitude: '',
  })
  
  // 表单验证规则
  const rules = {
    name: [{ required: true, message: '请输入店铺名称', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
    address: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
  }
  
// 修改 src/views/shop/config.vue 中的 getConfig

const getConfig = async () => {
  try {
    const { data: res } = await getConfigAPI()
    
    // 【核心修复】你的后端返回 0 表示成功，之前写的是 1，导致进不来
    if (res.code === 0 || res.code === 1) {
      if (res.data) {
        form.value = res.data
        // 防止 null 报错
        if(!form.value.latitude) form.value.latitude = ''
        if(!form.value.longitude) form.value.longitude = ''
      }
    } else {
      ElMessage.warning(res.msg || '获取配置失败')
    }
  } catch (e) {
    console.error('获取配置失败', e)
  }
}
  
// 修改 src/views/shop/config.vue 中的 handleSave

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      try {
        const { data: res } = await saveConfigAPI(form.value)
        // 【核心修复】同样兼容 code 0 和 1
        if (res.code === 0 || res.code === 1) {
          ElMessage.success('保存成功')
          getConfig() // 重新获取最新数据
        } else {
          ElMessage.error(res.msg || '保存失败')
        }
      } catch (e) {
        ElMessage.error('保存请求异常')
      } finally {
        loading.value = false
      }
    }
  })
}
  
  onMounted(() => {
    getConfig()
  })
  </script>
  
  <style scoped lang="scss">
  .dashboard-container {
    padding: 20px;
    background-color: #f0f2f5;
    min-height: 100vh;
  }
  
  .header-card {
    margin-bottom: 20px;
    border: none;
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .title-info {
        display: flex;
        align-items: center;
        .title-icon {
          font-size: 32px;
          color: #409EFF;
          background: #ecf5ff;
          padding: 10px;
          border-radius: 8px;
          margin-right: 15px;
        }
        .texts {
          display: flex;
          flex-direction: column;
          .main-title {
            font-size: 20px;
            font-weight: bold;
            color: #303133;
          }
          .sub-title {
            font-size: 13px;
            color: #909399;
            margin-top: 5px;
          }
        }
      }
    }
  }
  
  .section-card {
    margin-bottom: 24px;
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    
    .card-header {
      display: flex;
      align-items: center;
      font-weight: bold;
      font-size: 16px;
      color: #303133;
      .el-icon {
        margin-right: 8px;
        font-size: 18px;
        color: #409EFF;
      }
    }
  }
  
  .location-box {
    display: flex;
    align-items: center;
    gap: 10px;
    .split { color: #999; }
    .map-link {
      display: flex;
      align-items: center;
      color: #409EFF;
      font-size: 13px;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      &:hover { text-decoration: underline; }
    }
  }
  
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    
    .setting-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #606266;
    }
    
    .setting-info {
      display: flex;
      flex-direction: column;
      .label { font-size: 14px; color: #303133; font-weight: 500; }
      .desc { font-size: 12px; color: #909399; margin-top: 4px; }
    }
  }
  
  .setting-input-box {
    background: #f5f7fa;
    padding: 15px;
    border-radius: 6px;
    margin-top: 10px;
    display: flex;
    align-items: center;
    .unit { margin-left: 10px; font-size: 13px; color: #666; }
  }
  
  .tips-text {
    font-size: 12px;
    color: #E6A23C;
    margin-left: 10px;
  }
  
  .mt-20 { margin-top: 20px; }
  .w-100 { width: 100%; }
  </style>