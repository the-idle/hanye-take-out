"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "remark",
  setup(__props) {
    const remark = common_vendor.ref("");
    common_vendor.onLoad((options) => {
      if (options && options.remark) {
        remark.value = options.remark;
      }
    });
    common_vendor.onShow(async () => {
      const cacheRemark = common_vendor.index.getStorageSync("order_remark");
      if (cacheRemark) {
        remark.value = cacheRemark;
        common_vendor.index.removeStorageSync("order_remark");
      }
    });
    const returnToSubmit = () => {
      console.log("remark", remark.value);
      common_vendor.index.setStorageSync("order_remark", remark.value);
      common_vendor.index.navigateBack({
        delta: 1
      });
    };
    return (_ctx, _cache) => {
      return {
        a: remark.value,
        b: common_vendor.o(($event) => remark.value = $event.detail.value),
        c: common_vendor.t(remark.value.length),
        d: common_vendor.o(($event) => returnToSubmit())
      };
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-cc1c9952"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/remark/remark.vue"]]);
wx.createPage(MiniProgramPage);
