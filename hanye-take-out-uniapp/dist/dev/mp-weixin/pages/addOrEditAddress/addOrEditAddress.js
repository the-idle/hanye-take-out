"use strict";
const common_vendor = require("../../common/vendor.js");
const api_address = require("../../api/address.js");
require("../../utils/http.js");
require("../../stores/modules/user.js");
const _sfc_main = /* @__PURE__ */ common_vendor.defineComponent({
  __name: "addOrEditAddress",
  setup(__props) {
    common_vendor.ref("ios");
    common_vendor.ref(false);
    const items = [
      {
        value: 1,
        name: "男士"
      },
      {
        value: 0,
        name: "女士"
      }
    ];
    const options = [
      {
        name: "公司"
      },
      {
        name: "家"
      },
      {
        name: "学校"
      }
    ];
    const form = common_vendor.reactive({
      id: 0,
      consignee: "",
      phone: "",
      label: "家",
      gender: 1,
      // 逻辑拆分：
      provinceName: "已定位",
      // 默认值，防止后端校验
      cityName: "已定位",
      // 默认值
      districtName: "",
      // 【重点】用来存地图选点的“建筑名”
      detail: "",
      // 【重点】用来存用户填写的“门牌号”
      latitude: "",
      longitude: ""
    });
    common_vendor.ref("");
    const address = common_vendor.ref("");
    common_vendor.ref();
    common_vendor.computed(() => {
      return form.latitude && form.longitude && address.value;
    });
    common_vendor.onLoad(async (opt) => {
      if (opt.id) {
        common_vendor.index.setNavigationBarTitle({ title: "修改收货地址" });
        const res = await api_address.getAddressByIdAPI(opt.id);
        if (res.code === 1 || res.code === 0) {
          Object.assign(form, res.data);
          if (!form.districtName)
            form.districtName = "";
        }
      } else {
        common_vendor.index.setNavigationBarTitle({ title: "新增收货地址" });
      }
    });
    common_vendor.onUnload(() => {
      common_vendor.index.removeStorage({
        key: "edit"
      });
    });
    const chooseLocationFromMap = () => {
      common_vendor.index.chooseLocation({
        success: (res) => {
          console.log("选点结果", res);
          form.latitude = String(res.latitude);
          form.longitude = String(res.longitude);
          form.districtName = res.name || res.address;
          form.provinceName = "已定位";
          form.cityName = "已定位";
        }
      });
    };
    const saveAddress = async () => {
      if (!form.consignee)
        return common_vendor.index.showToast({ title: "请填写联系人", icon: "none" });
      if (!form.phone)
        return common_vendor.index.showToast({ title: "请填写手机号", icon: "none" });
      if (!/^1[3-9]\d{9}$/.test(form.phone))
        return common_vendor.index.showToast({ title: "手机号格式错误", icon: "none" });
      if (!form.districtName || form.districtName === "已定位") {
        return common_vendor.index.showToast({ title: "请点击选择收货地址", icon: "none" });
      }
      if (!form.detail) {
        return common_vendor.index.showToast({ title: "请填写门牌号", icon: "none" });
      }
      const api = form.id ? api_address.updateAddressAPI : api_address.addAddressAPI;
      const res = await api(form);
      if (res.code === 1 || res.code === 0) {
        common_vendor.index.showToast({ title: "保存成功" });
        setTimeout(() => common_vendor.index.navigateBack(), 800);
      } else {
        common_vendor.index.showToast({ title: res.msg || "保存失败", icon: "none" });
      }
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: form.consignee,
        b: common_vendor.o(($event) => form.consignee = $event.detail.value),
        c: common_vendor.f(items, (item, index, i0) => {
          return {
            a: common_vendor.t(item.name),
            b: form.gender === item.value ? 1 : "",
            c: index,
            d: common_vendor.o(($event) => form.gender = item.value, index)
          };
        }),
        d: form.phone,
        e: common_vendor.o(($event) => form.phone = $event.detail.value),
        f: form.districtName && form.districtName !== "已定位"
      }, form.districtName && form.districtName !== "已定位" ? {
        g: common_vendor.t(form.districtName)
      } : {}, {
        h: common_vendor.o(chooseLocationFromMap),
        i: form.detail,
        j: common_vendor.o(($event) => form.detail = $event.detail.value),
        k: common_vendor.f(options, (item, k0, i0) => {
          return {
            a: common_vendor.t(item.name),
            b: form.label === item.name ? 1 : "",
            c: item.name,
            d: common_vendor.o(($event) => form.label = item.name, item.name)
          };
        }),
        l: common_vendor.o(saveAddress)
      });
    };
  }
});
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-06210029"], ["__file", "D:/opgames/waimai/hanye-take-out/hanye-take-out-uniapp/src/pages/addOrEditAddress/addOrEditAddress.vue"]]);
wx.createPage(MiniProgramPage);
