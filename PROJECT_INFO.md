# 寒页外卖项目概览

## 目录结构

- `hanye-take-out-springboot3/`：后端（Spring Boot 3 + MyBatis + Redis）
  - `common/`：通用模块（常量、异常、JWT、工具类等）
  - `pojo/`：DTO/Entity/VO 模型层
  - `server/`：核心业务（Controller/Service/Mapper/WebSocket/定时任务）
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

### 小程序（UniApp）

- 工程：`hanye-take-out-uniapp/`
- 接口基地址：`hanye-take-out-uniapp/src/utils/http.ts` 内 `baseURL`，默认 `http://localhost:8081`
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
