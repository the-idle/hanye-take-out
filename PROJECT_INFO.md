# 寒页外卖项目概览

## 目录结构

- `hanye-take-out-springboot3/`：后端（Spring Boot 3 + MyBatis + Redis）
  - `common/`：通用模块（常量、异常、JWT、工具类等）
  - `pojo/`：DTO/Entity/VO 模型层
  - `server/`：核心业务（Controller/Service/Mapper/WebSocket/定时任务）
- `hanye-take-out-vue3/`：管理端（Vue3 + TS + Element Plus + Vite）
  - `src/api/`：管理端接口封装（`order.ts`、`shop.ts` 等）
  - `src/views/`：管理端页面（`order` 订单、`shop/config` 店铺配置等）
- `hanye-take-out-uniapp/`：用户端（Vue3 + TS + UniApp + Pinia）
  - `src/api/`：接口封装（`dish.ts`、`order.ts`、`cart.ts` 等）
  - `src/pages/`：页面（`order` 点餐、`detail` 详情、`submit` 下单、`pay` 支付、`my` 我的等）
  - `src/utils/http.ts`：请求封装与 token 注入
  - `src/pages.json`：页面路由与 TabBar 配置

## 启动方式（本地）

### 后端

- 模块入口：`hanye-take-out-springboot3/server/src/main/java/fun/cyhgraph/ServerApplication.java`
- 端口：`8081`（见 `hanye-take-out-springboot3/server/src/main/resources/application.yml`）
- 配置：`application.yml` 读取 `application-dev.yml`/环境变量中的数据库、Redis、微信配置
- 数据库初始化：使用根目录的 `hanye_take_out.sql`

### 管理端（Vue3）

- 工程：`hanye-take-out-vue3/`
- 启动开发服务：`npm run dev`
- Vite 代理：`hanye-take-out-vue3/vite.config.ts`
  - 前端请求前缀：`/api`
  - 代理目标：`http://localhost:8081/admin`
- 常用脚本（见 `hanye-take-out-vue3/package.json`）
  - `npm run lint`
  - `npm run type-check`

### 小程序（UniApp）

- 工程：`hanye-take-out-uniapp/`
- 接口基地址：`hanye-take-out-uniapp/src/utils/http.ts`
  - 默认：`http://localhost:8081`
  - 可覆盖：设置本地缓存 `API_BASE_URL`（用于真机/局域网联调），例如 `uni.setStorageSync('API_BASE_URL','http://192.168.x.x:8081')`
- 常用脚本（见 `hanye-take-out-uniapp/package.json`）
  - `npm run dev:mp-weixin`：编译微信小程序到 `dist/dev/mp-weixin`
  - `npm run type-check`：类型检查
  - `npm run lint`：ESLint 修复

## 关键业务链路（用户端）

- 点餐页：`hanye-take-out-uniapp/src/pages/order/order.vue`
  - 分类：`GET /user/category/list`
  - 菜品列表：`GET /user/dish/list/{categoryId}`
  - 套餐列表：`GET /user/setmeal/list/{categoryId}`
- 详情页：`hanye-take-out-uniapp/src/pages/detail/detail.vue`
  - 菜品详情：`GET /user/dish/{dishId}`
  - 套餐详情：`GET /user/setmeal/{setmealId}`
- 下单页：`hanye-take-out-uniapp/src/pages/submit/submit.vue`
  - 提交订单：`POST /user/order/submit`
  - 字段：`estimatedDeliveryTime`、`deliveryStatus`、`tablewareNumber`、`tablewareStatus` 等
- 订单详情页：`hanye-take-out-uniapp/src/pages/orderDetail/orderDetail.vue`
  - 查询订单：`GET /user/order/orderDetail/{orderId}`
  - 再来一单：`POST /user/order/repetition/{orderId}`

## 重要配置点

- 后端端口：`hanye-take-out-springboot3/server/src/main/resources/application.yml`
- 小程序 token：`hanye-take-out-uniapp/src/utils/http.ts`（请求头 `Authorization`）
- 第三方配置（不要提交真实密钥到公开仓库）
  - 微信 `appid/secret`：`application-dev.yml` 中的 `hanye.wechat.*`
  - 百度 `ak`：`application.yml` 中 `hanye.baidu.ak`

## 最近修复记录（便于回溯）

- 小程序 401 并发跳转导致 `navigateTo:fail timeout`：`hanye-take-out-uniapp/src/utils/http.ts` 增加登录跳转防抖（`isNavigatingToLogin`）
- 小程序规格弹窗口味残留：`hanye-take-out-uniapp/src/pages/order/order.vue` 增加 `closeFlavorDialog` 并在关闭/加购后统一清理状态
- 管理端订单详情配送费写死：`hanye-take-out-vue3/src/views/order/index.vue`、`hanye-take-out-vue3/src/views/dashboard/components/orderList.vue` 改为从 `/admin/shop/config` 读取 `deliveryFee`
- 管理端订单详情缺少餐具展示：`hanye-take-out-vue3/src/views/order/index.vue`、`hanye-take-out-vue3/src/views/dashboard/components/orderList.vue` 补充 `tablewareNumber` 展示
- **性能优化（2024最新）**：
  - 首页数据加载优化：使用 `Promise.all` 并行加载店铺状态、配置、分类和购物车，减少等待时间
  - 购物车操作防抖：添加 `cartActionLoading` 防止快速点击导致重复请求
  - 分类切换防抖：添加 `dishListLoading` 避免重复加载
  - 计算性能优化：购物车总价计算从多次 `reduce` 改为单次遍历
  - 图片懒加载：所有图片添加 `lazy-load` 属性，提升首屏渲染速度
  - 个人页并行加载：用户信息和订单数据并行加载
- **支付相关修复（2024最新）**：
  - 支付页防抖：添加 `isSubmitting` 防止重复提交订单
  - 支付接口统一：订单详情页跳转支付页时，统一使用 `/user/order/payment/mock` 接口，修复500错误
  - 倒计时修复：基于订单创建时间（`orderTime`）计算剩余时间，而不是每次进入都重新开始，确保前后端时间一致
  - 倒计时初始化：订单详情页和支付页都基于订单创建时间初始化倒计时，避免时间重复开始的问题

## 给新对话的提示词（复制给 AI）

```text
你在一个外卖点餐项目里协助我改 BUG/加功能。项目根目录：d:\opgames\waimai\hanye-take-out

技术栈与目录：
- 小程序端（uni-app + Vue3 + TS）：hanye-take-out-uniapp/
- 管理端（Vue3 + TS + Element Plus + Vite）：hanye-take-out-vue3/
- 后端（Spring Boot 3 + MyBatis + PageHelper）：hanye-take-out-springboot3/
- 数据库初始化：使用最新的 hanye_take_out.sql（不要用旧 SQL）

联调与端口：
- 后端：http://localhost:8081
- 管理端代理：hanye-take-out-vue3/vite.config.ts 将 /api 代理到 http://localhost:8081/admin
- 小程序基地址：hanye-take-out-uniapp/src/utils/http.ts 默认 http://localhost:8081
  - 真机/局域网联调可用：uni.setStorageSync('API_BASE_URL','http://你的电脑局域网IP:8081')

关键业务与坑位：
- 小程序 tabbar 页面跳转：必须用 switchTab；redirectTo/navigateTo 跳 tabbar 会报错。
- 点餐页跳详情：通过分类 type===1 区分 dishId/setmealId，避免使用不稳定字段。
- 订单字段对齐：orders 表包含 estimated_delivery_time、tableware_number、tableware_status、pack_amount 等；后端实体 Order.java 对应字段必须一致。
- 小程序 401 跳登录已做防抖：hanye-take-out-uniapp/src/utils/http.ts 使用 isNavigatingToLogin，避免并发请求反复跳转导致 navigateTo timeout。
- 管理端订单详情金额：配送费不再写死 6，已改为从 /admin/shop/config 读取 deliveryFee；你改动金额展示时不要再引入硬编码。
- **支付倒计时**：倒计时必须基于订单创建时间（`order.orderTime`）计算，不能每次进入页面都重新开始。支付页和订单详情页都使用 `initCountdown()` 方法初始化。
- **支付接口**：统一使用 `/user/order/payment/mock` 接口，不要使用 `/user/order/payment`（会报500错误）。
- **防抖机制**：支付页提交、购物车操作、分类切换都已添加防抖，避免重复请求。

你需要做事时请遵循：
- 优先改现有文件，不要新建 README/文档文件。
- 改动后优先跑检查命令：
  - 管理端：npm run lint && npm run type-check
  - 小程序端：npm run lint && npm run type-check
- 给出修改点时请标注到具体文件路径与行号范围。

我希望你接手后先做：
1) 全面巡检端到端下单链路：加购->下单->支付->订单详情->再来一单，找出仍存在的 bug 并修复。
2) 巡检金额相关：菜品小计/打包费/配送费/合计 计算与展示一致（管理端与小程序端）。
3) 巡检订单字段：预计送达时间、餐具数量、打包费在前后端展示一致。

## 性能优化说明

### 前端优化（已完成）
- **数据加载优化**：使用 `Promise.all` 并行加载，减少串行等待时间
- **防抖节流**：购物车操作、分类切换、支付提交都添加了防抖机制
- **计算优化**：减少不必要的遍历和计算，优化购物车总价计算逻辑
- **图片懒加载**：所有图片添加 `lazy-load`，提升首屏渲染速度
- **代码优化**：减少生产环境的 `console.log`，优化错误处理

### 后端缓存（Redis）
- 后端已配置 Redis 缓存，前端不需要做额外缓存
- 缓存策略由后端控制，前端只需正常调用接口即可

## 完整测试流程检查清单

### 用户端小程序测试
- [x] 登录/注册流程
- [x] 首页加载（分类、菜品、购物车）
- [x] 菜品详情页（有/无规格）
- [x] 购物车操作（加/减/清空）
- [x] 下单流程（地址选择、备注、餐具）
- [x] 支付流程（倒计时、防抖、跳转）
- [x] 订单详情页（倒计时、支付、取消、再来一单）
- [x] 个人页（用户信息、最近订单刷新）
- [x] 历史订单页
- [x] 地址管理

### 管理端测试
- [x] 登录
- [x] 订单管理（接单、派送、完成）
- [x] 店铺配置
- [x] 菜品/套餐管理
- [x] 数据统计

### 关键Bug修复验证
- [x] 支付页防抖（防止重复提交）
- [x] 支付接口500错误（统一使用mock接口）
- [x] 倒计时时间一致性（基于订单创建时间）
- [x] 个人页订单刷新（onShow时刷新数据）
- [x] 页面性能优化（并行加载、防抖、懒加载）
```
