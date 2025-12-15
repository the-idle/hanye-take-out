"use strict";
const common_vendor = require("../../common/vendor.js");
const api_address = require("../../api/address.js");
const api_cart = require("../../api/cart.js");
const api_order = require("../../api/order.js");
const api_shop = require("../../api/shop.js");
const stores_modules_address = require("../../stores/modules/address.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "submit",
  setup(__props) {
    const store = stores_modules_address.useAddressStore();
    const cartList = common_vendor.ref([]);
    const CartAllNumber = common_vendor.ref(0);
    const CartAllPrice = common_vendor.ref(0);
    const shopConfig = common_vendor.ref({
      id: 1,
      name: "",
      address: "",
      latitude: "",
      longitude: "",
      phone: "",
      deliveryFee: 0,
      deliveryStatus: 1,
      packFee: 0,
      packStatus: 1,
      minOrderAmount: 0,
      openingHours: "",
      notice: "",
      autoAccept: 0
    });
    common_vendor.ref("");
    const label = common_vendor.ref("");
    const consignee = common_vendor.ref("");
    const phoneNumber = common_vendor.ref("");
    const arrivalTime = common_vendor.ref("");
    const showTimePopup = common_vendor.ref(false);
    const selectedTimeLabel = common_vendor.ref("立即送出");
    const timeSlots = common_vendor.ref([]);
    const estimatedDeliveryTime = common_vendor.ref("");
    const selectedAddrObj = common_vendor.ref({});
    const addressId = common_vendor.ref(0);
    const generateTimeSlots = () => {
      const slots = ["立即送出"];
      const now = /* @__PURE__ */ new Date();
      let start = new Date(now.getTime() + 30 * 6e4);
      const remainder = start.getMinutes() % 15;
      start.setMinutes(start.getMinutes() + (15 - remainder));
      while (start.getHours() < 23) {
        const h = start.getHours().toString().padStart(2, "0");
        const m = start.getMinutes().toString().padStart(2, "0");
        slots.push(`${h}:${m}`);
        start.setMinutes(start.getMinutes() + 15);
      }
      timeSlots.value = slots;
    };
    const openTimePicker = () => {
      generateTimeSlots();
      showTimePopup.value = true;
    };
    const selectTime = (timeStr) => {
      selectedTimeLabel.value = timeStr;
      showTimePopup.value = false;
      const now = /* @__PURE__ */ new Date();
      if (timeStr === "立即送出") {
        now.setTime(now.getTime() + 45 * 6e4);
      } else {
        const [h, m] = timeStr.split(":");
        now.setHours(Number(h));
        now.setMinutes(Number(m));
      }
      estimatedDeliveryTime.value = DateToStr(now);
    };
    const detailAddressStr = common_vendor.computed(() => {
      if (!addressId.value)
        return "";
      const addr = selectedAddrObj.value;
      const p = !addr.provinceName || addr.provinceName === "已定位" ? "" : addr.provinceName;
      const c = !addr.cityName || addr.cityName === "已定位" ? "" : addr.cityName;
      const d = !addr.districtName || addr.districtName === "已定位" ? "" : addr.districtName;
      const detail = addr.detail || "";
      return `${p}${c}${d} ${detail}`.trim();
    });
    common_vendor.ref("ios");
    const openCooker = common_vendor.ref(false);
    const cookerNum = common_vendor.ref(-2);
    const cookers = common_vendor.ref([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const radioStatus = common_vendor.ref(false);
    const remark = common_vendor.ref("");
    const getCartList = async () => {
      try {
        const configRes = await api_shop.getShopConfigAPI();
        if (configRes.code === 0 || configRes.code === 1) {
          shopConfig.value = configRes.data;
        }
      } catch (e) {
        console.error("获取店铺配置失败", e);
      }
      const res = await api_cart.getCartAPI();
      if (res.data) {
        cartList.value = res.data;
        CartAllNumber.value = cartList.value.reduce((acc, cur) => acc + cur.number, 0);
        const goodsPrice = cartList.value.reduce((acc, cur) => acc + cur.amount * cur.number, 0);
        let packPrice = 0;
        if (shopConfig.value.packStatus === 1) {
          packPrice = CartAllNumber.value * Number(shopConfig.value.packFee);
        }
        let deliveryPrice = 0;
        if (shopConfig.value.deliveryStatus === 1) {
          deliveryPrice = Number(shopConfig.value.deliveryFee);
        }
        CartAllPrice.value = goodsPrice + packPrice + deliveryPrice;
      }
    };
    const packTotalPrice = common_vendor.computed(() => {
      if (shopConfig.value.packStatus === 1) {
        return (CartAllNumber.value * Number(shopConfig.value.packFee)).toFixed(2);
      }
      return "0.00";
    });
    const deliveryTotalPrice = common_vendor.computed(() => {
      if (shopConfig.value.deliveryStatus === 1) {
        return Number(shopConfig.value.deliveryFee).toFixed(2);
      }
      return "0.00";
    });
    common_vendor.onLoad(async (options) => {
      await getCartList();
      getHarfAnOur();
      const defaultCooker = common_vendor.index.getStorageSync("default_cooker_type");
      if (defaultCooker !== "" && defaultCooker !== null && defaultCooker !== void 0) {
        cookerNum.value = Number(defaultCooker);
        radioStatus.value = true;
      } else {
        cookerNum.value = -2;
        radioStatus.value = false;
      }
    });
    common_vendor.onShow(async () => {
      const cacheAddr = common_vendor.index.getStorageSync("select_address");
      if (cacheAddr) {
        fillAddress(cacheAddr);
        common_vendor.index.removeStorageSync("select_address");
      } else {
        if (!addressId.value) {
          await getAddressBookDefault();
        }
      }
      const cacheRemark = common_vendor.index.getStorageSync("order_remark");
      if (cacheRemark) {
        remark.value = cacheRemark;
        common_vendor.index.removeStorageSync("order_remark");
        console.log("读取到备注:", remark.value);
      }
      await getCartList();
    });
    const DateToStr = (date) => {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const min = date.getMinutes().toString().padStart(2, "0");
      const second = date.getSeconds().toString().padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${min}:${second}`;
    };
    const getHarfAnOur = () => {
      const date = /* @__PURE__ */ new Date();
      date.setTime(date.getTime() + 36e5);
      const formattedDate = DateToStr(date);
      estimatedDeliveryTime.value = formattedDate;
      let hours = date.getHours();
      let minutes = date.getMinutes();
      if (hours < 10)
        hours = parseInt("0" + hours);
      if (minutes < 10)
        minutes = parseInt("0" + minutes);
      arrivalTime.value = hours + ":" + minutes;
    };
    const getAddressBookDefault = async () => {
      const res = await api_address.getDefaultAddressAPI();
      if (res.code === 0 && res.data) {
        fillAddress(res.data);
      }
    };
    const trans = (item) => {
      if (item === "公司")
        return "1";
      if (item === "家")
        return "2";
      if (item === "学校")
        return "3";
      return "4";
    };
    const goAddress = () => {
      store.addressBackUrl = "/pages/submit/submit";
      common_vendor.index.navigateTo({
        url: "/pages/address/address?from=order"
      });
    };
    const goRemark = () => {
      common_vendor.index.navigateTo({
        url: `/pages/remark/remark?remark=${remark.value}`
      });
    };
    const chooseCooker = () => {
      openCooker.value = true;
      if (cookerNum.value === -2) {
        cookerNum.value = 0;
      }
    };
    const getCookerInfo = () => {
      if (cookerNum.value === -2)
        return "请依据实际情况填写，避免浪费";
      else if (cookerNum.value === -1)
        return "无需餐具";
      else if (cookerNum.value === 0)
        return "商家依据餐量提供";
      else if (cookerNum.value === 11)
        return "10份以上";
      else
        return cookerNum.value + "份";
    };
    const pickerChange = (ev) => {
      const index = ev.detail.value[0];
      const selectedVal = cookers.value[index];
      cookerNum.value = selectedVal;
      if (radioStatus.value) {
        common_vendor.index.setStorageSync("default_cooker_type", selectedVal);
      }
    };
    const radioChange = () => {
      radioStatus.value = !radioStatus.value;
      if (radioStatus.value) {
        if (cookerNum.value === -2) {
          cookerNum.value = 0;
        }
        common_vendor.index.setStorageSync("default_cooker_type", cookerNum.value);
        common_vendor.index.showToast({ title: "已记住您的偏好", icon: "none" });
      } else {
        common_vendor.index.removeStorageSync("default_cooker_type");
      }
    };
    const closeMask = () => {
      openCooker.value = false;
    };
    const payOrderHandle = async () => {
      const unPayRes = await api_order.getUnPayOrderAPI();
      if (unPayRes.data !== 0) {
        return common_vendor.index.showToast({ title: "有未支付订单，请先处理！", icon: "none" });
      }
      if (!addressId.value) {
        return common_vendor.index.showToast({ title: "请选择收货地址", icon: "none" });
      }
      if (cookerNum.value === -2) {
        return common_vendor.index.showToast({ title: "请选择餐具份数", icon: "none" });
      }
      const params = {
        payMethod: 1,
        addressId: addressId.value,
        remark: remark.value,
        deliveryStatus: selectedTimeLabel.value === "立即送出" ? 1 : 0,
        estimatedDeliveryTime: estimatedDeliveryTime.value,
        tablewareNumber: cookerNum.value,
        tablewareStatus: cookerNum.value === 0 ? 1 : 0,
        packAmount: CartAllNumber.value,
        amount: CartAllPrice.value
      };
      console.log("提交订单参数:", JSON.stringify(params, null, 2));
      const res = await api_order.submitOrderAPI(params);
      if (res.code === 0 || res.code === 1) {
        common_vendor.index.redirectTo({
          url: `/pages/pay/pay?orderId=${res.data.id}&orderAmount=${res.data.orderAmount}&orderNumber=${res.data.orderNumber}&orderTime=${res.data.orderTime}`
        });
      } else {
        common_vendor.index.showToast({ title: res.msg || "下单失败", icon: "none" });
      }
    };
    const fillAddress = (addr) => {
      if (!addr)
        return;
      addressId.value = addr.id;
      consignee.value = addr.consignee;
      phoneNumber.value = addr.phone;
      label.value = addr.label;
      selectedAddrObj.value = addr;
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: !addressId.value
      }, !addressId.value ? {} : common_vendor.e({
        b: label.value
      }, label.value ? {
        c: common_vendor.t(label.value),
        d: common_vendor.n("tag" + trans(label.value))
      } : {}, {
        e: common_vendor.t(detailAddressStr.value),
        f: common_vendor.t(consignee.value),
        g: common_vendor.t(phoneNumber.value)
      }), {
        h: common_vendor.o(goAddress),
        i: common_vendor.t(selectedTimeLabel.value),
        j: common_vendor.o(openTimePicker),
        k: common_vendor.f(cartList.value, (obj, index, i0) => {
          return common_vendor.e({
            a: obj.pic ? obj.pic : "/static/default_dish.png",
            b: common_vendor.t(obj.name),
            c: obj.dishFlavor
          }, obj.dishFlavor ? {
            d: common_vendor.t(obj.dishFlavor)
          } : {}, {
            e: obj.number && obj.number > 0
          }, obj.number && obj.number > 0 ? {
            f: common_vendor.t(obj.number)
          } : {}, {
            g: common_vendor.t(obj.amount),
            h: index
          });
        }),
        l: common_vendor.t(packTotalPrice.value),
        m: common_vendor.t(deliveryTotalPrice.value),
        n: common_vendor.t(CartAllPrice.value),
        o: common_vendor.t(remark.value || "选择口味等"),
        p: common_vendor.o(goRemark),
        q: common_vendor.t(getCookerInfo()),
        r: common_vendor.o(chooseCooker),
        s: common_vendor.t(CartAllNumber.value),
        t: common_vendor.t(parseFloat((Math.round(CartAllPrice.value * 100) / 100).toFixed(2))),
        v: common_vendor.o(($event) => payOrderHandle()),
        w: common_vendor.o(closeMask),
        x: common_vendor.f(cookers.value, (item, k0, i0) => {
          return {
            a: common_vendor.t(item === -1 ? "无需餐具" : item === 0 ? "商家依据餐量提供" : item === 11 ? "10份以上" : item + "份"),
            b: item
          };
        }),
        y: cookers.value,
        z: common_vendor.o(pickerChange),
        A: radioStatus.value,
        B: common_vendor.o(radioChange),
        C: common_vendor.t(cookerNum.value === -2 || cookerNum.value === -1 ? "以后都无需餐具" : "以后都需要餐具，商家依据餐量提供"),
        D: common_vendor.o(($event) => openCooker.value = !openCooker.value),
        E: common_vendor.o(($event) => openCooker.value = openCooker.value),
        F: openCooker.value,
        G: common_vendor.o(($event) => openCooker.value = !openCooker.value),
        H: common_vendor.f(timeSlots.value, (item, index, i0) => {
          return common_vendor.e({
            a: common_vendor.t(item),
            b: selectedTimeLabel.value === item ? 1 : "",
            c: selectedTimeLabel.value === item
          }, selectedTimeLabel.value === item ? {} : {}, {
            d: index,
            e: common_vendor.o(($event) => selectTime(item), index)
          });
        }),
        I: common_vendor.o(() => {
        }),
        J: showTimePopup.value,
        K: common_vendor.o(($event) => showTimePopup.value = false)
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-fb87e98c"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/submit/submit.vue"]]);
wx.createPage(MiniProgramPage);
