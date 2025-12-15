"use strict";
const common_vendor = require("../../../common/vendor.js");
if (!Array) {
  const _easycom_uni_icons2 = common_vendor.resolveComponent("uni-icons");
  _easycom_uni_icons2();
}
const _easycom_uni_icons = () => "../../../node-modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.js";
if (!Math) {
  _easycom_uni_icons();
}
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "Navbar",
  props: {
    status: { type: Boolean },
    shopConfig: {}
  },
  setup(__props) {
    const props = __props;
    const config = common_vendor.computed(() => {
      return props.shopConfig || {
        id: 1,
        name: "",
        address: "加载中...",
        phone: "",
        deliveryFee: 0,
        deliveryStatus: 1,
        packFee: 0,
        packStatus: 1,
        minOrderAmount: 0,
        openingHours: "",
        notice: "",
        autoAccept: 0
      };
    });
    const { safeAreaInsets } = common_vendor.index.getSystemInfoSync();
    const phone = () => {
      const phoneNumber = config.value.phone;
      if (phoneNumber)
        common_vendor.index.makePhoneCall({ phoneNumber });
    };
    return (_ctx, _cache) => {
      var _a;
      return common_vendor.e({
        a: ((_a = common_vendor.unref(safeAreaInsets)) == null ? void 0 : _a.top) + "px",
        b: common_vendor.t(_ctx.status ? "营业中" : "打烊中"),
        c: !_ctx.status ? 1 : "",
        d: common_vendor.t(config.value.deliveryStatus === 1 ? config.value.deliveryFee : 0),
        e: common_vendor.t(config.value.minOrderAmount),
        f: common_vendor.p({
          type: "location",
          size: "14",
          color: "#666"
        }),
        g: common_vendor.t(config.value.address),
        h: common_vendor.p({
          type: "phone-filled",
          size: "18",
          color: "#00aaff"
        }),
        i: common_vendor.o(phone),
        j: common_vendor.t(config.value.openingHours || "全天"),
        k: config.value.notice
      }, config.value.notice ? {
        l: common_vendor.t(config.value.notice)
      } : {});
    };
  }
});
const Component = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-e1a17746"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/order/components/Navbar.vue"]]);
wx.createComponent(Component);
