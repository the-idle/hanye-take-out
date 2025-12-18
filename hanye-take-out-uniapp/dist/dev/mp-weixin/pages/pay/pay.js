"use strict";
const common_vendor = require("../../common/vendor.js");
const api_order = require("../../api/order.js");
const stores_modules_countdown = require("../../stores/modules/countdown.js");
const utils_http = require("../../utils/http.js");
require("../../stores/modules/user.js");
if (!Array) {
  const _easycom_uni_countdown2 = common_vendor.resolveComponent("uni-countdown");
  _easycom_uni_countdown2();
}
const _easycom_uni_countdown = () => "../../node-modules/@dcloudio/uni-ui/lib/uni-countdown/uni-countdown.js";
if (!Math) {
  _easycom_uni_countdown();
}
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "pay",
  setup(__props) {
    const countdownStore = stores_modules_countdown.useCountdownStore();
    const orderId = common_vendor.ref(0);
    const orderNumber = common_vendor.ref("");
    const orderAmount = common_vendor.ref(0);
    const orderTime = common_vendor.ref();
    common_vendor.ref(null);
    const timeup = () => {
      clearTimer();
      countdownStore.showM = -1;
      countdownStore.showS = -1;
    };
    common_vendor.onLoad(async (options) => {
      {
        console.log("支付页加载", options);
      }
      orderId.value = options.orderId;
      orderNumber.value = options.orderNumber;
      orderAmount.value = options.orderAmount;
      const timeStr = options.orderTime;
      orderTime.value = typeof timeStr === "string" ? timeStr.replace(" ", "T") : timeStr;
      if (!orderTime.value) {
        try {
          const res = await api_order.getOrderAPI(orderId.value);
          if (res.data && res.data.orderTime) {
            orderTime.value = res.data.orderTime;
          }
        } catch (e) {
          console.error("获取订单信息失败", e);
        }
      }
      initCountdown();
    });
    let isSubmitting = false;
    const toSuccess = async () => {
      if (isSubmitting) {
        return;
      }
      if (countdownStore.showM == -1 && countdownStore.showS == -1) {
        common_vendor.index.redirectTo({
          url: "/pages/orderDetail/orderDetail?orderId=" + orderId.value
        });
        return;
      }
      isSubmitting = true;
      common_vendor.index.showLoading({ title: "提交中..." });
      try {
        const payDTO = {
          orderNumber: orderNumber.value,
          payMethod: 1
        };
        const res = await utils_http.http({
          url: "/user/order/payment/mock",
          method: "PUT",
          data: payDTO
        });
        if (res.code === 0) {
          clearTimer();
          common_vendor.index.redirectTo({
            url: "/pages/submit/success?orderId=" + orderId.value + "&orderNumber=" + orderNumber.value + "&orderAmount=" + orderAmount.value + "&orderTime=" + orderTime.value
          });
        } else {
          common_vendor.index.showToast({ title: res.msg || "支付失败", icon: "none" });
        }
      } catch (err) {
        console.error("支付失败", err);
        common_vendor.index.showToast({ title: err.msg || "网络请求失败", icon: "none" });
      } finally {
        isSubmitting = false;
        common_vendor.index.hideLoading();
      }
    };
    const clearTimer = () => {
      if (countdownStore.timer !== void 0) {
        clearInterval(countdownStore.timer);
        countdownStore.timer = void 0;
      }
    };
    common_vendor.onUnload(() => {
      clearTimer();
    });
    common_vendor.onBeforeUnmount(() => {
      clearTimer();
    });
    const initCountdown = () => {
      {
        console.log("初始化倒计时，订单时间:", orderTime.value);
      }
      clearTimer();
      const updateCountdown = () => {
        if (!orderTime.value) {
          console.error("订单时间为空，无法计算倒计时");
          return;
        }
        let buyTime;
        if (typeof orderTime.value === "string") {
          const timeStr = orderTime.value.replace(" ", "T");
          buyTime = new Date(timeStr).getTime();
        } else {
          buyTime = new Date(orderTime.value).getTime();
        }
        const time = buyTime + 15 * 60 * 1e3 - (/* @__PURE__ */ new Date()).getTime();
        if (time > 0) {
          const m = Math.floor(time / 1e3 / 60 % 60);
          const s = Math.floor(time / 1e3 % 60);
          countdownStore.showM = m;
          countdownStore.showS = s;
        } else {
          {
            console.log("订单已超时！");
          }
          clearTimer();
          countdownStore.showM = -1;
          countdownStore.showS = -1;
          cancelOrder();
        }
      };
      updateCountdown();
      countdownStore.timer = setInterval(updateCountdown, 1e3);
    };
    const cancelOrder = async () => {
      await api_order.cancelOrderAPI(orderId.value);
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: common_vendor.unref(countdownStore).showM == 0 && common_vendor.unref(countdownStore).showS == 0
      }, common_vendor.unref(countdownStore).showM == 0 && common_vendor.unref(countdownStore).showS == 0 ? {} : {
        b: common_vendor.o(($event) => timeup()),
        c: common_vendor.p({
          color: "#888",
          ["show-day"]: false,
          ["show-hour"]: false,
          minute: common_vendor.unref(countdownStore).showM,
          second: common_vendor.unref(countdownStore).showS
        })
      }, {
        d: common_vendor.t(orderAmount.value),
        e: common_vendor.t(orderNumber.value),
        f: common_vendor.o(($event) => toSuccess())
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-8a6251df"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/pay/pay.vue"]]);
wx.createPage(MiniProgramPage);
